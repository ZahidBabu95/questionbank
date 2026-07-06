import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Mail, Phone, Lock, Eye, EyeOff, Save, Key, Shield, AlertTriangle, 
    Upload, Zap, Database, Activity, Check, CheckSquare, Square, ChevronDown, 
    ChevronUp, RefreshCw, Globe, Cpu, Award, HardDrive, Layout, CheckCircle, Info, BookOpen
} from 'lucide-react';
import axios from '../../../utils/axios';
import userService from '../../../services/userService';
import instituteService from '../../../services/instituteService';
import billingService from '../../../services/billingService';
import academicService from '../../../services/academicService';
import { useLanguage } from '../../../context/LanguageContext';

const MyProfile = () => {
    const navigate = useNavigate();
    const { t, currentLang } = useLanguage();
    const isBn = currentLang === 'bn';
    // Current user and workspace state
    const [user, setUser] = useState(null);
    const [institute, setInstitute] = useState(null);
    const [loginHistory, setLoginHistory] = useState([]);
    const [billingPackages, setBillingPackages] = useState([]);
    const [hierarchy, setHierarchy] = useState(null);
    const [assignedSubjectIds, setAssignedSubjectIds] = useState([]);
    const [stats, setStats] = useState(null);

    // UI and loading states
    const [activeTab, setActiveTab] = useState('personal'); // personal, security, subscription, academic
    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [updatingSubscription, setUpdatingSubscription] = useState(false);
    const [savingSubjects, setSavingSubjects] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Form inputs state
    const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
    const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [showPwd, setShowPwd] = useState({ old: false, new: false, confirm: false });
    const [selectedPackageId, setSelectedPackageId] = useState('');

    // Collapsible hierarchy controls
    const [expandedStreams, setExpandedStreams] = useState({});
    const [expandedClasses, setExpandedClasses] = useState({});

    // Custom payment modal states for subjects
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [subjectToActivate, setSubjectToActivate] = useState(null);
    const [paymentStep, setPaymentStep] = useState('confirm'); // confirm, method, submitting, success
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bkash');

    // Toast/Alert Notifications
    const [notification, setNotification] = useState(null); // { message: '', type: 'success' | 'error' }

    // Drag and Drop files
    const [dragActive, setDragActive] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    const showMsg = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (!storedUser.id) {
                    showMsg('User not logged in', 'error');
                    setLoading(false);
                    return;
                }

                // 1. Fetch current User Details
                const userRes = await userService.getUserById(storedUser.id);
                if (userRes.success) {
                    const userData = userRes.data;
                    setUser(userData);
                    setProfileForm({
                        name: userData.name || '',
                        phone: userData.phone || '',
                        instituteNameEn: userData.instituteNameEn || '',
                        instituteNameBn: userData.instituteNameBn || ''
                    });

                    // 2. Fetch login history
                    fetchLoginHistory(userData.id);

                    // 3. Fetch Institute details if exists
                    if (userData.instituteId) {
                        fetchInstituteDetails(userData.instituteId);
                        
                        // Check if user is Workspace Admin to fetch billing packages and academic hierarchy
                        const isAdmin = userData.roles?.includes('INSTITUTE_ADMIN') || userData.roles?.includes('SUPER_ADMIN');
                        if (isAdmin) {
                            fetchBillingPackages();
                            fetchAcademicHierarchy();
                            fetchAssignedSubjects(userData.instituteId);
                            // Fetch user stats for active/remaining slots calculations
                            try {
                                const statsRes = await userService.getUserStats();
                                if (statsRes.success) {
                                    setStats(statsRes.data);
                                }
                            } catch (e) {
                                console.error("Failed to load user stats for limits card", e);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load profile data", err);
                showMsg('Failed to fetch profile details', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const fetchInstituteDetails = async (instituteId) => {
        try {
            const data = await instituteService.getInstitute(instituteId);
            setInstitute(data);
            if (data.subscriptionPackage?.id) {
                setSelectedPackageId(data.subscriptionPackage.id);
            }
        } catch (err) {
            console.error("Failed to fetch institute data", err);
        }
    };

    const fetchLoginHistory = async (userId) => {
        try {
            setHistoryLoading(true);
            const historyRes = await userService.getLoginHistory(userId, 0, 10);
            if (historyRes.success) {
                setLoginHistory(historyRes.data?.content || []);
            }
        } catch (err) {
            console.error("Failed to fetch login history", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchBillingPackages = async () => {
        try {
            const pkgs = await billingService.getPackages();
            const list = Array.isArray(pkgs) ? pkgs : (pkgs?.data || []);
            setBillingPackages(list.filter(pkg => pkg.status === 'ACTIVE'));
        } catch (err) {
            console.error("Failed to fetch packages", err);
        }
    };

    const fetchAcademicHierarchy = async () => {
        try {
            const data = await academicService.getHierarchy(true); // bypass tenant filters
            setHierarchy(data);
        } catch (err) {
            console.error("Failed to fetch curriculum hierarchy", err);
        }
    };

    const fetchAssignedSubjects = async (instituteId) => {
        try {
            const assigned = await instituteService.getAssignedSubjects(instituteId);
            setAssignedSubjectIds(assigned || []);
        } catch (err) {
            console.error("Failed to fetch assigned subjects", err);
        }
    };

    // User Profile Form Handlers
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const res = await axios.patch('/v1/users/profile', {
                name: profileForm.name,
                phone: profileForm.phone,
                instituteNameEn: profileForm.instituteNameEn,
                instituteNameBn: profileForm.instituteNameBn
            });
            if (res.data.success) {
                showMsg('Profile updated successfully!', 'success');
                const updatedUser = res.data.data;
                setUser(updatedUser);
                // Update local storage
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ 
                    ...storedUser, 
                    name: updatedUser.name, 
                    phone: updatedUser.phone,
                    instituteNameEn: updatedUser.instituteNameEn,
                    instituteNameBn: updatedUser.instituteNameBn
                }));
                window.dispatchEvent(new Event('storage'));
            }
        } catch (err) {
            showMsg(err.response?.data?.message || 'Failed to update profile details', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            showMsg('New passwords do not match!', 'error');
            return;
        }
        if (pwdForm.newPassword.length < 6) {
            showMsg('Password must be at least 6 characters long!', 'error');
            return;
        }

        setChangingPassword(true);
        try {
            const res = await axios.patch('/v1/users/profile/password', {
                oldPassword: pwdForm.oldPassword,
                newPassword: pwdForm.newPassword
            });
            if (res.data.success) {
                showMsg('Password changed successfully!', 'success');
                setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (err) {
            showMsg(err.response?.data?.message || 'Failed to update password. Verify current password.', 'error');
        } finally {
            setChangingPassword(false);
        }
    };

    // Subscription & Package Upgrader Handlers
    const handleUpgradeSubscription = async (packageId) => {
        if (!institute?.id) return;
        
        const pkg = billingPackages.find(p => p.id === packageId);
        const price = Number(pkg?.price) || 0;
        if (price > 0) {
            const proceed = window.confirm(`Your total comes to ৳${price}.\nProceed to the payment gateway to pay and update your subscription?`);
            if (!proceed) return;
            alert('Mock Payment Successful! Proceeding with subscription upgrade...');
        }
        
        setUpdatingSubscription(true);
        setSelectedPackageId(packageId);
        try {
            const data = await instituteService.updateSubscriptionPackage(institute.id, packageId);
            setInstitute(data);
            showMsg('Subscription package updated successfully!', 'success');
        } catch (err) {
            showMsg(err.response?.data?.message || 'Failed to upgrade subscription package', 'error');
        } finally {
            setUpdatingSubscription(false);
        }
    };

    // Subject Checklist assignment toggles
    const handleSubjectToggle = (classSubjectId) => {
        setAssignedSubjectIds(prev => 
            prev.includes(classSubjectId) 
                ? prev.filter(id => id !== classSubjectId) 
                : [...prev, classSubjectId]
        );
    };

    const handleClassSubjectsSelectAll = (classSubjectIds, select) => {
        setAssignedSubjectIds(prev => {
            if (select) {
                return Array.from(new Set([...prev, ...classSubjectIds]));
            } else {
                return prev.filter(id => !classSubjectIds.includes(id));
            }
        });
    };

    const saveAssignedSubjects = async () => {
        if (!institute?.id) return;
        setSavingSubjects(true);
        try {
            await instituteService.assignSubjects(institute.id, assignedSubjectIds);
            showMsg('Academic subject access scope updated successfully!', 'success');
            // Refresh local institute stats/access details
            fetchInstituteDetails(institute.id);
        } catch (err) {
            showMsg(err.response?.data?.message || 'Failed to assign subjects', 'error');
        } finally {
            setSavingSubjects(false);
        }
    };

    const getPricingRules = () => {
        if (!institute?.subscriptionPackage) return [];
        let parsedRules = institute.subscriptionPackage.pricingRules;
        if (typeof parsedRules === 'string') {
            try {
                parsedRules = JSON.parse(parsedRules);
            } catch (e) {
                parsedRules = {};
            }
        }
        return parsedRules?.subjects || [];
    };

    const triggerActivateSubject = (classSubject, rule) => {
        if (!isAdmin) {
            showMsg('শুধুমাত্র অ্যাডমিনরা বিষয় অ্যাক্টিভ করতে পারবেন!', 'error');
            return;
        }
        setSubjectToActivate({ classSubject, rule });
        setPaymentStep('confirm');
        setSelectedPaymentMethod('bkash');
        setShowPaymentModal(true);
    };

    const handleActivateSubject = async (classSubjectId) => {
        if (!institute?.id) return;
        setPaymentStep('submitting');
        try {
            const updatedList = Array.from(new Set([...assignedSubjectIds, classSubjectId]));
            await instituteService.assignSubjects(institute.id, updatedList);
            setAssignedSubjectIds(updatedList);
            setPaymentStep('success');
            showMsg('বিষয়টি সফলভাবে সক্রিয় করা হয়েছে!', 'success');
            // Refresh local institute stats/access details
            fetchInstituteDetails(institute.id);
        } catch (err) {
            setPaymentStep('confirm');
            setShowPaymentModal(false);
            showMsg(err.response?.data?.message || 'বিষয়টি সক্রিয় করতে ব্যর্থ হয়েছে', 'error');
        }
    };

    // Avatar Drag & Drop Handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            await uploadAvatar(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            await uploadAvatar(e.target.files[0]);
        }
    };

    const uploadAvatar = async (file) => {
        if (!file.type.startsWith('image/')) {
            showMsg('Please upload a valid image file!', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showMsg('Image size must be less than 2MB!', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploadingAvatar(true);
        try {
            const res = await axios.post(`/v1/users/${user.id}/profile-image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                showMsg('Avatar uploaded successfully!', 'success');
                // Re-fetch user details
                const userRes = await userService.getUserById(user.id);
                if (userRes.success) {
                    setUser(userRes.data);
                    // Update LocalStorage to keep session in sync
                    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ 
                        ...storedUser, 
                        profileImageUrl: userRes.data.profileImageUrl 
                    }));
                    window.dispatchEvent(new Event('storage'));
                }
            }
        } catch (err) {
            showMsg(err.response?.data?.message || 'Failed to upload profile image to Cloudflare R2', 'error');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Utility formatting helpers
    const getPercentage = (used, max) => {
        if (!max || max <= 0) return 0;
        const pct = (used / max) * 100;
        return Math.min(100, Math.max(0, Math.round(pct)));
    };

    const formatLimit = (val) => {
        if (val === null || val === undefined) return "∞";
        if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
        if (val >= 1000) return (val / 1000).toFixed(1) + "K";
        return val;
    };

    const formatStorage = (mb) => {
        if (mb === null || mb === undefined) return "0 MB";
        if (mb >= 1024) return (mb / 1024).toFixed(1) + " GB";
        return Math.round(mb) + " MB";
    };

    const parseUserAgent = (userAgent) => {
        if (!userAgent) return "Unknown Browser";
        let browser = "Unknown Browser";
        let os = "Unknown OS";

        if (userAgent.includes("Chrome")) browser = "Google Chrome";
        else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
        else if (userAgent.includes("Firefox")) browser = "Mozilla Firefox";
        else if (userAgent.includes("Edge")) browser = "Microsoft Edge";

        if (userAgent.includes("Windows")) os = "Windows";
        else if (userAgent.includes("Macintosh")) os = "macOS";
        else if (userAgent.includes("Android")) os = "Android";
        else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
        else if (userAgent.includes("Linux")) os = "Linux";

        return `${browser} on ${os}`;
    };

    const isAdmin = user?.roles?.includes('INSTITUTE_ADMIN') || user?.roles?.includes('SUPER_ADMIN');

    if (loading || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                <p className="text-slate-400 font-medium text-sm animate-pulse">লোড হচ্ছে...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 px-4">
            
            {/* Global Alert Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 max-w-md ${
                            notification.type === 'error' 
                                ? 'bg-rose-50 border-rose-100 text-rose-600' 
                                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        }`}
                    >
                        {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                        <span>{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Profile Cover Banner */}
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-lg border border-slate-800 relative">
                {/* Banner Background Gradient */}
                <div className="h-44 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
                    <div className="absolute -left-16 -top-16 w-56 h-56 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="absolute right-10 -bottom-16 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
                </div>

                {/* Profile User Info Panel */}
                <div className="px-8 pb-6 pt-16 relative flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800">
                    
                    {/* Avatar Editor Uploader Container */}
                    <div 
                        className={`absolute -top-16 left-8 w-32 h-32 rounded-3xl bg-slate-900 p-1.5 border border-slate-700 shadow-xl overflow-hidden cursor-pointer group`}
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-full h-full rounded-2xl overflow-hidden relative bg-slate-800 flex items-center justify-center">
                            {uploadingAvatar ? (
                                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center gap-2">
                                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Uploading</span>
                                </div>
                            ) : user.profileImageUrl ? (
                                <img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            ) : (
                                <span className="text-4xl font-black text-white">{user.name?.charAt(0).toUpperCase()}</span>
                            )}

                            {/* Camera overlay hover */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition duration-200">
                                <Upload size={22} className="mb-1" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                            </div>
                        </div>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange} 
                        />
                    </div>

                    <div className="md:pl-36">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-black text-white">{user.name}</h1>
                            {user.roles?.map(role => (
                                <span 
                                    key={role} 
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        role === 'SUPER_ADMIN' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                        role === 'INSTITUTE_ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                        role === 'TEACHER' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                    }`}
                                >
                                    {role}
                                </span>
                            ))}
                        </div>
                        <p className="text-slate-400 text-sm mt-1.5 flex items-center gap-2">
                            <Mail size={14} className="text-slate-500" /> {user.email}
                            <span className="text-slate-600">•</span>
                            <span className="text-indigo-400 font-bold">{user.instituteName || 'Global Access'}</span>
                        </p>
                    </div>

                    {/* Contribution Points */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3.5 shadow-inner">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                            <Award size={20} />
                        </div>
                        <div>
                            <span className="block text-xl font-black text-white">{user.contributionPoints || 0} XP</span>
                            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Contribution points</span>
                        </div>
                    </div>
                </div>

                {/* Glass Tabs Container */}
                <div className="px-6 py-2 bg-slate-900/50 flex flex-wrap gap-2 text-sm">
                    {[
                        { id: 'personal', label: t('profile_tab_info'), icon: User },
                        { id: 'security', label: t('profile_tab_security'), icon: Shield },
                        { id: 'subscription', label: t('profile_tab_subscription'), icon: Zap },
                        { id: 'academic', label: t('profile_tab_academic'), icon: BookOpen }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-4 py-2.5 rounded-xl font-bold flex items-center gap-2.5 transition duration-200 outline-none ${
                                    active 
                                        ? 'text-white' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                                }`}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                                {active && (
                                    <motion.div 
                                        layoutId="profileActiveTab"
                                        className="absolute inset-0 bg-indigo-600 rounded-xl -z-10 shadow-lg shadow-indigo-600/30"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Side main card depending on tab */}
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden"
                        >
                            
                            {/* TAB 1: PERSONAL INFO */}
                            {activeTab === 'personal' && (
                                <div className="p-8">
                                    <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                        <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><User size={18} /></span>
                                        {t('profile_personal_info')}
                                    </h2>

                                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">{t('profile_email')}</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                    <input 
                                                        type="text" 
                                                        disabled 
                                                        value={user.email} 
                                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 font-medium cursor-not-allowed text-sm"
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5 ml-1">
                                                    <Info size={12} /> {t('profile_email_warning')}
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">{t('profile_name')} *</label>
                                                <div className="relative group">
                                                    <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition duration-200" size={18} />
                                                    <input 
                                                        type="text" 
                                                        required 
                                                        value={profileForm.name} 
                                                        onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                                        placeholder={t('profile_name_placeholder')} 
                                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none rounded-2xl text-slate-800 text-sm font-semibold transition duration-200"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">{t('profile_phone')}</label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition duration-200" size={18} />
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.phone} 
                                                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                                                        placeholder={t('profile_phone_placeholder')} 
                                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none rounded-2xl text-slate-800 text-sm font-semibold transition duration-200"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">{isBn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institute Name (English)'}</label>
                                                <div className="relative group">
                                                    <Globe className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition duration-200" size={18} />
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.instituteNameEn} 
                                                        onChange={(e) => setProfileForm(p => ({ ...p, instituteNameEn: e.target.value }))}
                                                        placeholder={isBn ? 'প্রতিষ্ঠানের নাম ইংরেজিতে লিখুন' : 'Enter your institute name in English'} 
                                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none rounded-2xl text-slate-800 text-sm font-semibold transition duration-200"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">{isBn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Institute Name (Bengali)'}</label>
                                                <div className="relative group">
                                                    <Globe className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition duration-200" size={18} />
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.instituteNameBn} 
                                                        onChange={(e) => setProfileForm(p => ({ ...p, instituteNameBn: e.target.value }))}
                                                        placeholder={isBn ? 'প্রতিষ্ঠানের নাম বাংলায় লিখুন' : 'Enter your institute name in Bengali'} 
                                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none rounded-2xl text-slate-800 text-sm font-semibold transition duration-200"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-3">
                                            <button 
                                                type="submit" 
                                                disabled={savingProfile}
                                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition duration-150"
                                            >
                                                {savingProfile ? (
                                                    <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                                ) : <Save size={18} />}
                                                <span>{savingProfile ? t('profile_btn_saving') : t('profile_btn_save')}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* TAB 2: SECURITY & SESSIONS */}
                            {activeTab === 'security' && (
                                <div className="p-8 space-y-8">
                                    
                                    {/* Password Changer */}
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Key size={18} /></span>
                                            {t('profile_change_password')}
                                        </h2>

                                        <form onSubmit={handlePasswordSubmit} className="space-y-5">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">{t('profile_old_password')}</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                    <input 
                                                        type={showPwd.old ? 'text' : 'password'} 
                                                        required 
                                                        value={pwdForm.oldPassword}
                                                        onChange={(e) => setPwdForm(p => ({ ...p, oldPassword: e.target.value }))}
                                                        placeholder={t('profile_old_password_placeholder')} 
                                                        className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 focus:border-indigo-500 outline-none rounded-2xl text-slate-800 text-sm font-semibold transition duration-200"
                                                    />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowPwd(p => ({ ...p, old: !p.old }))}
                                                        className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                                                    >
                                                        {showPwd.old ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">{t('profile_new_password')}</label>
                                                    <div className="relative">
                                                        <Key className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                        <input 
                                                            type={showPwd.new ? 'text' : 'password'} 
                                                            required 
                                                            minLength={6}
                                                            value={pwdForm.newPassword}
                                                            onChange={(e) => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                                                            placeholder={t('profile_new_password_placeholder')} 
                                                            className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 focus:border-indigo-500 outline-none rounded-2xl text-slate-800 text-sm font-semibold transition duration-200"
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))}
                                                            className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                                                        >
                                                            {showPwd.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">{t('profile_confirm_password')}</label>
                                                    <div className="relative">
                                                        <Shield className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                        <input 
                                                            type={showPwd.confirm ? 'text' : 'password'} 
                                                            required 
                                                            value={pwdForm.confirmPassword}
                                                            onChange={(e) => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                                            placeholder={t('profile_confirm_password_placeholder')} 
                                                            className={`w-full pl-12 pr-12 py-3 bg-white border rounded-2xl focus:outline-none text-sm font-semibold transition duration-200 ${
                                                                pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword
                                                                    ? 'border-rose-300 focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 bg-rose-50/10'
                                                                    : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5'
                                                            }`}
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setShowPwd(p => ({ ...p, confirm: !p.confirm }))}
                                                            className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                                                        >
                                                            {showPwd.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-3">
                                                <button 
                                                    type="submit" 
                                                    disabled={changingPassword || !pwdForm.oldPassword || !pwdForm.newPassword || pwdForm.newPassword !== pwdForm.confirmPassword}
                                                    className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition duration-150"
                                                >
                                                    {changingPassword ? (
                                                        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                                    ) : <Lock size={18} />}
                                                    <span>{changingPassword ? t('profile_btn_updating_password') : t('profile_btn_update_password')}</span>
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="h-px bg-slate-100"></div>

                                    {/* Login Sessions History */}
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Activity size={18} /></span>
                                                {t('profile_recent_sessions')}
                                            </h2>
                                            <button 
                                                onClick={() => fetchLoginHistory(user.id)}
                                                disabled={historyLoading}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition duration-150 disabled:opacity-50"
                                                title={isBn ? 'সেশন লগ রিফ্রেশ করুন' : 'Refresh Session Log'}
                                            >
                                                <RefreshCw size={18} className={historyLoading ? 'animate-spin' : ''} />
                                            </button>
                                        </div>

                                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
                                            <table className="w-full border-collapse text-left text-sm text-slate-500">
                                                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-6 py-4">{isBn ? 'ডিভাইস / ব্রাউজার' : 'Device / Browser'}</th>
                                                        <th className="px-6 py-4">{t('profile_ip')}</th>
                                                        <th className="px-6 py-4">{t('profile_time')}</th>
                                                        <th className="px-6 py-4">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 bg-white">
                                                    {loginHistory.length > 0 ? (
                                                        loginHistory.map(session => (
                                                            <tr key={session.id} className="hover:bg-slate-50/50 transition">
                                                                <td className="px-6 py-4 font-semibold text-slate-700 max-w-[200px] truncate" title={session.userAgent}>
                                                                    {parseUserAgent(session.userAgent)}
                                                                </td>
                                                                <td className="px-6 py-4 font-medium text-slate-500">
                                                                    {session.ipAddress || 'Unknown IP'}
                                                                </td>
                                                                <td className="px-6 py-4 text-slate-500">
                                                                    {new Date(session.createdAt).toLocaleString('en-GB', { 
                                                                        day: '2-digit', 
                                                                        month: 'short', 
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                                                                        session.success 
                                                                            ? 'bg-emerald-500/10 text-emerald-600' 
                                                                            : 'bg-rose-500/10 text-rose-600'
                                                                    }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${session.success ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                                        {session.success ? (isBn ? 'সফল' : 'Success') : (isBn ? 'ব্যর্থ' : 'Failed')}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="px-6 py-10 text-center text-slate-400 font-medium">
                                                                {isBn ? 'কোনো লগইন রেকর্ড পাওয়া যায়নি' : 'No login records found'}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: SUBSCRIPTION & LIMITS */}
                            {activeTab === 'subscription' && (
                                <div className="p-8 space-y-8">
                                    
                                    {/* Limits overview grid */}
                                    {institute ? (
                                        <div>
                                            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><HardDrive size={18} /></span>
                                                {t('profile_limits_header')}
                                            </h2>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                
                                                {/* AI Limits Card */}
                                                <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100/50 rounded-2xl p-5 shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="p-2 bg-purple-500/10 text-purple-600 rounded-xl"><Zap size={20} /></span>
                                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{t('profile_tokens')} Quota</span>
                                                    </div>
                                                    <span className="block text-2xl font-black text-slate-800">
                                                        {formatLimit(institute.aiUsedCurrentMonth)} / {formatLimit(institute.aiLimitPerMonth)}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">{isBn ? 'এই মাসে ব্যবহৃত' : 'Used this month'}</span>
                                                    
                                                    {/* Progress bar */}
                                                    <div className="mt-4 w-full bg-slate-200/60 rounded-full h-2">
                                                        <div 
                                                            className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-500" 
                                                            style={{ width: `${getPercentage(institute.aiUsedCurrentMonth, institute.aiLimitPerMonth)}%` }}
                                                        />
                                                    </div>
                                                    <span className="block text-right text-[10px] text-slate-500 font-bold mt-2">
                                                        {getPercentage(institute.aiUsedCurrentMonth, institute.aiLimitPerMonth)}% {isBn ? 'ক্ষমতা' : 'capacity'}
                                                    </span>
                                                </div>

                                                {/* Questions Limits Card */}
                                                <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 border border-indigo-100/50 rounded-2xl p-5 shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl"><Cpu size={20} /></span>
                                                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{t('profile_questions')} Created</span>
                                                    </div>
                                                    <span className="block text-2xl font-black text-slate-800">
                                                        {formatLimit(institute.questionsUsedCurrentMonth)} / {formatLimit(institute.maxQuestions)}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">{isBn ? 'এই মাসে তৈরিকৃত' : 'Created this month'}</span>

                                                    {/* Progress bar */}
                                                    <div className="mt-4 w-full bg-slate-200/60 rounded-full h-2">
                                                        <div 
                                                            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-500" 
                                                            style={{ width: `${getPercentage(institute.questionsUsedCurrentMonth, institute.maxQuestions)}%` }}
                                                        />
                                                    </div>
                                                    <span className="block text-right text-[10px] text-slate-500 font-bold mt-2">
                                                        {getPercentage(institute.questionsUsedCurrentMonth, institute.maxQuestions)}% {isBn ? 'ক্ষমতা' : 'capacity'}
                                                    </span>
                                                </div>

                                                {/* Storage limits card */}
                                                <div className="bg-gradient-to-br from-indigo-50/50 to-emerald-50/50 border border-indigo-100/50 rounded-2xl p-5 shadow-sm">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <span className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl"><Database size={20} /></span>
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{t('profile_storage')} Used</span>
                                                    </div>
                                                    <span className="block text-2xl font-black text-slate-800">
                                                        {formatStorage(institute.storageUsedMb)} / {formatStorage(institute.storageLimitMb)}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">{isBn ? 'আর২ বাকেট ভলিউম' : 'R2 bucket volume'}</span>

                                                    {/* Progress bar */}
                                                    <div className="mt-4 w-full bg-slate-200/60 rounded-full h-2">
                                                        <div 
                                                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500" 
                                                            style={{ width: `${getPercentage(institute.storageUsedMb, institute.storageLimitMb)}%` }}
                                                        />
                                                    </div>
                                                    <span className="block text-right text-[10px] text-slate-500 font-bold mt-2">
                                                        {getPercentage(institute.storageUsedMb, institute.storageLimitMb)}% {isBn ? 'ক্ষমতা' : 'capacity'}
                                                    </span>
                                                </div>

                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2">
                                            <Info size={16} className="text-slate-400" />
                                            <span className="text-sm text-slate-500">{isBn ? 'এই অ্যাকাউন্টের সাথে কোনো ইনস্টিটিউট যুক্ত নেই।' : 'No institute associated with this account.'}</span>
                                        </div>
                                    )}

                                    <div className="h-px bg-slate-100"></div>

                                    {/* Workspace Subscription Selector (Admins Only) */}
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-3">
                                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Layout size={18} /></span>
                                            {isBn ? 'সাবস্ক্রিপশন প্ল্যান পরিবর্তন' : 'Upgrade Subscription Package'}
                                        </h2>
                                        <p className="text-xs text-slate-400 mb-6 ml-11">
                                            {isBn ? 'আপনার ইনস্টিটিউটের জন্য সাবস্ক্রিপশন প্ল্যান পরিবর্তন বা আপগ্রেড করুন' : 'Change or upgrade the subscription package for your institute'}
                                        </p>

                                        {isAdmin ? (
                                            <div className="space-y-6">
                                                {/* Packages side-by-side card grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    {billingPackages.map(pkg => {
                                                        const isCurrent = institute?.subscriptionPackage?.id === pkg.id;
                                                        return (
                                                            <div 
                                                                key={pkg.id} 
                                                                className={`rounded-2xl p-5 border-2 transition duration-200 relative overflow-hidden flex flex-col justify-between ${
                                                                    isCurrent 
                                                                        ? 'bg-gradient-to-br from-indigo-50/20 to-violet-50/20 border-indigo-500/80 shadow-md' 
                                                                        : 'bg-white border-slate-100 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                {isCurrent && (
                                                                    <div className="absolute right-0 top-0 bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                                                        {isBn ? 'সক্রিয় প্ল্যান' : 'Active Plan'}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                                                                        {pkg.packageCode}
                                                                    </span>
                                                                    <h3 className="text-lg font-black text-slate-800">{pkg.displayName || pkg.name}</h3>
                                                                    <p className="text-slate-400 text-xs mt-1 min-h-[32px]">{pkg.description}</p>
                                                                    
                                                                    <div className="my-4 flex items-baseline gap-1">
                                                                        <span className="text-2xl font-black text-slate-800">${pkg.price}</span>
                                                                        <span className="text-slate-400 text-xs font-bold uppercase">/ {pkg.billingCycle}</span>
                                                                    </div>

                                                                    <ul className="space-y-2 border-t border-slate-50 pt-4 mb-6">
                                                                        <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                                                            <Check size={14} className="text-emerald-500" />
                                                                            <span>{isBn ? 'শিক্ষক:' : 'Teachers:'} {pkg.maxTeachers || (isBn ? 'আনলিমিটেড' : 'Unlimited')}</span>
                                                                        </li>
                                                                        <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                                                            <Check size={14} className="text-emerald-500" />
                                                                            <span>{isBn ? 'শিক্ষার্থী:' : 'Students:'} {pkg.maxStudents || (isBn ? 'আনলিমিটেড' : 'Unlimited')}</span>
                                                                        </li>
                                                                        <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                                                            <Check size={14} className="text-emerald-500" />
                                                                            <span>{isBn ? 'প্রশ্ন:' : 'Questions:'} {pkg.maxQuestions || (isBn ? 'আনলিমিটেড' : 'Unlimited')}</span>
                                                                        </li>
                                                                        <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                                                            <Check size={14} className="text-emerald-500" />
                                                                            <span>{isBn ? 'স্টোরেজ:' : 'Storage:'} {formatStorage(pkg.storageLimitMb)}</span>
                                                                        </li>
                                                                        <li className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                                                            <Check size={14} className="text-emerald-500" />
                                                                            <span>{isBn ? 'এআই টোকেন:' : 'AI Tokens:'} {formatLimit(pkg.aiLimitPerMonth)} {isBn ? '/ মাস' : '/ mo'}</span>
                                                                        </li>
                                                                    </ul>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    disabled={isCurrent || updatingSubscription}
                                                                    onClick={() => handleUpgradeSubscription(pkg.id)}
                                                                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                                                                        isCurrent 
                                                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 disabled:opacity-50'
                                                                    }`}
                                                                >
                                                                    {updatingSubscription && selectedPackageId === pkg.id ? (
                                                                        <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                                                    ) : isCurrent ? <CheckCircle size={14} /> : null}
                                                                    <span>{isCurrent ? (isBn ? 'বর্তমান প্ল্যান' : 'Current Plan') : (isBn ? 'প্ল্যান আপগ্রেড করুন' : 'Upgrade Plan')}</span>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 flex items-start gap-3">
                                                <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
                                                <div>
                                                    <span className="block text-sm font-bold text-amber-700">{isBn ? 'অ্যাডমিন প্রিভিলেজ প্রয়োজন' : 'Admin Privilege Required'}</span>
                                                    <span className="block text-xs text-amber-600 mt-0.5">{isBn ? 'আপনার ইনস্টিটিউটের প্ল্যান আপগ্রেড করতে অনুগ্রহ করে ওয়ার্কস্পেস অ্যাডমিনের সাথে যোগাযোগ করুন।' : 'Please contact workspace admin to upgrade your institute package.'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: ACADEMIC SUBJECT CHECKLIST */}
                            {activeTab === 'academic' && (() => {
                                const activeSubjectsList = [];
                                const availableSubjectsList = [];
                                
                                if (hierarchy?.classSubjects) {
                                    const pricingRules = getPricingRules();
                                    
                                    hierarchy.classSubjects.forEach(cs => {
                                        const cls = hierarchy.classes?.find(c => c.id === cs._classId);
                                        const rule = pricingRules.find(pr => pr.classSubjectId === cs.id);
                                        
                                        const subjectDetail = {
                                            classSubject: cs,
                                            cls: cls,
                                            rule: rule,
                                            price: rule ? Number(rule.price) || 0 : 0
                                        };
                                        
                                        if (assignedSubjectIds.includes(cs.id)) {
                                            activeSubjectsList.push(subjectDetail);
                                        } else if (rule) {
                                            availableSubjectsList.push(subjectDetail);
                                        }
                                    });
                                }
                                
                                return (
                                    <div className="p-8 space-y-8">
                                        <div>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                                                <div>
                                                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                                        <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><BookOpen size={18} /></span>
                                                        {t('profile_academic_access')}
                                                    </h2>
                                                    <p className="text-xs text-slate-400 mt-1 ml-11">
                                                        {isBn ? 'এই ওয়ার্কস্পেসের সক্রিয় এবং ক্রয়যোগ্য অ্যাকাডেমিক বিষয়সমূহ' : 'Active and purchasable academic subjects for this workspace'}
                                                    </p>
                                                </div>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => saveAssignedSubjects()}
                                                        disabled={savingSubjects}
                                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition duration-150 disabled:opacity-50"
                                                    >
                                                        <RefreshCw size={14} className={savingSubjects ? "animate-spin" : ""} />
                                                        {isBn ? 'রিফ্রেশ করুন' : 'Refresh'}
                                                    </button>
                                                )}
                                            </div>

                                            {!hierarchy ? (
                                                <div className="flex items-center justify-center py-12 gap-3 text-slate-400 font-bold text-sm">
                                                    <RefreshCw size={18} className="animate-spin text-indigo-500" />
                                                    <span>{isBn ? 'লোড হচ্ছে অ্যাকাডেমিক বিষয়সমূহ...' : 'Loading academic subjects...'}</span>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                    
                                                    {/* Left Column: Active Subjects */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30 animate-pulse"></span>
                                                                {isBn ? 'বর্তমান অ্যাক্টিভ বিষয়' : 'Current Active Subjects'} ({activeSubjectsList.length})
                                                            </h3>
                                                        </div>
                                                        
                                                        {activeSubjectsList.length === 0 ? (
                                                            <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400 text-xs font-semibold">
                                                                {isBn ? 'কোনো বিষয় সক্রিয় করা নেই।' : 'No subjects activated.'}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {activeSubjectsList.map(({ classSubject, cls }) => (
                                                                    <div 
                                                                        key={classSubject.id}
                                                                        className="p-4 bg-gradient-to-br from-emerald-50/10 to-teal-50/5 border border-emerald-100/50 rounded-2xl flex items-center justify-between shadow-sm"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                                                                <BookOpen size={16} />
                                                                            </div>
                                                                            <div>
                                                                                <span className="block text-sm font-bold text-slate-800">{classSubject.name}</span>
                                                                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                                    {cls?.name || 'Class'} • {cls?._streamName || 'General'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                                            {isBn ? 'সক্রিয়' : 'Active'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Right Column: Available Subjects */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/30"></span>
                                                                {isBn ? 'সহজলভ্য বিষয়' : 'Available Subjects'} ({availableSubjectsList.length})
                                                            </h3>
                                                        </div>
                                                        
                                                        {availableSubjectsList.length === 0 ? (
                                                            <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400 text-xs font-semibold">
                                                                {isBn ? 'ক্রয় করার জন্য কোনো অতিরিক্ত বিষয় উপলব্ধ নেই।' : 'No additional subjects available for purchase.'}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {availableSubjectsList.map(({ classSubject, cls, rule, price }) => (
                                                                    <motion.div 
                                                                        key={classSubject.id}
                                                                        whileHover={{ scale: 1.01 }}
                                                                        onClick={() => triggerActivateSubject(classSubject, rule)}
                                                                        className="p-4 bg-white border border-slate-100 hover:border-indigo-200 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition duration-200"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl">
                                                                                <BookOpen size={16} />
                                                                            </div>
                                                                            <div>
                                                                                <span className="block text-sm font-bold text-slate-800">{classSubject.name}</span>
                                                                                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                                                    {cls?.name || 'Class'} • {cls?._streamName || 'General'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2.5">
                                                                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                                                                                ৳{price}
                                                                            </span>
                                                                            <span className="text-[10px] font-black text-slate-400 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 px-2.5 py-1 rounded-xl transition uppercase tracking-wider">
                                                                                {isBn ? 'সক্রিয় করুন' : 'Activate'}
                                                                            </span>
                                                                        </div>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right Side Sidebar Widget (Constant Account Overview) */}
                <div className="space-y-6">
                    
                    {/* Compact Workspace/Account summary status */}
                    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
                        <div className="absolute -right-12 -top-12 w-44 h-44 bg-indigo-500/5 rounded-full blur-[40px]" />
                        
                        <h3 className="text-md font-black uppercase tracking-wider text-slate-500 mb-5">{t('profile_workspace_status')}</h3>

                        <div className="space-y-5">
                            <div>
                                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">{t('profile_account_id')}</span>
                                <span className="block text-xs font-mono font-bold text-slate-300 mt-1 break-all select-all">{user.id}</span>
                            </div>

                            <div>
                                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">{t('profile_account_status')}</span>
                                <span className="text-emerald-400 font-extrabold flex items-center gap-2 mt-1.5 text-xs">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    {t('profile_active')}
                                </span>
                            </div>

                            <div>
                                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">{t('profile_member_since')}</span>
                                <span className="block text-xs text-slate-300 font-bold mt-1.5">
                                    {new Date(user.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-GB', { 
                                        day: 'numeric', 
                                        month: 'long', 
                                        year: 'numeric' 
                                    })}
                                </span>
                            </div>

                            {institute && (
                                <div className="border-t border-slate-800 pt-5 space-y-4">
                                    <div>
                                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">{isBn ? 'প্যাকেজের মেয়াদ সমাপ্তি' : 'Plan Expiry Date'}</span>
                                        <span className="block text-xs font-bold text-slate-300 mt-1.5">
                                            {institute.planEndDate ? (
                                                new Date(institute.planEndDate).toLocaleDateString(isBn ? 'bn-BD' : 'en-GB', { 
                                                    day: 'numeric', 
                                                    month: 'long', 
                                                    year: 'numeric' 
                                                })
                                            ) : (isBn ? 'আজীবন সচল' : 'No expiration')}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">{isBn ? 'ওয়ার্কস্পেস ব্যবহারের সীমা' : 'Workspace Limits'}</span>
                                        <div className="grid grid-cols-2 gap-3 mt-2.5">
                                            <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl">
                                                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{isBn ? 'শিক্ষক' : 'Teachers'}</span>
                                                <span className="block text-sm font-black text-white mt-0.5">
                                                    {stats && institute.maxTeachers != null ? (institute.maxTeachers - stats.teachers) : (institute.maxTeachers || (isBn ? 'আনলিমিটেড' : 'Unlimited'))}
                                                </span>
                                                {stats && institute.maxTeachers != null && (
                                                    <span className="block text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                                                        {isBn ? `ব্যবহৃত: ${stats.teachers}/${institute.maxTeachers}` : `Used: ${stats.teachers}/${institute.maxTeachers}`}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="bg-slate-800/40 border border-slate-800 p-2.5 rounded-xl">
                                                <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{isBn ? 'শিক্ষার্থী' : 'Students'}</span>
                                                <span className="block text-sm font-black text-white mt-0.5">
                                                    {stats && institute.maxStudents != null ? (institute.maxStudents - stats.students) : (institute.maxStudents || (isBn ? 'আনলিমিটেড' : 'Unlimited'))}
                                                </span>
                                                {stats && institute.maxStudents != null && (
                                                    <span className="block text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                                                        {isBn ? `ব্যবহৃত: ${stats.students}/${institute.maxStudents}` : `Used: ${stats.students}/${institute.maxStudents}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Option A Shortcut Buttons */}
                                        {isAdmin && (
                                            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800/60">
                                                <button
                                                    onClick={() => navigate('/users/teachers')}
                                                    className="py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-150 text-center flex items-center justify-center gap-1.5"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                    {isBn ? 'শিক্ষক যোগ / ম্যানেজ' : 'Manage Teachers'}
                                                </button>
                                                <button
                                                    onClick={() => navigate('/users/students')}
                                                    className="py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/30 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition duration-150 text-center flex items-center justify-center gap-1.5"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                    {isBn ? 'শিক্ষার্থী যোগ / ম্যানেজ' : 'Manage Students'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Simulated Payment Modal */}
            <AnimatePresence>
                {showPaymentModal && subjectToActivate && (() => {
                    const activePrice = subjectToActivate.rule ? (Number(subjectToActivate.rule.price) || 0) : 0;
                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                            {/* Backdrop */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => paymentStep !== 'submitting' && setShowPaymentModal(false)}
                                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                            />

                            {/* Modal Content */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 text-white"
                            >
                                {/* Close Button */}
                                {paymentStep !== 'submitting' && (
                                    <button 
                                        onClick={() => setShowPaymentModal(false)}
                                        className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition duration-150"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                )}

                                {paymentStep === 'confirm' && (
                                    <div className="p-6">
                                        <div className="text-center pb-4 border-b border-slate-800">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-500/20">
                                                <BookOpen size={22} />
                                            </div>
                                            <h3 className="text-lg font-black text-white">{isBn ? 'বিষয় সক্রিয়করণ নিশ্চিত করুন' : 'Confirm Subject Activation'}</h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {isBn ? 'আপনার ওয়ার্কস্পেসে নতুন একটি বিষয় যোগ করতে পেমেন্ট করুন' : 'Make a payment to add a new subject to your workspace'}
                                            </p>
                                        </div>

                                        <div className="py-6 space-y-4">
                                            <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-slate-500">{isBn ? 'বিষয়ের নাম:' : 'Subject Name:'}</span>
                                                    <span className="font-black text-slate-200">{subjectToActivate.classSubject.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-bold text-slate-500">{isBn ? 'শ্রেণী:' : 'Class:'}</span>
                                                    <span className="font-bold text-slate-300">
                                                        {hierarchy.classes?.find(c => c.id === subjectToActivate.classSubject._classId)?.name || 'Class'}
                                                    </span>
                                                </div>
                                                <div className="h-px bg-slate-800/60 my-2"></div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-500">{isBn ? 'মোট মূল্য:' : 'Total Price:'}</span>
                                                    <span className="text-lg font-black text-indigo-400">৳{activePrice}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setShowPaymentModal(false)}
                                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs transition active:scale-95"
                                            >
                                                {isBn ? 'বাতিল করুন' : 'Cancel'}
                                            </button>
                                            <button 
                                                onClick={() => setPaymentStep('method')}
                                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                                            >
                                                {isBn ? 'পে করুন' : 'Pay'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {paymentStep === 'method' && (
                                    <div className="p-6">
                                        <div className="text-center pb-4 border-b border-slate-800">
                                            <h3 className="text-lg font-black text-white">{isBn ? 'পেমেন্ট গেটওয়ে নির্বাচন করুন' : 'Select Payment Gateway'}</h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {isBn ? 'পেমেন্ট সম্পন্ন করার জন্য গেটওয়ে নির্বাচন করুন' : 'Select gateway to complete your payment'}
                                            </p>
                                        </div>

                                        <div className="py-5 grid grid-cols-2 gap-3">
                                            {/* bKash */}
                                            <button 
                                                onClick={() => setSelectedPaymentMethod('bkash')}
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition duration-200 ${
                                                    selectedPaymentMethod === 'bkash' 
                                                        ? 'border-[#E2136E] bg-[#E2136E]/10 text-white' 
                                                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                                                }`}
                                            >
                                                <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm">
                                                    <span className="text-[#E2136E] font-black text-xs">bKash</span>
                                                </div>
                                                <span className="text-[10px] font-black tracking-wide">{isBn ? 'বিকাশ' : 'bKash'}</span>
                                            </button>

                                            {/* Nagad */}
                                            <button 
                                                onClick={() => setSelectedPaymentMethod('nagad')}
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition duration-200 ${
                                                    selectedPaymentMethod === 'nagad' 
                                                        ? 'border-[#F7941D] bg-[#F7941D]/10 text-white' 
                                                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                                                }`}
                                            >
                                                <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm">
                                                    <span className="text-[#F7941D] font-black text-xs">Nagad</span>
                                                </div>
                                                <span className="text-[10px] font-black tracking-wide">{isBn ? 'নগদ' : 'Nagad'}</span>
                                            </button>

                                            {/* Rocket */}
                                            <button 
                                                onClick={() => setSelectedPaymentMethod('rocket')}
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition duration-200 ${
                                                    selectedPaymentMethod === 'rocket' 
                                                        ? 'border-[#8C3494] bg-[#8C3494]/10 text-white' 
                                                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                                                }`}
                                            >
                                                <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm">
                                                    <span className="text-[#8C3494] font-black text-xs">Rocket</span>
                                                </div>
                                                <span className="text-[10px] font-black tracking-wide">{isBn ? 'রকেট' : 'Rocket'}</span>
                                            </button>

                                            {/* Card */}
                                            <button 
                                                onClick={() => setSelectedPaymentMethod('card')}
                                                className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition duration-200 ${
                                                    selectedPaymentMethod === 'card' 
                                                        ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                                                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                                                }`}
                                            >
                                                <div className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-xl shadow-sm border border-slate-700">
                                                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                                    </svg>
                                                </div>
                                                <span className="text-[10px] font-black tracking-wide">{isBn ? 'কার্ড' : 'Card'}</span>
                                            </button>
                                        </div>

                                        {/* Mock Input for high-fidelity feel */}
                                        <div className="mb-6 space-y-3">
                                            {selectedPaymentMethod !== 'card' ? (
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">{isBn ? 'মোবাইল নম্বর লিখুন' : 'Enter Mobile Number'}</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="01XXXXXXXXX" 
                                                        defaultValue="01712345678"
                                                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-sm font-semibold outline-none focus:border-indigo-500 transition"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">{isBn ? 'কার্ড নম্বর' : 'Card Number'}</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="XXXX XXXX XXXX XXXX" 
                                                            defaultValue="4242 4242 4242 4242"
                                                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-sm font-semibold outline-none focus:border-indigo-500 transition"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">{isBn ? 'মেয়াদ' : 'Expiry'}</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="MM/YY" 
                                                                defaultValue="12/28"
                                                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-sm font-semibold outline-none focus:border-indigo-500 transition text-center"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">CVC</label>
                                                            <input 
                                                                type="password" 
                                                                placeholder="***" 
                                                                defaultValue="123"
                                                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-200 text-sm font-semibold outline-none focus:border-indigo-500 transition text-center"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setPaymentStep('confirm')}
                                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs transition active:scale-95"
                                            >
                                                {isBn ? 'ফিরে যান' : 'Go Back'}
                                            </button>
                                            <button 
                                                onClick={() => handleActivateSubject(subjectToActivate.classSubject.id)}
                                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                                            >
                                                {isBn ? 'পেমেন্ট সম্পন্ন করুন' : 'Complete Payment'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {paymentStep === 'submitting' && (
                                    <div className="p-8 text-center space-y-4">
                                        <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-indigo-500 animate-spin mx-auto"></div>
                                        <div>
                                            <h3 className="text-lg font-black text-white">{isBn ? 'পেমেন্ট প্রসেসিং হচ্ছে...' : 'Payment processing...'}</h3>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {isBn ? 'অনুগ্রহ করে অপেক্ষা করুন, সংযোগ বিচ্ছিন্ন করবেন না' : 'Please wait, do not disconnect'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {paymentStep === 'success' && (
                                    <div className="p-6 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                            <CheckCircle size={28} />
                                        </div>
                                        <h3 className="text-lg font-black text-white">{isBn ? 'পেমেন্ট সফল হয়েছে!' : 'Payment Successful!'}</h3>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {isBn ? 'বিষয়টি আপনার অ্যাকাউন্টে সফলভাবে সক্রিয় করা হয়েছে' : 'The subject has been successfully activated on your account'}
                                        </p>

                                        <div className="my-5 bg-slate-950/40 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="font-bold text-slate-500">{isBn ? 'বিষয়:' : 'Subject:'}</span>
                                                <span className="font-bold text-slate-300">{subjectToActivate.classSubject.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-bold text-slate-500">{isBn ? 'পেমেন্ট গেটওয়ে:' : 'Payment Gateway:'}</span>
                                                <span className="font-bold text-slate-300 uppercase">{selectedPaymentMethod}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-bold text-slate-500">{isBn ? 'মোট মূল্য:' : 'Total Price:'}</span>
                                                <span className="font-black text-emerald-400">৳{activePrice}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-bold text-slate-500">Transaction ID:</span>
                                                <span className="font-mono font-bold text-indigo-400">TXN{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => setShowPaymentModal(false)}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                                        >
                                            {isBn ? 'বন্ধ করুন' : 'Close'}
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

        </div>
    );
};

export default MyProfile;
