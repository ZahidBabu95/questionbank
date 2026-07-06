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
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Feather, AntDesign } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { logoUrl, systemName } = useBranding();
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width > 600;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Validation and error states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
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

  // Track focused fields for premium outline animation
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleFocusField = (fieldName: string) => {
    setFocusedField(fieldName);
    if (fieldName === 'password') {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Simple validation checks
  const validateForm = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setGlobalError('');

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

    if (!password) {
      setPasswordError(i18n.language === 'bn' ? 'পাসওয়ার্ড প্রদান করা আবশ্যক।' : 'Password is required.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError(i18n.language === 'bn' ? 'পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await login(email.trim(), password);
      // AuthContext state update automatically changes App.tsx route to AuthenticatedStack!
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Login failed.';
      // Localized error message mapping
      let localMsg = errorMsg;
      if (errorMsg.toLowerCase().includes('bad credentials') || errorMsg.toLowerCase().includes('invalid email or password')) {
        localMsg = i18n.language === 'bn' 
          ? 'ভুল ইমেইল বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।' 
          : 'Invalid email or password. Please try again.';
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

  const handleGoogleLogin = () => {
    Alert.alert('Google Login', 'Google Login is under development.');
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
              <Text style={styles.title}>{t('auth.loginTitle')}</Text>
              <Text style={styles.subtitle}>Sign in to your account to continue.</Text>
            </View>

            {/* Google Login Button */}
            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
              <AntDesign name="google" size={18} color="#EA4335" style={styles.googleIcon} />
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with email</Text>
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

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
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

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <Text style={styles.label}>Password</Text>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.forgotBtnText}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
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
                    textContentType="password"
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                    <Feather name={secureText ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                {/* Inline Error */}
                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={[styles.loginBtn, loading && styles.disabledBtn]} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <View style={styles.loginBtnInner}>
                    <Text style={styles.loginBtnText}>Sign In</Text>
                    <Feather name="arrow-right" size={18} color="#FFF" style={styles.arrowIcon} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Navigation link to register */}
              <TouchableOpacity 
                style={styles.switchAuth}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.switchAuthText}>
                  Don't have an account? <Text style={styles.boldText}>Create free account</Text>
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: theme.colors.primaryLight,
    opacity: 0.6,
  },
  glowBlob2: {
    position: 'absolute',
    bottom: -120,
    left: -100,
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
    marginBottom: 32,
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
    gap: 20,
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
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgotBtnText: {
    fontSize: theme.typography.sizes.base - 1,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
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
  loginBtn: {
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
  loginBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
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
});
