import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  UIManager,
  LayoutAnimation,
  RefreshControl,
  Modal,
  Image,
  Animated,
  Linking,
  BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import apiClient, { LOCAL_DEV_IP, getWebAppBaseUrl, BASE_URL } from '../api/apiClient';
import { APP_CONFIG } from '../config';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const { width } = Dimensions.get('window');
const isTablet = width > 600;

const getRelativePath = (urlStr: string) => {
  if (!urlStr) return '/dashboard';
  const parts = urlStr.split(':5173');
  return parts.length > 1 ? parts[1] : '/dashboard';
};

// StatCard Component with spring animation and iPhone-style glassmorphism
const StatCardComponent: React.FC<{ stat: any; isTablet: boolean; index: number }> = ({ stat, isTablet, index }) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [stat.value]); // Re-animate on value update

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 6
    }).start();
  };

  return (
    <Animated.View 
      style={{ 
        transform: [{ scale }, { translateY: slideAnim }], 
        opacity: fadeAnim,
        width: isTablet ? (width - 76) / 4 : (width - 52) / 2 
      }}
    >
      <TouchableOpacity 
        style={[styles.statCard, isTablet && styles.tabletStatCard]}
        onPress={stat.onPress}
        disabled={!stat.onPress}
        onPressIn={stat.onPress ? handlePressIn : undefined}
        onPressOut={stat.onPress ? handlePressOut : undefined}
        activeOpacity={0.9}
      >
        {/* Apple-style frosted glass card background */}
        <View style={styles.glassBackground} />

        <View style={[styles.statIconBg, { backgroundColor: stat.bg, borderColor: stat.color + '20' }]}>
          {/* Glossy overlay */}
          <View style={styles.glassyOverlay} />
          <Feather name={stat.icon as any} size={18} color={stat.color} style={{ zIndex: 3 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', marginTop: 8 }}>
          <Text style={styles.statValue}>{stat.value}</Text>
          {stat.subValue ? (
            <Text style={{ fontSize: 9, color: theme.colors.textMuted, marginLeft: 4, fontWeight: 'bold' }}>
              / {stat.subValue}
            </Text>
          ) : null}
        </View>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const DashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout, updateUser, token } = useAuth();
  const { logoUrl, systemName } = useBranding();

  // Auto-Update States
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatusText, setDownloadStatusText] = useState<string>('');

  // Tab: 'home' | 'notifications' | 'profile' | 'saved-exams' | 'ai-workspace'
  const [activeTab, setActiveTab] = useState<'home' | 'notifications' | 'profile' | 'saved-exams' | 'ai-workspace'>('home');

  // Profile sub-tabs: 'info' | 'security' | 'subscription' | 'academic'
  const [profileSubTab, setProfileSubTab] = useState<'info' | 'security' | 'subscription' | 'academic'>('info');

  // Greeting visibility logic (shows on login/refresh then hides)
  const [showGreeting, setShowGreeting] = useState(true);
  const greetingTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startGreetingTimer = () => {
    if (greetingTimerRef.current) {
      clearTimeout(greetingTimerRef.current);
    }
    greetingTimerRef.current = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowGreeting(false);
    }, 4000);
  };

  // Real notifications integration
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await apiClient.get('/notifications?page=0&size=20');
      if (response.data && response.data.content) {
        setNotifications(response.data.content);
      }
    } catch (error) {
      console.log('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await apiClient.get('/notifications/unread-count');
      if (response.data && typeof response.data.count === 'number') {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.log('Failed to fetch unread count:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
      fetchUnreadCount();
    } catch (error) {
      console.log('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      setNotifications(prev => prev.map(item => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.log('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationIconAndColor = (type: string) => {
    switch (type) {
      case 'REVISION_APPROVED':
      case 'ACHIEVEMENT':
        return { icon: 'check-circle', color: '#10B981' }; // green
      case 'REVISION_REJECTED':
      case 'WARNING':
      case 'API_LIMIT_ALERT':
        return { icon: 'alert-triangle', color: '#EF4444' }; // red
      case 'SYSTEM_ALERT':
        return { icon: 'bell', color: '#3B82F6' }; // blue
      default:
        return { icon: 'info', color: '#8B5CF6' }; // purple
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Just now';
    try {
      const diffMs = new Date().getTime() - new Date(timeString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHrs > 0) return `${diffHrs}h ago`;
      if (diffMins > 0) return `${diffMins}m ago`;
      return 'Just now';
    } catch (e) {
      return 'Just now';
    }
  };

  // Saved exams integration
  const [savedExams, setSavedExams] = useState<any[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  const fetchSavedExams = async () => {
    setLoadingExams(true);
    try {
      const response = await apiClient.get('/exams/generate?page=0&size=20');
      if (response.data && response.data.success && response.data.data) {
        setSavedExams(response.data.data.content || []);
      }
    } catch (error) {
      console.log('Failed to fetch saved exams:', error);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleDeleteExam = async (id: string) => {
    Alert.alert(
      'Delete Exam',
      'Are you sure you want to permanently delete this exam paper?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.delete(`/exams/generate/${id}`);
              if (response.data?.success) {
                Alert.alert('Success', 'Exam deleted successfully');
                fetchSavedExams();
                fetchFreshUserDetails();
                fetchDashboardStats();
              }
            } catch (error) {
              console.log('Failed to delete exam:', error);
              Alert.alert('Error', 'Failed to delete exam paper.');
            }
          }
        }
      ]
    );
  };

  const handleOpenWebUrl = (path: string, title: string) => {
    // Append ?embedded=true if not present
    const separator = path.includes('?') ? '&' : '?';
    const cleanPath = path.includes('embedded=true') ? path : `${path}${separator}embedded=true`;
    
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const userParam = user ? `&user=${encodeURIComponent(JSON.stringify(user))}` : '';
    const webUrl = `${getWebAppBaseUrl()}${cleanPath}${tokenParam}${userParam}`;
    
    setCanGoBack(false);
    setQuickActionUrl(webUrl);
    setWebViewTitle(title);
    setQuickActionProgress(0);
    setQuickActionLoading(true);
    setIsWebViewActive(true);
    
    // Switch to home tab silently if not already there, to hide other tab views cleanly
    setActiveTab('home');
  };

  const handleCloseEmbeddedWebView = () => {
    setIsWebViewActive(false);
    setQuickActionUrl('');
    setCanGoBack(false);
    setHideMobileLayoutBars(false);
  };

  // Loaders
  const [loadingFreshUser, setLoadingFreshUser] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Forms
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });

  const [pwdForm, setPwdForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Password requirements real-time checks
  const [pwdStrength, setPwdStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // Toggle show password
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Fresh user state (from backend)
  const [freshUser, setFreshUser] = useState<any>(user);
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
  const [academicHierarchy, setAcademicHierarchy] = useState<any>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Live stats state
  const [liveStats, setLiveStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [showQuestionStatsModal, setShowQuestionStatsModal] = useState(false);

  // WebView states
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [webViewUrl, setWebViewUrl] = useState('');
  const [webViewTitle, setWebViewTitle] = useState('');
  const [webProgress, setWebProgress] = useState(0);
  const [webLoading, setWebLoading] = useState(false);
  const webViewRef = React.useRef<any>(null);

  // Quick Action WebView states
  const [isWebViewActive, setIsWebViewActive] = useState(false);
  const [quickActionUrl, setQuickActionUrl] = useState('');
  const [quickActionProgress, setQuickActionProgress] = useState(0);
  const [quickActionLoading, setQuickActionLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const quickActionWebViewRef = React.useRef<any>(null);
  const [hideMobileLayoutBars, setHideMobileLayoutBars] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const lastAutoLoginTime = React.useRef<{[key: string]: number}>({});

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'download_pdf') {
        const downloadUrl = `${BASE_URL}/exams/download/pdf/${data.examId}?${data.queryString}`;
        console.log("WebView requested PDF download, opening direct URL:", downloadUrl);
        Alert.alert(
          "PDF Download",
          "The exam paper PDF will download and open in your default browser.",
          [{ text: "Download & Open", onPress: () => Linking.openURL(downloadUrl) }]
        );
      } else if (data && data.type === 'hide_layout_bars') {
        setHideMobileLayoutBars(!!data.hide);
      } else if (data && data.type === 'close_webview') {
        handleCloseEmbeddedWebView();
      }
    } catch (e) {
      console.warn("Failed to parse WebView message:", e);
    }
  };

  const handleUploadAvatar = async () => {
    // 1. Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant gallery access to change profile picture.');
      return;
    }

    // 2. Select image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return;
    
    const selectedAsset = result.assets[0];
    
    // 3. Upload to API
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      
      const fileUri = selectedAsset.uri;
      const fileType = selectedAsset.mimeType || 'image/jpeg';
      const fileName = fileUri.split('/').pop() || 'profile.jpg';

      formData.append('file', {
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        name: fileName,
        type: fileType,
      } as any);

      const response = await apiClient.post(`/users/${user.id}/profile-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        Alert.alert('Success', 'Profile image updated successfully!');
        // Refresh fresh user details to reload avatar
        fetchFreshUserDetails();
      }
    } catch (error: any) {
      console.log('Avatar upload failed:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload profile image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const fetchDashboardStats = async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      let endpoint = '/dashboard/student-stats';
      if (user.roles?.includes('SUPER_ADMIN')) {
        endpoint = '/dashboard/admin-stats';
      } else if (user.roles?.includes('INSTITUTE_ADMIN')) {
        endpoint = '/dashboard/institute-stats';
      } else if (user.roles?.includes('TEACHER')) {
        endpoint = '/dashboard/teacher-stats';
      }
      
      const response = await apiClient.get(endpoint);
      if (response.data) {
        setLiveStats(response.data);
      }
    } catch (error) {
      console.log('Failed to fetch live stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowGreeting(true);
    await Promise.all([
      fetchFreshUserDetails(),
      fetchDashboardStats(),
      fetchNotifications(),
      fetchUnreadCount(),
      activeTab === 'saved-exams' ? fetchSavedExams() : Promise.resolve()
    ]);
    setRefreshing(false);
    startGreetingTimer();
  };

  const checkForAppUpdates = async () => {
    try {
      const platformParam = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
      const response = await apiClient.get(`/public/apps/latest?platform=${platformParam}`);
      if (response.data && response.data.active) {
        const serverRelease = response.data;
        if (serverRelease.versionCode > APP_CONFIG.VERSION_CODE) {
          setUpdateInfo(serverRelease);
          setShowUpdateModal(true);
        }
      }
    } catch (error) {
      console.log('Failed to check for app updates:', error);
    }
  };

  const downloadAndInstallApk = async (downloadUrl: string) => {
    if (!downloadUrl) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatusText('আপডেট ডাউনলোড শুরু হচ্ছে...');

    try {
      const filename = downloadUrl.split('/').pop() || 'update.apk';
      const localApkUri = `${FileSystem.cacheDirectory}${filename}`;

      // Create download resumable to track progress
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        localApkUri,
        {},
        (downloadProgressEvent) => {
          const progress = downloadProgressEvent.totalBytesWritten / downloadProgressEvent.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
          const percent = Math.round(progress * 100);
          const writtenMb = (downloadProgressEvent.totalBytesWritten / (1024 * 1024)).toFixed(1);
          const totalMb = (downloadProgressEvent.totalBytesExpectedToWrite / (1024 * 1024)).toFixed(1);
          setDownloadStatusText(`ডাউনলোড হচ্ছে: ${percent}% (${writtenMb}MB / ${totalMb}MB)`);
        }
      );

      setDownloadStatusText('ফাইল ডাউনলোড করা হচ্ছে...');
      const downloadResult = await downloadResumable.downloadAsync();
      
      if (!downloadResult || !downloadResult.uri) {
        throw new Error('Download failed: uri is null');
      }

      setDownloadProgress(1);
      setDownloadStatusText('ডাউনলোড সম্পন্ন! ইনস্টলেশন শুরু হচ্ছে...');

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(downloadResult.uri);
        setDownloadStatusText('ইনস্টল করার অনুমতি চাওয়া হচ্ছে...');
        
        await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
          data: contentUri,
          flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
        });
      } else {
        // Fallback for iOS/other platforms (using native sharing picker to save/install)
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/vnd.android.package-archive',
            dialogTitle: 'Install QuestionShaper Update',
          });
        } else {
          Alert.alert('Download Complete', `Update saved to: ${downloadResult.uri}`);
        }
      }
      
      // Close the modals
      setShowUpdateModal(false);
      setIsDownloading(false);
    } catch (error: any) {
      console.log('App update failed:', error);
      Alert.alert(
        'Update Failed',
        'অ্যাপটি স্বয়ংক্রিয়ভাবে ডাউনলোড ও ইনস্টল করতে ব্যর্থ হয়েছে। আপনি কি ব্রাউজার থেকে সরাসরি ডাউনলোড করতে চান?',
        [
          { text: 'Later', style: 'cancel', onPress: () => setIsDownloading(false) },
          { 
            text: 'Download in Chrome', 
            onPress: () => {
              setIsDownloading(false);
              Linking.openURL(downloadUrl);
            } 
          }
        ]
      );
    }
  };

  useEffect(() => {
    checkForAppUpdates();
    fetchFreshUserDetails();
    fetchDashboardStats();
    fetchNotifications();
    fetchUnreadCount();
    startGreetingTimer();
    return () => {
      if (greetingTimerRef.current) {
        clearTimeout(greetingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const backAction = () => {
      // 1. If Quick Action WebView is active (e.g. manual selection)
      if (isWebViewActive) {
        if (canGoBack) {
          quickActionWebViewRef.current?.goBack();
          return true; // Prevent default action (app exit/back)
        } else {
          // Double-confirmation dialog to protect unsaved user exam progress!
          Alert.alert(
            "Exit Manual Exam Builder?",
            "Are you sure you want to close the manual exam builder? Unsaved changes will be lost.",
            [
              { text: "Cancel", onPress: () => null, style: "cancel" },
              { text: "Exit & Close", onPress: () => handleCloseEmbeddedWebView(), style: "destructive" }
            ]
          );
          return true; // Prevent default action
        }
      }
      
      // 2. If AI Workspace WebView is active
      if (activeTab === 'ai-workspace') {
        setActiveTab('home');
        return true;
      }

      // 3. If on other sub-tabs like notifications or profile, redirect to home instead of crashing/exiting
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }

      return false; // Let default back action happen (exit app)
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [isWebViewActive, canGoBack, activeTab]);

  useEffect(() => {
    // Sync profile form when context user changes
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Real-time password check
  useEffect(() => {
    const p = pwdForm.newPassword;
    setPwdStrength({
      length: p.length >= 8,
      uppercase: /[A-Z]/.test(p),
      lowercase: /[a-z]/.test(p),
      number: /[0-9]/.test(p),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(p)
    });
  }, [pwdForm.newPassword]);

  const fetchFreshUserDetails = async () => {
    if (!user?.id) return;
    setLoadingFreshUser(true);
    try {
      const response = await apiClient.get(`/users/${user.id}`);
      if (response.data?.success && response.data?.data) {
        const u = response.data.data;
        setFreshUser(u);
        setProfileForm({
          name: u.name || '',
          phone: u.phone || ''
        });
        
        // Sync context
        await updateUser({
          ...user,
          name: u.name,
          phone: u.phone,
          roles: u.roles || user.roles,
          instituteName: u.instituteName || user.instituteName,
          instituteStatus: u.instituteStatus || user.instituteStatus,
          subscriptionPackage: u.subscriptionPackage || user.subscriptionPackage
        });
      }
    } catch (error) {
      console.log('Failed to fetch fresh user details:', error);
    } finally {
      setLoadingFreshUser(false);
    }
  };

  const fetchAcademicAccess = async () => {
    if (!user?.instituteId) return;
    
    setLoadingSubjects(true);
    try {
      const [subjectsRes, hierarchyRes] = await Promise.all([
        apiClient.get(`/institutes/${user.instituteId}/assigned-subjects`),
        apiClient.get('/academic/hierarchy?bypass=true')
      ]);

      if (subjectsRes.data) {
        setAssignedSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
      }
      if (hierarchyRes.data) {
        setAcademicHierarchy(hierarchyRes.data);
      }
    } catch (error) {
      console.log('Failed to fetch academic subjects/hierarchy:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    if (profileSubTab === 'academic') {
      fetchAcademicAccess();
    }
  }, [profileSubTab]);

  const handleProfileUpdate = async () => {
    if (!profileForm.name.trim()) {
      Alert.alert('Error', 'Full Name is required');
      return;
    }
    setSavingProfile(true);
    try {
      const response = await apiClient.patch('/users/profile', {
        name: profileForm.name,
        phone: profileForm.phone
      });
      if (response.data?.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        const updated = response.data.data;
        setFreshUser(updated);
        await updateUser({
          ...user,
          name: updated.name,
          phone: updated.phone
        } as any);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    const allMet = Object.values(pwdStrength).every(Boolean);
    if (!allMet) {
      Alert.alert('Error', 'Please satisfy all password complexity requirements.');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      Alert.alert('Error', 'Confirm password does not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const response = await apiClient.patch('/users/profile/password', {
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword
      });
      if (response.data?.success) {
        Alert.alert('Success', 'Password changed successfully!');
        setPwdForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password. Verify your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of QuestionShaper?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', onPress: logout, style: 'destructive' }
      ]
    );
  };

  const changeTab = (tab: 'home' | 'notifications' | 'profile' | 'saved-exams' | 'ai-workspace') => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.spring, springDamping: 0.75 },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity }
    });
    
    // Switch active tab and turn off quick actions WebView
    setIsWebViewActive(false);
    setQuickActionUrl('');
    
    setActiveTab(tab);
    if (tab === 'notifications') {
      fetchNotifications();
      fetchUnreadCount();
    } else if (tab === 'saved-exams') {
      fetchSavedExams();
    } else if (tab === 'ai-workspace') {
      const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
      const userParam = user ? `&user=${encodeURIComponent(JSON.stringify(user))}` : '';
      const webUrl = `${getWebAppBaseUrl()}/ai-workspace?embedded=true${tokenParam}${userParam}`;
      setWebViewUrl(webUrl);
      setWebViewTitle('AI Workspace');
    }
  };

  const changeSubTab = (subTab: typeof profileSubTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setProfileSubTab(subTab);
  };

  // Dynamic live stats cards mapping
  const getStatsCards = () => {
    const qCount = liveStats?.approvedQuestionsCount ?? liveStats?.totalQuestions ?? 0;
    const gCount = liveStats?.globalQuestionsCount ?? liveStats?.totalQuestions ?? 0;
    const qTotal = liveStats?.totalQuestions ?? 0;
    const uCount = liveStats?.totalUsers ?? 0;
    const iCount = liveStats?.activeInstitutes ?? 0;
    const xp = freshUser?.contributionPoints ?? 0;

    const cards = [];

    if (user?.roles?.includes('SUPER_ADMIN')) {
      cards.push(
        { label: 'Active Approved Questions', value: qCount.toLocaleString(), subValue: gCount.toLocaleString(), icon: 'database', color: theme.colors.primary, bg: 'rgba(37, 99, 235, 0.08)', onPress: () => setShowSubjectsModal(true) },
        { label: 'Questions Created', value: qTotal.toLocaleString(), icon: 'pie-chart', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', onPress: () => setShowQuestionStatsModal(true) },
        { label: 'Active Institutes', value: iCount.toLocaleString(), icon: 'book-open', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)' }
      );
    } else if (user?.roles?.includes('INSTITUTE_ADMIN')) {
      cards.push(
        { label: 'Active Approved Questions', value: qCount.toLocaleString(), subValue: gCount.toLocaleString(), icon: 'database', color: theme.colors.primary, bg: 'rgba(37, 99, 235, 0.08)', onPress: () => setShowSubjectsModal(true) },
        { label: 'Questions Created', value: qTotal.toLocaleString(), icon: 'pie-chart', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', onPress: () => setShowQuestionStatsModal(true) }
      );
    } else {
      // Teachers and other users
      cards.push(
        { label: 'Active Approved Questions', value: qCount.toLocaleString(), subValue: gCount.toLocaleString(), icon: 'database', color: theme.colors.primary, bg: 'rgba(37, 99, 235, 0.08)', onPress: () => setShowSubjectsModal(true) },
        { label: 'My Questions', value: qTotal.toLocaleString(), icon: 'pie-chart', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', onPress: () => setShowQuestionStatsModal(true) }
      );
    }

    return cards;
  };

  const stats = getStatsCards();

  const getRecentActivitiesList = () => {
    if (!liveStats?.recentActivities || liveStats.recentActivities.length === 0) {
      return [];
    }

    return liveStats.recentActivities.map((act: any) => {
      let color = theme.colors.primary;
      let icon = 'edit';

      if (act.action.includes('MCQ')) {
        color = '#F59E0B';
        icon = 'plus-circle';
      } else if (act.status === 'APPROVED') {
        color = '#10B981';
        icon = 'check-circle';
      } else if (act.status === 'REJECTED') {
        color = '#EF4444';
        icon = 'x-circle';
      }

      let timeAgo = 'Just now';
      if (act.time) {
        try {
          const diffMs = new Date().getTime() - new Date(act.time).getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHrs = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHrs / 24);

          if (diffDays > 0) {
            timeAgo = `${diffDays}d ago`;
          } else if (diffHrs > 0) {
            timeAgo = `${diffHrs}h ago`;
          } else if (diffMins > 0) {
            timeAgo = `${diffMins}m ago`;
          } else {
            timeAgo = 'Just now';
          }
        } catch (e) {
          timeAgo = 'Just now';
        }
      }

      return {
        action: act.user,
        desc: act.action,
        time: timeAgo,
        icon,
        color
      };
    });
  };

  const recentActivities = getRecentActivitiesList();

  return (
    <SafeAreaView style={styles.container}>
      {/* ─── Top Header (Logo & Notifications) ─── */}
      {!hideMobileLayoutBars && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => changeTab('home')} activeOpacity={0.7}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.headerLogoImage} resizeMode="contain" />
            ) : (
              <View style={styles.headerLogoPlaceholder}>
                <View style={styles.headerLogoIcon}>
                  <Feather name="book-open" size={16} color="#FFF" />
                </View>
                <Text style={styles.headerLogoText}>{systemName}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            {freshUser?.contributionPoints !== undefined && (
              <View style={styles.headerXpBadge}>
                <Feather name="award" size={12} color="#D97706" style={{ marginRight: 4 }} />
                <Text style={styles.headerXpText}>{freshUser.contributionPoints} XP</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.headerNotificationBtn}
              onPress={() => changeTab('notifications')}
              activeOpacity={0.7}
            >
              <Feather name="bell" size={18} color={theme.colors.text} />
              {unreadCount > 0 && <View style={styles.headerNotificationBadge} />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Progress Bars directly under the standard header */}
      {isWebViewActive && quickActionLoading && (
        <View style={styles.webProgressBarBg}>
          <View style={[styles.webProgressBarFill, { width: `${quickActionProgress * 100}%` }]} />
        </View>
      )}
      {activeTab === 'ai-workspace' && webLoading && (
        <View style={styles.webProgressBarBg}>
          <View style={[styles.webProgressBarFill, { width: `${webProgress * 100}%` }]} />
        </View>
      )}

      {/* ─── Main Content Tabs Switcher ─── */}
      <View style={styles.content}>
        {activeTab === 'home' && !isWebViewActive ? (
          // ─── Home Dashboard View ───
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollPadding}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
            }
          >
            {/* Greeting Header (Auto-Hides) */}
            {showGreeting && (
              <View style={styles.greetingHeader}>
                <View>
                  <Text style={styles.greetingWelcome}>Welcome back,</Text>
                  <Text style={styles.greetingName}>{user?.name} 👋</Text>
                </View>
                <Feather name="award" size={24} color={theme.colors.primary} />
              </View>
            )}

            {/* AI Workspace Banner */}
            <TouchableOpacity 
              style={styles.aiWorkspaceCard}
              activeOpacity={0.9}
              onPress={() => changeTab('ai-workspace')}
            >
              {/* Decorative elements */}
              <View style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }} />
              
              <View style={styles.aiWorkspaceBadge}>
                <Ionicons name="sparkles" size={10} color="#FBBF24" />
                <Text style={styles.aiWorkspaceBadgeText}>Next-Gen AI Assistant</Text>
              </View>
              
              <Text style={styles.aiWorkspaceTitle}>AI Co-Pilot Workspace</Text>
              
              <Text style={styles.aiWorkspaceDesc}>
                Create exams instantly, auto-generate standard question banks, search smart content, and optimize your teaching workflow with our advanced AI tools.
              </Text>
              
              <View style={styles.aiWorkspaceBtn}>
                <Text style={styles.aiWorkspaceBtnText}>Launch AI Workspace</Text>
                <Feather name="zap" size={12} color="#FBBF24" />
              </View>
            </TouchableOpacity>

            {/* Stats Grid */}
            <View style={[styles.sectionHeader, { alignItems: 'center' }]}>
              <Text style={styles.sectionTitle}>Overview Statistics</Text>
            </View>

            <View style={styles.statsGrid}>
              {stats.map((stat, idx) => (
                <StatCardComponent key={idx} stat={stat} isTablet={isTablet} index={idx} />
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={[styles.actionRow, { marginBottom: 12 }]}>
              <TouchableOpacity 
                style={styles.actionCard} 
                activeOpacity={0.8}
                onPress={() => handleOpenWebUrl('/exams/generate/manual', 'Manual Exam')}
              >
                <View style={[styles.actionIconWrapper, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="plus-circle" size={22} color={theme.colors.primary} />
                </View>
                <Text style={styles.actionText}>Manual Exam</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard} 
                activeOpacity={0.8}
                onPress={() => handleOpenWebUrl('/exams/generate/auto', 'Auto Exam Generator')}
              >
                <View style={[styles.actionIconWrapper, { backgroundColor: '#FDF2F8' }]}>
                  <Feather name="zap" size={22} color="#EC4899" />
                </View>
                <Text style={styles.actionText}>Auto Exam</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.actionCard} 
                activeOpacity={0.8}
                onPress={() => handleOpenWebUrl('/questions/approved', 'Question Bank')}
              >
                <View style={[styles.actionIconWrapper, { backgroundColor: '#ECFDF5' }]}>
                  <Feather name="book-open" size={22} color="#10B981" />
                </View>
                <Text style={styles.actionText}>Question Bank</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard} 
                activeOpacity={0.8}
                onPress={() => handleOpenWebUrl('/exams/generate/saved', 'Saved Exams Drive')}
              >
                <View style={[styles.actionIconWrapper, { backgroundColor: '#F5F3FF' }]}>
                  <Feather name="hard-drive" size={22} color="#8B5CF6" />
                </View>
                <Text style={styles.actionText}>Saved Exams</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Activity Log */}
            {(user?.roles?.includes('SUPER_ADMIN') || user?.email === 'admin') && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>
                <View style={styles.activitiesContainer}>
                  {recentActivities.length > 0 ? (
                    recentActivities.map((act: any, idx: number) => (
                      <View key={idx} style={styles.activityRow}>
                        <View style={[styles.activityIconBg, { backgroundColor: 'rgba(0,0,0,0.03)' }]}>
                          <Feather name={act.icon as any} size={16} color={act.color} />
                        </View>
                        <View style={styles.activityMeta}>
                          <Text style={styles.activityAction}>{act.action}</Text>
                          <Text style={styles.activityDesc} numberOfLines={1}>{act.desc}</Text>
                        </View>
                        <Text style={styles.activityTime}>{act.time}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>সাম্প্রতিক কোনো অ্যাক্টিভিটি পাওয়া যায়নি</Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        ) : activeTab === 'notifications' && !isWebViewActive ? (
          // ─── Notifications View ───
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollPadding}
            refreshControl={
              <RefreshControl refreshing={loadingNotifications} onRefresh={fetchNotifications} colors={[theme.colors.primary]} />
            }
          >
            {/* Header row with back button */}
            <View style={styles.savedExamsHeaderRow}>
              <TouchableOpacity onPress={() => changeTab('home')} style={styles.backBtn} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                {unreadCount > 0 ? (
                  <TouchableOpacity onPress={handleMarkAllAsRead} activeOpacity={0.7} style={{ marginTop: 3 }}>
                    <Text style={styles.markAllReadText}>Mark all as read</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.sectionSubtitle}>Your recent system notifications</Text>
                )}
              </View>
            </View>
            
            <View style={styles.notificationsList}>
              {loadingNotifications && notifications.length === 0 ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
              ) : notifications.length > 0 ? (
                notifications.map(item => {
                  const meta = getNotificationIconAndColor(item.type);
                  return (
                    <TouchableOpacity 
                      key={item.id} 
                      style={[styles.notificationCard, !item.read && styles.notificationCardUnread]}
                      onPress={() => !item.read && handleMarkAsRead(item.id)}
                      disabled={item.read}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.notificationIconBg, { backgroundColor: meta.color + '15' }]}>
                        <Feather name={meta.icon as any} size={18} color={meta.color} />
                      </View>
                      <View style={styles.notificationTextContainer}>
                        <View style={styles.notificationCardHeader}>
                          <Text style={styles.notificationCardTitle}>{item.title}</Text>
                          {!item.read && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.notificationCardBody}>{item.message}</Text>
                        <Text style={styles.notificationCardTime}>{formatTime(item.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyNotifications}>
                  <Feather name="bell-off" size={40} color={theme.colors.textMuted} />
                  <Text style={styles.emptyNotificationsText}>No notifications yet</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : activeTab === 'saved-exams' && !isWebViewActive ? (
          // ─── Saved Exams Library View ───
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollPadding}
            refreshControl={
              <RefreshControl refreshing={loadingExams} onRefresh={fetchSavedExams} colors={[theme.colors.primary]} />
            }
          >
            {/* Header row with back button */}
            <View style={styles.savedExamsHeaderRow}>
              <TouchableOpacity onPress={() => changeTab('home')} style={styles.backBtn} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Saved Exams</Text>
                <Text style={styles.sectionSubtitle}>Select or manage saved exam papers</Text>
              </View>
            </View>

            <View style={styles.examsListContainer}>
              {loadingExams && savedExams.length === 0 ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 20 }} />
              ) : savedExams.length > 0 ? (
                savedExams.map((exam) => (
                  <View key={exam.id} style={styles.examCard}>
                    {/* APPLE Frosted Glass card bg */}
                    <View style={styles.glassBackground} />
                    
                    <View style={styles.examCardHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.examTitle}>{exam.title}</Text>
                        <Text style={styles.examMeta}>
                          {exam.subjectName} • {exam.className}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.deleteExamBtn}
                        onPress={() => handleDeleteExam(exam.id)}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.examStatsRow}>
                      <View style={styles.examStatItem}>
                        <Feather name="help-circle" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.examStatText}>{exam.totalQuestions || 0} Questions</Text>
                      </View>
                      <View style={styles.examStatItem}>
                        <Feather name="award" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.examStatText}>{exam.totalMarks || 0} Marks</Text>
                      </View>
                      <View style={styles.examStatItem}>
                        <Feather name="clock" size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.examStatText}>{exam.durationMinutes || 0} Mins</Text>
                      </View>
                    </View>

                    <View style={styles.examBadgeRow}>
                      <View style={styles.examBadge}>
                        <Text style={styles.examBadgeText}>
                          {exam.language || 'Bangla'}
                        </Text>
                      </View>
                      <View style={[styles.examBadge, { backgroundColor: theme.colors.primaryLight }]}>
                        <Text style={[styles.examBadgeText, { color: theme.colors.primary }]}>
                          {exam.examType || 'MCQ'}
                        </Text>
                      </View>
                      <View style={[styles.examBadge, { backgroundColor: exam.status === 'FINALIZED' ? '#ECFDF5' : '#FEF3C7' }]}>
                        <Text style={[styles.examBadgeText, { color: exam.status === 'FINALIZED' ? '#059669' : '#D97706' }]}>
                          {exam.status || 'DRAFT'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyExamsContainer}>
                  <Feather name="folder-minus" size={44} color={theme.colors.textMuted} />
                  <Text style={styles.emptyExamsTitle}>No saved exams</Text>
                  <Text style={styles.emptyExamsText}>Generate an exam paper using the auto or manual builder on our Web Dashboard to see it listed here.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : activeTab === 'profile' && !isWebViewActive ? (
          // ─── Profile Tab View ───
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            
            {/* Banner Cover Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.profileBanner} />
              
              <View style={styles.profileMetaArea}>
                <TouchableOpacity 
                  style={styles.profileAvatarContainer} 
                  onPress={handleUploadAvatar}
                  disabled={uploadingAvatar}
                  activeOpacity={0.8}
                >
                  <View style={styles.profileAvatar}>
                    {uploadingAvatar ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (freshUser?.profileImageUrl || user?.profileImageUrl) ? (
                      <Image 
                        source={{ uri: freshUser?.profileImageUrl || user?.profileImageUrl }} 
                        style={styles.profileAvatarImg} 
                      />
                    ) : (
                      <Text style={styles.profileAvatarTxt}>
                        {(freshUser?.name || user?.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  
                  {/* Camera edit floating icon */}
                  <View style={styles.profileAvatarEditBadge}>
                    <Feather name="camera" size={10} color="#FFF" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.profileName}>{freshUser?.name || user?.name}</Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                
                {/* Contribution points badge */}
                <View style={styles.xpBadge}>
                  <Feather name="award" size={14} color="#F59E0B" />
                  <Text style={styles.xpText}>{freshUser?.contributionPoints || 0} XP Points</Text>
                </View>
              </View>
            </View>

            {/* Inner Sub Tabs bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabsContainer} contentContainerStyle={styles.subTabsContent}>
              {[
                { id: 'info', label: 'Profile Info', icon: 'user' },
                { id: 'security', label: 'Security', icon: 'shield' },
                { id: 'subscription', label: 'Subscription', icon: 'zap' },
                { id: 'academic', label: 'Academic Access', icon: 'book-open' }
              ].map(sub => {
                const active = profileSubTab === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.subTabItem, active && styles.subTabItemActive]}
                    onPress={() => changeSubTab(sub.id as any)}
                  >
                    <Feather name={sub.icon as any} size={14} color={active ? '#FFF' : theme.colors.textSecondary} />
                    <Text style={[styles.subTabText, active && styles.subTabTextActive]}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sub Tab Page Contents */}
            <View style={styles.subTabContentArea}>
              {profileSubTab === 'info' && (
                // 1. Profile Info Form
                <View style={styles.formContainer}>
                  <Text style={styles.formSectionTitle}>Personal Details</Text>
                  
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={[styles.inputWrapper, styles.disabledInput]}>
                    <Feather name="mail" size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={user?.email}
                      editable={false}
                    />
                  </View>
                  <Text style={styles.inputHelpText}>Email cannot be changed</Text>

                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="user" size={16} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Full Name"
                      value={profileForm.name}
                      onChangeText={(txt) => setProfileForm(p => ({ ...p, name: txt }))}
                    />
                  </View>

                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="phone" size={16} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Phone Number"
                      keyboardType="phone-pad"
                      value={profileForm.phone}
                      onChangeText={(txt) => setProfileForm(p => ({ ...p, phone: txt }))}
                    />
                  </View>

                  <TouchableOpacity 
                    style={[styles.saveBtn, savingProfile && styles.disabledBtn]}
                    onPress={handleProfileUpdate}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Feather name="save" size={16} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>Save Profile Details</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {profileSubTab === 'security' && (
                // 2. Change Password Security tab
                <View style={styles.formContainer}>
                  <Text style={styles.formSectionTitle}>Change Password</Text>

                  <Text style={styles.inputLabel}>Current Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="lock" size={16} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Current Password"
                      secureTextEntry={!showOldPwd}
                      value={pwdForm.oldPassword}
                      onChangeText={(txt) => setPwdForm(p => ({ ...p, oldPassword: txt }))}
                    />
                    <TouchableOpacity onPress={() => setShowOldPwd(!showOldPwd)}>
                      <Feather name={showOldPwd ? "eye-off" : "eye"} size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="key" size={16} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="New Password"
                      secureTextEntry={!showNewPwd}
                      value={pwdForm.newPassword}
                      onChangeText={(txt) => setPwdForm(p => ({ ...p, newPassword: txt }))}
                    />
                    <TouchableOpacity onPress={() => setShowNewPwd(!showNewPwd)}>
                      <Feather name={showNewPwd ? "eye-off" : "eye"} size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Password Guidelines Indicators */}
                  <View style={styles.guidelinesBox}>
                    <Text style={styles.guidelineTitle}>Password Requirements:</Text>
                    {[
                      { check: pwdStrength.length, text: 'At least 8 characters' },
                      { check: pwdStrength.uppercase, text: 'One uppercase letter (A-Z)' },
                      { check: pwdStrength.lowercase, text: 'One lowercase letter (a-z)' },
                      { check: pwdStrength.number, text: 'One number (0-9)' },
                      { check: pwdStrength.special, text: 'One special character (!@#...)' }
                    ].map((g, idx) => (
                      <View key={idx} style={styles.guidelineRow}>
                        <Ionicons 
                          name={g.check ? "checkmark-circle" : "ellipse-outline"} 
                          size={14} 
                          color={g.check ? '#10B981' : theme.colors.textMuted} 
                        />
                        <Text style={[styles.guidelineText, g.check && styles.guidelineTextMet]}>
                          {g.text}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <Feather name="shield" size={16} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Confirm New Password"
                      secureTextEntry={!showConfirmPwd}
                      value={pwdForm.confirmPassword}
                      onChangeText={(txt) => setPwdForm(p => ({ ...p, confirmPassword: txt }))}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPwd(!showConfirmPwd)}>
                      <Feather name={showConfirmPwd ? "eye-off" : "eye"} size={16} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: '#EF4444' }, changingPassword && styles.disabledBtn]}
                    onPress={handlePasswordChange}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Feather name="lock" size={16} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.saveBtnText}>Update Password</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {profileSubTab === 'subscription' && (() => {
                const aiUsed = freshUser?.aiUsedCurrentMonth ?? 0;
                const aiLimit = freshUser?.aiLimitPerMonth ?? 500000;
                const aiPercent = Math.min(100, Math.max(0, (aiUsed / aiLimit) * 100));

                const questionsUsed = freshUser?.questionsUsedCurrentMonth ?? 0;
                const questionsLimit = freshUser?.maxQuestions ?? 5000;
                const questionsPercent = Math.min(100, Math.max(0, (questionsUsed / questionsLimit) * 100));

                const storageUsed = freshUser?.storageUsedMb ?? 0.0;
                const storageLimit = freshUser?.storageLimitMb ?? 1024;
                const storagePercent = Math.min(100, Math.max(0, (storageUsed / storageLimit) * 100));

                const formatLimitNumber = (num: number) => {
                  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                  if (num >= 1000) return (num / 1000).toFixed(0) + '.0K';
                  return num.toString();
                };

                const formatDate = (dateStr: any) => {
                  if (!dateStr) return 'No expiration (আজীবন সচল)';
                  try {
                    const d = new Date(dateStr);
                    if (isNaN(d.getTime())) return dateStr;
                    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  } catch (e) {
                    return dateStr;
                  }
                };

                return (
                  <View style={styles.formContainer}>
                    <Text style={styles.formSectionTitle}>Workspace Plan & Limits</Text>
                    
                    {/* Active Plan Premium Gradient Card */}
                    <View style={styles.premiumPlanCard}>
                      <View style={styles.premiumPlanGradient} />
                      <View style={styles.premiumPlanHeader}>
                        <Text style={styles.premiumPlanCode}>
                          {freshUser?.planType || 'BETA'}
                        </Text>
                        <View style={styles.premiumActiveBadge}>
                          <Text style={styles.premiumActiveBadgeText}>Active Plan</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.premiumPlanTitle}>
                        {freshUser?.subscriptionPackage || user?.subscriptionPackage || 'Beta User (Early Access)'}
                      </Text>
                      
                      <Text style={styles.premiumPlanDesc}>
                        Exclusive generous package for early workspace members and academic administrators.
                      </Text>

                      <View style={styles.premiumPlanPriceArea}>
                        <Text style={styles.premiumPlanPrice}>
                          {freshUser?.subscriptionPackage ? '৳0.0' : '$100'}
                        </Text>
                        <Text style={styles.premiumPlanPeriod}>/ MONTHLY</Text>
                      </View>
                    </View>

                    {/* রিসোর্স ব্যবহার সীমা Header */}
                    <Text style={styles.resourceSectionTitle}>রিসোর্স ব্যবহার সীমা (Resource Usage Limits)</Text>

                    {/* AI Token Quota Card */}
                    <View style={styles.resourceCard}>
                      <View style={styles.resourceHeader}>
                        <View style={styles.resourceTitleRow}>
                          <View style={[styles.resourceIconBg, { backgroundColor: 'rgba(109, 40, 217, 0.08)' }]}>
                            <Feather name="zap" size={15} color="#6D28D9" />
                          </View>
                          <Text style={styles.resourceName}>AI TOKEN QUOTA</Text>
                        </View>
                        <Text style={styles.resourcePercent}>{aiPercent.toFixed(0)}% capacity</Text>
                      </View>
                      <View style={styles.resourceStatsRow}>
                        <Text style={styles.resourceValueUsed}>
                          {formatLimitNumber(aiUsed)}
                        </Text>
                        <Text style={styles.resourceValueLimit}>
                          {' / ' + formatLimitNumber(aiLimit)}
                        </Text>
                      </View>
                      <Text style={styles.resourceValueLabel}>Used This Month</Text>
                      <View style={styles.resourceProgressBarBg}>
                        <View style={[styles.resourceProgressBarFill, { width: `${aiPercent}%`, backgroundColor: '#6D28D9' }]} />
                      </View>
                    </View>

                    {/* Questions Created Card */}
                    <View style={styles.resourceCard}>
                      <View style={styles.resourceHeader}>
                        <View style={styles.resourceTitleRow}>
                          <View style={[styles.resourceIconBg, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
                            <Feather name="help-circle" size={15} color="#2563EB" />
                          </View>
                          <Text style={styles.resourceName}>QUESTIONS CREATED</Text>
                        </View>
                        <Text style={styles.resourcePercent}>{questionsPercent.toFixed(0)}% capacity</Text>
                      </View>
                      <View style={styles.resourceStatsRow}>
                        <Text style={styles.resourceValueUsed}>
                          {formatLimitNumber(questionsUsed)}
                        </Text>
                        <Text style={styles.resourceValueLimit}>
                          {' / ' + formatLimitNumber(questionsLimit)}
                        </Text>
                      </View>
                      <Text style={styles.resourceValueLabel}>Created This Month</Text>
                      <View style={styles.resourceProgressBarBg}>
                        <View style={[styles.resourceProgressBarFill, { width: `${questionsPercent}%`, backgroundColor: '#2563EB' }]} />
                      </View>
                    </View>

                    {/* Storage Used Card */}
                    <View style={styles.resourceCard}>
                      <View style={styles.resourceHeader}>
                        <View style={styles.resourceTitleRow}>
                          <View style={[styles.resourceIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                            <Feather name="database" size={15} color="#10B981" />
                          </View>
                          <Text style={styles.resourceName}>STORAGE USED</Text>
                        </View>
                        <Text style={styles.resourcePercent}>{storagePercent.toFixed(0)}% capacity</Text>
                      </View>
                      <View style={styles.resourceStatsRow}>
                        <Text style={styles.resourceValueUsed}>
                          {storageUsed.toFixed(1) + ' MB'}
                        </Text>
                        <Text style={styles.resourceValueLimit}>
                          {' / ' + (storageLimit >= 1024 ? (storageLimit / 1024).toFixed(1) + ' GB' : storageLimit + ' MB')}
                        </Text>
                      </View>
                      <Text style={styles.resourceValueLabel}>R2 Bucket Volume</Text>
                      <View style={styles.resourceProgressBarBg}>
                        <View style={[styles.resourceProgressBarFill, { width: `${storagePercent}%`, backgroundColor: '#10B981' }]} />
                      </View>
                    </View>

                    {/* Workspace Status dark glass Card */}
                    <View style={styles.workspaceStatusCard}>
                      <View style={styles.workspaceHeaderRow}>
                        <Feather name="shield" size={14} color="#94A3B8" />
                        <Text style={styles.workspaceHeaderTitle}>Workspace Status</Text>
                      </View>

                      <View style={styles.workspaceDetailRow}>
                        <Text style={styles.workspaceDetailLabel}>Account ID</Text>
                        <TouchableOpacity 
                          onPress={() => {
                            if (freshUser?.instituteId) {
                              const Clipboard = require('react-native').Clipboard;
                              Clipboard.setString(freshUser.instituteId);
                              Alert.alert('Copied', 'Account ID copied to clipboard!');
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.workspaceDetailValue, { color: '#818CF8', textDecorationLine: 'underline' }]} numberOfLines={1}>
                            {freshUser?.instituteId || '2648f762-bc87-48e3-82eb-31a0ca0d3fc2'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.workspaceDetailRow}>
                        <Text style={styles.workspaceDetailLabel}>Account Status</Text>
                        <View style={styles.workspaceStatusDotRow}>
                          <View style={styles.workspaceStatusDot} />
                          <Text style={styles.workspaceStatusText}>
                            Active ({freshUser?.instituteStatus || user?.instituteStatus || 'সক্রিয়'})
                          </Text>
                        </View>
                      </View>

                      <View style={styles.workspaceDetailRow}>
                        <Text style={styles.workspaceDetailLabel}>Member Since</Text>
                        <Text style={styles.workspaceDetailValue}>
                          {freshUser?.createdAt ? formatDate(freshUser.createdAt) : '24 May 2026'}
                        </Text>
                      </View>

                      <View style={styles.workspaceDetailRow}>
                        <Text style={styles.workspaceDetailLabel}>Plan Expiry Date</Text>
                        <Text style={styles.workspaceDetailValue}>
                          {formatDate(freshUser?.expiryDate || freshUser?.planEndDate)}
                        </Text>
                      </View>

                      {/* Workspace Limit small cards */}
                      <View style={styles.workspaceLimitsGrid}>
                        <View style={styles.workspaceLimitBox}>
                          <Text style={styles.workspaceLimitVal}>
                            {freshUser?.maxTeachers ?? 10}
                          </Text>
                          <Text style={styles.workspaceLimitLbl}>Teachers Quota</Text>
                        </View>
                        <View style={styles.workspaceLimitBox}>
                          <Text style={styles.workspaceLimitVal}>
                            {freshUser?.maxStudents ?? 100}
                          </Text>
                          <Text style={styles.workspaceLimitLbl}>Students Quota</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.infoBoxText}>
                      To upgrade your subscription limits or change payment structures, please contact your workspace administrator or login via our Web Dashboard.
                    </Text>
                  </View>
                );
              })()}

              {profileSubTab === 'academic' && (() => {
                const activeSubjectsList: any[] = [];
                
                if (academicHierarchy?.classSubjects) {
                  academicHierarchy.classSubjects.forEach((cs: any) => {
                    if (assignedSubjects.includes(cs.id)) {
                      const cls = academicHierarchy.classes?.find((c: any) => c.id === cs._classId);
                      activeSubjectsList.push({
                        classSubject: cs,
                        cls: cls
                      });
                    }
                  });
                }

                return (
                  <View style={styles.formContainer}>
                    <Text style={styles.formSectionTitle}>Academic Scope Access</Text>
                    
                    {loadingSubjects ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
                    ) : (
                      <>
                        <Text style={styles.infoBoxText}>
                          Your account has licensing access to subjects inside this institute. Below is the list of active scope permissions:
                        </Text>
                        
                        <View style={styles.subjectsScopeList}>
                          {activeSubjectsList.length > 0 ? (
                            activeSubjectsList.map(({ classSubject, cls }, idx) => (
                              <View key={classSubject.id || idx} style={styles.scopeItem}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                                  <View style={[styles.resourceIconBg, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                                    <Feather name="book-open" size={14} color="#10B981" />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.text }}>
                                      {classSubject.name}
                                    </Text>
                                    <Text style={{ fontSize: 9, color: theme.colors.textMuted, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 }}>
                                      {cls?.name || 'Class'} • {cls?._streamName || 'General'}
                                    </Text>
                                  </View>
                                </View>
                                
                                <View style={styles.premiumActiveBadge}>
                                  <Text style={styles.premiumActiveBadgeText}>Active</Text>
                                </View>
                              </View>
                            ))
                          ) : (
                            <View style={styles.scopeItem}>
                              <View style={[styles.resourceIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                                <Feather name="info" size={14} color={theme.colors.primary} />
                              </View>
                              <Text style={[styles.scopeItemText, { marginLeft: 10 }]}>
                                {user?.roles?.includes('SUPER_ADMIN') 
                                  ? 'Super Admin Mode - Unlimited global curriculum access'
                                  : 'Default curriculum scope activated for your teacher workspace'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                );
              })()}
            </View>

            {/* Logout Row - Hidden per user request as it is now in the bottom navigation bar */}
            {/* 
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Feather name="log-out" size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.logoutBtnText}>Logout Account</Text>
            </TouchableOpacity>
            */}
          </ScrollView>
        ) : null}

        {/* ─── Keep AI Workspace WebView mounted in the background ─── */}
        <View style={{ flex: 1, display: (activeTab === 'ai-workspace' && !isWebViewActive) ? 'flex' : 'none' }}>
          {webViewUrl ? (
            <WebView
              ref={webViewRef}
              source={{ uri: webViewUrl }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              injectedJavaScriptBeforeContentLoaded={`
                try {
                  localStorage.setItem('token', ${JSON.stringify(token || '')});
                  localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user || {}))});
                } catch(e) {}
                true;
              `}
              injectedJavaScript={`
                try {
                  localStorage.setItem('token', ${JSON.stringify(token || '')});
                  localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user || {}))});
                } catch(e) {}
                true;
              `}
              onNavigationStateChange={(navState) => {
                if (navState.url.includes('/login')) {
                  if (!token) return;
                  const relativePath = getRelativePath(webViewUrl);
                  const now = Date.now();
                  const lastAttempt = lastAutoLoginTime.current[relativePath] || 0;
                  if (now - lastAttempt < 5000) {
                    console.warn("Auto-login redirect loop detected. Logging out...");
                    logout();
                    return;
                  }
                  lastAutoLoginTime.current[relativePath] = now;
                  webViewRef.current?.injectJavaScript(`
                    try {
                      localStorage.setItem('token', ${JSON.stringify(token)});
                      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user || {}))});
                      window.location.replace(${JSON.stringify(relativePath)});
                    } catch(e) {}
                    true;
                  `);
                }
              }}
              onLoadProgress={({ nativeEvent }) => setWebProgress(nativeEvent.progress)}
              onLoadStart={() => setWebLoading(true)}
              onLoadEnd={() => setWebLoading(false)}
              onMessage={handleWebViewMessage}
              style={{ flex: 1 }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webLoaderOverlay}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              )}
              renderError={() => (
                <View style={styles.webErrorOverlay}>
                  <Feather name="wifi-off" size={40} color="#EF4444" style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 }}>
                    নেটওয়ার্ক সংযোগ নেই
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 24, marginBottom: 16 }}>
                    অনুগ্রহ করে আপনার ইন্টারনেট সংযোগটি পরীক্ষা করুন এবং পুনরায় চেষ্টা করুন।
                  </Text>
                  <TouchableOpacity 
                    onPress={() => webViewRef.current?.reload()}
                    style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>পুনরায় চেষ্টা করুন</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : null}
        </View>

        {/* ─── Keep Quick Actions Embedded WebView mounted ─── */}
        <View style={{ flex: 1, display: isWebViewActive ? 'flex' : 'none' }}>
          {isWebViewActive && !hideMobileLayoutBars && (
            <View style={[styles.webHeader, { height: 48, paddingHorizontal: 12 }]}>
              <TouchableOpacity 
                onPress={() => {
                  if (canGoBack) {
                    quickActionWebViewRef.current?.goBack();
                  } else {
                    handleCloseEmbeddedWebView();
                  }
                }} 
                style={[styles.webCloseBtn, { padding: 4 }]}
                activeOpacity={0.7}
              >
                <Feather name={canGoBack ? "arrow-left" : "chevron-left"} size={22} color={theme.colors.text} />
              </TouchableOpacity>
              
              <View style={styles.webTitleContainer}>
                <Text style={[styles.webTitleText, { fontSize: 14, fontWeight: 'bold' }]} numberOfLines={1}>
                  {webViewTitle === 'Saved Exams Drive' ? 'সেভড এক্সাম ড্রাইভ (Saved Exams)' : webViewTitle}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TouchableOpacity 
                  onPress={() => quickActionWebViewRef.current?.reload()} 
                  style={[styles.webRefreshBtn, { padding: 4 }]}
                  activeOpacity={0.7}
                >
                  <Feather name="refresh-cw" size={15} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleCloseEmbeddedWebView} 
                  style={[styles.webCloseBtn, { padding: 4 }]}
                  activeOpacity={0.7}
                >
                  <Feather name="x" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {quickActionUrl ? (
            <WebView
              ref={quickActionWebViewRef}
              source={{ uri: quickActionUrl }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              injectedJavaScriptBeforeContentLoaded={`
                try {
                  localStorage.setItem('token', ${JSON.stringify(token || '')});
                  localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user || {}))});
                } catch(e) {}
                true;
              `}
              injectedJavaScript={`
                try {
                  localStorage.setItem('token', ${JSON.stringify(token || '')});
                  localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user || {}))});
                } catch(e) {}
                true;
              `}
              onNavigationStateChange={(navState) => {
                setCanGoBack(navState.canGoBack);
                if (navState.url.includes('/login')) {
                  if (!token) return;
                  const relativePath = getRelativePath(quickActionUrl);
                  const now = Date.now();
                  const lastAttempt = lastAutoLoginTime.current[relativePath] || 0;
                  if (now - lastAttempt < 5000) {
                    console.warn("Auto-login redirect loop detected. Logging out...");
                    logout();
                    return;
                  }
                  lastAutoLoginTime.current[relativePath] = now;
                  quickActionWebViewRef.current?.injectJavaScript(`
                    try {
                      localStorage.setItem('token', ${JSON.stringify(token)});
                      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user || {}))});
                      window.location.replace(${JSON.stringify(relativePath)});
                    } catch(e) {}
                    true;
                  `);
                }
              }}
              onLoadProgress={({ nativeEvent }) => setQuickActionProgress(nativeEvent.progress)}
              onLoadStart={() => setQuickActionLoading(true)}
              onLoadEnd={() => setQuickActionLoading(false)}
              onMessage={handleWebViewMessage}
              style={{ flex: 1 }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webLoaderOverlay}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
              )}
              renderError={() => (
                <View style={styles.webErrorOverlay}>
                  <Feather name="wifi-off" size={40} color="#EF4444" style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 }}>
                    নেটওয়ার্ক সংযোগ নেই
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 24, marginBottom: 16 }}>
                    অনুগ্রহ করে আপনার ইন্টারনেট সংযোগটি পরীক্ষা করুন এবং পুনরায় চেষ্টা করুন।
                  </Text>
                  <TouchableOpacity 
                    onPress={() => quickActionWebViewRef.current?.reload()}
                    style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>পুনরায় চেষ্টা করুন</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          ) : null}
          
          
        </View>
      </View>

      {/* ─── Custom Bottom Navigation Bar ─── */}
      {!hideMobileLayoutBars && (
        <View style={styles.bottomNav}>
          <TouchableOpacity 
            style={[styles.navItem, activeTab === 'home' && !isWebViewActive && styles.navItemActive]}
            onPress={() => changeTab('home')}
            activeOpacity={0.9}
          >
            <Feather name="home" size={20} color={activeTab === 'home' && !isWebViewActive ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.navText, activeTab === 'home' && !isWebViewActive && styles.navTextActive]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, activeTab === 'ai-workspace' && !isWebViewActive && styles.navItemActive]}
            onPress={() => changeTab('ai-workspace')}
            activeOpacity={0.9}
          >
            <Feather name="zap" size={20} color={activeTab === 'ai-workspace' && !isWebViewActive ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.navText, activeTab === 'ai-workspace' && !isWebViewActive && styles.navTextActive]}>
              AI Workspace
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navItem}
            onPress={handleLogout}
            activeOpacity={0.9}
          >
            <Feather name="log-out" size={20} color={theme.colors.textMuted} />
            <Text style={styles.navText}>
              Logout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.navItem, activeTab === 'profile' && !isWebViewActive && styles.navItemActive]}
            onPress={() => changeTab('profile')}
            activeOpacity={0.9}
          >
            <Feather name="user" size={20} color={activeTab === 'profile' && !isWebViewActive ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={[styles.navText, activeTab === 'profile' && !isWebViewActive && styles.navTextActive]}>
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Subject breakdown Modal */}
      <Modal
        visible={showSubjectsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubjectsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Approved Questions</Text>
                <Text style={styles.modalSubtitle}>Breakdown by Subject</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={() => setShowSubjectsModal(false)}
              >
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {(() => {
                if (!liveStats?.subjectQuestions || liveStats.subjectQuestions.length === 0) {
                  return (
                    <View style={styles.modalEmptyContainer}>
                      <Feather name="info" size={40} color={theme.colors.textMuted} />
                      <Text style={styles.modalEmptyText}>No subject metrics available</Text>
                    </View>
                  );
                }
                const total = liveStats.subjectQuestions.reduce((acc: number, curr: any) => acc + curr.count, 0);
                return liveStats.subjectQuestions.map((sub: any, index: number) => {
                  const percent = total > 0 ? Math.round((sub.count / total) * 100) : 0;
                  const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#10b981'];
                  const color = colors[index % colors.length];

                  return (
                    <View key={index} style={styles.modalSubjectCard}>
                      <View style={styles.modalSubjectInfo}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.modalSubjectName}>{sub.subjectName}</Text>
                          <Text style={styles.modalSubjectMeta}>
                            {sub.version} • {sub.levelName} • {sub.className}
                          </Text>
                        </View>
                        <Text style={styles.modalSubjectCount}>{sub.count.toLocaleString()}</Text>
                      </View>
                      
                      <View style={styles.modalProgressBarBg}>
                        <View style={[styles.modalProgressBarFill, { width: `${percent}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={styles.modalSubjectPercent}>{percent}% of total approved</Text>
                    </View>
                  );
                });
              })()}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCloseFooterBtn}
                onPress={() => setShowSubjectsModal(false)}
              >
                <Text style={styles.modalCloseFooterBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Question breakdown & types Modal */}
      <Modal
        visible={showQuestionStatsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuestionStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Questions Stats & Types</Text>
                <Text style={styles.modalSubtitle}>Breakdown and recent creations</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={() => setShowQuestionStatsModal(false)}
              >
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Question Types Distribution section */}
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12, marginTop: 4 }}>
                Question Types Distribution
              </Text>
              {liveStats?.questionTypes && liveStats.questionTypes.length > 0 ? (
                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 }}>
                  {liveStats.questionTypes.map((type: any, index: number) => {
                    return (
                      <View key={index} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#475569' }}>
                            {type.name === 'MCQ' ? 'MCQ (বহুনির্বাচনী)' : type.name === 'CQ' ? 'CQ (সৃজনশীল)' : type.name === 'Short' ? 'Short (সংক্ষিপ্ত)' : type.name}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: type.color || theme.colors.primary }}>
                            {type.value}%
                          </Text>
                        </View>
                        <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${type.value}%`, backgroundColor: type.color || theme.colors.primary }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 20 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>No question types data available</Text>
                </View>
              )}

              {/* Recent Questions list section */}
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12 }}>
                Recent Questions Asked/Created
              </Text>
              {liveStats?.recentActivities && liveStats.recentActivities.length > 0 ? (
                <View style={{ gap: 10 }}>
                  {liveStats.recentActivities.map((act: any, idx: number) => {
                    let color = theme.colors.primary;
                    let icon = 'edit';
                    if (act.desc?.includes('MCQ') || act.action?.includes('MCQ')) {
                      color = '#F59E0B';
                      icon = 'plus-circle';
                    } else if (act.status === 'APPROVED') {
                      color = '#10B981';
                      icon = 'check-circle';
                    } else if (act.status === 'REJECTED') {
                      color = '#EF4444';
                      icon = 'x-circle';
                    }

                    return (
                      <View key={idx} style={[styles.activityRow, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 16, padding: 12, marginHorizontal: 0, marginBottom: 0 }]}>
                        <View style={[styles.activityIconBg, { backgroundColor: color + '10' }]}>
                          <Feather name={icon as any} size={15} color={color} />
                        </View>
                        <View style={styles.activityMeta}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#475569' }}>{act.user}</Text>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.colors.text, marginTop: 2 }} numberOfLines={2}>{act.action}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <View style={{ backgroundColor: act.status === 'APPROVED' ? '#ECFDF5' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: 'bold', color: act.status === 'APPROVED' ? '#059669' : '#D97706' }}>
                                {act.status}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>{formatTime(act.time)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={{ padding: 20, alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16 }}>
                  <Text style={{ fontSize: 11, color: theme.colors.textMuted }}>No recent activities available</Text>
                </View>
              )}

            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCloseFooterBtn}
                onPress={() => setShowQuestionStatsModal(false)}
              >
                <Text style={styles.modalCloseFooterBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- Dynamic Auto-Update Overlay Modal --- */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (updateInfo && !updateInfo.forceUpdate) {
            setShowUpdateModal(false);
          }
        }}
      >
        <View style={styles.updateModalOverlay}>
          <View style={styles.updateModalContainer}>
            <View style={styles.updateModalHeader}>
              <View style={styles.updateIconContainer}>
                <Ionicons name="cloud-download-outline" size={32} color="#2563EB" />
              </View>
              <Text style={styles.updateModalTitle}>New Update Available!</Text>
              <Text style={styles.updateModalSubtitle}>
                Version {updateInfo?.versionName} (Build {updateInfo?.versionCode}) is now live.
              </Text>
            </View>

            <ScrollView style={styles.updateChangelogScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.updateChangelogHeader}>WHAT'S NEW</Text>
              <Text style={styles.updateChangelogText}>
                {updateInfo?.changelog || '• Performance enhancements and general bug fixes.'}
              </Text>
            </ScrollView>

            <View style={styles.updateModalActions}>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={() => {
                  if (updateInfo?.downloadUrl) {
                    // For Android APK file uploads, use the new in-app downloader
                    if (Platform.OS === 'android' && updateInfo.releaseType === 'FILE_UPLOAD') {
                      downloadAndInstallApk(updateInfo.downloadUrl);
                    } else {
                      // Fallback for iOS / store links
                      Linking.openURL(updateInfo.downloadUrl);
                    }
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.updateButtonText}>Update Now</Text>
                <Feather name="arrow-right" size={16} color="#FFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              {updateInfo && !updateInfo.forceUpdate && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => setShowUpdateModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.skipButtonText}>Later</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* --- In-App Download Progress Overlay Modal --- */}
      <Modal
        visible={isDownloading}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // Block dismissal
      >
        <View style={styles.updateModalOverlay}>
          <View style={styles.updateModalContainer}>
            <View style={styles.updateModalHeader}>
              <View style={[styles.updateIconContainer, { backgroundColor: 'rgba(37, 99, 235, 0.08)' }]}>
                <ActivityIndicator size="large" color="#2563EB" />
              </View>
              <Text style={styles.updateModalTitle}>Downloading Update</Text>
              <Text style={[styles.updateModalSubtitle, { color: theme.colors.textMuted }]}>
                দয়া করে অপেক্ষা করুন, প্রজেক্ট আপডেট ফাইলটি সংগ্রহ করা হচ্ছে...
              </Text>
            </View>

            {/* Custom linear progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {downloadStatusText}
              </Text>
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
    backgroundColor: '#F8F9FC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...theme.shadows.sm,
    zIndex: 10,
  },
  headerLogoImage: {
    height: 28,
    width: 130,
  },
  headerLogoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerLogoText: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  headerNotificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerNotificationBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerXpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerXpText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: '#D97706',
  },
  content: {
    flex: 1,
  },
  scrollPadding: {
    padding: 20,
    paddingBottom: 40,
  },
  workspaceBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  workspaceInfo: {
    zIndex: 2,
    flex: 1,
  },
  bannerSubtitle: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: '#60A5FA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    color: '#FFF',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  bannerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bannerBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: theme.typography.weights.bold,
  },
  bannerIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    zIndex: 1,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  glassBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    zIndex: 0,
  },
  statCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...theme.shadows.sm,
  },
  tabletStatCard: {
    width: '100%',
  },
  statIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  statValue: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
    marginTop: 2,
  },
  glassyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  actionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    textAlign: 'center',
  },
  activitiesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 8,
    ...theme.shadows.sm,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityMeta: {
    flex: 1,
    marginLeft: 12,
  },
  activityAction: {
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  activityDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.bold,
  },
  profileHeader: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  profileBanner: {
    height: 90,
    backgroundColor: theme.colors.primary,
  },
  profileMetaArea: {
    alignItems: 'center',
    paddingBottom: 20,
    marginTop: -40,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  profileAvatarContainer: {
    position: 'relative',
    ...theme.shadows.md,
  },
  profileAvatarImg: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  profileAvatarEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  profileAvatarTxt: {
    fontSize: 32,
    fontWeight: theme.typography.weights.black,
    color: '#FFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 10,
  },
  profileEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  xpText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: '#D97706',
    marginLeft: 6,
  },
  subTabsContainer: {
    marginBottom: 16,
  },
  subTabsContent: {
    gap: 8,
    paddingRight: 20,
  },
  subTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabItemActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  subTabTextActive: {
    color: '#FFF',
  },
  subTabContentArea: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#FFF',
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  inputHelpText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginLeft: 4,
  },
  saveBtn: {
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    ...theme.shadows.sm,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
  },
  guidelinesBox: {
    backgroundColor: '#FAFBFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  guidelineTitle: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guidelineText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
  guidelineTextMet: {
    color: '#10B981',
    fontWeight: theme.typography.weights.semibold,
  },
  premiumPlanCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  premiumPlanGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.12)', // Subtle indigo glow
  },
  premiumPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  premiumActiveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  premiumActiveBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumPlanCode: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  premiumPlanTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
  },
  premiumPlanDesc: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  premiumPlanPriceArea: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  premiumPlanPrice: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: theme.typography.weights.black,
  },
  premiumPlanPeriod: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resourceSectionTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: 12,
    marginTop: 10,
  },
  resourceCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    ...theme.shadows.sm,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resourceIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  resourcePercent: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  resourceStatsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  resourceValueUsed: {
    fontSize: 18,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  resourceValueLimit: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: 'semibold',
  },
  resourceValueLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  resourceProgressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  resourceProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  workspaceStatusCard: {
    backgroundColor: '#0F172A',
    borderRadius: 22,
    padding: 18,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...theme.shadows.md,
  },
  workspaceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 8,
  },
  workspaceHeaderTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  workspaceDetailRow: {
    marginBottom: 12,
  },
  workspaceDetailLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  workspaceDetailValue: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: 'semibold',
  },
  workspaceStatusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workspaceStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  workspaceStatusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  workspaceLimitsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
  },
  workspaceLimitBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  workspaceLimitVal: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'black',
  },
  workspaceLimitLbl: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  infoBoxText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    backgroundColor: '#F8F9FC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subjectsScopeList: {
    marginTop: 12,
    gap: 8,
  },
  scopeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8F9FC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scopeItemText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
    marginLeft: 8,
    flex: 1,
  },
  logoutBtn: {
    height: 48,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...theme.shadows.md,
  },
  logoutBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
  },
  bottomNav: {
    height: 64,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
    ...theme.shadows.lg,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    // optional scaling or coloring can happen in style triggers
  },
  navText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.bold,
    marginTop: 3,
  },
  navTextActive: {
    color: theme.colors.primary,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    maxHeight: '80%',
    padding: 20,
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalScrollContent: {
    paddingVertical: 5,
  },
  modalSubjectCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F9FC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSubjectMeta: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.semibold,
    marginTop: 2,
  },
  modalSubjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalSubjectName: {
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  modalSubjectCount: {
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  modalProgressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  modalSubjectPercent: {
    fontSize: 9,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
    fontWeight: theme.typography.weights.semibold,
  },
  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  modalEmptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 10,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 15,
    marginTop: 10,
    alignItems: 'flex-end',
  },
  modalCloseFooterBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalCloseFooterBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
  },
  greetingHeader: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 20,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.sm,
  },
  greetingWelcome: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.semibold,
  },
  greetingName: {
    fontSize: 22,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginTop: 2,
  },
  aiWorkspaceCard: {
    backgroundColor: '#6D28D9',
    borderRadius: 20,
    padding: 18,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  aiWorkspaceBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 99,
    marginBottom: 8,
  },
  aiWorkspaceBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  aiWorkspaceTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiWorkspaceDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 12,
  },
  aiWorkspaceBtn: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiWorkspaceBtnText: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.sm,
  },
  notificationCardUnread: {
    borderColor: theme.colors.primary + '30',
    backgroundColor: theme.colors.primaryLight + '40',
  },
  notificationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationCardTitle: {
    fontSize: 13,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  notificationCardBody: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  notificationCardTime: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.semibold,
    marginTop: 6,
  },
  notificationsList: {
    marginTop: 10,
  },
  navNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  markAllReadText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.bold,
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyNotificationsText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: theme.typography.weights.medium,
  },
  savedExamsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 5,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: theme.typography.weights.medium,
  },
  examsListContainer: {
    gap: 12,
    marginTop: 8,
  },
  examCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    position: 'relative',
    ...theme.shadows.sm,
  },
  examCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  examTitle: {
    fontSize: 14,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  examMeta: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: theme.typography.weights.medium,
  },
  deleteExamBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    zIndex: 2,
  },
  examStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  examStatText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontWeight: theme.typography.weights.semibold,
  },
  examBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    zIndex: 2,
  },
  examBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  examBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.textSecondary,
  },
  emptyExamsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyExamsTitle: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  emptyExamsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  webModalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  webHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  webCloseBtn: {
    padding: 8,
  },
  webTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  webTitleText: {
    fontSize: 15,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  webSubtitleText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 1,
    fontWeight: theme.typography.weights.semibold,
  },
  webRefreshBtn: {
    padding: 8,
  },
  webProgressBarBg: {
    height: 3,
    backgroundColor: '#F1F5F9',
    width: '100%',
  },
  webProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  webLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webErrorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  updateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  updateModalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    alignItems: 'center',
  },
  updateModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  updateIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  updateModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  updateModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  updateChangelogScroll: {
    width: '100%',
    maxHeight: 150,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
  },
  updateChangelogHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  updateChangelogText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 20,
  },
  updateModalActions: {
    width: '100%',
    gap: 12,
  },
  updateButton: {
    width: '100%',
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  skipButton: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },

});
