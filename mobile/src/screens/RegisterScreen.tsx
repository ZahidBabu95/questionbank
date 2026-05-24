import React, { useState } from 'react';
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

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
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
  
  // Track focused fields for premium outline animation
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert(t('common.error'), 'Please fill in all required fields (Name, Email, Password).');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('common.error'), 'Please enter a valid email address.');
      return false;
    }
    if (!isPasswordValid) {
      Alert.alert(t('common.error'), t('auth.passwordRequirementsNotMet') || 'Password does not meet all security requirements.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordsDoNotMatch') || 'Passwords do not match.');
      return false;
    }
    if (!termsAccepted) {
      Alert.alert(t('common.error'), t('auth.termsRequired') || 'You must agree to the Terms of Service and Privacy Policy.');
      return false;
    }
    return true;
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
        roles: ['TEACHER'], // Default role matching web signup behavior
      };

      await register(payload);
      
      // Auto-login after registration (parity with Web app)
      await login(payload.email, password);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Registration failed.';
      Alert.alert(t('common.error'), errorMsg);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView 
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
              
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedField === 'name' && styles.inputWrapperFocused
                ]}>
                  <Feather 
                    name="user" 
                    size={18} 
                    color={focusedField === 'name' ? theme.colors.primary : theme.colors.textMuted} 
                    style={styles.inputIcon} 
                  />
                  <TextInput 
                    style={styles.input} 
                    placeholder="John Doe"
                    placeholderTextColor={theme.colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCorrect={false}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedField === 'email' && styles.inputWrapperFocused
                ]}>
                  <Feather 
                    name="mail" 
                    size={18} 
                    color={focusedField === 'email' ? theme.colors.primary : theme.colors.textMuted} 
                    style={styles.inputIcon} 
                  />
                  <TextInput 
                    style={styles.input} 
                    placeholder="you@example.com"
                    placeholderTextColor={theme.colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={[
                  styles.inputWrapper, 
                  focusedField === 'phone' && styles.inputWrapperFocused
                ]}>
                  <Feather 
                    name="smartphone" 
                    size={18} 
                    color={focusedField === 'phone' ? theme.colors.primary : theme.colors.textMuted} 
                    style={styles.inputIcon} 
                  />
                  <TextInput 
                    style={styles.input} 
                    placeholder="+880 1XXX XXXXXX"
                    placeholderTextColor={theme.colors.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Password & Confirm Grid for tablet, row for mobile */}
              <View style={isTablet ? styles.passwordRowTablet : styles.passwordCol}>
                
                {/* Password Input */}
                <View style={[styles.inputGroup, isTablet && { flex: 1 }]}>
                  <Text style={styles.label}>Password *</Text>
                  <View style={[
                    styles.inputWrapper, 
                    focusedField === 'password' && styles.inputWrapperFocused
                  ]}>
                    <Feather 
                      name="lock" 
                      size={18} 
                      color={focusedField === 'password' ? theme.colors.primary : theme.colors.textMuted} 
                      style={styles.inputIcon} 
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry={secureText}
                      value={password}
                      onChangeText={setPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                      <Feather name={secureText ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password Input */}
                <View style={[styles.inputGroup, isTablet && { flex: 1 }]}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <View style={[
                    styles.inputWrapper, 
                    focusedField === 'confirmPassword' && styles.inputWrapperFocused
                  ]}>
                    <Feather 
                      name="lock" 
                      size={18} 
                      color={focusedField === 'confirmPassword' ? theme.colors.primary : theme.colors.textMuted} 
                      style={styles.inputIcon} 
                    />
                    <TextInput 
                      style={styles.input} 
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textMuted}
                      secureTextEntry={secureConfirmText}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity onPress={() => setSecureConfirmText(!secureConfirmText)}>
                      <Feather name={secureConfirmText ? 'eye-off' : 'eye'} size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
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
              <TouchableOpacity 
                style={styles.checkboxContainer} 
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Feather name="check" size={12} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  I agree to the <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

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
});
