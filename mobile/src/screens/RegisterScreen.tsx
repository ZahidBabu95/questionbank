import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Image,
  useWindowDimensions,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Feather, AntDesign } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { getRegistrationRoles, Role } from '../api/authService';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from '../utils/legalContent';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { logoUrl } = useBranding();
  const { register, login } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState('TEACHER');
  const [rolesLoading, setRolesLoading] = useState(true);
  
  // Validation and error states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [globalError, setGlobalError] = useState('');

  // Auto-dismiss global error banner after 4 seconds
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => {
        setGlobalError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await getRegistrationRoles();
        if (res.success && res.data.length > 0) {
          setRoles(res.data);
          setSelectedRole(res.data[0].name);
        }
      } catch (err) {
        console.log('Error fetching registration roles:', err);
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, []);

  // Legal Modal states
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy'>('terms');

  const openLegalModal = (type: 'terms' | 'privacy') => {
    setLegalModalType(type);
    setLegalModalVisible(true);
    if (termsError) setTermsError('');
  };
  
  // Track focused fields for premium outline animation
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleFocusField = (fieldName: string) => {
    setFocusedField(fieldName);
    if (['password', 'confirmPassword'].includes(fieldName)) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Password validation rules checker helper
  const getPasswordRules = (pass: string) => {
    return {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };
  };

  const passwordRules = getPasswordRules(password);
  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  // Validate form details to match web validation rules
  const validateForm = () => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setTermsError('');
    setGlobalError('');

    if (!name.trim()) {
      setNameError(i18n.language === 'bn' ? 'অনুগ্রহ করে আপনার পুরো নাম লিখুন।' : 'Please enter your full name.');
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError(i18n.language === 'bn' ? 'অনুগ্রহ করে ইমেইল অ্যাড্রেসটি দিন।' : 'Email address is required.');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setEmailError(i18n.language === 'bn' ? 'সঠিক ইমেইল অ্যাড্রেস প্রদান করুন।' : 'Please enter a valid email address.');
        isValid = false;
      }
    }

    if (phone.trim()) {
      const phoneRegex = /^(\+8801|8801|01)[3-9]\d{8}$/;
      if (!phoneRegex.test(phone.trim())) {
        setPhoneError(i18n.language === 'bn' ? 'সঠিক বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx)।' : 'Please enter a valid Bangladeshi phone number.');
        isValid = false;
      }
    }

    if (!password) {
      setPasswordError(i18n.language === 'bn' ? 'পাসওয়ার্ড প্রদান করা আবশ্যক।' : 'Password is required.');
      isValid = false;
    } else if (!isPasswordValid) {
      setPasswordError(i18n.language === 'bn' ? 'পাসওয়ার্ডটি নিরাপত্তা শর্তাবলী পূরণ করেনি।' : 'Password does not meet requirements.');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError(i18n.language === 'bn' ? 'পাসওয়ার্ডটি পুনরায় টাইপ করুন।' : 'Please confirm your password.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError(i18n.language === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি।' : 'Passwords do not match.');
      isValid = false;
    }

    if (!termsAccepted) {
      setTermsError(i18n.language === 'bn' ? 'আপনাকে ব্যবহারের শর্তাবলী ও গোপনীয়তা নীতিতে সম্মত হতে হবে।' : 'You must agree to the Terms of Service and Privacy Policy.');
      isValid = false;
    }

    return isValid;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        roles: [selectedRole],
      };

      await register(payload);
      
      // Auto-login after registration (parity with Web app)
      await login(payload.email, password);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed.';
      // Localized backend errors
      let localMsg = errorMsg;
      if (errorMsg.toLowerCase().includes('already exists') || errorMsg.toLowerCase().includes('duplicate email')) {
        localMsg = i18n.language === 'bn'
          ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহার করা হয়েছে। দয়া করে অন্য ইমেইল ব্যবহার করুন।'
          : 'This email is already registered. Please use a different email.';
      } else if (errorMsg.toLowerCase().includes('network error') || errorMsg.toLowerCase().includes('timeout')) {
        localMsg = i18n.language === 'bn'
          ? 'সার্ভারের সাথে সংযোগ ব্যাহত হয়েছে। আপনার ইন্টারনেট কানেকশন চেক করুন।'
          : 'Network error. Please check your internet connection.';
      }
      setGlobalError(localMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    Alert.alert('Google Signup', 'Google Signup is under development.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Decorative Glow Blobs */}
      <View style={styles.glowBlob1} pointerEvents="none" />
      <View style={styles.glowBlob2} pointerEvents="none" />

      <KeyboardAvoidingView 
        enabled={true}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={[styles.scrollContent, isTablet && styles.tabletScroll]} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Main Card Wrapper for Tablets, transparent for Mobile */}
          <View style={[styles.cardWrapper, isTablet && styles.tabletCard]}>
            
            {/* Back Button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={20} color={theme.colors.text} />
              <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>

            {/* Logo Area */}
            <View style={styles.logoContainer}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoIcon}>
                  <Text style={styles.logoText}>Q</Text>
                </View>
              )}
            </View>

            {/* Title Area */}
            <View style={styles.titleArea}>
              <Text style={styles.title}>{t('auth.registerTitle')}</Text>
              <Text style={styles.subtitle}>Join us to streamline your academic workflow.</Text>
            </View>

            {/* Google Signup Button */}
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignup}>
              <AntDesign name="google" size={18} color="#EA4335" style={styles.googleIcon} />
              <Text style={styles.googleBtnText}>Sign up with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Form Area */}
            <View style={styles.formArea}>
              
              {/* Global Error Banner */}
              {!!globalError && (
                <View style={styles.globalErrorCard}>
                  <Feather name="alert-circle" size={18} color={theme.colors.danger} />
                  <Text style={styles.globalErrorText}>{globalError}</Text>
                  <TouchableOpacity onPress={() => setGlobalError('')} style={styles.globalErrorClose}>
                    <Feather name="x" size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedField === 'name' && styles.inputWrapperFocused,
                  !!nameError && styles.inputWrapperError
                ]}>
                  <Feather 
                    name="user" 
                    size={18} 
                    color={nameError ? theme.colors.danger : (focusedField === 'name' ? theme.colors.primary : theme.colors.textMuted)} 
                    style={styles.inputIcon} 
                  />
                  <TextInput 
                    style={styles.input} 
                    placeholder="John Doe"
                    placeholderTextColor={theme.colors.textMuted}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (nameError) setNameError('');
                    }}
                    autoCorrect={false}
                    onFocus={() => handleFocusField('name')}
                    onBlur={() => setFocusedField(null)}
                    textContentType="name"
                    autoComplete="name"
                  />
                </View>
                {/* Inline Error */}
                {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedField === 'email' && styles.inputWrapperFocused,
                  !!emailError && styles.inputWrapperError
                ]}>
                  <Feather 
                    name="mail" 
                    size={18} 
                    color={emailError ? theme.colors.danger : (focusedField === 'email' ? theme.colors.primary : theme.colors.textMuted)} 
                    style={styles.inputIcon} 
                  />
                  <TextInput 
                    style={styles.input} 
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.textMuted}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (emailError) setEmailError('');
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    onFocus={() => handleFocusField('email')}
                    onBlur={() => {
                      setFocusedField(null);
                      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                        setEmailError(i18n.language === 'bn' ? 'সঠিক ইমেইল অ্যাড্রেস প্রদান করুন।' : 'Please enter a valid email address.');
                      }
                    }}
                    textContentType="emailAddress"
                    autoComplete="email"
                  />
                </View>
                {/* Inline Error */}
                {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedField === 'phone' && styles.inputWrapperFocused,
                  !!phoneError && styles.inputWrapperError
                ]}>
                  <Feather 
                    name="smartphone" 
                    size={18} 
                    color={phoneError ? theme.colors.danger : (focusedField === 'phone' ? theme.colors.primary : theme.colors.textMuted)} 
                    style={styles.inputIcon} 
                  />
                  <TextInput 
                    style={styles.input} 
                    placeholder="+880 1XXX XXXXXX"
                    placeholderTextColor={theme.colors.textMuted}
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val);
                      if (phoneError) setPhoneError('');
                    }}
                    keyboardType="phone-pad"
                    onFocus={() => handleFocusField('phone')}
                    onBlur={() => {
                      setFocusedField(null);
                      if (phone.trim() && !/^(\+8801|8801|01)[3-9]\d{8}$/.test(phone.trim())) {
                        setPhoneError(i18n.language === 'bn' ? 'সঠিক বাংলাদেশী মোবাইল নম্বর দিন।' : 'Please enter a valid Bangladeshi phone number.');
                      }
                    }}
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                  />
                </View>
                {/* Inline Error */}
                {!!phoneError && <Text style={styles.errorText}>{phoneError}</Text>}
              </View>

              {/* Dynamic Registration Roles Selection */}
              {!rolesLoading && roles.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{i18n.language === 'bn' ? 'আমি নিবন্ধন করছি একজন' : 'I am registering as a'} *</Text>
                  <View style={styles.rolesGrid}>
                    {roles.map((role) => {
                      const isSelected = selectedRole === role.name;
                      return (
                        <TouchableOpacity
                          key={role.name}
                          activeOpacity={0.8}
                          onPress={() => setSelectedRole(role.name)}
                          style={[
                            styles.roleCard,
                            isSelected && styles.roleCardActive
                          ]}
                        >
                          <View style={styles.roleCardHeader}>
                            <Text style={[
                              styles.roleCardName,
                              isSelected && styles.roleCardNameActive
                            ]}>
                              {role.name}
                            </Text>
                            {isSelected && (
                              <View style={styles.roleCheckCircle}>
                                <AntDesign name="check" size={10} color="#FFF" />
                              </View>
                            )}
                          </View>
                          <Text style={[
                            styles.roleCardDesc,
                            isSelected && styles.roleCardDescActive
                          ]}>
                            {role.description || (role.name === 'TEACHER' ? 'Create exams & question banks' : 'Access papers & study materials')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Password & Confirm Grid for tablet, row for mobile */}
              <View style={isTablet ? styles.passwordRowTablet : styles.passwordCol}>
                
                {/* Password Input */}
                <View style={[styles.inputGroup, isTablet && { flex: 1 }]}>
                  <Text style={styles.label}>Password *</Text>
                  <View style={[
                    styles.inputWrapper, 
                    focusedField === 'password' && styles.inputWrapperFocused,
                    !!passwordError && styles.inputWrapperError
                  ]}>
                    <Feather 
                      name="lock" 
                      size={18} 
                      color={passwordError ? theme.colors.danger : (focusedField === 'password' ? theme.colors.primary : theme.colors.textMuted)} 
                      style={styles.inputIcon} 
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry={secureText}
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        if (passwordError) setPasswordError('');
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => handleFocusField('password')}
                      onBlur={() => setFocusedField(null)}
                      textContentType="newPassword"
                      autoComplete="password-new"
                    />
                    <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                      <Feather name={secureText ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {/* Inline Error */}
                  {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                </View>

                {/* Confirm Password Input */}
                <View style={[styles.inputGroup, isTablet && { flex: 1 }]}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <View style={[
                    styles.inputWrapper, 
                    focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                    !!confirmPasswordError && styles.inputWrapperError
                  ]}>
                    <Feather 
                      name="lock" 
                      size={18} 
                      color={confirmPasswordError ? theme.colors.danger : (focusedField === 'confirmPassword' ? theme.colors.primary : theme.colors.textMuted)} 
                      style={styles.inputIcon} 
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry={secureConfirmText}
                      value={confirmPassword}
                      onChangeText={(val) => {
                        setConfirmPassword(val);
                        if (confirmPasswordError) setConfirmPasswordError('');
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => handleFocusField('confirmPassword')}
                      onBlur={() => {
                        setFocusedField(null);
                        if (confirmPassword && password !== confirmPassword) {
                          setConfirmPasswordError(i18n.language === 'bn' ? 'পাসওয়ার্ড দুটি মেলেনি।' : 'Passwords do not match.');
                        }
                      }}
                      textContentType="newPassword"
                      autoComplete="password-new"
                    />
                    <TouchableOpacity onPress={() => setSecureConfirmText(!secureConfirmText)}>
                      <Feather name={secureConfirmText ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {/* Inline Error */}
                  {!!confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
                </View>

              </View>

              {/* Password Requirements Guidance */}
              {password.length > 0 && (
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsHeader}>
                    {t('auth.passwordRequirements')}
                  </Text>
                  
                  <View style={styles.requirementsGrid}>
                    <View style={styles.requirementItem}>
                      <Feather 
                        name={passwordRules.length ? "check-circle" : "circle"} 
                        size={14} 
                        color={passwordRules.length ? theme.colors.success : theme.colors.textMuted} 
                      />
                      <Text style={[
                        styles.requirementText, 
                        passwordRules.length && styles.requirementTextValid
                      ]}>
                        {t('auth.reqMinLength')}
                      </Text>
                    </View>

                    <View style={styles.requirementItem}>
                      <Feather 
                        name={passwordRules.uppercase ? "check-circle" : "circle"} 
                        size={14} 
                        color={passwordRules.uppercase ? theme.colors.success : theme.colors.textMuted} 
                      />
                      <Text style={[
                        styles.requirementText, 
                        passwordRules.uppercase && styles.requirementTextValid
                      ]}>
                        {t('auth.reqUppercase')}
                      </Text>
                    </View>

                    <View style={styles.requirementItem}>
                      <Feather 
                        name={passwordRules.lowercase ? "check-circle" : "circle"} 
                        size={14} 
                        color={passwordRules.lowercase ? theme.colors.success : theme.colors.textMuted} 
                      />
                      <Text style={[
                        styles.requirementText, 
                        passwordRules.lowercase && styles.requirementTextValid
                      ]}>
                        {t('auth.reqLowercase')}
                      </Text>
                    </View>

                    <View style={styles.requirementItem}>
                      <Feather 
                        name={passwordRules.number ? "check-circle" : "circle"} 
                        size={14} 
                        color={passwordRules.number ? theme.colors.success : theme.colors.textMuted} 
                      />
                      <Text style={[
                        styles.requirementText, 
                        passwordRules.number && styles.requirementTextValid
                      ]}>
                        {t('auth.reqNumber')}
                      </Text>
                    </View>

                    <View style={styles.requirementItem}>
                      <Feather 
                        name={passwordRules.special ? "check-circle" : "circle"} 
                        size={14} 
                        color={passwordRules.special ? theme.colors.success : theme.colors.textMuted} 
                      />
                      <Text style={[
                        styles.requirementText, 
                        passwordRules.special && styles.requirementTextValid
                      ]}>
                        {t('auth.reqSpecial')}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Terms Checkbox */}
              <View style={styles.checkboxContainer}>
                <TouchableOpacity 
                  style={[
                    styles.checkbox, 
                    termsAccepted && styles.checkboxChecked,
                    !!termsError && styles.checkboxError
                  ]}
                  onPress={() => {
                    setTermsAccepted(!termsAccepted);
                    if (termsError) setTermsError('');
                  }}
                  activeOpacity={0.8}
                >
                  {termsAccepted && <Feather name="check" size={12} color="#FFF" />}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>
                  {i18n.language === 'bn' ? 'আমি ' : 'I agree to the '}
                  <Text 
                    style={styles.linkText} 
                    onPress={() => openLegalModal('terms')}
                  >
                    {i18n.language === 'bn' ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service'}
                  </Text>
                  {i18n.language === 'bn' ? ' এবং ' : ' and '}
                  <Text 
                    style={styles.linkText} 
                    onPress={() => openLegalModal('privacy')}
                  >
                    {i18n.language === 'bn' ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
                  </Text>
                  {i18n.language === 'bn' ? '-তে সম্মত আছি।' : ''}
                </Text>
              </View>
              {/* Inline Terms Error */}
              {!!termsError && <Text style={[styles.errorText, { marginTop: -6 }]}>{termsError}</Text>}

              {/* Signup Button */}
              <TouchableOpacity 
                style={[styles.signupBtn, loading && styles.disabledBtn]} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <View style={styles.signupBtnInner}>
                    <Text style={styles.signupBtnText}>Create Account</Text>
                    <Feather name="arrow-right" size={18} color="#FFF" style={styles.arrowIcon} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Navigation link */}
              <TouchableOpacity 
                style={styles.switchAuth}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.switchAuthText}>
                  Already have an account? <Text style={styles.boldText}>Sign in</Text>
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
                {legalModalType === 'terms' 
                  ? (i18n.language === 'bn' ? TERMS_OF_SERVICE.bn.title : TERMS_OF_SERVICE.en.title)
                  : (i18n.language === 'bn' ? PRIVACY_POLICY.bn.title : PRIVACY_POLICY.en.title)
                }
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
            </ScrollView>

            {/* Footer Accept Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalAcceptBtn} 
                onPress={() => {
                  setTermsAccepted(true);
                  setLegalModalVisible(false);
                }}
              >
                <Text style={styles.modalAcceptBtnText}>
                  {i18n.language === 'bn' ? 'শর্তাবলীতে সম্মত এবং বন্ধ করুন' : 'Agree & Close'}
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
    backgroundColor: '#FFF',
  },
  glowBlob1: {
    position: 'absolute',
    top: -120,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.6,
  },
  glowBlob2: {
    position: 'absolute',
    bottom: -120,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: theme.colors.secondaryLight,
    opacity: 0.7,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabletScroll: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: 40,
  },
  tabletCard: {
    flex: 0,
    width: 480,
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xxl,
    ...theme.shadows.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    zIndex: 10,
  },
  backText: {
    marginLeft: 6,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  titleArea: {
    marginTop: 12,
    marginBottom: 24,
  },
  logoContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
  },
  logoImage: {
    width: 180,
    height: 50,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  logoIcon: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  logoText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
  },
  requirementsContainer: {
    backgroundColor: theme.colors.secondaryLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
  },
  requirementsHeader: {
    fontSize: theme.typography.sizes.base - 1,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  requirementsGrid: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
    marginLeft: 4,
  },
  requirementTextValid: {
    color: theme.colors.success,
  },
  title: {
    fontSize: theme.typography.sizes.xxl + 2,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
  },
  googleBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginBottom: 20,
    ...theme.shadows.sm,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.secondaryLight,
  },
  dividerText: {
    fontSize: theme.typography.sizes.xs + 1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: theme.spacing.md,
  },
  formArea: {
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: theme.typography.sizes.base - 1,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    marginLeft: 2,
  },
  inputWrapper: {
    height: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.secondaryLight,
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: theme.colors.text,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
  },
  passwordCol: {
    gap: 18,
  },
  passwordRowTablet: {
    flexDirection: 'row',
    gap: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFF',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: theme.typography.sizes.base - 1,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  signupBtn: {
    height: 54,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...theme.shadows.md,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  signupBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.lg - 1,
    fontWeight: theme.typography.weights.bold,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  switchAuth: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchAuthText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
  },
  boldText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
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
  inputWrapperError: {
    borderColor: theme.colors.danger,
    borderWidth: 1.5,
    backgroundColor: '#FFF8F8',
  },
  errorText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.danger,
    fontWeight: theme.typography.weights.medium,
    marginTop: 4,
    marginLeft: 4,
  },
  checkboxError: {
    borderColor: theme.colors.danger,
    backgroundColor: '#FFF8F8',
    borderWidth: 1.5,
  },
  globalErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    position: 'relative',
    gap: 12,
    ...theme.shadows.sm,
  },
  globalErrorText: {
    flex: 1,
    fontSize: theme.typography.sizes.base - 1,
    color: theme.colors.danger,
    fontWeight: theme.typography.weights.semibold,
    lineHeight: 18,
  },
  globalErrorClose: {
    padding: 4,
  },
  rolesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  roleCard: {
    flex: 1,
    height: 96,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    ...theme.shadows.sm,
  },
  roleCardActive: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
    backgroundColor: 'rgba(59, 130, 246, 0.04)',
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleCardName: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textMuted,
  },
  roleCardNameActive: {
    color: theme.colors.primary,
  },
  roleCheckCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCardDesc: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    lineHeight: 13,
  },
  roleCardDescActive: {
    color: theme.colors.primary,
  },
});
