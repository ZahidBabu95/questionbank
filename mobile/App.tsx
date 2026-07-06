import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';

import { theme } from './src/theme/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BrandingProvider } from './src/context/BrandingContext';
import { LandingScreen } from './src/screens/LandingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { WorkspaceStatusScreen } from './src/screens/WorkspaceStatusScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import './src/utils/i18n'; // Force i18n initialization

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createStackNavigator();


// Temporary Dashboard Placeholder for authenticated users
const DashboardPlaceholder = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.dashboardContainer}>
      <StatusBar style="dark" />
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashLogoText}>QuestionShaper</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Feather name="log-out" size={18} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dashContent}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.welcomeTitle}>Welcome, {user?.name || 'User'}!</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.roles?.join(', ') || 'TEACHER'}</Text>
        </View>

        <Text style={styles.dashSubtitle}>AI Workspace & Quizzes are coming soon here...</Text>
      </View>
    </SafeAreaView>
  );
};

const NavigationWrapper = () => {
  const { isLoggedIn, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashText}>QuestionShaper</Text>
      </View>
    );
  }

  // Workspace status check:
  // If logged in, check if they need workspace activation or have missing institute names
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
  const isDefaultInstitute = user?.instituteName === 'DEFAULT' || user?.instituteName === 'Default Institute';
  const isMissingInstituteInfo = !isSuperAdmin && !isDefaultInstitute && (!user?.instituteNameEn || !user?.instituteNameBn);
  const isWorkspaceActive = (user?.instituteStatus === 'ACTIVE' || isSuperAdmin || isDefaultInstitute) && !isMissingInstituteInfo;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          // Unauthenticated Stack
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !isWorkspaceActive ? (
          // Onboarding / Workspace Status Stack
          <Stack.Screen name="WorkspaceStatus" component={WorkspaceStatusScreen} />
        ) : (
          // Authenticated Stack
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BrandingProvider>
          <AuthProvider>
            <NavigationWrapper />
          </AuthProvider>
        </BrandingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: theme.typography.weights.black,
    letterSpacing: 1,
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  dashboardHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dashLogoText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
  },
  logoutText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.danger,
  },
  dashContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: '#FFF',
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primary,
  },
  welcomeTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  roleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.secondaryLight,
    borderRadius: theme.borderRadius.full,
    marginBottom: 32,
  },
  roleText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  dashSubtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
    textAlign: 'center',
  },
});
