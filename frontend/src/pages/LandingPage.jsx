import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    BookOpen, CheckCircle, Layout, Users,
    ArrowRight, Zap, Globe, Shield, Star, Menu, X, FileText,
    Smartphone, Apple, Monitor, Cpu, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import cmsService from '../services/cmsService';
import { useBranding } from '../context/BrandingContext';

const translations = {
    en: {
        // Nav Links
        navFeatures: "Features",
        navPricing: "Pricing",
        navLogin: "Log In",
        navSignup: "Get Started",
        navDashboard: "Go to Dashboard",
        navDownloads: "Downloads",
        
        // Hero Fallbacks
        heroBadge: "New Version 2.0 Released",
        heroTitle: "Smart Exam Management",
        heroSubtitle: "Question Shaper",
        heroDesc: "Empower your institute with AI-driven question generation and performance analytics.",
        heroCta: "Start Free Trial",
        heroLogin: "Access Workspace",
        
        // Client banner
        marqueeHeading: "TRUSTED BY TOP SCHOOLS & FRANCHISES",
        
        // Features Section
        featSectionTitle: "Everything you need to run exams",
        feat1Title: "Rich Question Bank",
        feat1Desc: "Organize thousands of questions by class, subject, and topic with simple navigation.",
        feat2Title: "AI Auto Generator",
        feat2Desc: "Create balanced, high-quality exam papers in seconds with automatic difficulty tuning.",
        feat3Title: "Multi-Tenant Support",
        feat3Desc: "Manage coaching chains, multiple branches, or franchises from a single admin panel.",
        
        // Pricing Section
        pricingSectionTitle: "Simple, Transparent Pricing",
        pricingSectionSubtitle: "Start for free, then upgrade as your institution grows.",
        pricingStart: "Get Started",
        pricingCycleMo: "mo",
        pricingCycleYr: "yr",
        pricingCurrency: "৳",
        popularBadge: "Most Popular",
        
        // CTA Section
        ctaTitle: "Ready to modernize your institute?",
        ctaBtn: "Get Started Now",
        
        // Fallback Packages (English)
        standardName: "Standard",
        standardDesc: "Essential tools for individual teachers and small coaching centers.",
        standardFeat1: "Up to 500 Students",
        standardFeat2: "AI Question Generator",
        standardFeat3: "Basic OMR Scanning",
        standardFeat4: "Email Support",
        
        enterpriseName: "Enterprise",
        enterpriseDesc: "Complete suite for large schools and franchise institutions.",
        enterpriseFeat1: "Unlimited Students",
        enterpriseFeat2: "Advanced Neural Engine",
        enterpriseFeat3: "White-labeling & Own Branding",
        enterpriseFeat4: "Priority Phone Support",
        enterpriseFeat5: "API Access",
        enterpriseBtn: "Upgrade to Enterprise",
    },
    bn: {
        // Nav Links
        navFeatures: "ফিচারসমূহ",
        navPricing: "মূল্য তালিকা",
        navLogin: "লগইন",
        navSignup: "শুরু করুন",
        navDashboard: "ড্যাশবোর্ডে যান",
        navDownloads: "ডাউনলোড",
        
        // Hero Fallbacks
        heroBadge: "নতুন সংস্করণ ২.০ রিলিজ হয়েছে",
        heroTitle: "স্মার্ট এক্সাম ম্যানেজমেন্ট",
        heroSubtitle: "কোয়েশ্চেন শ্যাপার",
        heroDesc: "এআই-চালিত প্রশ্ন জেনারেশন এবং পারফরম্যান্স অ্যানালিটিক্স দিয়ে আপনার প্রতিষ্ঠানকে আধুনিক করুন।",
        heroCta: "ফ্রি ট্রায়াল শুরু করুন",
        heroLogin: "ওয়ার্কস্পেস অ্যাক্সেস করুন",
        
        // Client banner
        marqueeHeading: "শীর্ষস্থানীয় স্কুল এবং শিক্ষাপ্রতিষ্ঠান দ্বারা বিশ্বস্ত",
        
        // Features Section
        featSectionTitle: "পরীক্ষা পরিচালনার জন্য প্রয়োজনীয় সবকিছু",
        feat1Title: "সমৃদ্ধ প্রশ্ন ব্যাংক",
        feat1Desc: "শ্রেণী, বিষয় এবং টপিক অনুসারে গোছানো হাজারো সৃজনশীল ও বহুনির্বাচনী প্রশ্ন।",
        feat2Title: "এআই অটো জেনারেটর",
        feat2Desc: "কঠিনতা ও সিলেবাসের মান বজায় রেখে মাত্র কয়েক সেকেন্ডে ব্যালেন্সড প্রশ্নপত্র তৈরি করুন।",
        feat3Title: "মাল্টি-টেন্যান্ট সাপোর্ট",
        feat3Desc: "কোচিং সেন্টার এবং স্কুল-কলেজ চেইনের জন্য একাধিক শাখা বা ইনস্টিটিউট ম্যানেজমেন্ট সুবিধা।",
        
        // Pricing Section
        pricingSectionTitle: "স্বচ্ছ এবং সহজ মূল্য তালিকা",
        pricingSectionSubtitle: "বিনামূল্যে শুরু করুন, তারপর আপনার প্রতিষ্ঠানের পরিধি বাড়ার সাথে সাথে আপগ্রেড করুন।",
        pricingStart: "শুরু করুন",
        pricingCycleMo: "মাস",
        pricingCycleYr: "বছর",
        pricingCurrency: "৳",
        popularBadge: "সবচেয়ে জনপ্রিয়",
        
        // CTA Section
        ctaTitle: "আপনার শিক্ষাপ্রতিষ্ঠানকে আধুনিক করতে প্রস্তুত তো?",
        ctaBtn: "আজই বিনামূল্যে শুরু করুন",
        
        // Fallback Packages (Bengali)
        standardName: "স্ট্যান্ডার্ড",
        standardDesc: "ব্যক্তিগত শিক্ষক এবং ছোট কোচিং সেন্টারের জন্য প্রয়োজনীয় টুলস।",
        standardFeat1: "৫০০ শিক্ষার্থী পর্যন্ত",
        standardFeat2: "এআই প্রশ্ন জেনারেটর",
        standardFeat3: "বেসিক ওএমআর স্ক্যানিং",
        standardFeat4: "ইমেইল সাপোর্ট",
        
        enterpriseName: "এন্টারপ্রাইজ",
        enterpriseDesc: "বড় স্কুল এবং ফ্র্যাঞ্চাইজি প্রতিষ্ঠানের জন্য সম্পূর্ণ স্যুট।",
        enterpriseFeat1: "সীমাহীন শিক্ষার্থী",
        enterpriseFeat2: "অ্যাডভান্সড নিউরাল ইঞ্জিন",
        enterpriseFeat3: "হোয়াইট-লেবেলিং এবং নিজস্ব ব্র্যান্ডিং",
        enterpriseFeat4: "অগ্রাধিকার ফোন সাপোর্ট",
        enterpriseFeat5: "এপিআই অ্যাক্সেস",
        enterpriseBtn: "এন্টারপ্রাইজে আপগ্রেড করুন",
    }
};

const LANG_DISPLAY_NAMES = {
    en: 'English',
    bn: 'বাংলা',
    hi: 'हिन्दी',
    ar: 'العربية',
    es: 'Español'
};

const LandingPage = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cmsData, setCmsData] = useState([]);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const branding = useBranding();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [enabledLanguages, setEnabledLanguages] = useState(['en', 'bn']);
    const [currentLang, setCurrentLang] = useState('en');
    const [downloads, setDownloads] = useState({
        ANDROID: null,
        IOS: null,
        WINDOWS: null,
        LINUX: null
    });

    useEffect(() => {
        setIsLoggedIn(!!localStorage.getItem('token'));
        const loadContent = async () => {
            try {
                const [data, packagesData, langsData] = await Promise.all([
                    cmsService.getPublicLanding(),
                    cmsService.getPublicPackages(),
                    cmsService.getPublicLanguages().catch(() => ({ defaultLanguage: 'en', enabledLanguages: 'en,bn' }))
                ]);
                setCmsData(data);
                setPackages(packagesData);
                
                const enabled = langsData.enabledLanguages ? langsData.enabledLanguages.split(',') : ['en', 'bn'];
                const def = langsData.defaultLanguage || 'en';
                setEnabledLanguages(enabled);
                
                const storedLang = localStorage.getItem('user-language');
                if (storedLang && enabled.includes(storedLang)) {
                    setCurrentLang(storedLang);
                } else {
                    setCurrentLang(def);
                    localStorage.setItem('user-language', def);
                }

                // Fetch dynamic app download releases
                const plats = ['ANDROID', 'IOS', 'WINDOWS', 'LINUX'];
                const dlData = {};
                for (const p of plats) {
                    try {
                        const release = await cmsService.getLatestPublicRelease(p);
                        if (release && release.active) {
                            dlData[p] = release;
                        }
                    } catch (e) {
                        // ignore 404/no active release
                    }
                }
                setDownloads(dlData);

            } catch (err) {
                console.error('Failed to load CMS content:', err);
            } finally {
                setLoading(false);
            }
        };
        loadContent();
    }, []);

    const toggleLanguage = () => {
        if (enabledLanguages.length <= 1) return;
        const currentIndex = enabledLanguages.indexOf(currentLang);
        const nextIndex = (currentIndex + 1) % enabledLanguages.length;
        const nextLang = enabledLanguages[nextIndex];
        setCurrentLang(nextLang);
        localStorage.setItem('user-language', nextLang);
    };

    const findSection = (key) => cmsData.find(s => s.sectionKey === key);
    
    const getContent = (section, key, fallbackKey) => {
        if (!section) {
            return translations[currentLang]?.[fallbackKey] || translations.en[fallbackKey] || fallbackKey;
        }
        const item = section.contents.find(c => c.contentKey === key);
        if (!item || !item.contentValue) {
            return translations[currentLang]?.[fallbackKey] || translations.en[fallbackKey] || fallbackKey;
        }
        
        try {
            const json = JSON.parse(item.contentValue);
            if (json && typeof json === 'object') {
                return json[currentLang] || json['en'] || translations[currentLang]?.[fallbackKey] || fallbackKey;
            }
        } catch (e) {
            // Treat plain string as legacy Bengali fallback
            if (currentLang === 'bn') {
                return item.contentValue;
            }
        }
        
        return translations[currentLang]?.[fallbackKey] || translations.en[fallbackKey] || fallbackKey;
    };

    const hero = findSection('HERO_SECTION');
    const features = findSection('FEATURES_SECTION');
    const cta = findSection('CTA_SECTION');
    const trusted = findSection('TRUSTED_SECTION');

    // Retrieve partners dynamically from TRUSTED_SECTION
    const partners = [];
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

    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-700 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-xl z-50 border-b border-slate-200/60 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link to="/" className="flex-shrink-0">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.4 }}
                                className="flex items-center"
                            >
                                {branding?.logo_url ? (
                                    <img
                                        src={branding.logo_url}
                                        alt="Logo"
                                        className="h-12 w-auto object-contain drop-shadow-sm select-none"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 text-white">
                                        <Layout strokeWidth={2.5} size={28} />
                                    </div>
                                )}
                            </motion.div>
                        </Link>

                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                                {translations[currentLang].navFeatures}
                            </a>
                            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                                {translations[currentLang].navPricing}
                            </a>
                            <a href="#downloads" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                                {translations[currentLang].navDownloads}
                            </a>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                            {/* Language Switcher */}
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-primary hover:border-primary/30 bg-slate-50/50 transition-all select-none"
                            >
                                <Globe size={14} className="text-slate-400" />
                                {LANG_DISPLAY_NAMES[currentLang] || currentLang.toUpperCase()}
                            </button>

                            {isLoggedIn ? (
                                <Link to="/dashboard" className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-primary hover:brightness-110 transition-all shadow-lg shadow-primary/30">
                                    {translations[currentLang].navDashboard}
                                </Link>
                            ) : (
                                <>
                                    <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                                        {translations[currentLang].navLogin}
                                    </Link>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Link to="/signup" className="inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-primary hover:brightness-110 transition-all shadow-lg shadow-primary/30">
                                            {translations[currentLang].navSignup}
                                        </Link>
                                    </motion.div>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Toggle Button */}
                        <div className="md:hidden flex items-center gap-2">
                            {/* Language Switcher on Mobile Header */}
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50/50 transition-all"
                            >
                                <Globe size={12} className="text-slate-400" />
                                {(currentLang || '').toUpperCase()}
                            </button>

                            <button
                                onClick={toggleMenu}
                                className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
                            >
                                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Drawer */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200/60 overflow-hidden"
                        >
                            <div className="px-4 py-6 space-y-4 flex flex-col items-center">
                                <a href="#features" onClick={toggleMenu} className="block w-full text-center text-base font-bold text-slate-700 hover:text-primary p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                    {translations[currentLang].navFeatures}
                                </a>
                                <a href="#pricing" onClick={toggleMenu} className="block w-full text-center text-base font-bold text-slate-700 hover:text-primary p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                    {translations[currentLang].navPricing}
                                </a>
                                <a href="#downloads" onClick={toggleMenu} className="block w-full text-center text-base font-bold text-slate-700 hover:text-primary p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                    {translations[currentLang].navDownloads}
                                </a>
                                
                                <div className="w-full h-px bg-slate-100 my-2"></div>
                                
                                {isLoggedIn ? (
                                    <Link to="/dashboard" onClick={toggleMenu} className="block w-full text-center px-5 py-4 text-base font-bold rounded-xl text-white bg-primary shadow-lg shadow-primary/30">
                                        {translations[currentLang].navDashboard}
                                    </Link>
                                ) : (
                                    <>
                                        <Link to="/login" onClick={toggleMenu} className="block w-full text-center text-base font-bold text-slate-700 hover:text-primary p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                            {translations[currentLang].navLogin}
                                        </Link>
                                        <Link to="/signup" onClick={toggleMenu} className="block w-full text-center px-5 py-4 text-base font-bold rounded-xl text-white bg-primary shadow-lg shadow-primary/30">
                                            {translations[currentLang].navSignup}
                                        </Link>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* Dynamic Hero Section */}
            <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center"
                >
                    <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-8">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        {getContent(hero, 'BADGE_TEXT', 'heroBadge')}
                    </motion.div>

                    <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
                        {getContent(hero, 'TITLE', 'heroTitle')} <br />
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            {translations[currentLang].heroSubtitle}
                        </span>
                    </motion.h1>

                    <motion.p variants={fadeInUp} className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                        {getContent(hero, 'DESCRIPTION', 'heroDesc')}
                    </motion.p>

                    <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center items-center gap-4">
                        <Link
                            to="/signup"
                            className="px-8 py-4 bg-primary text-white font-bold rounded-xl hover:brightness-110 transition-all shadow-xl shadow-primary/30 hover:-translate-y-1 flex items-center gap-2 group w-full sm:w-auto justify-center"
                        >
                            {translations[currentLang].heroCta} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </motion.div>
                </motion.div>

                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px]" />
                </div>
            </section>

            {/* Smart Client Logo Marquee */}
            <section className="py-8 bg-white border-y border-slate-100 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 text-center mb-6">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {getContent(trusted, 'HEADING', 'marqueeHeading')}
                    </p>
                </div>
                <div className="flex whitespace-nowrap animate-marquee md:animate-marquee-slow hover:[animation-play-state:paused]">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-12 md:gap-24 px-6 md:px-12 items-center">
                            {partnerList.map((partner, pIdx) => (
                                <React.Fragment key={pIdx}>
                                    {partner.logo ? (
                                        <img 
                                            src={partner.logo} 
                                            alt={partner.name} 
                                            className="h-10 md:h-12 w-auto object-contain filter grayscale opacity-45 hover:grayscale-0 hover:opacity-100 transition-all duration-300 select-none cursor-pointer"
                                        />
                                    ) : (
                                        <h2 className="text-xl md:text-2xl font-black text-slate-200 hover:text-slate-400 transition-colors select-none cursor-pointer">
                                            {partner.name}
                                        </h2>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    ))}
                </div>
            </section>

            {/* Dynamic Features Grid */}
            <section id="features" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-20"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                            {getContent(features, 'SECTION_TITLE', 'featSectionTitle')}
                        </h2>
                    </motion.div>

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        <FeatureCard
                            icon={<Layout className="w-6 h-6 text-primary" />}
                            title={getContent(features, 'F1_TITLE', 'feat1Title')}
                            desc={getContent(features, 'F1_DESC', 'feat1Desc')}
                            color="bg-blue-50"
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-amber-500" />}
                            title={getContent(features, 'F2_TITLE', 'feat2Title')}
                            desc={getContent(features, 'F2_DESC', 'feat2Desc')}
                            color="bg-amber-50"
                        />
                        <FeatureCard
                            icon={<Users className="w-6 h-6 text-emerald-500" />}
                            title={getContent(features, 'F3_TITLE', 'feat3Title')}
                            desc={getContent(features, 'F3_DESC', 'feat3Desc')}
                            color="bg-emerald-50"
                        />
                    </motion.div>
                </div>
            </section>

            {/* App Downloads Section */}
            {(() => {
                const hasActiveReleases = Object.values(downloads).some(d => d && d.active);
                if (!hasActiveReleases) return null;

                const finalDownloads = {};
                Object.entries(downloads).forEach(([platform, data]) => {
                    if (data && data.active) {
                        finalDownloads[platform] = data;
                    }
                });

                return (
                    <section id="downloads" className="py-20 bg-gradient-to-b from-white to-slate-50 relative border-t border-slate-100">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInUp}
                                className="text-center mb-16"
                            >
                                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                                    {currentLang === 'bn' ? 'কোয়েশ্চেন শ্যাপার অ্যাপ ডাউনলোড করুন' : 'Download the QuestionShaper Apps'}
                                </h2>
                                <p className="text-slate-500 max-w-2xl mx-auto text-base">
                                    {currentLang === 'bn' 
                                        ? 'আমাদের এআই-চালিত অনন্য ওয়ার্কস্পেস আপনার মোবাইল এবং ডেস্কটপে নেটিভলি অ্যাক্সেস করুন।' 
                                        : 'Access our advanced neural workspace natively across all your devices for ultimate performance.'}
                                </p>
                            </motion.div>

                            <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
                                {Object.entries(finalDownloads).map(([platform, data]) => {
                                    if (!data) return null;
                                const isAndroid = platform === 'ANDROID';
                                const isIos = platform === 'IOS';
                                const isWindows = platform === 'WINDOWS';
                                
                                const IconComp = isAndroid ? Smartphone : isIos ? Apple : isWindows ? Monitor : Cpu;
                                const title = isAndroid ? 'Android App' : isIos ? 'iOS App' : isWindows ? 'Windows Native' : 'Linux Package';
                                const buttonText = data.releaseType === 'STORE_LINK' 
                                    ? (currentLang === 'bn' ? 'স্টোর থেকে ডাউনলোড করুন' : 'Get it on App Store') 
                                    : (currentLang === 'bn' ? 'সরাসরি ফাইল ডাউনলোড' : 'Download Binary File');
                                
                                // Color configurations for the platform glassmorphic look
                                const theme = isAndroid 
                                    ? {
                                        bg: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400',
                                        badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                                        iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
                                        button: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]',
                                        glow: 'shadow-[0_0_40px_rgba(16,185,129,0.08)]'
                                    } 
                                    : isIos 
                                    ? {
                                        bg: 'bg-slate-900/90 border-slate-700/40 text-slate-200',
                                        badge: 'bg-slate-500/15 text-slate-300 border border-slate-500/20',
                                        iconBg: 'bg-slate-500/20 text-white border border-slate-500/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]',
                                        button: 'bg-white text-slate-950 hover:bg-slate-100 hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]',
                                        glow: 'shadow-[0_0_40px_rgba(255,255,255,0.03)]'
                                    } 
                                    : isWindows 
                                    ? {
                                        bg: 'bg-blue-950/90 border-blue-500/30 text-blue-400',
                                        badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                                        iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
                                        button: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.4)]',
                                        glow: 'shadow-[0_0_40px_rgba(59,130,246,0.08)]'
                                    } 
                                    : {
                                        bg: 'bg-orange-950/90 border-orange-500/30 text-orange-400',
                                        badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
                                        iconBg: 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.3)]',
                                        button: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-[0_0_25px_rgba(249,115,22,0.4)]',
                                        glow: 'shadow-[0_0_40px_rgba(249,115,22,0.08)]'
                                    };

                                return (
                                    <motion.div
                                        key={platform}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        whileHover="hover"
                                        className={`w-full sm:w-[300px] p-8 rounded-[2rem] border ${theme.bg} ${theme.glow} flex flex-col justify-between transition-all duration-300 relative overflow-hidden backdrop-blur-xl group`}
                                    >
                                        {/* Dynamic Gloss Sheen Sweep Effect */}
                                        <motion.div 
                                            className="absolute top-0 left-0 w-[60%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-[150%] pointer-events-none"
                                            variants={{
                                                hover: {
                                                    x: '250%',
                                                    transition: {
                                                        duration: 1.5,
                                                        ease: 'easeInOut',
                                                        repeat: Infinity,
                                                        repeatDelay: 0.3
                                                    }
                                                }
                                            }}
                                        />

                                        <div className="space-y-6 relative z-10">
                                            {/* Header Section: Glowing Icon & Platform */}
                                            <div className="flex justify-between items-start">
                                                <motion.div 
                                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${theme.iconBg}`}
                                                    variants={{
                                                        hover: {
                                                            scale: 1.1,
                                                            rotate: [0, -5, 5, 0],
                                                            transition: { duration: 0.5 }
                                                        }
                                                    }}
                                                >
                                                    <IconComp size={28} />
                                                </motion.div>
                                                <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full ${theme.badge}`}>
                                                    v{data.versionName}
                                                </span>
                                            </div>

                                            {/* Name & Subtitle */}
                                            <div>
                                                <h3 className="font-black text-white text-xl tracking-tight">{title}</h3>
                                                <p className="text-slate-400 text-xs font-semibold mt-1">
                                                    {data.releaseType === 'STORE_LINK' ? 'Official App Store Link' : 'Secure Binary (Cloudflare R2)'}
                                                </p>
                                            </div>

                                            {/* Changelog section inside glossy box */}
                                            {data.changelog && (
                                                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-[11px] leading-relaxed text-slate-300">
                                                    <span className="font-black text-slate-400 uppercase tracking-widest block text-[9px] mb-2">
                                                        {currentLang === 'bn' ? 'নতুন পরিবর্তনসমূহ' : "What's New"}
                                                    </span>
                                                    <div className="space-y-1.5 max-h-[90px] overflow-y-auto pr-1">
                                                        {data.changelog.split('\n').map((line, idx) => {
                                                            let cleanLine = line.trim();
                                                            if (cleanLine.startsWith('•')) cleanLine = cleanLine.substring(1).trim();
                                                            if (cleanLine.startsWith('-')) cleanLine = cleanLine.substring(1).trim();
                                                            if (cleanLine.startsWith('*')) cleanLine = cleanLine.substring(1).trim();
                                                            return (
                                                                <div key={idx} className="flex items-start gap-2">
                                                                    <span className="text-indigo-400 mt-0.5">•</span>
                                                                    <span>{cleanLine}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Download CTA Button */}
                                        <div className="mt-8 relative z-10">
                                            <a
                                                href={data.downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`w-full py-4 px-6 rounded-2xl font-bold text-xs text-center flex items-center justify-center gap-2 transition-all duration-300 ${theme.button}`}
                                            >
                                                <Download size={15} strokeWidth={2.5} className="animate-bounce" />
                                                {buttonText}
                                            </a>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            </div>
                        </div>
                    </section>
                );
            })()}

            {/* Responsive Pricing Section */}
            <section id="pricing" className="py-24 bg-slate-50 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                            {translations[currentLang].pricingSectionTitle}
                        </h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">
                            {translations[currentLang].pricingSectionSubtitle}
                        </p>
                    </motion.div>

                    <div className="flex justify-center -mx-4 md:mx-0">
                        <div className="flex md:grid md:grid-cols-2 gap-6 px-4 md:px-0 w-full md:max-w-4xl overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-8 md:pb-0 hide-scrollbar justify-start md:justify-center">
                            {packages.length > 0 ? (
                                packages.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((pkg) => {
                                    const isPremium = pkg.type === 'ENTERPRISE' || pkg.name.toUpperCase().includes('ENTERPRISE') || pkg.name.toUpperCase().includes('PREMIUM') || pkg.highlightBadge;
                                    
                                    const featuresList = [
                                        pkg.maxStudents === 0 ? 'Unlimited Students' : `${currentLang === 'bn' ? 'সর্বোচ্চ' : 'Up to'} ${pkg.maxStudents} ${currentLang === 'bn' ? 'শিক্ষার্থী' : 'Students'}`,
                                        pkg.maxTeachers === 0 ? 'Unlimited Teachers' : `${currentLang === 'bn' ? 'সর্বোচ্চ' : 'Up to'} ${pkg.maxTeachers} ${currentLang === 'bn' ? 'শিক্ষক' : 'Teachers'}`,
                                        pkg.aiLimitPerMonth === 0 ? 'Unlimited AI Limit' : `${currentLang === 'bn' ? 'এআই লিমিট:' : 'AI Limit:'} ${pkg.aiLimitPerMonth} /${currentLang === 'bn' ? 'মাস' : 'mo'}`,
                                        ...(pkg.featureFlags ? Object.entries(pkg.featureFlags).filter(([_, v]) => v).map(([k, _]) => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : [])
                                    ];
                                    
                                    const localizedBadge = pkg.highlightBadge === 'BETA TESTER' ? (currentLang === 'bn' ? 'বিটা টেস্টার' : 'Beta Tester') : pkg.highlightBadge;

                                    if (isPremium) {
                                        return (
                                            <motion.div 
                                                key={pkg.id}
                                                variants={fadeInUp}
                                                className="min-w-[85vw] sm:min-w-[320px] max-w-sm w-full md:w-auto bg-[#0F172A] rounded-3xl p-8 shadow-xl shadow-primary/20 border border-slate-700 snap-center shrink-0 flex flex-col relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary rounded-full blur-2xl opacity-50"></div>
                                                {pkg.highlightBadge && (
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-blue-400 text-xs font-bold uppercase tracking-wider w-max mb-4">
                                                        <Star size={12} className="fill-current" /> {localizedBadge}
                                                    </div>
                                                )}
                                                <h3 className="text-2xl font-bold text-white">{pkg.displayName || pkg.name}</h3>
                                                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-white">
                                                    {translations[currentLang].pricingCurrency}{pkg.price} <span className="ml-1 text-xl font-medium text-slate-400">/{pkg.billingCycle === 'MONTHLY' ? translations[currentLang].pricingCycleMo : translations[currentLang].pricingCycleYr}</span>
                                                </div>
                                                <p className="mt-4 text-sm text-slate-300">{pkg.description}</p>
                                                <ul className="mt-8 space-y-4 flex-1">
                                                    {featuresList.map((feature, idx) => (
                                                        <li key={idx} className="flex items-center gap-3">
                                                            <CheckCircle className="text-primary w-5 h-5 shrink-0" />
                                                            <span className="text-slate-200 text-sm font-medium">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Link to={`/signup?packageId=${pkg.id}`} className="mt-8 block w-full py-3 px-4 bg-primary text-white font-bold text-center rounded-xl hover:brightness-110 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
                                                    {translations[currentLang].pricingStart}
                                                </Link>
                                            </motion.div>
                                        );
                                    } else {
                                        return (
                                            <motion.div 
                                                key={pkg.id}
                                                variants={fadeInUp}
                                                className="min-w-[85vw] sm:min-w-[320px] max-w-sm w-full md:w-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200 snap-center shrink-0 flex flex-col"
                                            >
                                                <h3 className="text-2xl font-bold text-slate-900">{pkg.displayName || pkg.name}</h3>
                                                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-slate-900">
                                                    {translations[currentLang].pricingCurrency}{pkg.price} <span className="ml-1 text-xl font-medium text-slate-500">/{pkg.billingCycle === 'MONTHLY' ? translations[currentLang].pricingCycleMo : translations[currentLang].pricingCycleYr}</span>
                                                </div>
                                                <p className="mt-4 text-sm text-slate-500">{pkg.description}</p>
                                                <ul className="mt-8 space-y-4 flex-1">
                                                    {featuresList.map((feature, idx) => (
                                                        <li key={idx} className="flex items-center gap-3">
                                                            <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                                                            <span className="text-slate-600 text-sm font-medium">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <Link to={`/signup?packageId=${pkg.id}`} className="mt-8 block w-full py-3 px-4 bg-slate-50 text-slate-900 font-bold text-center rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                                                    {translations[currentLang].pricingStart}
                                                </Link>
                                            </motion.div>
                                        );
                                    }
                                })
                            ) : (
                                <>
                                    {/* Standard Plan Card */}
                                    <motion.div 
                                        variants={fadeInUp}
                                        className="min-w-[85vw] sm:min-w-[320px] max-w-sm w-full md:w-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200 snap-center shrink-0 flex flex-col"
                                    >
                                        <h3 className="text-2xl font-bold text-slate-900">
                                            {translations[currentLang].standardName}
                                        </h3>
                                        <div className="mt-4 flex items-baseline text-4xl font-extrabold text-slate-900">
                                            {translations[currentLang].pricingCurrency}{currentLang === 'bn' ? '২৯৯' : '299'} <span className="ml-1 text-xl font-medium text-slate-500">/{translations[currentLang].pricingCycleMo}</span>
                                        </div>
                                        <p className="mt-4 text-sm text-slate-500">
                                            {translations[currentLang].standardDesc}
                                        </p>
                                        <ul className="mt-8 space-y-4 flex-1">
                                            {[
                                                translations[currentLang].standardFeat1,
                                                translations[currentLang].standardFeat2,
                                                translations[currentLang].standardFeat3,
                                                translations[currentLang].standardFeat4
                                            ].map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-3">
                                                    <CheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
                                                    <span className="text-slate-600 text-sm font-medium">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link to="/signup" className="mt-8 block w-full py-3 px-4 bg-slate-50 text-slate-900 font-bold text-center rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
                                            {translations[currentLang].pricingStart}
                                        </Link>
                                    </motion.div>

                                    {/* Enterprise Plan Card */}
                                    <motion.div 
                                        variants={fadeInUp}
                                        className="min-w-[85vw] sm:min-w-[320px] max-w-sm w-full md:w-auto bg-[#0F172A] rounded-3xl p-8 shadow-xl shadow-primary/20 border border-slate-700 snap-center shrink-0 flex flex-col relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary rounded-full blur-2xl opacity-50"></div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-blue-400 text-xs font-bold uppercase tracking-wider w-max mb-4">
                                            <Star size={12} className="fill-current" /> {translations[currentLang].popularBadge}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">
                                            {translations[currentLang].enterpriseName}
                                        </h3>
                                        <div className="mt-4 flex items-baseline text-4xl font-extrabold text-white">
                                            {translations[currentLang].pricingCurrency}{currentLang === 'bn' ? '৯৯৯' : '999'} <span className="ml-1 text-xl font-medium text-slate-400">/{translations[currentLang].pricingCycleMo}</span>
                                        </div>
                                        <p className="mt-4 text-sm text-slate-300">
                                            {translations[currentLang].enterpriseDesc}
                                        </p>
                                        <ul className="mt-8 space-y-4 flex-1">
                                            {[
                                                translations[currentLang].enterpriseFeat1,
                                                translations[currentLang].enterpriseFeat2,
                                                translations[currentLang].enterpriseFeat3,
                                                translations[currentLang].enterpriseFeat4,
                                                translations[currentLang].enterpriseFeat5
                                            ].map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-3">
                                                    <CheckCircle className="text-primary w-5 h-5 shrink-0" />
                                                    <span className="text-slate-200 text-sm font-medium">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link to="/signup" className="mt-8 block w-full py-3 px-4 bg-primary text-white font-bold text-center rounded-xl hover:brightness-110 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
                                            {translations[currentLang].enterpriseBtn}
                                        </Link>
                                    </motion.div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Dynamic CTA Section */}
            {cta && (
                <section className="py-24 relative overflow-hidden bg-white">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="max-w-4xl mx-auto px-4 text-center relative z-10"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                            {getContent(cta, 'TITLE', 'ctaTitle')}
                        </h2>
                        <Link
                            to="/signup"
                            className="inline-block px-10 py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-primary/30 hover:scale-105"
                        >
                            {getContent(cta, 'BTN_TEXT', 'ctaBtn')}
                        </Link>
                    </motion.div>
                </section>
            )}

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-100 pb-8 mb-8">
                        <div className="flex items-center gap-3">
                            {branding?.logo_url ? (
                                <img src={branding.logo_url} alt="Logo" className="h-8 w-auto object-contain select-none" />
                            ) : (
                                <>
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white">
                                        <Layout strokeWidth={2.5} size={18} />
                                    </div>
                                    <span className="font-bold text-slate-800 text-sm">QuestionShaper</span>
                                </>
                            )}
                        </div>
                        <div className="flex gap-6 text-sm font-semibold text-slate-500">
                            <Link to="/terms" className="hover:text-primary transition-colors">
                                {currentLang === 'bn' ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service'}
                            </Link>
                            <Link to="/privacy" className="hover:text-primary transition-colors">
                                {currentLang === 'bn' ? 'গোপনীয়তা নীতিমালা' : 'Privacy Policy'}
                            </Link>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-400 text-sm">
                            {branding?.footer_text || `© ${new Date().getFullYear()} QuestionShaper Inc. All rights reserved.`}
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="p-8 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
    >
        <div className={`w-14 h-14 ${color} rounded-xl flex items-center justify-center mb-6`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed">{desc}</p>
    </motion.div>
);

export default LandingPage;
