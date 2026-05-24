import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  useWindowDimensions,
  Platform,
  UIManager,
  LayoutAnimation
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';

interface Package {
  id: string;
  name: string;
  price: string;
  billingCycle: string;
  maxTeachers: number;
  maxStudents: number;
  status: string;
  pricingRules?: string | any;
}

interface ClassSubject {
  id: string;
  _classId: string;
  _subjectId: string;
}

interface ClassItem {
  id: string;
  name: string;
  _streamName: string;
}

interface SubjectItem {
  id: string;
  name: string;
  paper?: string;
}

interface Hierarchy {
  classes: ClassItem[];
  classSubjects: ClassSubject[];
  subjects: SubjectItem[];
}

export const WorkspaceStatusScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 600;

  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [hierarchy, setHierarchy] = useState<Hierarchy | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectVersions, setSubjectVersions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(true);

  const status = user?.instituteStatus || 'INACTIVE';

  useEffect(() => {
    if (status === 'INACTIVE') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      setApiLoading(true);
      const [pkgRes, hierRes] = await Promise.all([
        apiClient.get('/billing/packages'),
        apiClient.get('/academic/hierarchy')
      ]);

      const availablePackages = (pkgRes.data || []).filter((p: Package) => p.status === 'ACTIVE');
      setPackages(availablePackages);
      if (availablePackages.length > 0) {
        setSelectedPackageId(availablePackages[0].id);
      }

      setHierarchy(hierRes.data);
    } catch (error) {
      console.error('Failed to fetch packages/hierarchy data:', error);
      Alert.alert(t('common.error'), 'Failed to load workspace data.');
    } finally {
      setApiLoading(false);
    }
  };

  const handleNext = () => {
    if (!selectedPackageId) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(2);
  };

  const toggleSubject = (classSubjectId: string, allowedVersions: string[] = []) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSubjects(prev => {
      if (prev.includes(classSubjectId)) {
        return prev.filter(id => id !== classSubjectId);
      } else {
        setSubjectVersions(c => ({
          ...c,
          [classSubjectId]: allowedVersions.length > 0 ? [allowedVersions[0]] : ['Bangla']
        }));
        return [...prev, classSubjectId];
      }
    });
  };

  const toggleVersion = (classSubjectId: string, version: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubjectVersions(prev => {
      const conf = prev[classSubjectId] || [];
      const newVersions = conf.includes(version)
        ? conf.filter(v => v !== version)
        : [...conf, version];
      return { ...prev, [classSubjectId]: newVersions };
    });
  };

  const handleSubmit = async () => {
    if (!selectedPackageId) return;
    setLoading(true);
    try {
      await apiClient.post('/institutes/request', {
        packageId: selectedPackageId,
        subjectIds: selectedSubjects,
        subjectVersions: subjectVersions,
        medium: Object.values(subjectVersions).flat().join(',') || 'Bangla'
      });

      // Update local context user status to PENDING
      if (user) {
        const updatedUser = { ...user, instituteStatus: 'PENDING' };
        await updateUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to request workspace:', error);
      Alert.alert(t('common.error'), 'Failed to submit workspace request.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render Restricted / Pending / Suspended State Views ───
  if (status !== 'INACTIVE') {
    const isSuspended = status === 'SUSPENDED';

    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.card, isTablet && styles.tabletCard, { alignSelf: 'center', marginTop: 60 }]}>
          <View style={styles.restrictedHeader}>
            <View style={[
              styles.iconWrapper, 
              isSuspended ? styles.dangerIconWrapper : styles.warningIconWrapper
            ]}>
              <Feather 
                name={isSuspended ? "lock" : "clock"} 
                size={40} 
                color={isSuspended ? theme.colors.danger : theme.colors.warning} 
              />
            </View>
            <Text style={styles.restrictedTitle}>
              {isSuspended ? 'Account Suspended' : 'Pending Approval'}
            </Text>
            <Text style={styles.restrictedSubtitle}>
              {isSuspended ? 'Your workspace access has been revoked.' : 'Your workspace is awaiting admin approval.'}
            </Text>
          </View>

          <View style={styles.restrictedBody}>
            <Text style={styles.restrictedDescription}>
              {isSuspended 
                ? 'Your workspace access has been suspended. Please contact system support for further information.'
                : 'Your package request has been submitted successfully. You will be able to access the dashboard once an administrator approves your workspace.'}
            </Text>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Feather name="log-out" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading State ───
  if (apiLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  const selectedPackageObj = packages.find(p => p.id === selectedPackageId);
  let extraPrice = 0;
  
  if (selectedPackageObj && hierarchy) {
    let parsedRules = selectedPackageObj.pricingRules;
    if (typeof parsedRules === 'string') {
      try { parsedRules = JSON.parse(parsedRules); } catch(e) { parsedRules = {}; }
    }
    const pricingRules = parsedRules?.subjects || [];

    selectedSubjects.forEach(id => {
      const rule = pricingRules.find((pr: any) => pr.classSubjectId === id);
      if (rule) {
        const count = subjectVersions[id]?.length || 0;
        extraPrice += (parseFloat(rule.price) || 0) * count;
      }
    });
  }

  const basePrice = parseFloat(selectedPackageObj?.price || '0');
  const totalPrice = basePrice + extraPrice;
  const isStep2Valid = selectedSubjects.length > 0 && selectedSubjects.every(id => (subjectVersions[id] || []).length > 0);

  const containerStyle = [
    styles.container,
    isTablet && styles.tabletContainer
  ];

  return (
    <SafeAreaView style={containerStyle}>
      <View style={[
        styles.card,
        isTablet ? styles.tabletCard : styles.mobileFullCard
      ]}>
        
        <View style={styles.headerArea}>
          <MaterialCommunityIcons name="office-building-cog" size={38} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>
            {step === 1 ? 'Select Subscription' : 'Select Subjects'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === 1 ? 'Choose a package to activate your workspace.' : 'Choose the subjects to manage.'}
          </Text>
        </View>

        <View style={styles.flex1}>
          {step === 1 ? (
            // ─── Step 1: Package Selection ───
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
              <View style={styles.packagesList}>
                {packages.map(pkg => {
                  const isSelected = selectedPackageId === pkg.id;
                  return (
                    <TouchableOpacity
                      key={pkg.id}
                      style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
                      onPress={() => setSelectedPackageId(pkg.id)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.pkgHeader}>
                        <Text style={[styles.pkgName, isSelected && styles.pkgTextSelected]}>
                          {pkg.name}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                        )}
                      </View>
                      
                      <Text style={styles.pkgPrice}>৳{pkg.price}</Text>
                      <Text style={styles.pkgCycle}>{pkg.billingCycle}</Text>

                      <View style={styles.pkgDivider} />

                      <View style={styles.pkgFeatures}>
                        <View style={styles.featureRow}>
                          <View style={styles.bullet} />
                          <Text style={styles.featureText}>Max Teachers: {pkg.maxTeachers}</Text>
                        </View>
                        <View style={styles.featureRow}>
                          <View style={styles.bullet} />
                          <Text style={styles.featureText}>Max Students: {pkg.maxStudents}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            // ─── Step 2: Subject & Version Selection ───
            <>
              {hierarchy ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
                  {(() => {
                    let parsedRules = selectedPackageObj?.pricingRules;
                    if (typeof parsedRules === 'string') {
                      try { parsedRules = JSON.parse(parsedRules); } catch(e) { parsedRules = {}; }
                    }
                    const pricingRules = parsedRules?.subjects || [];

                    return (
                      <View style={styles.subjectsContainer}>
                        {Array.from(new Set(hierarchy.classes?.map(c => c._streamName))).map(streamName => {
                          const streamClasses = hierarchy.classes.filter(c => c._streamName === streamName);
                          if (streamClasses.length === 0) return null;

                          const activeStreamClasses = streamClasses.filter(cls => {
                            const classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === cls.id) || [];
                            return classSubjects.some(cs => pricingRules.find((pr: any) => pr.classSubjectId === cs.id));
                          });

                          if (activeStreamClasses.length === 0) return null;

                          return (
                            <View key={streamName || 'General'} style={styles.streamGroup}>
                              <Text style={styles.streamTitle}>{streamName || 'General Stream'}</Text>

                              {activeStreamClasses.map(cls => {
                                let classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === cls.id) || [];
                                classSubjects = classSubjects.filter(cs => pricingRules.find((pr: any) => pr.classSubjectId === cs.id));
                                if (classSubjects.length === 0) return null;

                                return (
                                  <View key={cls.id} style={styles.classBlock}>
                                    <Text style={styles.classTitle}>{cls.name}</Text>

                                    {classSubjects.map(cs => {
                                      const subject = hierarchy.subjects?.find(s => s.id === cs._subjectId);
                                      const rule = pricingRules.find((pr: any) => pr.classSubjectId === cs.id);
                                      if (!subject || !rule) return null;

                                      const isSelected = selectedSubjects.includes(cs.id);
                                      const allowedVersions = rule.versions || ['Bangla', 'English', 'Bilingual'];
                                      const pricePerVersion = parseFloat(rule.price) || 0;
                                      const versions = subjectVersions[cs.id] || [];

                                      return (
                                        <View 
                                          key={cs.id} 
                                          style={[
                                            styles.subjectItemCard, 
                                            isSelected && styles.subjectItemCardSelected
                                          ]}
                                        >
                                          <TouchableOpacity
                                            style={styles.subjectCheckboxRow}
                                            onPress={() => toggleSubject(cs.id, allowedVersions)}
                                            activeOpacity={0.8}
                                          >
                                            <View style={styles.flexRow}>
                                              <View style={[
                                                styles.checkboxCircle, 
                                                isSelected && styles.checkboxCircleSelected
                                              ]}>
                                                {isSelected && <Feather name="check" size={12} color="#FFF" />}
                                              </View>
                                              <Text style={[styles.subjectName, isSelected && styles.subjectNameSelected]}>
                                                {subject.name} {subject.paper ? `(${subject.paper})` : ''}
                                              </Text>
                                            </View>
                                            {pricePerVersion > 0 && (
                                              <Text style={styles.priceBadge}>+৳{pricePerVersion}/v</Text>
                                            )}
                                          </TouchableOpacity>

                                          {isSelected && allowedVersions.length > 0 && (
                                            <View style={styles.versionsWrapper}>
                                              <Text style={styles.versionLabel}>Select Versions:</Text>
                                              <View style={styles.versionTogglesRow}>
                                                {allowedVersions.map((v: string) => {
                                                  const isVerSelected = versions.includes(v);
                                                  return (
                                                    <TouchableOpacity
                                                      key={v}
                                                      style={[
                                                        styles.versionTag,
                                                        isVerSelected && styles.versionTagSelected
                                                      ]}
                                                      onPress={() => toggleVersion(cs.id, v)}
                                                      activeOpacity={0.7}
                                                    >
                                                      <Text style={[
                                                        styles.versionTagText,
                                                        isVerSelected && styles.versionTagTextSelected
                                                      ]}>
                                                        {v}
                                                      </Text>
                                                    </TouchableOpacity>
                                                  );
                                                })}
                                              </View>
                                            </View>
                                          )}
                                        </View>
                                      );
                                    })}
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })()}
                </ScrollView>
              ) : (
                <View style={styles.center}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              )}
            </>
          )}
        </View>

        {/* Sticky/Fixed Footer Area */}
        <View style={styles.fixedFooter}>
          {step === 2 && (
            <View style={styles.priceBox}>
              <Text style={styles.priceBoxLabel}>Total Estimated Price</Text>
              <Text style={styles.priceBoxValue}>৳{totalPrice.toFixed(0)}</Text>
            </View>
          )}

          <View style={styles.footerRow}>
            {step === 1 ? (
              <>
                <TouchableOpacity style={styles.backLink} onPress={logout}>
                  <Feather name="log-out" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.backLinkText}>Logout</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.nextBtn, !selectedPackageId && styles.disabledBtn]} 
                  onPress={handleNext}
                  disabled={!selectedPackageId}
                >
                  <Text style={styles.nextBtnText}>Next Step</Text>
                  <Feather name="arrow-right" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.backBtnLight} onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setStep(1);
                }}>
                  <Text style={styles.backBtnLightText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.submitBtn, (!isStep2Valid || loading) && styles.disabledBtn]} 
                  onPress={handleSubmit}
                  disabled={!isStep2Valid || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Submit Request</Text>
                      <Feather name="send" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  tabletContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFF',
  },
  tabletCard: {
    width: 480,
    maxHeight: '90%',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  mobileFullCard: {
    flex: 1,
    padding: theme.spacing.lg,
    borderRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  flex1: {
    flex: 1,
  },
  scrollPadding: {
    paddingBottom: 16,
  },
  fixedFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.semibold,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl + 2,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.base - 1,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  stepContent: {
    width: '100%',
  },
  packagesList: {
    gap: 16,
    marginBottom: 24,
  },
  pkgCard: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    backgroundColor: '#FFF',
  },
  pkgCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  pkgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pkgName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  pkgTextSelected: {
    color: theme.colors.primary,
  },
  pkgPrice: {
    fontSize: 26,
    fontWeight: theme.typography.weights.black,
    color: theme.colors.text,
  },
  pkgCycle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  pkgDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  pkgFeatures: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginRight: 8,
  },
  featureText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    marginLeft: 6,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...theme.shadows.sm,
  },
  nextBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  streamGroup: {
    marginBottom: 20,
  },
  streamTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    backgroundColor: theme.colors.secondaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
    marginBottom: 10,
  },
  classBlock: {
    marginBottom: 16,
    paddingLeft: 6,
  },
  classTitle: {
    fontSize: theme.typography.sizes.base - 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  subjectItemCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  subjectItemCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  subjectCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxCircleSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  subjectName: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  subjectNameSelected: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  priceBadge: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
    backgroundColor: '#E0EBFF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
  },
  versionsWrapper: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D1E2FF',
    paddingTop: 8,
    paddingLeft: 28,
  },
  versionLabel: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  versionTogglesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  versionTag: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FFF',
  },
  versionTagSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  versionTagText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  versionTagTextSelected: {
    color: '#FFF',
    fontWeight: theme.typography.weights.bold,
  },
  subjectsContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: 8,
    backgroundColor: '#FAFBFD',
  },
  priceBox: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1.5,
    borderColor: '#D1E2FF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: 16,
  },
  priceBoxLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceBoxValue: {
    fontSize: 26,
    fontWeight: theme.typography.weights.black,
    color: theme.colors.primary,
    marginTop: 4,
  },
  backBtnLight: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backBtnLightText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    ...theme.shadows.sm,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
  },
  restrictedHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  dangerIconWrapper: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: '#FCA5A5',
  },
  warningIconWrapper: {
    backgroundColor: theme.colors.warningLight,
    borderColor: '#FDE047',
  },
  restrictedTitle: {
    fontSize: theme.typography.sizes.xl + 2,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  restrictedSubtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  restrictedBody: {
    alignItems: 'center',
  },
  restrictedDescription: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.text,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 28,
    ...theme.shadows.sm,
  },
  logoutBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
  },
});
