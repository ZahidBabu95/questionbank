import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions,
  Image,
  Modal,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import cmsService, { CmsSection, BillingPackage } from '../api/cmsService';
import apiClient from '../api/apiClient';
import { useBranding } from '../context/BrandingContext';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../utils/legalContent';

const { width } = Dimensions.get('window');

interface LandingScreenProps {
  navigation: any;
}

const LANG_DISPLAY_NAMES: Record<string, string> = {
  en: 'English',
  bn: 'বাংলা',
  hi: 'हिन्दी',
  ar: 'العربية',
  es: 'Español'
};

export const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { logoUrl, systemName } = useBranding();
  const [cmsData, setCmsData] = useState<CmsSection[]>([]);
  const [packages, setPackages] = useState<BillingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(['en', 'bn']);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('en');
  const [downloads, setDownloads] = useState<Record<string, any>>({
    ANDROID: null,
    IOS: null,
    WINDOWS: null,
    LINUX: null
  });

  // Legal Modal states
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy'>('terms');

  const openLegalModal = (type: 'terms' | 'privacy') => {
    setLegalModalType(type);
    setLegalModalVisible(true);
  };

  // Toggle Language
  const toggleLanguage = async () => {
    if (enabledLanguages.length <= 1) return;
    const currentIndex = enabledLanguages.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % enabledLanguages.length;
    const nextLang = enabledLanguages[nextIndex];
    await i18n.changeLanguage(nextLang);
    await AsyncStorage.setItem('user-language', nextLang);
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [landingData, packagesData, langsData] = await Promise.all([
          cmsService.getPublicLanding(),
          cmsService.getPublicPackages(),
          cmsService.getPublicLanguages().catch(() => ({ defaultLanguage: 'en', enabledLanguages: 'en,bn' }))
        ]);
        setCmsData(landingData);
        setPackages(packagesData);
        
        // Fetch dynamic app download releases from database (managed at /cms/landing)
        const plats = ['ANDROID', 'IOS', 'WINDOWS', 'LINUX'];
        const dlData: Record<string, any> = {};
        for (const p of plats) {
          try {
            const res = await apiClient.get(`/public/apps/latest?platform=${p}`);
            if (res.data && res.data.active) {
              dlData[p] = res.data;
            }
          } catch (e) {
            // ignore 404/not active release
          }
        }
        setDownloads(dlData);
        
        const enabled = langsData.enabledLanguages ? langsData.enabledLanguages.split(',') : ['en', 'bn'];
        const def = langsData.defaultLanguage || 'en';
        setEnabledLanguages(enabled);
        setDefaultLanguage(def);
        
        const storedLang = await AsyncStorage.getItem('user-language');
        if (storedLang && enabled.includes(storedLang)) {
          if (i18n.language !== storedLang) {
            await i18n.changeLanguage(storedLang);
          }
        } else {
          await i18n.changeLanguage(def);
          await AsyncStorage.setItem('user-language', def);
        }
      } catch (err) {
        console.log('Failed to fetch landing content, using default fallbacks.');
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, []);

  const findSection = (key: string) => cmsData.find(s => s.sectionKey === key);
  const getContent = (section: CmsSection | undefined, key: string, fallback: string) => {
    if (!section) return fallback;
    const item = section.contents.find(c => c.contentKey === key);
    if (!item || !item.contentValue) return fallback;
    
    try {
      const json = JSON.parse(item.contentValue);
      if (json && typeof json === 'object') {
        return json[i18n.language] || json['en'] || fallback;
      }
    } catch (e) {
      // Treat plain string as legacy Bengali fallback
      if (i18n.language === 'bn') {
        return item.contentValue;
      }
    }
    
    return fallback;
  };

  const hero = findSection('HERO_SECTION');
  const features = findSection('FEATURES_SECTION');
  const cta = findSection('CTA_SECTION');
  const trusted = findSection('TRUSTED_SECTION');
  const termsSec = findSection('TERMS_SECTION');
  const privacySec = findSection('PRIVACY_SECTION');

  const currentSec = legalModalType === 'terms' ? termsSec : privacySec;
  const dynamicTitle = getContent(
    currentSec,
    'TITLE',
    legalModalType === 'terms'
      ? (i18n.language === 'bn' ? TERMS_OF_SERVICE.bn.title : TERMS_OF_SERVICE.en.title)
      : (i18n.language === 'bn' ? PRIVACY_POLICY.bn.title : PRIVACY_POLICY.en.title)
  );
  const dynamicBody = getContent(currentSec, 'BODY_CONTENT', '');

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n\n').map((paragraph, idx) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      // H3 Heading
      if (trimmed.startsWith('###')) {
        return (
          <Text key={idx} style={styles.modalH3}>
            {trimmed.replace(/^###\s*/, '')}
          </Text>
        );
      }
      // H2 Heading
      if (trimmed.startsWith('##')) {
        return (
          <Text key={idx} style={styles.modalH2}>
            {trimmed.replace(/^##\s*/, '')}
          </Text>
        );
      }
      // H1 Heading
      if (trimmed.startsWith('#')) {
        return (
          <Text key={idx} style={styles.modalH1}>
            {trimmed.replace(/^#\s*/, '')}
          </Text>
        );
      }

      // Bullet List
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.includes('\n- ') || trimmed.includes('\n* ')) {
        return (
          <View key={idx} style={styles.modalList}>
            {trimmed.split('\n').map((li, lIdx) => {
              const cleanLi = li.trim();
              if (!cleanLi) return null;
              const liText = cleanLi.replace(/^[\-\*]\s*/, '').trim();
              return (
                <View key={lIdx} style={styles.modalListItem}>
                  <Text style={styles.modalListDot}>•</Text>
                  <Text style={styles.modalListText}>{liText}</Text>
                </View>
              );
            })}
          </View>
        );
      }

      // Numbered List
      if (/^\d+\.\s/.test(trimmed) || trimmed.includes('\n1. ') || trimmed.includes('\n2. ')) {
        return (
          <View key={idx} style={styles.modalList}>
            {trimmed.split('\n').map((li, lIdx) => {
              const cleanLi = li.trim();
              if (!cleanLi) return null;
              const match = cleanLi.match(/^(\d+)\.\s*(.*)/);
              if (!match) {
                return <Text key={lIdx} style={styles.modalListText}>{cleanLi}</Text>;
              }
              const num = match[1];
              const liText = match[2].trim();
              return (
                <View key={lIdx} style={styles.modalListItem}>
                  <Text style={styles.modalListNum}>{num}.</Text>
                  <Text style={styles.modalListText}>{liText}</Text>
                </View>
              );
            })}
          </View>
        );
      }

      // Standard Paragraph
      return (
        <Text key={idx} style={styles.modalParagraph}>
          {trimmed}
        </Text>
      );
    });
  };


  // Retrieve partners dynamically from TRUSTED_SECTION
  const partners: { name: string; logo: string }[] = [];
  if (trusted) {
    for (let i = 1; i <= 5; i++) {
      const nameContent = trusted.contents.find(c => c.contentKey === `PARTNER_${i}_NAME`);
      const logoContent = trusted.contents.find(c => c.contentKey === `PARTNER_${i}_LOGO`);
      if (nameContent && nameContent.contentValue) {
        partners.push({
          name: nameContent.contentValue,
          logo: logoContent ? logoContent.contentValue : ''
        });
      }
    }
  }
  const defaultPartners = [
    { name: "NDCC", logo: "" },
    { name: "DHAKA COLLEGE", logo: "" },
    { name: "IDEAL SCHOOL", logo: "" },
    { name: "VIQARUNNISA", logo: "" },
    { name: "RAJUK COLLEGE", logo: "" }
  ];
  const partnerList = partners.length > 0 ? partners : defaultPartners;

  // Auto-scroll marquee states & effects
  const marqueeRef = React.useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    if (contentWidth === 0 || partnerList.length === 0) return;

    let scrollX = 0;
    const interval = setInterval(() => {
      scrollX += 0.8; // Scroll speed
      const limit = contentWidth / 3;
      if (scrollX >= limit) {
        scrollX = 0;
      }
      marqueeRef.current?.scrollTo({ x: scrollX, animated: false });
    }, 20); // ~50fps

    return () => clearInterval(interval);
  }, [contentWidth, partnerList]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header / Navbar */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
          ) : (
            <>
              <View style={styles.logoIcon}>
                <Feather name="layout" size={20} color="#FFF" />
              </View>
              <Text style={styles.logoText}>{systemName}</Text>
            </>
          )}
        </View>

        {/* Language Toggler */}
        <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
          <Feather name="globe" size={16} color={theme.colors.primary} />
          <Text style={styles.langText}>
            {LANG_DISPLAY_NAMES[i18n.language] || i18n.language.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>
              {getContent(hero, 'BADGE_TEXT', 'NEW VERSION 2.0')}
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            {getContent(hero, 'TITLE', t('landing.title'))}
          </Text>
          <Text style={styles.heroAccent}>
            {t('landing.subtitle')}
          </Text>
          
          <Text style={styles.heroDesc}>
            {getContent(hero, 'DESCRIPTION', t('landing.description'))}
          </Text>

          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.primaryBtnText}>{t('landing.ctaStart')}</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryBtnText}>{t('landing.ctaLogin')}</Text>
          </TouchableOpacity>
        </View>

        {/* Client Marquee Banner */}
        <View style={styles.marqueeSection}>
          <Text style={styles.marqueeHeading}>
            {getContent(trusted, 'HEADING', t('landing.marqueeHeading') || 'TRUSTED BY TOP SCHOOLS & FRANCHISES').toUpperCase()}
          </Text>
          <ScrollView 
            ref={marqueeRef}
            horizontal 
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.marqueeScroll}
            onContentSizeChange={(w) => setContentWidth(w)}
          >
            {[...Array(3)].map((_, i) => (
              <View key={i} style={styles.marqueeRow}>
                {partnerList.map((partner, pIdx) => (
                  <View key={pIdx} style={styles.partnerContainer}>
                    {partner.logo ? (
                      <Image 
                        source={{ uri: partner.logo }} 
                        style={styles.partnerLogo} 
                        resizeMode="contain" 
                      />
                    ) : (
                      <Text style={styles.marqueeItem}>{partner.name.toUpperCase()}</Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>
            {getContent(features, 'SECTION_TITLE', t('landing.featuresTitle'))}
          </Text>

          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <View style={[styles.featIconBg, { backgroundColor: '#EFF6FF' }]}>
                <Feather name="database" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.featTitle}>
                {getContent(features, 'F1_TITLE', 'Question Bank')}
              </Text>
              <Text style={styles.featDesc}>
                {getContent(features, 'F1_DESC', 'Organize questions by Class, Subject, and Topic.')}
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featIconBg, { backgroundColor: '#FFFBEB' }]}>
                <Feather name="zap" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.featTitle}>
                {getContent(features, 'F2_TITLE', 'Auto Generator')}
              </Text>
              <Text style={styles.featDesc}>
                {getContent(features, 'F2_DESC', 'Create balanced exam papers in seconds.')}
              </Text>
            </View>

            <View style={styles.featureCard}>
              <View style={[styles.featIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="users" size={24} color="#10B981" />
              </View>
              <Text style={styles.featTitle}>
                {getContent(features, 'F3_TITLE', 'Multi-Tenant')}
              </Text>
              <Text style={styles.featDesc}>
                {getContent(features, 'F3_DESC', 'Perfect for coaching centers and large schools.')}
              </Text>
            </View>
          </View>
        </View>

                {/* App Downloads Section (Dynamic releases with fallback) */}
        {(() => {
          const hasActiveReleases = Object.values(downloads).some(d => d && d.active);
          const finalDownloads: Record<string, any> = {};

          if (hasActiveReleases) {
            Object.entries(downloads).forEach(([platform, data]) => {
              if (data && data.active) {
                finalDownloads[platform] = data;
              }
            });
          } else {
            // Default fallback is Android ONLY when database contains zero active releases
            finalDownloads.ANDROID = {
              active: true,
              versionName: "2.0.0",
              versionCode: 1,
              releaseType: "FILE_UPLOAD",
              downloadUrl: "https://qb.learningshaper.com/api/v1/public/files/QuestionShaper.apk",
              changelog: i18n.language === 'bn' 
                ? "• এআই-চালিত সৃজনশীল প্রশ্ন জেনারেটর\n• নেটিভ পারফরম্যান্স এবং স্পিড পিডিএফ ডাউনলোড\n• অফলাইন মেমরি ক্যাশ অপ্টিমাইজেশন"
                : "• AI-driven Creative Question workspace\n• Native performance & fast PDF downloads\n• Offline memory caching & optimizations"
            };
          }

          return (
            <View style={styles.downloadsSection}>
              <Text style={styles.sectionTitle}>
                {i18n.language === 'bn' ? 'কোয়েশ্চেন শ্যাপার অ্যাপ ডাউনলোড করুন' : 'Download the QuestionShaper Apps'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {i18n.language === 'bn' 
                  ? 'আমাদের এআই-চালিত অনন্য ওয়ার্কস্পেস আপনার মোবাইল এবং ডেস্কটপে নেটিভলি অ্যাক্সেস করুন।' 
                  : 'Access our advanced neural workspace natively across all your devices for ultimate performance.'}
              </Text>

              <View style={styles.downloadsContainer}>
                {Object.entries(finalDownloads).map(([platform, data]) => {
                  if (!data || !data.active) return null;
                  
                  const isAndroid = platform === 'ANDROID';
                  const isIos = platform === 'IOS';
                  const isWindows = platform === 'WINDOWS';
                  
                  const iconName = isAndroid ? 'smartphone' : isIos ? 'apple' : isWindows ? 'monitor' : 'cpu';
                  const title = isAndroid ? 'Android App' : isIos ? 'iOS App' : isWindows ? 'Windows Native' : 'Linux Package';
                  
                  const cardBg = isAndroid ? '#064E3B' : isIos ? '#0F172A' : isWindows ? '#172554' : '#7C2D12';
                  const borderColor = isAndroid ? 'rgba(16,185,129,0.3)' : isIos ? 'rgba(255,255,255,0.15)' : isWindows ? 'rgba(59,130,246,0.3)' : 'rgba(249,115,22,0.3)';
                  const iconColor = isAndroid ? '#34D399' : isIos ? '#FFF' : isWindows ? '#60A5FA' : '#FB923C';
                  const iconBg = isAndroid ? 'rgba(16,185,129,0.2)' : isIos ? 'rgba(255,255,255,0.1)' : isWindows ? 'rgba(59,130,246,0.2)' : 'rgba(249,115,22,0.2)';
                  const btnBg = isAndroid ? '#10B981' : isIos ? '#E2E8F0' : isWindows ? '#3B82F6' : '#F97316';
                  const btnTextColor = isIos ? '#0F172A' : '#FFF';
                  
                  const buttonText = data.releaseType === 'STORE_LINK'
                    ? (i18n.language === 'bn' ? 'স্টোর থেকে ডাউনলোড' : 'Get on App Store')
                    : (i18n.language === 'bn' ? 'সরাসরি ফাইল ডাউনলোড' : 'Download Binary File');
                    
                  return (
                    <View key={platform} style={[styles.downloadCard, { backgroundColor: cardBg, borderColor }]}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.downloadIconBg, { backgroundColor: iconBg }]}>
                          <Feather name={iconName as any} size={24} color={iconColor} />
                        </View>
                        <View style={styles.versionBadge}>
                          <Text style={styles.versionText}>v{data.versionName}</Text>
                        </View>
                      </View>
                      <Text style={styles.downloadCardTitle}>{title}</Text>
                      <Text style={styles.downloadCardMeta}>
                        {data.releaseType === 'STORE_LINK' ? 'Official App Store Link' : 'Secure Binary (Cloudflare R2)'}
                      </Text>
                      
                      {data.changelog ? (
                        <View style={styles.changelogBox}>
                          <Text style={styles.changelogHeading}>
                            {i18n.language === 'bn' ? 'নতুন পরিবর্তনসমূহ' : "What's New"}
                          </Text>
                          {data.changelog.split('\n').map((line: string, idx: number) => {
                            let cleanLine = line.trim();
                            if (cleanLine.startsWith('•')) cleanLine = cleanLine.substring(1).trim();
                            if (cleanLine.startsWith('-')) cleanLine = cleanLine.substring(1).trim();
                            if (cleanLine.startsWith('*')) cleanLine = cleanLine.substring(1).trim();
                            return (
                              <Text key={idx} style={styles.changelogLine}>• {cleanLine}</Text>
                            );
                          })}
                        </View>
                      ) : null}

                      <TouchableOpacity 
                        style={[styles.downloadBtn, { backgroundColor: btnBg }]}
                        onPress={() => Linking.openURL(data.downloadUrl)}
                      >
                        <Feather name="download" size={16} color={btnTextColor} style={{ marginRight: 6 }} />
                        <Text style={[styles.downloadBtnText, { color: btnTextColor }]}>
                          {buttonText}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Pricing/Packages Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>{t('landing.pricingTitle')}</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.85 + 20}
            decelerationRate="fast"
            contentContainerStyle={styles.packagesScroll}
          >
            {packages.length > 0 ? (
              packages
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                .map((pkg) => {
                  const isPremium = pkg.name.toUpperCase().includes('ENTERPRISE') || 
                                    pkg.name.toUpperCase().includes('PREMIUM') || 
                                    !!pkg.highlightBadge;

                  const featuresList = [
                    pkg.maxStudents === 0 ? 'Unlimited Students' : `Up to ${pkg.maxStudents} Students`,
                    pkg.maxTeachers === 0 ? 'Unlimited Teachers' : `Up to ${pkg.maxTeachers} Teachers`,
                    pkg.aiLimitPerMonth === 0 ? 'Unlimited AI Limit' : `AI Limit: ${pkg.aiLimitPerMonth} /mo`,
                    ...(pkg.featureFlags 
                      ? Object.entries(pkg.featureFlags)
                          .filter(([_, v]) => v)
                          .map(([k, _]) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
                      : []
                    )
                  ];

                  return (
                    <View 
                      key={pkg.id} 
                      style={[
                        styles.pricingCard, 
                        isPremium && styles.popularCard
                      ]}
                    >
                      {pkg.highlightBadge && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>{pkg.highlightBadge}</Text>
                        </View>
                      )}
                      <Text style={[styles.packageName, isPremium && { color: '#FFF' }]}>
                        {pkg.displayName || pkg.name}
                      </Text>
                      <Text style={[styles.packagePrice, isPremium && { color: '#FFF' }]}>
                        {t('landing.currencySymbol')}{pkg.price}
                        <Text style={[styles.packageCycle, isPremium && { color: '#94A3B8' }]}>
                          /{pkg.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}
                        </Text>
                      </Text>
                      <Text style={[styles.packageDesc, isPremium && { color: '#CBD5E1' }]}>
                        {pkg.description}
                      </Text>
                      
                      <View style={[styles.packageDivider, isPremium && { backgroundColor: '#334155' }]} />
                      
                      <View style={styles.packageFeatureList}>
                        {featuresList.map((feature, idx) => (
                          <Text 
                            key={idx} 
                            style={[
                              styles.pkgFeatText, 
                              isPremium && { color: '#CBD5E1' }
                            ]}
                          >
                            ✓ {feature}
                          </Text>
                        ))}
                      </View>

                      <TouchableOpacity 
                        style={[
                          styles.pricingBtn, 
                          isPremium && { backgroundColor: theme.colors.primary }
                        ]}
                        onPress={() => navigation.navigate('Register')}
                      >
                        <Text style={[styles.pricingBtnText, isPremium && { color: '#FFF' }]}>
                          {t('landing.ctaStart')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
            ) : (
              // Default Fallback Plans
              <>
                <View style={styles.pricingCard}>
                  <Text style={styles.packageName}>Standard</Text>
                  <Text style={styles.packagePrice}>
                    {t('landing.currencySymbol')}২৯৯<Text style={styles.packageCycle}>/mo</Text>
                  </Text>
                  <Text style={styles.packageDesc}>Essential tools for individual teachers and small coaching centers.</Text>
                  <View style={styles.packageDivider} />
                  <View style={styles.packageFeatureList}>
                    <Text style={styles.pkgFeatText}>✓ Up to 500 Students</Text>
                    <Text style={styles.pkgFeatText}>✓ AI Question Generator</Text>
                    <Text style={styles.pkgFeatText}>✓ Email Support</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.pricingBtn}
                    onPress={() => navigation.navigate('Register')}
                  >
                    <Text style={styles.pricingBtnText}>{t('landing.ctaStart')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.pricingCard, styles.popularCard]}>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                  <Text style={[styles.packageName, { color: '#FFF' }]}>Enterprise</Text>
                  <Text style={[styles.packagePrice, { color: '#FFF' }]}>
                    {t('landing.currencySymbol')}৯৯৯<Text style={[styles.packageCycle, { color: '#94A3B8' }]}>/mo</Text>
                  </Text>
                  <Text style={[styles.packageDesc, { color: '#CBD5E1' }]}>Complete suite for large schools and franchise institutions.</Text>
                  <View style={[styles.packageDivider, { backgroundColor: '#334155' }]} />
                  <View style={styles.packageFeatureList}>
                    <Text style={[styles.pkgFeatText, { color: '#CBD5E1' }]}>✓ Unlimited Students</Text>
                    <Text style={[styles.pkgFeatText, { color: '#CBD5E1' }]}>✓ Advanced Neural Engine</Text>
                    <Text style={[styles.pkgFeatText, { color: '#CBD5E1' }]}>✓ Priority Support</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.pricingBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('Register')}
                  >
                    <Text style={styles.pricingBtnText}>{t('landing.ctaStart')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>

        {/* CTA Banner Section */}
        {cta && (
          <View style={styles.ctaSection}>
            <Text style={styles.ctaTitle}>
              {getContent(cta, 'TITLE', 'Ready to modernize your institute?')}
            </Text>
            <TouchableOpacity 
              style={styles.ctaBtn}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.ctaBtnText}>
                {getContent(cta, 'BTN_TEXT', 'Get Started Now')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} {systemName}. {i18n.language === 'bn' ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}
          </Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => openLegalModal('terms')}>
              <Text style={styles.footerLinkText}>
                {i18n.language === 'bn' ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.footerLinkDivider}>•</Text>
            <TouchableOpacity onPress={() => openLegalModal('privacy')}>
              <Text style={styles.footerLinkText}>
                {i18n.language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Legal Content Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={legalModalVisible}
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {dynamicTitle}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={() => setLegalModalVisible(false)}
              >
                <Feather name="x" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              style={styles.modalScrollView} 
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {dynamicBody ? (
                renderMarkdown(dynamicBody)
              ) : (
                <>
                  <Text style={styles.modalLastUpdated}>
                    {legalModalType === 'terms'
                      ? (i18n.language === 'bn' ? TERMS_OF_SERVICE.bn.lastUpdated : TERMS_OF_SERVICE.en.lastUpdated)
                      : (i18n.language === 'bn' ? PRIVACY_POLICY.bn.lastUpdated : PRIVACY_POLICY.en.lastUpdated)
                    }
                  </Text>
                  <Text style={styles.modalIntro}>
                    {legalModalType === 'terms'
                      ? (i18n.language === 'bn' ? TERMS_OF_SERVICE.bn.intro : TERMS_OF_SERVICE.en.intro)
                      : (i18n.language === 'bn' ? PRIVACY_POLICY.bn.intro : PRIVACY_POLICY.en.intro)
                    }
                  </Text>

                  {/* Sections */}
                  {(legalModalType === 'terms' 
                    ? (i18n.language === 'bn' ? TERMS_OF_SERVICE.bn.sections : TERMS_OF_SERVICE.en.sections)
                    : (i18n.language === 'bn' ? PRIVACY_POLICY.bn.sections : PRIVACY_POLICY.en.sections)
                  ).map((sec, index) => (
                    <View key={index} style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>{sec.title}</Text>
                      <Text style={styles.modalSectionContent}>{sec.content}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            {/* Footer Close Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalAcceptBtn} 
                onPress={() => setLegalModalVisible(false)}
              >
                <Text style={styles.modalAcceptBtnText}>
                  {i18n.language === 'bn' ? 'ঠিক আছে' : 'I Understand'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 130,
    height: 38,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  logoText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  langText: {
    marginLeft: 6,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxxl,
  },
  heroSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 40,
    alignItems: 'center',
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
    marginBottom: theme.spacing.lg,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  heroTitle: {
    fontSize: theme.typography.sizes.xxxl - 2,
    fontWeight: theme.typography.weights.black,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 36,
  },
  heroAccent: {
    fontSize: theme.typography.sizes.xxxl - 2,
    fontWeight: theme.typography.weights.black,
    color: theme.colors.primary,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: theme.spacing.md,
  },
  heroDesc: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  primaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.md,
    marginBottom: theme.spacing.md,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  secondaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  marqueeSection: {
    backgroundColor: '#FFF',
    paddingVertical: theme.spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  marqueeHeading: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: theme.spacing.md,
  },
  marqueeScroll: {
    alignItems: 'center',
  },
  marqueeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    paddingRight: 32,
  },
  partnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerLogo: {
    height: 30,
    width: 90,
    opacity: 0.45,
  },
  marqueeItem: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.black,
    color: '#E2E8F0',
  },
  featuresSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 40,
    backgroundColor: '#FFF',
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  featureGrid: {
    gap: theme.spacing.lg,
  },
  featureCard: {
    padding: theme.spacing.lg,
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  featIconBg: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  featTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  featDesc: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  pricingSection: {
    paddingVertical: 40,
    marginTop: theme.spacing.lg,
  },
  packagesScroll: {
    paddingHorizontal: theme.spacing.xl,
    gap: 20,
  },
  pricingCard: {
    width: width * 0.82,
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    position: 'relative',
  },
  popularCard: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
  },
  popularText: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    textTransform: 'uppercase',
  },
  packageName: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  packageCycle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.textSecondary,
  },
  packageDesc: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  packageDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  packageFeatureList: {
    gap: 12,
    marginBottom: theme.spacing.xl,
  },
  pkgFeatText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  pricingBtn: {
    height: 48,
    backgroundColor: theme.colors.secondaryLight,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingBtnText: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
  },
  ctaSection: {
    marginHorizontal: theme.spacing.xl,
    marginTop: 32,
    padding: theme.spacing.xl,
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  ctaBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  ctaBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
  },
  footerSection: {
    marginTop: 48,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FAFBFD',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
  },
  footerLinkDivider: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '82%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalScrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalLastUpdated: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalIntro: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
    fontWeight: theme.typography.weights.medium,
  },
  modalSection: {
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  modalSectionContent: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  modalH1: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text,
    marginTop: 18,
    marginBottom: 8,
    lineHeight: 24,
  },
  modalH2: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 6,
    lineHeight: 20,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: 8,
  },
  modalH3: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  modalParagraph: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  modalList: {
    marginBottom: 10,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingLeft: 4,
  },
  modalListDot: {
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 6,
    lineHeight: 16,
  },
  modalListNum: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    marginRight: 6,
    lineHeight: 16,
  },
  modalListText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: '#FFF',
  },
  modalAcceptBtn: {
    height: 50,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  modalAcceptBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  downloadsSection: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 40,
    backgroundColor: '#FAFBFD',
    marginTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionSubtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: -20,
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: theme.spacing.md,
  },
  downloadsContainer: {
    gap: 24,
  },
  downloadCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  downloadIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  versionBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  versionText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#FFF',
  },
  downloadCardTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.weights.bold,
    color: '#FFF',
  },
  downloadCardMeta: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: theme.typography.weights.semibold,
    marginTop: 2,
    marginBottom: 16,
  },
  changelogBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  changelogHeading: {
    fontSize: 9,
    fontWeight: theme.typography.weights.bold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  changelogLine: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginTop: 4,
  },
  downloadBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
  },
});
