import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Mail, Phone, Lock, Eye, EyeOff, Save, Key, Shield, AlertTriangle, 
    Upload, Zap, Database, Activity, Check, CheckSquare, Square, ChevronDown, 
    ChevronUp, RefreshCw, Globe, Cpu, Award, HardDrive, Layout, CheckCircle, Info, BookOpen,
    Search, Filter, Copy, ExternalLink, Sparkles, Building2, Calendar, Users, GraduationCap,
    Plus, Trash2, Edit3, MapPin, X, Unlock
} from 'lucide-react';
import axios from '../../../utils/axios';
import userService from '../../../services/userService';
import instituteService from '../../../services/instituteService';
import billingService from '../../../services/billingService';
import academicService from '../../../services/academicService';
import { useLanguage } from '../../../context/LanguageContext';

const MyProfile = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [copiedId, setCopiedId] = useState(false);

    // UI and loading states
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(() => {
        if (['personal', 'teachers', 'security', 'subscription', 'academic'].includes(tabParam)) {
            return tabParam;
        }
        return 'personal';
    });

    useEffect(() => {
        if (tabParam && ['personal', 'teachers', 'security', 'subscription', 'academic'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
    };

    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [updatingSubscription, setUpdatingSubscription] = useState(false);
    const [savingSubjects, setSavingSubjects] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Teachers Management State
    const [teachers, setTeachers] = useState([]);
    const [teachersLoading, setTeachersLoading] = useState(false);
    const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
    const [teacherSubmitting, setTeacherSubmitting] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [teacherForm, setTeacherForm] = useState({ name: '', email: '', phone: '', password: '', branch: '' });
    const [teacherActionLoading, setTeacherActionLoading] = useState({});
    const [teacherSearch, setTeacherSearch] = useState('');
    const [teacherBranchFilter, setTeacherBranchFilter] = useState('ALL');
    const [showTeacherPassword, setShowTeacherPassword] = useState(true);
    const [copiedTeacherPassword, setCopiedTeacherPassword] = useState(false);

    const [profileForm, setProfileForm] = useState({ 
        name: '', 
        phone: '', 
        instituteNameEn: '', 
        instituteNameBn: '' 
    });
    // Institute Branches state
    const [branches, setBranches] = useState([]);
    const [isAddingBranch, setIsAddingBranch] = useState(false);
    const [newBranch, setNewBranch] = useState({ nameEn: '', nameBn: '' });
    const [editingBranchId, setEditingBranchId] = useState(null);
    const [editBranchForm, setEditBranchForm] = useState({ nameEn: '', nameBn: '' });

    const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [showPwd, setShowPwd] = useState({ old: false, new: false, confirm: false });
    const [selectedPackageId, setSelectedPackageId] = useState('');

    // Custom payment modal states for subjects
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [subjectToActivate, setSubjectToActivate] = useState(null);
    const [paymentStep, setPaymentStep] = useState('confirm'); // confirm, method, submitting, success
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bkash');

    // Subject Filtering States
    const [selectedLevelFilter, setSelectedLevelFilter] = useState('ALL');
    const [selectedStreamFilter, setSelectedStreamFilter] = useState('ALL');
    const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

    // Teacher Subject Permissions Modal States
    const [subjectModalTeacher, setSubjectModalTeacher] = useState(null);
    const [teacherSubjectIds, setTeacherSubjectIds] = useState([]);
    const [savingTeacherSubjects, setSavingTeacherSubjects] = useState(false);
    const [teacherSubjectSearch, setTeacherSubjectSearch] = useState('');

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
                    const instNameEn = userData.instituteNameEn || userData.instituteName || '';
                    const instNameBn = userData.instituteNameBn || '';
                    setProfileForm({
                        name: userData.name || '',
                        phone: userData.phone || '',
                        instituteNameEn: instNameEn,
                        instituteNameBn: instNameBn
                    });

                    // Parse initial branches if present
                    let initialBranches = [];
                    if (userData.instituteBranches) {
                        try {
                            initialBranches = typeof userData.instituteBranches === 'string' 
                                ? JSON.parse(userData.instituteBranches) 
                                : userData.instituteBranches;
                        } catch (e) {
                            initialBranches = [];
                        }
                    }
                    setBranches(Array.isArray(initialBranches) ? initialBranches : []);

                    // Fetch institute details if instituteId is present to get accurate institute names
                    if (userData.instituteId) {
                        try {
                            const instRes = await instituteService.getInstitute(userData.instituteId);
                            if (instRes && (instRes.success || instRes.id || instRes.data)) {
                                const instData = instRes.data || instRes;
                                setInstitute(instData);
                                const realNameEn = instData.nameEn || (!instData.name?.endsWith("'s Workspace") ? instData.name : '');
                                const realNameBn = instData.nameBn || '';
                                if (realNameEn || realNameBn) {
                                    setProfileForm(p => ({
                                        ...p,
                                        instituteNameEn: realNameEn || p.instituteNameEn || '',
                                        instituteNameBn: realNameBn || p.instituteNameBn || ''
                                    }));
                                    setUser(u => ({
                                        ...u,
                                        instituteNameEn: realNameEn || u?.instituteNameEn || '',
                                        instituteNameBn: realNameBn || u?.instituteNameBn || '',
                                        instituteName: realNameEn || u?.instituteName
                                    }));
                                }
                            }
                        } catch (e) {
                            console.warn("Could not fetch institute details", e);
                        }
                    }

                    // Fetch user stats for admin active/remaining slots calculations
                    const userRoles = (userData?.roles || []).map(r => typeof r === 'string' ? r : (r.name || ''));
                    const isAdminUser = userRoles.includes('SUPER_ADMIN') || userRoles.includes('INSTITUTE_ADMIN');
                    if (isAdminUser) {
                        try {
                            const statsRes = await userService.getUserStats();
                            if (statsRes && statsRes.success) {
                                setStats(statsRes.data);
                            }
                        } catch (e) {
                            // Non-blocking fallback
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

    // Ensure data loads when tab is switched
    useEffect(() => {
        if (activeTab === 'teachers') {
            fetchTeachers();
        } else if (activeTab === 'academic') {
            if (!hierarchy) {
                fetchAcademicHierarchy();
            }
            if (user?.instituteId || user?.id) {
                fetchAssignedSubjects(user?.instituteId || user?.id);
            }
        } else if (activeTab === 'subscription') {
            fetchBillingPackages();
        } else if (activeTab === 'security' && user?.id) {
            fetchLoginHistory(user.id);
        }
    }, [activeTab, user?.id, user?.instituteId]);

    const fetchTeachers = async () => {
        try {
            setTeachersLoading(true);
            const res = await userService.getAllUsers({ role: 'TEACHER', size: 100 });
            if (res && res.success) {
                const list = res.data?.content || (Array.isArray(res.data) ? res.data : []);
                setTeachers(list);
            }
        } catch (err) {
            console.error("Failed to fetch teachers", err);
            setTeachers([]);
        } finally {
            setTeachersLoading(false);
        }
    };

    const generateTeacherPassword = () => {
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const num = Math.floor(100 + Math.random() * 900);
        return `QS@${code}${num}`;
    };

    const handleGenerateTeacherPassword = () => {
        const newPwd = generateTeacherPassword();
        setTeacherForm(p => ({ ...p, password: newPwd }));
        setShowTeacherPassword(true);
    };

    const handleCopyTeacherPassword = () => {
        if (!teacherForm.password) return;
        navigator.clipboard.writeText(teacherForm.password);
        setCopiedTeacherPassword(true);
        setTimeout(() => setCopiedTeacherPassword(false), 2000);
    };

    const getMainCampusTitle = () => {
        const name = isBn 
            ? (user?.instituteNameBn || user?.instituteName || institute?.nameBn || institute?.name || profileForm?.instituteNameBn || profileForm?.instituteNameEn) 
            : (user?.instituteNameEn || user?.instituteName || institute?.nameEn || institute?.name || profileForm?.instituteNameEn || profileForm?.instituteNameBn);
        return name || (isBn ? 'মূল ক্যাম্পাস' : 'Main Campus');
    };

    const getAssignedCampusName = (raw) => {
        if (!raw || raw === 'MAIN' || raw === 'Main Campus' || raw === 'মূল ক্যাম্পাস') {
            return getMainCampusTitle();
        }
        if (typeof raw === 'string' && !raw.trim().startsWith('{') && !raw.trim().startsWith('[')) {
            return raw;
        }
        try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) return getMainCampusTitle();
                return parsed.map(b => {
                    if (typeof b === 'string') return b;
                    return isBn ? (b.nameBn || b.nameEn || b.name || '') : (b.nameEn || b.nameBn || b.name || '');
                }).filter(Boolean).join(', ') || getMainCampusTitle();
            }
            if (typeof parsed === 'object' && parsed !== null) {
                return isBn ? (parsed.nameBn || parsed.nameEn || parsed.name || '') : (parsed.nameEn || parsed.nameBn || parsed.name || '');
            }
        } catch (e) {
            return raw;
        }
        return raw;
    };

    const handleOpenAddTeacher = () => {
        const maxAllowed = institute?.subscriptionPackage?.maxTeachers ?? user?.maxTeachers ?? institute?.maxTeachers ?? 0;
        if (teachers.length >= maxAllowed) {
            showMsg(isBn ? `আপনার বর্তমান প্যাকেজের শিক্ষক সীমা পূর্ণ হয়েছে (${maxAllowed} জন)। আরও শিক্ষক যোগ করতে প্যাকেজ আপগ্রেড করুন।` : `Teacher limit reached (${maxAllowed}). Please upgrade your package.`, 'error');
            return;
        }
        setEditingTeacher(null);
        setTeacherForm({ name: '', email: '', phone: '', password: generateTeacherPassword(), branch: '' });
        setShowTeacherPassword(true);
        setCopiedTeacherPassword(false);
        setIsTeacherModalOpen(true);
    };

    const handleOpenEditTeacher = (teacher) => {
        setEditingTeacher(teacher);
        let branchVal = teacher.userInstituteBranches || teacher.instituteBranches || '';
        if (branchVal && typeof branchVal === 'string' && (branchVal.startsWith('{') || branchVal.startsWith('['))) {
            try {
                const parsed = JSON.parse(branchVal);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    branchVal = parsed[0].nameBn || parsed[0].nameEn || parsed[0].name || '';
                } else if (typeof parsed === 'object' && parsed !== null) {
                    branchVal = parsed.nameBn || parsed.nameEn || parsed.name || '';
                }
            } catch (e) {
                branchVal = '';
            }
        }
        setTeacherForm({
            name: teacher.name || '',
            email: teacher.email || '',
            phone: teacher.phone || '',
            password: '',
            branch: branchVal
        });
        setIsTeacherModalOpen(true);
    };

    const handleSaveTeacher = async (e) => {
        if (e) e.preventDefault();
        if (!teacherForm.name?.trim()) {
            showMsg(isBn ? 'শিক্ষকের নাম প্রদান করা আবশ্যক' : 'Teacher name is required', 'error');
            return;
        }
        if (!editingTeacher && !teacherForm.email?.trim()) {
            showMsg(isBn ? 'ইমেইল অ্যাড্রেস প্রদান করা আবশ্যক' : 'Email is required', 'error');
            return;
        }
        if (!editingTeacher && (!teacherForm.password || teacherForm.password.length < 6)) {
            showMsg(isBn ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters', 'error');
            return;
        }

        try {
            setTeacherSubmitting(true);
            if (editingTeacher) {
                const isTeacherActive = editingTeacher.active !== false && editingTeacher.isActive !== false;
                await userService.updateUser(editingTeacher.id, {
                    name: teacherForm.name.trim(),
                    email: editingTeacher.email,
                    phone: teacherForm.phone?.trim() || '',
                    active: isTeacherActive,
                    isActive: isTeacherActive,
                    instituteId: user?.instituteId,
                    roles: ['TEACHER'],
                    instituteBranches: teacherForm.branch || ''
                });
                showMsg(isBn ? 'শিক্ষকের তথ্য সফলভাবে আপডেট হয়েছে!' : 'Teacher updated successfully!');
            } else {
                const payload = {
                    name: teacherForm.name.trim(),
                    email: teacherForm.email.trim().toLowerCase(),
                    password: teacherForm.password,
                    phone: teacherForm.phone?.trim() || undefined,
                    roles: ['TEACHER'],
                    instituteId: user?.instituteId,
                    instituteBranches: teacherForm.branch || undefined
                };
                await userService.createUser(payload);
                showMsg(isBn ? 'নতুন শিক্ষক সফলভাবে যুক্ত হয়েছে!' : 'Teacher added successfully!');
            }
            setIsTeacherModalOpen(false);
            setEditingTeacher(null);
            setTeacherForm({ name: '', email: '', phone: '', password: '', branch: '' });
            await fetchTeachers();
        } catch (err) {
            console.error("Failed to save teacher", err);
            const errMsg = err?.response?.data?.message || err?.message || (isBn ? 'শিক্ষক সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save teacher');
            showMsg(errMsg, 'error');
        } finally {
            setTeacherSubmitting(false);
        }
    };

    const handleDeleteTeacher = async (teacherId) => {
        if (!window.confirm(isBn ? 'আপনি কি নিশ্চিত যে এই শিক্ষক অ্যাকাউন্টটি মুছে ফেলতে চান?' : 'Are you sure you want to remove this teacher?')) {
            return;
        }
        try {
            setTeacherActionLoading(p => ({ ...p, [teacherId]: true }));
            await userService.deleteUser(teacherId);
            showMsg(isBn ? 'শিক্ষক সফলভাবে মুছে ফেলা হয়েছে' : 'Teacher removed successfully');
            await fetchTeachers();
        } catch (err) {
            console.error("Failed to delete teacher", err);
            showMsg(err?.response?.data?.message || (isBn ? 'শিক্ষক মুছতে ব্যর্থ হয়েছে' : 'Failed to delete teacher'), 'error');
        } finally {
            setTeacherActionLoading(p => ({ ...p, [teacherId]: false }));
        }
    };

    const handleToggleTeacherStatus = async (teacher) => {
        try {
            setTeacherActionLoading(p => ({ ...p, [teacher.id]: true }));
            if (teacher.active) {
                await userService.deactivateUser(teacher.id);
                showMsg(isBn ? 'শিক্ষক অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে' : 'Teacher deactivated');
            } else {
                await userService.activateUser(teacher.id);
                showMsg(isBn ? 'শিক্ষক অ্যাকাউন্টটি সক্রিয় করা হয়েছে' : 'Teacher activated');
            }
            await fetchTeachers();
        } catch (err) {
            console.error("Failed to toggle teacher status", err);
            showMsg(err?.response?.data?.message || (isBn ? 'স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে' : 'Failed to toggle status'), 'error');
        } finally {
            setTeacherActionLoading(p => ({ ...p, [teacher.id]: false }));
        }
    };

    const handleResetTeacherPassword = async (teacher) => {
        try {
            setTeacherActionLoading(p => ({ ...p, [teacher.id]: true }));
            const res = await userService.resetPassword(teacher.id);
            const newPass = res?.data || 'QS@' + Math.floor(10000 + Math.random() * 90000);
            alert(isBn ? `শিক্ষক: ${teacher.name}\nনতুন পাসওয়ার্ড: ${newPass}\nদয়া করে শিক্ষককে এই পাসওয়ার্ডটি প্রদান করুন।` : `Teacher: ${teacher.name}\nNew Password: ${newPass}`);
            showMsg(isBn ? 'পাসওয়ার্ড সফলভাবে রিসেট হয়েছে' : 'Password reset successfully');
            await fetchTeachers();
        } catch (err) {
            console.error("Failed to reset teacher password", err);
            showMsg(err?.response?.data?.message || (isBn ? 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে' : 'Failed to reset password'), 'error');
        } finally {
            setTeacherActionLoading(p => ({ ...p, [teacher.id]: false }));
        }
    };

    const handleOpenSubjectPermissions = async (teacher) => {
        setSubjectModalTeacher(teacher);
        setTeacherSubjectSearch('');
        if (!hierarchy) {
            fetchAcademicHierarchy();
        }
        if (user?.instituteId) {
            fetchAssignedSubjects(user.instituteId);
        }
        // Load teacher's current assigned subjects
        try {
            const res = await userService.getAssignedSubjects(teacher.id);
            if (res && res.success && Array.isArray(res.data)) {
                setTeacherSubjectIds(res.data);
            } else if (Array.isArray(teacher.assignedSubjectIds)) {
                setTeacherSubjectIds(teacher.assignedSubjectIds);
            } else {
                setTeacherSubjectIds([]);
            }
        } catch (e) {
            setTeacherSubjectIds(Array.isArray(teacher.assignedSubjectIds) ? teacher.assignedSubjectIds : []);
        }
    };

    const handleSaveTeacherSubjects = async () => {
        if (!subjectModalTeacher) return;
        try {
            setSavingTeacherSubjects(true);
            await userService.assignSubjects(subjectModalTeacher.id, teacherSubjectIds);
            showMsg(isBn ? `${subjectModalTeacher.name}-এর বিষয় পারমিশন সফলভাবে সংরক্ষণ করা হয়েছে!` : `Subject permissions saved for ${subjectModalTeacher.name}!`, 'success');
            // Update locally in teachers list
            setTeachers(prev => prev.map(t => t.id === subjectModalTeacher.id ? { ...t, assignedSubjectIds: teacherSubjectIds } : t));
            setSubjectModalTeacher(null);
        } catch (err) {
            console.error("Failed to save teacher subject permissions", err);
            const errMsg = err?.response?.data?.message || err?.message || (isBn ? 'বিষয় পারমিশন সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save subject permissions');
            showMsg(errMsg, 'error');
        } finally {
            setSavingTeacherSubjects(false);
        }
    };

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
            setBillingPackages([]);
        }
    };

    const fetchAcademicHierarchy = async () => {
        try {
            const data = await academicService.getHierarchy(true); // bypass tenant filters
            setHierarchy(data || { classes: [], classSubjects: [] });
        } catch (err) {
            console.error("Failed to fetch curriculum hierarchy", err);
            setHierarchy({ classes: [], classSubjects: [] });
        }
    };

    const fetchAssignedSubjects = async (instituteId) => {
        const targetId = instituteId || user?.instituteId || user?.id;
        if (!targetId) return;
        try {
            const assigned = await instituteService.getAssignedSubjects(targetId);
            setAssignedSubjectIds(assigned || []);
        } catch (err) {
            console.error("Failed to fetch assigned subjects", err);
            setAssignedSubjectIds([]);
        }
    };

    const refreshAcademicData = async () => {
        setSavingSubjects(true);
        await fetchAcademicHierarchy();
        if (user?.instituteId) {
            await fetchAssignedSubjects(user.instituteId);
        }
        setSavingSubjects(false);
    };

    // Branch Helper Handlers
    const handleAddBranch = (e) => {
        if (e) e.preventDefault();
        const maxBranchesAllowed = institute?.subscriptionPackage?.maxBranches ?? institute?.maxBranches ?? user?.maxBranches ?? 1;
        if (maxBranchesAllowed <= 1) {
            showMsg(isBn 
                ? 'আপনার বর্তমান প্যাকেজে মাল্টি-ব্রাঞ্চ সুবিধা অন্তর্ভুক্ত নয় (শুধুমাত্র ১টি প্রধান ক্যাম্পাস অনুমোদিত)। একাধিক শাখা যুক্ত করতে অনুগ্রহ করে প্যাকেজ আপগ্রেড করুন।' 
                : 'Multi-branch is not available on your current plan (1 main campus allowed). Please upgrade your package to add multiple branches.', 
                'error'
            );
            return;
        }
        if (branches.length >= maxBranchesAllowed) {
            showMsg(isBn 
                ? `আপনার সাবস্ক্রিপশন প্যাকেজের সীমা অনুযায়ী সর্বোচ্চ ${maxBranchesAllowed}টি ব্রাঞ্চ যুক্ত করতে পারবেন। সীমা বাড়াতে প্যাকেজ আপগ্রেড করুন।` 
                : `You have reached the maximum allowed branches (${maxBranchesAllowed}) for your package. Please upgrade to add more.`, 
                'error'
            );
            return;
        }
        if (!newBranch.nameEn.trim() && !newBranch.nameBn.trim()) {
            showMsg(isBn ? 'অনুগ্রহ করে ব্রাঞ্চের নাম লিখুন!' : 'Please provide branch name!', 'error');
            return;
        }
        const branchItem = {
            id: 'branch_' + Date.now(),
            nameEn: newBranch.nameEn.trim() || newBranch.nameBn.trim(),
            nameBn: newBranch.nameBn.trim() || newBranch.nameEn.trim()
        };
        setBranches(prev => [...prev, branchItem]);
        setNewBranch({ nameEn: '', nameBn: '' });
        setIsAddingBranch(false);
        showMsg(isBn ? 'নতুন ব্রাঞ্চ যুক্ত করা হয়েছে! সংরক্ষণ করতে "Save Changes" বাটনে ক্লিক করুন।' : 'Branch added! Click "Save Changes" to persist.', 'success');
    };

    const handleRemoveBranch = (branchId) => {
        setBranches(prev => prev.filter(b => b.id !== branchId));
        showMsg(isBn ? 'ব্রাঞ্চ মুছে ফেলা হয়েছে।' : 'Branch removed.', 'success');
    };

    const handleStartEditBranch = (branch) => {
        setEditingBranchId(branch.id);
        setEditBranchForm({ nameEn: branch.nameEn || '', nameBn: branch.nameBn || '' });
    };

    const handleSaveEditBranch = (branchId) => {
        if (!editBranchForm.nameEn.trim() && !editBranchForm.nameBn.trim()) {
            showMsg(isBn ? 'অনুগ্রহ করে ব্রাঞ্চের নাম লিখুন!' : 'Please provide branch name!', 'error');
            return;
        }
        setBranches(prev => prev.map(b => b.id === branchId ? {
            ...b,
            nameEn: editBranchForm.nameEn.trim() || editBranchForm.nameBn.trim(),
            nameBn: editBranchForm.nameBn.trim() || editBranchForm.nameEn.trim()
        } : b));
        setEditingBranchId(null);
        showMsg(isBn ? 'ব্রাঞ্চ আপডেট করা হয়েছে।' : 'Branch updated.', 'success');
    };

    // User Profile Form Handlers
    const handleProfileSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setSavingProfile(true);
        try {
            const res = await axios.patch('/v1/users/profile', {
                name: profileForm.name,
                phone: profileForm.phone,
                instituteNameEn: profileForm.instituteNameEn,
                instituteNameBn: profileForm.instituteNameBn,
                instituteBranches: JSON.stringify(branches)
            });
            if (res.data.success) {
                showMsg(isBn ? 'প্রোফাইল ও ব্রাঞ্চ সফলভাবে আপডেট করা হয়েছে!' : 'Profile and branches updated successfully!', 'success');
                const updatedUser = res.data.data;
                setUser(updatedUser);
                // Update local storage
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ 
                    ...storedUser, 
                    name: updatedUser.name, 
                    phone: updatedUser.phone,
                    instituteNameEn: updatedUser.instituteNameEn,
                    instituteNameBn: updatedUser.instituteNameBn,
                    instituteBranches: updatedUser.instituteBranches
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
            showMsg(isBn ? 'নতুন পাসওয়ার্ড দুটি মিলছে না!' : 'New passwords do not match!', 'error');
            return;
        }
        if (pwdForm.newPassword.length < 6) {
            showMsg(isBn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!' : 'Password must be at least 6 characters long!', 'error');
            return;
        }

        setChangingPassword(true);
        try {
            const res = await axios.patch('/v1/users/profile/password', {
                oldPassword: pwdForm.oldPassword,
                newPassword: pwdForm.newPassword
            });
            if (res.data.success) {
                showMsg(isBn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' : 'Password changed successfully!', 'success');
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
            showMsg(isBn ? 'সাবস্ক্রিপশন প্যাকেজ সফলভাবে আপডেট করা হয়েছে!' : 'Subscription package updated successfully!', 'success');
        } catch (err) {
            showMsg(err.response?.data?.message || 'Failed to upgrade subscription package', 'error');
        } finally {
            setUpdatingSubscription(false);
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

    const handleActivateSubject = async (classSubjectId) => {
        const targetId = institute?.id || user?.instituteId || user?.id;
        if (!targetId) return;
        setPaymentStep('submitting');
        try {
            const updatedList = Array.from(new Set([...assignedSubjectIds, classSubjectId]));
            await instituteService.assignSubjects(targetId, updatedList);
            setAssignedSubjectIds(updatedList);
            setPaymentStep('success');
            showMsg(isBn ? 'বিষয়টি সফলভাবে সক্রিয় করা হয়েছে!' : 'Subject activated successfully!', 'success');
            fetchAssignedSubjects(targetId);
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
            showMsg(isBn ? 'সঠিক ইমেজ ফাইল আপলোড করুন!' : 'Please upload a valid image file!', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showMsg(isBn ? 'ফাইলের আকার ২ মেগাবাইটের কম হতে হবে!' : 'Image size must be less than 2MB!', 'error');
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
                showMsg(isBn ? 'অ্যাভাটার সফলভাবে আপডেট হয়েছে!' : 'Avatar uploaded successfully!', 'success');
                // Re-fetch user details
                const userRes = await userService.getUserById(user.id);
                if (userRes.success) {
                    setUser(userRes.data);
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

    const copyAccountId = () => {
        if (!user?.id) return;
        navigator.clipboard.writeText(user.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
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

    const isAdmin = !user?.roles || (
        Array.isArray(user.roles) && user.roles.some(r => {
            const roleStr = typeof r === 'string' ? r : (r?.name || r?.authority || '');
            return roleStr.includes('ADMIN') || roleStr.includes('SUPER_ADMIN');
        })
    );

    if (loading || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
                <div className="w-9 h-9 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                <p className="text-slate-500 font-semibold text-xs tracking-wide">{isBn ? 'লোড হচ্ছে...' : 'Loading profile...'}</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-5 pb-12">
            
            {/* Global Alert Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2.5 max-w-sm backdrop-blur-md ${
                            notification.type === 'error' 
                                ? 'bg-rose-50/95 border-rose-200 text-rose-700' 
                                : 'bg-emerald-50/95 border-emerald-200 text-emerald-700'
                        }`}
                    >
                        {notification.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                        <span className="leading-snug">{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Compact Corporate Header & User Identity */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 relative overflow-hidden">
                {/* Subtle top accent gradient line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Avatar & Identity Summary */}
                    <div className="flex items-center gap-4">
                        {/* Avatar Container */}
                        <div 
                            className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-100 p-1 border border-slate-200 shadow-2xs group cursor-pointer shrink-0"
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            title={isBn ? 'ছবি পরিবর্তন করতে ক্লিক করুন' : 'Click to change avatar'}
                        >
                            <div className="w-full h-full rounded-xl overflow-hidden relative bg-slate-900 flex items-center justify-center text-white">
                                {uploadingAvatar ? (
                                    <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-1">
                                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-200">Wait</span>
                                    </div>
                                ) : user.profileImageUrl ? (
                                    <img src={user.profileImageUrl} alt={user.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                ) : (
                                    <span className="text-xl sm:text-2xl font-black text-indigo-200">{user.name?.charAt(0).toUpperCase()}</span>
                                )}

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition duration-150">
                                    <Upload size={14} className="mb-0.5" />
                                    <span className="text-[8px] font-bold uppercase tracking-wider">{isBn ? 'পরিবর্তন' : 'Change'}</span>
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

                        {/* Name, Roles, Meta */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">{user.name}</h1>
                                {user.roles?.map(role => {
                                    const roleStr = typeof role === 'string' ? role : (role.name || '');
                                    const isSuper = roleStr.includes('SUPER_ADMIN');
                                    const isInstAdmin = roleStr.includes('INSTITUTE_ADMIN');
                                    const isTeacher = roleStr.includes('TEACHER');
                                    return (
                                        <span 
                                            key={roleStr} 
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
                                                isSuper ? 'bg-rose-50 text-rose-700 border-rose-200/80' :
                                                isInstAdmin ? 'bg-purple-50 text-purple-700 border-purple-200/80' :
                                                isTeacher ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                                                'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                                            }`}
                                        >
                                            {roleStr.replace('_', ' ')}
                                        </span>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                    <Mail size={13} className="text-slate-400" />
                                    <span className="truncate">{user.email}</span>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="flex items-center gap-1 text-indigo-600 font-semibold truncate">
                                    <Building2 size={13} className="text-indigo-400" />
                                    <span>{(isBn ? (user.instituteNameBn || user.instituteName || user.instituteNameEn) : (user.instituteNameEn || user.instituteName || user.instituteNameBn)) || (isBn ? 'গ্লোবাল ওয়ার্কস্পেস' : 'Global Workspace')}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Stats Badge & Action */}
                    <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                                <Award size={14} />
                            </div>
                            <div>
                                <span className="block text-xs font-black text-amber-900 leading-none">{user.contributionPoints || 0} XP</span>
                                <span className="block text-[9px] text-amber-700/80 font-bold uppercase tracking-wider leading-none mt-0.5">Contribution</span>
                            </div>
                        </div>

                        {activeTab === 'personal' && (
                            <button
                                type="button"
                                onClick={handleProfileSubmit}
                                disabled={savingProfile}
                                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
                            >
                                {savingProfile ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                                <span>{savingProfile ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'পরিবর্তন সংরক্ষণ' : 'Save Changes')}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Sleek Segmented Tab Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar">
                    <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 shrink-0">
                        {(() => {
                            const maxTeachersAllowed = institute?.subscriptionPackage?.maxTeachers ?? user?.maxTeachers ?? institute?.maxTeachers ?? 0;
                            const uRoles = (user?.roles || []).map(r => typeof r === 'string' ? r : (r?.name || ''));
                            const isTeacherAccount = uRoles.includes('TEACHER') || uRoles.includes('ROLE_TEACHER') || uRoles.includes('STUDENT') || uRoles.includes('ROLE_STUDENT');

                            const tabsList = [
                                { id: 'personal', label: isBn ? 'ব্যক্তিগত তথ্য' : 'Personal Info', icon: User }
                            ];

                            if (!isTeacherAccount) {
                                tabsList.push({ 
                                    id: 'teachers', 
                                    label: isBn ? 'শিক্ষকবৃন্দ' : 'Teachers & Staff', 
                                    icon: GraduationCap, 
                                    badge: maxTeachersAllowed > 0 ? `${teachers.length}/${maxTeachersAllowed}` : null 
                                });
                            }

                            tabsList.push({ id: 'security', label: isBn ? 'নিরাপত্তা ও সেশন' : 'Security & Sessions', icon: Shield });

                            if (!isTeacherAccount) {
                                tabsList.push({ id: 'subscription', label: isBn ? 'সাবস্ক্রিপশন ও লিমিট' : 'Subscription & Limits', icon: Zap });
                            }

                            tabsList.push({ id: 'academic', label: isBn ? 'বিষয় এক্সেস' : 'Subject Access', icon: BookOpen });

                            return tabsList;
                        })().map(tab => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`relative px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all outline-none select-none ${
                                        active 
                                            ? 'text-indigo-700 bg-white shadow-2xs' 
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                    }`}
                                >
                                    <Icon size={13} className={active ? 'text-indigo-600' : 'text-slate-400'} />
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                            active ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'bg-slate-200/80 text-slate-600'
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{isBn ? 'সক্রিয় সেশন' : 'Active Account'}</span>
                    </div>
                </div>
            </div>

            {/* Main Content: Full Width Tab Content Card */}
            <div className="w-full">
                <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
                        >
                            
                            {/* ================= TAB 1: PERSONAL INFO ================= */}
                            {activeTab === 'personal' && (
                                <div className="p-4 sm:p-6">
                                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/80">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-slate-800">{isBn ? 'ব্যক্তিগত ও প্রাতিষ্ঠানিক তথ্য' : 'Personal & Institutional Details'}</h2>
                                                <p className="text-[11px] text-slate-400">{isBn ? 'আপনার প্রোফাইল এবং শিক্ষা প্রতিষ্ঠানের মেটাডাটা আপডেট করুন' : 'Manage your identity and institute branding'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            
                                            {/* 1. Email (Read-only) */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                                    <span>{t('profile_email')}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                                        <Lock size={10} /> {isBn ? 'পরিবর্তনযোগ্য নয়' : 'Read-only'}
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={15} />
                                                    <input 
                                                        type="text" 
                                                        disabled 
                                                        value={user.email} 
                                                        className="w-full pl-9 pr-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-500 font-semibold cursor-not-allowed text-xs"
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* 2. Full Name */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    {t('profile_name')} <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <User className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-600 transition" size={15} />
                                                    <input 
                                                        type="text" 
                                                        required 
                                                        value={profileForm.name} 
                                                        onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                                        placeholder={t('profile_name_placeholder')} 
                                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 outline-none transition"
                                                    />
                                                </div>
                                            </div>

                                            {/* 3. Phone Number */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    {t('profile_phone')}
                                                </label>
                                                <div className="relative group">
                                                    <Phone className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-600 transition" size={15} />
                                                    <input 
                                                        type="text" 
                                                        value={profileForm.phone} 
                                                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                                                        placeholder={t('profile_phone_placeholder')} 
                                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 outline-none transition"
                                                    />
                                                </div>
                                            </div>

                                            {/* 4. Primary Role Display */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    {isBn ? 'সিস্টেম পদবী / রোল' : 'Primary Account Role'}
                                                </label>
                                                <div className="relative">
                                                    <Shield className="absolute left-3 top-2.5 text-slate-400" size={15} />
                                                    <input 
                                                        type="text" 
                                                        disabled
                                                        value={(user.roles || []).map(r => typeof r === 'string' ? r : r.name).join(', ') || 'USER'}
                                                        className="w-full pl-9 pr-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-600 font-bold cursor-not-allowed text-xs uppercase"
                                                    />
                                                </div>
                                            </div>

                                            {/* 5. Institute Name (English) */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                                    <span>{isBn ? 'প্রতিষ্ঠানের নাম (ইংরেজি)' : 'Institute Name (English)'}</span>
                                                    {(() => {
                                                        const uRoles = (user?.roles || []).map(r => typeof r === 'string' ? r : (r?.name || ''));
                                                        const isTeacherAccount = uRoles.includes('TEACHER') || uRoles.includes('ROLE_TEACHER') || uRoles.includes('STUDENT') || uRoles.includes('ROLE_STUDENT');
                                                        return isTeacherAccount ? (
                                                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                                                <Lock size={10} /> {isBn ? 'প্রতিষ্ঠান নির্ধারিত' : 'Assigned by Institute'}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                </label>
                                                <div className="relative group">
                                                    <Globe className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-600 transition" size={15} />
                                                    <input 
                                                        type="text" 
                                                        disabled={(() => {
                                                            const uRoles = (user?.roles || []).map(r => typeof r === 'string' ? r : (r?.name || ''));
                                                            return uRoles.includes('TEACHER') || uRoles.includes('ROLE_TEACHER') || uRoles.includes('STUDENT') || uRoles.includes('ROLE_STUDENT');
                                                        })()}
                                                        value={profileForm.instituteNameEn || user.instituteNameEn || user.instituteName || ''} 
                                                        onChange={(e) => setProfileForm(p => ({ ...p, instituteNameEn: e.target.value }))}
                                                        placeholder={isBn ? 'প্রতিষ্ঠানের নাম ইংরেজিতে লিখুন' : 'Enter institute name in English'} 
                                                        className={`w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none transition ${
                                                            ((user?.roles || []).map(r => typeof r === 'string' ? r : (r?.name || '')).some(r => r.includes('TEACHER') || r.includes('STUDENT')))
                                                                ? 'bg-slate-50/80 text-slate-500 cursor-not-allowed'
                                                                : 'bg-white text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10'
                                                        }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* 6. Institute Name (Bengali) */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                                                    <span>{isBn ? 'প্রতিষ্ঠানের নাম (বাংলা)' : 'Institute Name (Bengali)'}</span>
                                                    {(() => {
                                                        const uRoles = (user?.roles || []).map(r => typeof r === 'string' ? r : (r?.name || ''));
                                                        const isTeacherAccount = uRoles.includes('TEACHER') || uRoles.includes('ROLE_TEACHER') || uRoles.includes('STUDENT') || uRoles.includes('ROLE_STUDENT');
                                                        return isTeacherAccount ? (
                                                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                                                <Lock size={10} /> {isBn ? 'প্রতিষ্ঠান নির্ধারিত' : 'Assigned by Institute'}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                </label>
                                                <div className="relative group">
                                                    <Globe className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-indigo-600 transition" size={15} />
                                                    <input 
                                                        type="text" 
                                                        disabled={(() => {
                                                            const uRoles = (user?.roles || []).map(r => typeof r === 'string' ? r : (r?.name || ''));
                                                            return uRoles.includes('TEACHER') || uRoles.includes('ROLE_TEACHER') || uRoles.includes('STUDENT') || uRoles.includes('ROLE_STUDENT');
                                                        })()}
                                                        value={profileForm.instituteNameBn || user.instituteNameBn || ''} 
                                                        onChange={(e) => setProfileForm(p => ({ ...p, instituteNameBn: e.target.value }))}
                                                        placeholder={isBn ? 'প্রতিষ্ঠানের নাম বাংলায় লিখুন' : 'Enter institute name in Bengali'} 
                                                        className={`w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none transition ${
                                                            ((user?.roles || []).map(r => typeof r === 'string' ? r : (r?.name || '')).some(r => r.includes('TEACHER') || r.includes('STUDENT')))
                                                                ? 'bg-slate-50/80 text-slate-500 cursor-not-allowed'
                                                                : 'bg-white text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10'
                                                        }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* 7. Dedicated Institute Branch Management Block */}
                                            {(() => {
                                                const uRoles = (user?.roles || []).map(r => typeof r === 'string' ? r : (r?.name || ''));
                                                const isTeacherAccount = uRoles.includes('TEACHER') || uRoles.includes('ROLE_TEACHER') || uRoles.includes('STUDENT') || uRoles.includes('ROLE_STUDENT');

                                                if (isTeacherAccount) {
                                                    return (
                                                        <div className="md:col-span-2 pt-2">
                                                            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                                                                        <Building2 size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-slate-800">{isBn ? 'নির্ধারিত শাখা / ক্যাম্পাস' : 'Assigned Campus'}</h4>
                                                                        <p className="text-[11px] text-slate-600 mt-0.5">
                                                                            {user.userInstituteBranches ? (
                                                                                <span className="font-bold text-purple-700">🏢 {getAssignedCampusName(user.userInstituteBranches)}</span>
                                                                            ) : (
                                                                                <span className="font-bold text-indigo-700">🏛️ {getMainCampusTitle()}</span>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-semibold">{isBn ? 'প্রতিষ্ঠান নির্ধারিত' : 'Assigned by Institute Admin'}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const maxBranchesAllowed = institute?.subscriptionPackage?.maxBranches ?? institute?.maxBranches ?? user?.maxBranches ?? 1;
                                                const isMultiBranchAllowed = maxBranchesAllowed > 1;
                                                const isLimitReached = branches.length >= maxBranchesAllowed;

                                                return (
                                                    <div className="md:col-span-2 pt-2">
                                                        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                                                            <div className="flex items-center justify-between flex-wrap gap-2.5">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/80 shadow-2xs">
                                                                        <Building2 size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                                                                {isBn ? 'প্রতিষ্ঠানের শাখাসমূহ (Branches)' : 'Institute Branches & Campuses'}
                                                                            </h3>
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                                isMultiBranchAllowed 
                                                                                    ? 'text-indigo-700 bg-indigo-100/80 border-indigo-200/60' 
                                                                                    : 'text-amber-700 bg-amber-50 border-amber-200/80'
                                                                            }`}>
                                                                                {isMultiBranchAllowed 
                                                                                    ? `${branches.length} / ${maxBranchesAllowed} ${isBn ? 'টি শাখা' : 'Branches'}`
                                                                                    : (isBn ? '১টি ক্যাম্পাস (সিঙ্গেল শাখা)' : '1 Campus (Single Branch)')
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                                            {isMultiBranchAllowed
                                                                                ? (isBn ? 'আপনার শিক্ষা প্রতিষ্ঠানের একাধিক শাখা বা ক্যাম্পাস থাকলে বাংলা ও ইংরেজি নাম সহ এখানে যুক্ত করুন' : 'Add multiple campuses or branch locations with English & Bengali titles')
                                                                                : (isBn ? 'আপনার বর্তমান সাবস্ক্রিপশন প্ল্যানে ১টি মূল ক্যাম্পাস অন্তর্ভুক্ত। একাধিক ক্যাম্পাস যোগ করতে প্যাকেজ আপগ্রেড করুন।' : 'Your current plan supports 1 main campus. Upgrade subscription to add multiple branches.')
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {!isAddingBranch && (
                                                                    isMultiBranchAllowed ? (
                                                                        !isLimitReached ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setIsAddingBranch(true)}
                                                                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95"
                                                                            >
                                                                                <Plus size={14} />
                                                                                <span>{isBn ? 'শাখা যুক্ত করুন' : 'Add Branch'}</span>
                                                                            </button>
                                                                        ) : (
                                                                            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5">
                                                                                <Check size={13} className="text-emerald-500" />
                                                                                <span>{isBn ? 'সর্বোচ্চ শাখা যুক্ত আছে' : 'Limit Reached'}</span>
                                                                            </span>
                                                                        )
                                                                    ) : (
                                                                        <span className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs">
                                                                            <Lock size={12} />
                                                                            <span>{isBn ? 'মাল্টি-ব্রাঞ্চ সুবিধা বন্ধ' : 'Multi-Branch Locked'}</span>
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>

                                                    {/* Inline Add Branch Form */}
                                                    {isAddingBranch && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, scale: 0.98, y: -6 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.98, y: -6 }}
                                                            className="p-4 bg-white border-2 border-indigo-500/30 rounded-xl shadow-sm space-y-3"
                                                        >
                                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                                <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                                                                    <Sparkles size={13} className="text-indigo-600" />
                                                                    {isBn ? 'নতুন শাখার বিবরণ লিখুন' : 'New Branch Details'}
                                                                </span>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                                        setIsAddingBranch(false);
                                                                        setNewBranch({ nameEn: '', nameBn: '' });
                                                                    }}
                                                                    className="text-slate-400 hover:text-slate-700 text-xs p-1"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                <div>
                                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                                        {isBn ? 'শাখার নাম (ইংরেজি)' : 'Branch Name (English)'} <span className="text-rose-500">*</span>
                                                                    </label>
                                                                    <div className="relative">
                                                                        <MapPin size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                                        <input
                                                                            type="text"
                                                                            value={newBranch.nameEn}
                                                                            onChange={(e) => setNewBranch(p => ({ ...p, nameEn: e.target.value }))}
                                                                            placeholder={isBn ? 'যেমন: Dhanmondi Branch / Main Campus' : 'e.g. Dhanmondi Branch'}
                                                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                                        {isBn ? 'শাখার নাম (বাংলা)' : 'Branch Name (Bengali)'} <span className="text-rose-500">*</span>
                                                                    </label>
                                                                    <div className="relative">
                                                                        <MapPin size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                                        <input
                                                                            type="text"
                                                                            value={newBranch.nameBn}
                                                                            onChange={(e) => setNewBranch(p => ({ ...p, nameBn: e.target.value }))}
                                                                            placeholder={isBn ? 'যেমন: ধানমন্ডি শাখা / প্রধান ক্যাম্পাস' : 'e.g. ধানমন্ডি শাখা'}
                                                                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-end items-center gap-2 pt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setIsAddingBranch(false);
                                                                        setNewBranch({ nameEn: '', nameBn: '' });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition"
                                                                >
                                                                    {isBn ? 'বাতিল' : 'Cancel'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAddBranch}
                                                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
                                                                >
                                                                    <Plus size={13} />
                                                                    <span>{isBn ? 'যুক্ত করুন' : 'Add to List'}</span>
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* Existing Branches List */}
                                                    {branches.length === 0 ? (
                                                        <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs font-medium">
                                                            {isBn ? 'এখনো কোনো শাখা যোগ করা হয়নি। আপনার প্রতিষ্ঠানের একাধিক ক্যাম্পাস থাকলে উপরের "+ শাখা যুক্ত করুন" বাটনে ক্লিক করুন।' : 'No branch added yet. Click "+ Add Branch" above to add branch locations.'}
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                            {branches.map((branch, idx) => (
                                                                <div 
                                                                    key={branch.id || idx}
                                                                    className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition flex items-start justify-between gap-2"
                                                                >
                                                                    {editingBranchId === branch.id ? (
                                                                        <div className="w-full space-y-2">
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                <div>
                                                                                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">English</span>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editBranchForm.nameEn}
                                                                                        onChange={(e) => setEditBranchForm(p => ({ ...p, nameEn: e.target.value }))}
                                                                                        placeholder="Branch Name (English)"
                                                                                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">বাংলা</span>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={editBranchForm.nameBn}
                                                                                        onChange={(e) => setEditBranchForm(p => ({ ...p, nameBn: e.target.value }))}
                                                                                        placeholder="শাখার নাম (বাংলা)"
                                                                                        className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-end gap-1.5 pt-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => setEditingBranchId(null)}
                                                                                    className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition"
                                                                                >
                                                                                    {isBn ? 'বাতিল' : 'Cancel'}
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleSaveEditBranch(branch.id)}
                                                                                    className="px-3 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition shadow-2xs"
                                                                                >
                                                                                    {isBn ? 'সংরক্ষণ' : 'Save'}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
                                                                                    <span className="text-xs font-bold text-slate-900 truncate">
                                                                                        {branch.nameEn || branch.nameBn}
                                                                                    </span>
                                                                                </div>
                                                                                {branch.nameBn && (
                                                                                    <span className="block text-[11px] text-slate-500 font-semibold pl-3.5 mt-0.5 truncate">
                                                                                        {branch.nameBn}
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleStartEditBranch(branch)}
                                                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                                                                                    title={isBn ? 'সম্পাদনা করুন' : 'Edit Branch'}
                                                                                >
                                                                                    <Edit3 size={13} />
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveBranch(branch.id)}
                                                                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                                                                    title={isBn ? 'শাখা মুছুন' : 'Delete Branch'}
                                                                                >
                                                                                    <Trash2 size={13} />
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                            <p className="text-[11px] text-slate-400">
                                                {isBn ? '* তারকা চিহ্নিত তথ্যগুলো আবশ্যক।' : '* Fields marked with asterisk are required.'}
                                            </p>
                                            <button 
                                                type="submit" 
                                                disabled={savingProfile}
                                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition active:scale-95 disabled:opacity-50"
                                            >
                                                {savingProfile ? (
                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                                ) : <Save size={14} />}
                                                <span>{savingProfile ? t('profile_btn_saving') : t('profile_btn_save')}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* ================= TAB: TEACHERS & FACULTY MANAGEMENT ================= */}
                            {activeTab === 'teachers' && (() => {
                                const maxTeachersAllowed = institute?.subscriptionPackage?.maxTeachers ?? user?.maxTeachers ?? institute?.maxTeachers ?? 0;
                                
                                if (maxTeachersAllowed <= 0) {
                                    return (
                                        <div className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-4">
                                            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200/80 shadow-2xs">
                                                <Lock size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-800">
                                                    {isBn ? 'শিক্ষক যুক্ত করার সুবিধা অন্তর্ভুক্ত নেই' : 'Teacher Management Not Available'}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                                                    {isBn 
                                                        ? 'আপনার বর্তমান প্যাকেজে কোনো শিক্ষক অ্যাকাউন্ট যুক্ত করার সুবিধা নেই। প্রতিষ্ঠানে শিক্ষক যুক্ত করে প্রশ্ন প্রণয়ন ও শেয়ার করতে অনুগ্রহ করে প্যাকেজ আপগ্রেড করুন।' 
                                                        : 'Your current package does not allow adding additional teacher accounts. Upgrade your subscription package to add faculty members.'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleTabChange('subscription')}
                                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs active:scale-95 transition"
                                            >
                                                <Zap size={14} />
                                                <span>{isBn ? 'প্যাকেজ আপগ্রেড করুন' : 'Upgrade Plan'}</span>
                                            </button>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="p-4 sm:p-6 space-y-5">
                                        {/* Top Header Card with Quota & Action */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/80 shrink-0">
                                                    <GraduationCap size={18} />
                                                </div>
                                                <div>
                                                    <h2 className="text-sm font-black text-slate-800">
                                                        {isBn ? 'শিক্ষক ও অনুষদ ব্যবস্থাপনা' : 'Teachers & Staff Management'}
                                                    </h2>
                                                    <p className="text-[11px] text-slate-400">
                                                        {isBn ? 'আপনার প্রতিষ্ঠানের শিক্ষকদের অ্যাকাউন্ট যুক্ত ও নিয়ন্ত্রণ করুন' : 'Manage teacher accounts, assign branches and control permissions'}
                                                    </p>
                                                </div>
                                            </div>

                                        {/* Right: Quota Metric & Add Button */}
                                        {(() => {
                                            const maxTeachersAllowed = institute?.subscriptionPackage?.maxTeachers ?? user?.maxTeachers ?? institute?.maxTeachers ?? 5;
                                            const isLimitReached = teachers.length >= maxTeachersAllowed;
                                            return (
                                                <div className="flex items-center gap-2.5 self-start sm:self-center">
                                                    <div className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2">
                                                        <Users size={13} className="text-indigo-600" />
                                                        <div className="text-left">
                                                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                                                                {isBn ? 'শিক্ষক কোটা' : 'Teacher Limit'}
                                                            </span>
                                                            <span className="block text-xs font-black text-slate-900 leading-tight mt-0.5">
                                                                {teachers.length} / {maxTeachersAllowed}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={handleOpenAddTeacher}
                                                        disabled={isLimitReached}
                                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                                                            isLimitReached 
                                                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95 shadow-indigo-600/10'
                                                        }`}
                                                    >
                                                        {isLimitReached ? <Lock size={13} /> : <Plus size={13} />}
                                                        <span>{isBn ? 'নতুন শিক্ষক যুক্ত করুন' : 'Add New Teacher'}</span>
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Search & Filter Controls */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="relative w-full sm:w-72">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="text" 
                                                value={teacherSearch}
                                                onChange={(e) => setTeacherSearch(e.target.value)}
                                                placeholder={isBn ? 'শিক্ষকের নাম, ইমেইল বা ফোন...' : 'Search name, email, phone...'}
                                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-600 transition"
                                            />
                                        </div>

                                        {branches.length > 0 && (
                                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                                <span className="text-[11px] font-bold text-slate-400 shrink-0">{isBn ? 'শাখা:' : 'Branch:'}</span>
                                                <select
                                                    value={teacherBranchFilter}
                                                    onChange={(e) => setTeacherBranchFilter(e.target.value)}
                                                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-600 transition"
                                                >
                                                    <option value="ALL">{isBn ? 'সকল শাখা' : 'All Branches'}</option>
                                                    <option value="MAIN">🏛️ {getMainCampusTitle()}</option>
                                                    {branches.map((b, bIdx) => (
                                                        <option key={b.id || bIdx} value={b.nameBn || b.nameEn}>
                                                            🏢 {b.nameBn || b.nameEn}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Teachers List */}
                                    {teachersLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                                            <RefreshCw size={20} className="animate-spin text-indigo-600" />
                                            <span className="text-xs font-semibold">{isBn ? 'শিক্ষকদের তালিকা লোড হচ্ছে...' : 'Loading teachers list...'}</span>
                                        </div>
                                    ) : (() => {
                                        const filteredTeachers = teachers.filter(t => {
                                            const q = teacherSearch.toLowerCase();
                                            const matchQuery = !q || (t.name || '').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q) || (t.phone || '').includes(q);
                                            const matchBranch = teacherBranchFilter === 'ALL' || (teacherBranchFilter === 'MAIN' && !t.instituteBranches) || (t.instituteBranches === teacherBranchFilter);
                                            return matchQuery && matchBranch;
                                        });

                                        if (filteredTeachers.length === 0) {
                                            return (
                                                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                                                        <GraduationCap size={22} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black text-slate-800">
                                                             {teachers.length === 0 ? (isBn ? 'এখনও কোনো শিক্ষক যুক্ত করা হয়নি' : 'No teachers added yet') : (isBn ? 'অনুসন্ধানে কোনো শিক্ষক পাওয়া যায়নি' : 'No matching teachers found')}
                                                        </h3>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                                            {teachers.length === 0 ? (isBn ? 'আপনার প্রতিষ্ঠানের শিক্ষকদের প্রশ্ন প্রণয়নের সুযোগ দিতে যুক্ত করুন' : 'Add teachers to collaborate on questions') : (isBn ? 'অনুসন্ধানের ফিল্টার পরিবর্তন করে চেষ্টা করুন' : 'Try adjusting your search criteria')}
                                                        </p>
                                                    </div>
                                                    {teachers.length === 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={handleOpenAddTeacher}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs active:scale-95 transition"
                                                        >
                                                            <Plus size={13} />
                                                            <span>{isBn ? 'প্রথম শিক্ষক যুক্ত করুন' : 'Add First Teacher'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {filteredTeachers.map((teacher, tIdx) => {
                                                    const initials = (teacher.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                                    const isActionLoading = teacherActionLoading[teacher.id];
                                                    return (
                                                        <div 
                                                            key={teacher.id || tIdx}
                                                            className="bg-slate-50/60 hover:bg-white border border-slate-200/90 hover:border-indigo-200 rounded-2xl p-3.5 shadow-2xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between gap-3"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                                                                        {initials}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="text-xs font-black text-slate-900 truncate">{teacher.name}</h4>
                                                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 border ${
                                                                                teacher.active 
                                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                                                            }`}>
                                                                                {teacher.active ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'নিষ্ক্রিয়' : 'Inactive')}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                                                            <Mail size={11} className="text-slate-400 shrink-0" />
                                                                            <span className="truncate">{teacher.email}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 flex-wrap gap-2">
                                                                <div className="flex items-center gap-2 text-slate-500">
                                                                    {teacher.phone ? (
                                                                        <span className="flex items-center gap-1 font-semibold">
                                                                            <Phone size={10} className="text-slate-400" />
                                                                            <span>{teacher.phone}</span>
                                                                        </span>
                                                                    ) : null}
                                                                    {teacher.instituteBranches ? (
                                                                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200/60 font-bold text-[9px] max-w-[200px] truncate" title={getAssignedCampusName(teacher.instituteBranches)}>
                                                                            🏢 {getAssignedCampusName(teacher.instituteBranches)}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold text-[9px] max-w-[220px] truncate" title={getMainCampusTitle()}>
                                                                            🏛️ {getMainCampusTitle()}
                                                                        </span>
                                                                    )}
                                                                    
                                                                    {/* Subject Access Button & Badge */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenSubjectPermissions(teacher)}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
                                                                        title={isBn ? 'শিক্ষকের বিষয় এক্সেস পারমিশন পরিবর্তন করুন' : 'Manage teacher subject permissions'}
                                                                    >
                                                                        <BookOpen size={10} className="text-indigo-600" />
                                                                        <span>
                                                                            {teacher.assignedSubjectIds && teacher.assignedSubjectIds.length > 0
                                                                                ? (isBn ? `${teacher.assignedSubjectIds.length}টি বিষয় অনুমোদিত` : `${teacher.assignedSubjectIds.length} Subjects Allowed`)
                                                                                : (isBn ? 'সকল বিষয় (Default)' : 'All Active Subjects')}
                                                                        </span>
                                                                    </button>
                                                                </div>

                                                                {/* Action Buttons */}
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        disabled={isActionLoading}
                                                                        onClick={() => handleResetTeacherPassword(teacher)}
                                                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                                        title={isBn ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password'}
                                                                    >
                                                                        <Key size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isActionLoading}
                                                                        onClick={() => handleToggleTeacherStatus(teacher)}
                                                                        className={`p-1.5 rounded-lg transition ${
                                                                            teacher.active 
                                                                                ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' 
                                                                                : 'text-emerald-600 hover:bg-emerald-50'
                                                                        }`}
                                                                        title={teacher.active ? (isBn ? 'অ্যাকাউন্ট নিষ্ক্রিয় করুন' : 'Deactivate') : (isBn ? 'অ্যাকাউন্ট সক্রিয় করুন' : 'Activate')}
                                                                    >
                                                                        {teacher.active ? <Lock size={13} /> : <Unlock size={13} />}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isActionLoading}
                                                                        onClick={() => handleOpenEditTeacher(teacher)}
                                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                                        title={isBn ? 'সম্পাদনা করুন' : 'Edit Teacher'}
                                                                    >
                                                                        <Edit3 size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isActionLoading}
                                                                        onClick={() => handleDeleteTeacher(teacher.id)}
                                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                                        title={isBn ? 'শিক্ষক অ্যাকাউন্ট মুছুন' : 'Delete Teacher'}
                                                                    >
                                                                        {isActionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )})()}

                            {/* ================= TAB 2: SECURITY & SESSIONS ================= */}
                            {activeTab === 'security' && (
                                <div className="p-4 sm:p-6 space-y-6">
                                    {/* Change Password Form */}
                                    <div>
                                        <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-slate-100">
                                            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100/80">
                                                <Key size={16} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-slate-800">{t('profile_change_password')}</h2>
                                                <p className="text-[11px] text-slate-400">{isBn ? 'আপনার অ্যাকাউন্টের সুরক্ষার জন্য নিয়মিত পাসওয়ার্ড পরিবর্তন করুন' : 'Ensure strong, unique credentials for your workspace'}</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Current Password */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('profile_old_password')}</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-2.5 text-slate-400" size={15} />
                                                        <input 
                                                            type={showPwd.old ? 'text' : 'password'} 
                                                            required 
                                                            value={pwdForm.oldPassword}
                                                            onChange={(e) => setPwdForm(p => ({ ...p, oldPassword: e.target.value }))}
                                                            placeholder={t('profile_old_password_placeholder')} 
                                                            className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 outline-none transition"
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setShowPwd(p => ({ ...p, old: !p.old }))}
                                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                        >
                                                            {showPwd.old ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* New Password */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('profile_new_password')}</label>
                                                    <div className="relative">
                                                        <Key className="absolute left-3 top-2.5 text-slate-400" size={15} />
                                                        <input 
                                                            type={showPwd.new ? 'text' : 'password'} 
                                                            required 
                                                            minLength={6}
                                                            value={pwdForm.newPassword}
                                                            onChange={(e) => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                                                            placeholder={t('profile_new_password_placeholder')} 
                                                            className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 outline-none transition"
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))}
                                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                        >
                                                            {showPwd.new ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Confirm Password */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('profile_confirm_password')}</label>
                                                    <div className="relative">
                                                        <Shield className="absolute left-3 top-2.5 text-slate-400" size={15} />
                                                        <input 
                                                            type={showPwd.confirm ? 'text' : 'password'} 
                                                            required 
                                                            value={pwdForm.confirmPassword}
                                                            onChange={(e) => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                                                            placeholder={t('profile_confirm_password_placeholder')} 
                                                            className={`w-full pl-9 pr-9 py-2 bg-white border rounded-xl text-xs font-semibold outline-none transition ${
                                                                pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword
                                                                    ? 'border-rose-300 focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/20'
                                                                    : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10'
                                                            }`}
                                                        />
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setShowPwd(p => ({ ...p, confirm: !p.confirm }))}
                                                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                                        >
                                                            {showPwd.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <button 
                                                    type="submit" 
                                                    disabled={changingPassword || !pwdForm.oldPassword || !pwdForm.newPassword || pwdForm.newPassword !== pwdForm.confirmPassword}
                                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 disabled:opacity-50"
                                                >
                                                    {changingPassword ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
                                                    <span>{changingPassword ? t('profile_btn_updating_password') : t('profile_btn_update_password')}</span>
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* Login Sessions History */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 bg-slate-100 text-slate-600 rounded-md">
                                                    <Activity size={14} />
                                                </div>
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{t('profile_recent_sessions')}</h3>
                                            </div>
                                            <button 
                                                onClick={() => fetchLoginHistory(user.id)}
                                                disabled={historyLoading}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-50"
                                                title={isBn ? 'সেশন লগ রিফ্রেশ' : 'Refresh Session Log'}
                                            >
                                                <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} />
                                            </button>
                                        </div>

                                        <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                                            <table className="w-full border-collapse text-left text-xs text-slate-600">
                                                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                                                    <tr>
                                                        <th className="px-4 py-2.5">{isBn ? 'ডিভাইস / ব্রাউজার' : 'Device / Browser'}</th>
                                                        <th className="px-4 py-2.5">{t('profile_ip')}</th>
                                                        <th className="px-4 py-2.5">{t('profile_time')}</th>
                                                        <th className="px-4 py-2.5 text-right">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {loginHistory.length > 0 ? (
                                                        loginHistory.map(session => (
                                                            <tr key={session.id} className="hover:bg-slate-50/60 transition">
                                                                <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[220px] truncate" title={session.userAgent}>
                                                                    {parseUserAgent(session.userAgent)}
                                                                </td>
                                                                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                                                                    {session.ipAddress || 'Unknown IP'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                                                                    {new Date(session.createdAt).toLocaleString('en-GB', { 
                                                                        day: '2-digit', 
                                                                        month: 'short', 
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right">
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                                        session.success 
                                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                                                                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                                    }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${session.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                                        {session.success ? (isBn ? 'সফল' : 'Success') : (isBn ? 'ব্যর্থ' : 'Failed')}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="4" className="px-4 py-8 text-center text-slate-400 text-xs font-medium">
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

                            {/* ================= TAB 3: SUBSCRIPTION & LIMITS ================= */}
                            {activeTab === 'subscription' && (
                                <div className="p-4 sm:p-6 space-y-6">
                                    {institute ? (
                                        <div>
                                            <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-slate-100">
                                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/80">
                                                    <HardDrive size={16} />
                                                </div>
                                                <div>
                                                    <h2 className="text-sm font-black text-slate-800">{t('profile_limits_header')}</h2>
                                                    <p className="text-[11px] text-slate-400">{isBn ? 'এই মাসে আপনার ওয়ার্কস্পেসের বর্তমান রিসোর্স ব্যবহার' : 'Current month quota usage across AI, Questions, and R2 Cloud storage'}</p>
                                                </div>
                                            </div>

                                            {/* Metric Cards Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {/* AI Limits Card */}
                                                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                            <Zap size={11} /> AI Tokens
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            {getPercentage(institute.aiUsedCurrentMonth, institute.aiLimitPerMonth)}%
                                                        </span>
                                                    </div>
                                                    <span className="block text-lg font-black text-slate-900 leading-tight">
                                                        {formatLimit(institute.aiUsedCurrentMonth)} <span className="text-xs font-semibold text-slate-400">/ {formatLimit(institute.aiLimitPerMonth)}</span>
                                                    </span>
                                                    <div className="mt-2.5 w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                                        <div 
                                                            className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                                                            style={{ width: `${getPercentage(institute.aiUsedCurrentMonth, institute.aiLimitPerMonth)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Questions Limits Card */}
                                                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                            <Cpu size={11} /> Questions
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            {getPercentage(institute.questionsUsedCurrentMonth, institute.maxQuestions)}%
                                                        </span>
                                                    </div>
                                                    <span className="block text-lg font-black text-slate-900 leading-tight">
                                                        {formatLimit(institute.questionsUsedCurrentMonth)} <span className="text-xs font-semibold text-slate-400">/ {formatLimit(institute.maxQuestions)}</span>
                                                    </span>
                                                    <div className="mt-2.5 w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                                        <div 
                                                            className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                                            style={{ width: `${getPercentage(institute.questionsUsedCurrentMonth, institute.maxQuestions)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Storage limits card */}
                                                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                            <Database size={11} /> Storage
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            {getPercentage(institute.storageUsedMb, institute.storageLimitMb)}%
                                                        </span>
                                                    </div>
                                                    <span className="block text-lg font-black text-slate-900 leading-tight">
                                                        {formatStorage(institute.storageUsedMb)} <span className="text-xs font-semibold text-slate-400">/ {formatStorage(institute.storageLimitMb)}</span>
                                                    </span>
                                                    <div className="mt-2.5 w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                                        <div 
                                                            className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                                                            style={{ width: `${getPercentage(institute.storageUsedMb, institute.storageLimitMb)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2 text-xs text-slate-600">
                                            <Info size={15} className="text-slate-400" />
                                            <span>{isBn ? 'এই অ্যাকাউন্টের সাথে কোনো ইনস্টিটিউট যুক্ত নেই।' : 'No institute associated with this account.'}</span>
                                        </div>
                                    )}

                                    {/* Workspace Subscription Selector (Admins Only) */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2.5 mb-4 pb-2 border-b border-slate-100">
                                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/80">
                                                <Layout size={16} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-slate-800">{isBn ? 'সাবস্ক্রিপশন প্ল্যান পরিবর্তন' : 'Upgrade Subscription Package'}</h2>
                                                <p className="text-[11px] text-slate-400">{isBn ? 'আপনার ওয়ার্কস্পেসের জন্য উপযুক্ত প্যাকেজ নির্বাচন করুন' : 'Select an enterprise tier for your workspace'}</p>
                                            </div>
                                        </div>

                                        {isAdmin ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {billingPackages.map(pkg => {
                                                    const isCurrent = institute?.subscriptionPackage?.id === pkg.id;
                                                    return (
                                                        <div 
                                                            key={pkg.id} 
                                                            className={`rounded-xl p-4 border transition duration-150 flex flex-col justify-between ${
                                                                isCurrent 
                                                                    ? 'bg-indigo-50/30 border-indigo-500 shadow-2xs' 
                                                                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                                                            }`}
                                                        >
                                                            <div>
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md">
                                                                        {pkg.packageCode}
                                                                    </span>
                                                                    {isCurrent && (
                                                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                                            <CheckCircle size={10} /> {isBn ? 'সক্রিয়' : 'Current'}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <h3 className="text-sm font-black text-slate-900">{pkg.displayName || pkg.name}</h3>
                                                                <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{pkg.description}</p>
                                                                
                                                                <div className="my-3 flex items-baseline gap-1">
                                                                    <span className="text-xl font-black text-slate-900">৳{pkg.price}</span>
                                                                    <span className="text-slate-400 text-xs font-semibold">/ {pkg.billingCycle}</span>
                                                                </div>

                                                                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 mb-4 text-[11px] text-slate-600 font-medium">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Users size={12} className="text-indigo-500 shrink-0" />
                                                                        <span>{isBn ? 'টিচার:' : 'Teachers:'} {pkg.maxTeachers || '∞'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <GraduationCap size={12} className="text-indigo-500 shrink-0" />
                                                                        <span>{isBn ? 'স্টুডেন্ট:' : 'Students:'} {pkg.maxStudents || '∞'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Cpu size={12} className="text-indigo-500 shrink-0" />
                                                                        <span>{isBn ? 'প্রশ্ন:' : 'Questions:'} {formatLimit(pkg.maxQuestions)}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Database size={12} className="text-indigo-500 shrink-0" />
                                                                        <span>{formatStorage(pkg.storageLimitMb)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                disabled={isCurrent || updatingSubscription}
                                                                onClick={() => handleUpgradeSubscription(pkg.id)}
                                                                className={`w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                                                    isCurrent 
                                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60' 
                                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95 disabled:opacity-50'
                                                                }`}
                                                            >
                                                                {updatingSubscription && selectedPackageId === pkg.id ? (
                                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                                                ) : isCurrent ? <CheckCircle size={13} /> : null}
                                                                <span>{isCurrent ? (isBn ? 'বর্তমান প্ল্যান' : 'Active Plan') : (isBn ? 'প্ল্যান আপগ্রেড করুন' : 'Upgrade Package')}</span>
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center gap-2.5 text-xs text-amber-800">
                                                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                                                <span>{isBn ? 'প্যাকেজ আপগ্রেড করতে অ্যাডমিন প্রিভিলেজ প্রয়োজন।' : 'Admin privilege required to upgrade subscription packages.'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ================= TAB 4: ACADEMIC SUBJECT ACCESS ================= */}
                            {activeTab === 'academic' && (() => {
                                const activeSubjectsList = [];
                                const availableSubjectsList = [];
                                
                                const userRoles = (user?.roles || []).map(r => typeof r === 'string' ? r : (r.name || ''));
                                const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ROLE_SUPER_ADMIN');
                                const isInstituteAdmin = userRoles.includes('INSTITUTE_ADMIN') || userRoles.includes('ROLE_INSTITUTE_ADMIN');
                                
                                // Check if teacher is an institutional sub-teacher (belongs to a custom institution tenant, not default)
                                const instCode = institute?.code || user?.instituteCode || '';
                                const instName = institute?.nameEn || user?.instituteNameEn || '';
                                const isDefaultInstitute = !institute?.id || instCode === 'DEFAULT' || instName.toLowerCase().includes('default');
                                const isTeacher = (userRoles.includes('TEACHER') || userRoles.includes('ROLE_TEACHER')) && !isSuperAdmin && !isInstituteAdmin && !isDefaultInstitute;
                                
                                // Effective allowed subjects for this user:
                                const effectiveAllowedIds = (isTeacher && user?.assignedSubjectIds && user.assignedSubjectIds.length > 0)
                                    ? user.assignedSubjectIds
                                    : assignedSubjectIds;

                                if (hierarchy?.classSubjects) {
                                    const pricingRules = getPricingRules();
                                    
                                    hierarchy.classSubjects.forEach(cs => {
                                        const cls = hierarchy.classes?.find(c => String(c.id) === String(cs._classId));
                                        const rule = pricingRules.find(pr => String(pr.classSubjectId) === String(cs.id));
                                        
                                        const subjectDetail = {
                                            classSubject: cs,
                                            cls: cls,
                                            rule: rule,
                                            price: rule ? (Number(rule.price) || 200) : 200
                                        };
                                        
                                        const isAssigned = effectiveAllowedIds.some(id => String(id) === String(cs.id));
                                        if (isAssigned) {
                                            activeSubjectsList.push(subjectDetail);
                                        } else if (!isTeacher) {
                                            // Only Workspace Admins / Individual Teachers see Available for Activation
                                            if (cs.approvedQuestionCount && cs.approvedQuestionCount > 0) {
                                                availableSubjectsList.push(subjectDetail);
                                            }
                                        }
                                    });
                                }

                                const selectedLevelObj = hierarchy?.levels?.find(l => String(l.id) === String(selectedLevelFilter));

                                const filteredStreamOptions = (hierarchy?.streams || []).filter(s => {
                                    if (selectedLevelFilter === 'ALL') return true;
                                    const matchId = s._levelId && String(s._levelId) === String(selectedLevelFilter);
                                    const matchName = selectedLevelObj && s._levelName === selectedLevelObj.name;
                                    return matchId || matchName;
                                });

                                const filteredClassOptions = (hierarchy?.classes || []).filter(c => {
                                    if (selectedLevelFilter !== 'ALL') {
                                        const matchLevelId = c._levelId && String(c._levelId) === String(selectedLevelFilter);
                                        const matchLevelName = selectedLevelObj && c._levelName === selectedLevelObj.name;
                                        if (!matchLevelId && !matchLevelName) return false;
                                    }
                                    if (selectedStreamFilter !== 'ALL') {
                                        const matchStreamId = c._streamId && String(c._streamId) === String(selectedStreamFilter);
                                        const matchStreamName = c._streamName && (
                                            c._streamName === selectedStreamFilter || 
                                            hierarchy?.streams?.some(s => String(s.id) === String(selectedStreamFilter) && s.name === c._streamName)
                                        );
                                        if (!matchStreamId && !matchStreamName) return false;
                                    }
                                    return true;
                                });

                                const filteredSubjectOptions = (hierarchy?.classSubjects || []).filter(cs => {
                                    const cls = hierarchy.classes?.find(c => String(c.id) === String(cs._classId));
                                    if (!cs.approvedQuestionCount || cs.approvedQuestionCount <= 0) return false;
                                    if (selectedLevelFilter !== 'ALL') {
                                        const matchLevelId = cls?._levelId && String(cls._levelId) === String(selectedLevelFilter);
                                        const matchLevelName = selectedLevelObj && cls?._levelName === selectedLevelObj.name;
                                        if (!matchLevelId && !matchLevelName) return false;
                                    }
                                    if (selectedStreamFilter !== 'ALL') {
                                        const matchStreamId = cls?._streamId && String(cls._streamId) === String(selectedStreamFilter);
                                        const matchStreamName = cls?._streamName && (
                                            cls._streamName === selectedStreamFilter || 
                                            hierarchy?.streams?.some(s => String(s.id) === String(selectedStreamFilter) && s.name === cls._streamName)
                                        );
                                        if (!matchStreamId && !matchStreamName) return false;
                                    }
                                    if (selectedClassFilter !== 'ALL') {
                                        const matchClassId = cls?.id && String(cls.id) === String(selectedClassFilter);
                                        const matchClassCs = cs._classId && String(cs._classId) === String(selectedClassFilter);
                                        if (!matchClassId && !matchClassCs) return false;
                                    }
                                    return true;
                                });

                                const filterSubjectItem = ({ classSubject, cls }) => {
                                    if (selectedLevelFilter !== 'ALL') {
                                        const matchLevelId = cls?._levelId && String(cls._levelId) === String(selectedLevelFilter);
                                        const matchLevelName = selectedLevelObj && cls?._levelName === selectedLevelObj.name;
                                        if (!matchLevelId && !matchLevelName) return false;
                                    }
                                    if (selectedStreamFilter !== 'ALL') {
                                        const matchStreamId = cls?._streamId && String(cls._streamId) === String(selectedStreamFilter);
                                        const matchStreamName = cls?._streamName && (
                                            cls._streamName === selectedStreamFilter || 
                                            hierarchy?.streams?.some(s => String(s.id) === String(selectedStreamFilter) && s.name === cls._streamName)
                                        );
                                        if (!matchStreamId && !matchStreamName) return false;
                                    }
                                    if (selectedClassFilter !== 'ALL') {
                                        const matchClassId = cls?.id && String(cls.id) === String(selectedClassFilter);
                                        const matchClassCs = classSubject?._classId && String(classSubject._classId) === String(selectedClassFilter);
                                        if (!matchClassId && !matchClassCs) return false;
                                    }
                                    if (selectedSubjectFilter !== 'ALL') {
                                        if (classSubject?.id && String(classSubject.id) !== String(selectedSubjectFilter)) return false;
                                    }
                                    const q = subjectSearchQuery.trim().toLowerCase();
                                    if (q) {
                                        const matchesSubject = classSubject.name?.toLowerCase().includes(q);
                                        const matchesClass = cls?.name?.toLowerCase().includes(q);
                                        const matchesStream = cls?._streamName?.toLowerCase().includes(q);
                                        if (!matchesSubject && !matchesClass && !matchesStream) {
                                            return false;
                                        }
                                    }
                                    return true;
                                };

                                const filteredActiveList = activeSubjectsList.filter(filterSubjectItem);
                                const filteredAvailableList = availableSubjectsList.filter(filterSubjectItem);
                                
                                return (
                                    <div className="p-4 sm:p-6 space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/80">
                                                    <BookOpen size={16} />
                                                </div>
                                                <div>
                                                    <h2 className="text-sm font-black text-slate-800">{t('profile_academic_access')}</h2>
                                                    <p className="text-[11px] text-slate-400">
                                                        {isTeacher 
                                                            ? (isBn ? 'আপনার প্রতিষ্ঠান থেকে অনুমোদিত বিষয়সমূহের তালিকা' : 'List of subjects assigned to you by your institution')
                                                            : (isBn ? 'সক্রিয় এবং ক্রয়যোগ্য অ্যাকাডেমিক বিষয়সমূহ' : 'Manage syllabus and question bank access scope')}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => refreshAcademicData()}
                                                disabled={savingSubjects}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 self-start sm:self-auto"
                                            >
                                                <RefreshCw size={13} className={savingSubjects ? "animate-spin" : ""} />
                                                <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
                                            </button>
                                        </div>

                                        {/* Teacher Info Notice */}
                                        {isTeacher && (
                                            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-center gap-3 text-xs text-indigo-900 shadow-2xs">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                                    <Building2 size={16} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-bold flex items-center gap-1.5 flex-wrap">
                                                        <span>{isBn ? '🏛️ প্রতিষ্ঠান নির্ধারিত বিষয় অ্যাক্সেস' : '🏛️ Institution Assigned Subject Access'}</span>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/80 text-indigo-800">
                                                            {user?.assignedSubjectIds && user.assignedSubjectIds.length > 0
                                                                ? (isBn ? `${user.assignedSubjectIds.length}টি বিষয় অনুমোদিত` : `${user.assignedSubjectIds.length} Subjects Allowed`)
                                                                : (isBn ? 'প্রতিষ্ঠানের সকল সক্রিয় বিষয়' : 'All Active Institute Subjects')}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-indigo-700 mt-0.5">
                                                        {isBn 
                                                            ? `আপনার প্রতিষ্ঠান (${user?.userInstituteNameBn || user?.instituteName || 'আপনার শিক্ষা প্রতিষ্ঠান'}) আপনাকে এই বিষয়গুলোতে প্রশ্ন প্রণয়নের অনুমতি প্রদান করেছে। অন্য কোনো বিষয়ের অ্যাক্সেস প্রয়োজন হলে প্রতিষ্ঠান কর্তৃপক্ষের সাথে যোগাযোগ করুন।`
                                                            : `Your institution has granted you access to these subjects. For additional subject access, please contact your institution admin.`}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Hierarchical Filter Strip */}
                                        {hierarchy && (
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                                        <Filter size={13} className="text-indigo-600" />
                                                        <span>{isBn ? 'বিষয় ফিল্টারিং' : 'Hierarchy Filter'}</span>
                                                    </div>
                                                    {(selectedLevelFilter !== 'ALL' || selectedClassFilter !== 'ALL' || selectedStreamFilter !== 'ALL' || selectedSubjectFilter !== 'ALL' || subjectSearchQuery) && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedLevelFilter('ALL');
                                                                setSelectedStreamFilter('ALL');
                                                                setSelectedClassFilter('ALL');
                                                                setSelectedSubjectFilter('ALL');
                                                                setSubjectSearchQuery('');
                                                            }}
                                                            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 transition flex items-center gap-1"
                                                        >
                                                            <span>✕ {isBn ? 'রিসেট' : 'Reset'}</span>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                    {/* 1. Level */}
                                                    <div>
                                                        <select
                                                            value={selectedLevelFilter}
                                                            onChange={(e) => {
                                                                setSelectedLevelFilter(e.target.value);
                                                                setSelectedStreamFilter('ALL');
                                                                setSelectedClassFilter('ALL');
                                                                setSelectedSubjectFilter('ALL');
                                                            }}
                                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                                                        >
                                                            <option value="ALL">{isBn ? 'সকল স্তর (Level)' : 'All Levels'}</option>
                                                            {hierarchy?.levels?.map(lvl => (
                                                                <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* 2. Stream */}
                                                    <div>
                                                        <select
                                                            value={selectedStreamFilter}
                                                            onChange={(e) => {
                                                                setSelectedStreamFilter(e.target.value);
                                                                setSelectedClassFilter('ALL');
                                                                setSelectedSubjectFilter('ALL');
                                                            }}
                                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                                                        >
                                                            <option value="ALL">{isBn ? 'সকল বিভাগ (Stream)' : 'All Streams'}</option>
                                                            {filteredStreamOptions.map(st => (
                                                                <option key={st.id} value={st.id}>{st.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* 3. Class */}
                                                    <div>
                                                        <select
                                                            value={selectedClassFilter}
                                                            onChange={(e) => {
                                                                setSelectedClassFilter(e.target.value);
                                                                setSelectedSubjectFilter('ALL');
                                                            }}
                                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                                                        >
                                                            <option value="ALL">{isBn ? 'সকল শ্রেণী (Class)' : 'All Classes'}</option>
                                                            {filteredClassOptions.map(cls => (
                                                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* 4. Subject */}
                                                    <div>
                                                        <select
                                                            value={selectedSubjectFilter}
                                                            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                                                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                                                        >
                                                            <option value="ALL">{isBn ? 'সকল বিষয় (Subject)' : 'All Subjects'}</option>
                                                            {filteredSubjectOptions.map(cs => (
                                                                <option key={cs.id} value={cs.id}>{cs.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!hierarchy ? (
                                            <div className="flex items-center justify-center py-10 gap-2.5 text-slate-400 font-semibold text-xs">
                                                <RefreshCw size={15} className="animate-spin text-indigo-600" />
                                                <span>{isBn ? 'লোড হচ্ছে অ্যাকাডেমিক বিষয়সমূহ...' : 'Loading academic subjects...'}</span>
                                            </div>
                                        ) : (
                                            <div className={isTeacher ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-4"}>
                                                
                                                {/* Left Column: Active Subjects */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                                        <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            {isTeacher 
                                                                ? (isBn ? 'অনুমোদিত বিষয়সমূহ' : 'Permitted Subjects') 
                                                                : (isBn ? 'বর্তমান সক্রিয় বিষয়' : 'Active Subjects')} ({filteredActiveList.length})
                                                        </h3>
                                                    </div>
                                                    
                                                    {filteredActiveList.length === 0 ? (
                                                        <div className="p-6 border-2 border-dashed border-slate-200/80 rounded-xl text-center text-slate-400 text-xs font-semibold">
                                                            {isBn ? 'কোনো অনুমোদিত বিষয় পাওয়া যায়নি।' : 'No assigned subjects found.'}
                                                        </div>
                                                    ) : (
                                                        <div className={isTeacher 
                                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" 
                                                            : "space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar"}>
                                                            {filteredActiveList.map(({ classSubject, cls }) => (
                                                                <div 
                                                                    key={classSubject.id}
                                                                    className="p-3 bg-emerald-50/20 border border-emerald-200/70 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-emerald-300 transition"
                                                                >
                                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                                        <div className="p-1.5 bg-emerald-100/80 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                                                                            <BookOpen size={14} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <span className="text-xs font-bold text-slate-900 truncate">{classSubject.name}</span>
                                                                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200/60">
                                                                                    {(classSubject.approvedQuestionCount || 0).toLocaleString(isBn ? 'bn-BD' : 'en-US')} {isBn ? 'প্রশ্ন' : 'Qs'}
                                                                                </span>
                                                                            </div>
                                                                            <span className="block text-[10px] text-slate-500 font-semibold mt-0.5 truncate">
                                                                                {cls?.name || 'Class'} • {cls?._streamName || 'General'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md shrink-0">
                                                                        {isTeacher ? (isBn ? 'অনুমোদিত' : 'Permitted') : (isBn ? 'সক্রিয়' : 'Active')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Available Subjects */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                                        <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                            <Sparkles size={13} className="text-indigo-600" />
                                                            {isBn ? 'উপলব্ধ অন্যান্য বিষয়' : 'Available for Activation'} ({filteredAvailableList.length})
                                                        </h3>
                                                    </div>

                                                    {filteredAvailableList.length === 0 ? (
                                                        <div className="p-6 border-2 border-dashed border-slate-200/80 rounded-xl text-center text-slate-400 text-xs font-semibold">
                                                            {isBn ? 'কোনো অতিরিক্ত বিষয় উপলব্ধ নেই।' : 'No additional subjects available.'}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                                                            {filteredAvailableList.map(({ classSubject, cls, rule, price }) => (
                                                                <div 
                                                                    key={classSubject.id}
                                                                    className="p-3 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-indigo-300 transition"
                                                                >
                                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                                        <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-0.5">
                                                                            <BookOpen size={14} />
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <span className="text-xs font-bold text-slate-900 truncate">{classSubject.name}</span>
                                                                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                                                                                    {(classSubject.approvedQuestionCount || 0).toLocaleString(isBn ? 'bn-BD' : 'en-US')} {isBn ? 'প্রশ্ন' : 'Qs'}
                                                                                </span>
                                                                            </div>
                                                                            <span className="block text-[10px] text-slate-500 font-semibold mt-0.5 truncate">
                                                                                {cls?.name || 'Class'} • {cls?._streamName || 'General'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200/60">
                                                                            ৳{price}
                                                                        </span>
                                                                        <button 
                                                                            onClick={() => {
                                                                                setSubjectToActivate({ classSubject, rule });
                                                                                setPaymentStep('confirm');
                                                                                setSelectedPaymentMethod('bkash');
                                                                                setShowPaymentModal(true);
                                                                            }}
                                                                            className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition shadow-2xs active:scale-95"
                                                                        >
                                                                            {isBn ? 'সক্রিয় করুন' : 'Activate'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        </motion.div>
                    </AnimatePresence>
            </div>

            {/* Add / Edit Teacher Modal Dialog */}
            <AnimatePresence>
                {isTeacherModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !teacherSubmitting && setIsTeacherModalOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                        />

                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden z-10"
                        >
                            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 sm:p-5 text-white flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                        <GraduationCap size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black">
                                            {editingTeacher 
                                                ? (isBn ? 'শিক্ষকের তথ্য সম্পাদনা' : 'Edit Teacher Profile') 
                                                : (isBn ? 'নতুন শিক্ষক যুক্ত করুন' : 'Add New Teacher')}
                                        </h3>
                                        <p className="text-[10px] text-indigo-100/80">
                                            {isBn ? 'শিক্ষক প্রোফাইলের প্রয়োজনীয় তথ্য পূরণ করুন' : 'Enter teacher details and credentials'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => !teacherSubmitting && setIsTeacherModalOpen(false)}
                                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            <form onSubmit={handleSaveTeacher} className="p-4 sm:p-5 space-y-3.5">
                                {/* 1. Full Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        {isBn ? 'শিক্ষকের নাম' : 'Full Name'} <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={teacherForm.name}
                                        onChange={(e) => setTeacherForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder={isBn ? 'যেমন: মোহাম্মদ আসাদুজ্জামান' : 'e.g. John Doe'}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition"
                                    />
                                </div>

                                {/* 2. Email */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        {isBn ? 'ইমেইল অ্যাড্রেস' : 'Email Address'} <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        disabled={!!editingTeacher}
                                        value={teacherForm.email}
                                        onChange={(e) => setTeacherForm(p => ({ ...p, email: e.target.value }))}
                                        placeholder={isBn ? 'teacher@school.edu.bd' : 'teacher@domain.com'}
                                        className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none transition ${
                                            editingTeacher ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:bg-white focus:border-indigo-600'
                                        }`}
                                    />
                                </div>

                                {/* 3. Password (Only when adding) */}
                                {!editingTeacher && (
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-slate-700">
                                                {isBn ? 'প্রাথমিক পাসওয়ার্ড' : 'Initial Password'} <span className="text-rose-500">*</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleGenerateTeacherPassword}
                                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline transition select-none"
                                            >
                                                <Sparkles size={12} className="text-indigo-500" />
                                                <span>{isBn ? 'পাসওয়ার্ড জেনারেট করুন' : 'Generate Password'}</span>
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type={showTeacherPassword ? "text" : "password"}
                                                required
                                                minLength={6}
                                                value={teacherForm.password}
                                                onChange={(e) => setTeacherForm(p => ({ ...p, password: e.target.value }))}
                                                placeholder={isBn ? 'কমপক্ষে ৬ অক্ষর' : 'At least 6 characters'}
                                                className="w-full pl-3 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition"
                                            />
                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={handleCopyTeacherPassword}
                                                    className={`p-1.5 rounded-lg transition text-xs flex items-center gap-1 ${
                                                        copiedTeacherPassword 
                                                            ? 'text-emerald-600 bg-emerald-50 font-bold' 
                                                            : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                                    }`}
                                                    title={isBn ? (copiedTeacherPassword ? 'কপি হয়েছে!' : 'কপি করুন') : (copiedTeacherPassword ? 'Copied!' : 'Copy Password')}
                                                >
                                                    {copiedTeacherPassword ? <Check size={13} /> : <Copy size={13} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTeacherPassword(p => !p)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                                    title={showTeacherPassword ? (isBn ? 'লুকান' : 'Hide') : (isBn ? 'দেখান' : 'Show')}
                                                >
                                                    {showTeacherPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateTeacherPassword}
                                                    className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                                                    title={isBn ? 'নতুন পাসওয়ার্ড জেনারেট করুন' : 'Generate new password'}
                                                >
                                                    <RefreshCw size={13} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {isBn ? 'শিক্ষককে সরবরাহ করতে পাসওয়ার্ডটি কপি করে সংরক্ষণ করুন।' : 'Copy this password to share with the teacher.'}
                                        </p>
                                    </div>
                                )}

                                {/* 4. Phone Number */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        {isBn ? 'ফোন নম্বর' : 'Phone Number'}
                                    </label>
                                    <input
                                        type="tel"
                                        value={teacherForm.phone}
                                        onChange={(e) => setTeacherForm(p => ({ ...p, phone: e.target.value }))}
                                        placeholder={isBn ? '০১৭XXXXXXXX' : '+8801XXXXXXXXX'}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition"
                                    />
                                </div>

                                {/* 5. Assigned Branch */}
                                {branches.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            {isBn ? 'নির্ধারিত শাখা / ক্যাম্পাস' : 'Assigned Branch / Campus'}
                                        </label>
                                        <select
                                            value={teacherForm.branch}
                                            onChange={(e) => setTeacherForm(p => ({ ...p, branch: e.target.value }))}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition"
                                        >
                                            <option value="">🏛️ {getMainCampusTitle()}</option>
                                            {branches.map((b, bIdx) => (
                                                <option key={b.id || bIdx} value={b.nameBn || b.nameEn}>
                                                    🏢 {b.nameBn || b.nameEn}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        disabled={teacherSubmitting}
                                        onClick={() => setIsTeacherModalOpen(false)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                                    >
                                        {isBn ? 'বাতিল' : 'Cancel'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={teacherSubmitting}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                                    >
                                        {teacherSubmitting ? (
                                            <RefreshCw size={13} className="animate-spin" />
                                        ) : <Check size={13} />}
                                        <span>{teacherSubmitting ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (editingTeacher ? (isBn ? 'আপডেট করুন' : 'Update') : (isBn ? 'যুক্ত করুন' : 'Add Teacher'))}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ================= TEACHER SUBJECT PERMISSIONS MODAL ================= */}
            <AnimatePresence>
                {subjectModalTeacher && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !savingTeacherSubjects && setSubjectModalTeacher(null)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 12 }}
                            className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative z-10 text-slate-900 flex flex-col max-h-[85vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                            <span>{subjectModalTeacher.name}</span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                                {isBn ? 'বিষয় এক্সেস নিয়ন্ত্রণ' : 'Subject Permissions'}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {subjectModalTeacher.email} • {subjectModalTeacher.instituteBranches ? getAssignedCampusName(subjectModalTeacher.instituteBranches) : getMainCampusTitle()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSubjectModalTeacher(null)}
                                    disabled={savingTeacherSubjects}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Info Banner */}
                            <div className="px-4 sm:px-5 py-2.5 bg-amber-50/80 border-b border-amber-100 text-[11px] text-amber-900 flex items-center gap-2">
                                <span className="text-amber-600 font-bold shrink-0">ℹ️</span>
                                <span>
                                    {isBn 
                                        ? 'শিক্ষককে শুধুমাত্র আপনার প্রতিষ্ঠানের সক্রিয় বিষয়গুলো থেকেই পারমিশন দেওয়া যাবে। কোনো বিষয় সিলেক্ট না থাকলে শিক্ষক প্রতিষ্ঠানের সকল সক্রিয় বিষয়ে প্রশ্ন তৈরির এক্সেস পাবেন।'
                                        : 'Teachers can only be assigned subjects currently active in your institution. If no specific subjects are selected, the teacher will have default access to all institute subjects.'}
                                </span>
                            </div>

                            {/* Search & Bulk Select Controls */}
                            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                                <div className="relative w-full sm:w-64">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={teacherSubjectSearch}
                                        onChange={(e) => setTeacherSubjectSearch(e.target.value)}
                                        placeholder={isBn ? 'বিষয় বা শ্রেণি অনুসন্ধান...' : 'Search subjects or classes...'}
                                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-600 transition"
                                    />
                                </div>

                                {(() => {
                                    // Collect active subjects of institute
                                    const activeSubjectsList = (hierarchy?.classSubjects || []).filter(cs => assignedSubjectIds.includes(cs.id));
                                    const allActiveIds = activeSubjectsList.map(cs => cs.id);
                                    const isAllSelected = allActiveIds.length > 0 && allActiveIds.every(id => teacherSubjectIds.includes(id));
                                    
                                    return (
                                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isAllSelected) {
                                                        setTeacherSubjectIds([]);
                                                    } else {
                                                        setTeacherSubjectIds(allActiveIds);
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95"
                                            >
                                                {isAllSelected ? (isBn ? 'সব আন-সিলেক্ট করুন' : 'Deselect All') : (isBn ? 'সব সক্রিয় বিষয় সিলেক্ট করুন' : 'Select All Active')}
                                            </button>
                                            {teacherSubjectIds.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setTeacherSubjectIds([])}
                                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition active:scale-95"
                                                >
                                                    {isBn ? 'রিসেট (সকল বিষয়)' : 'Reset (All Access)'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Subjects List grouped by Class */}
                            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                                {(() => {
                                    if (!hierarchy) {
                                        return (
                                            <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                                                <RefreshCw size={20} className="animate-spin text-indigo-600" />
                                                <span className="text-xs font-semibold">{isBn ? 'বিষয় তালিকা লোড হচ্ছে...' : 'Loading subjects...'}</span>
                                            </div>
                                        );
                                    }

                                    // Filter active subjects of institute only
                                    const activeSubjects = (hierarchy.classSubjects || []).filter(cs => assignedSubjectIds.includes(cs.id));
                                    
                                    if (activeSubjects.length === 0) {
                                        return (
                                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                                                <BookOpen size={24} className="mx-auto text-slate-300" />
                                                <h4 className="text-xs font-bold text-slate-700">
                                                    {isBn ? 'আপনার প্রতিষ্ঠানে কোনো সক্রিয় বিষয় পাওয়া যায়নি' : 'No active subjects found for this institution'}
                                                </h4>
                                                <p className="text-[11px] text-slate-400">
                                                    {isBn ? 'শিক্ষককে বিষয় অ্যাসাইন করতে প্রথমে "Subject Access" ট্যাব থেকে বিষয় সক্রিয় করুন।' : 'Please activate subjects in the "Subject Access" tab first.'}
                                                </p>
                                            </div>
                                        );
                                    }

                                    // Group active subjects by class
                                    const grouped = {};
                                    activeSubjects.forEach(cs => {
                                        const cls = hierarchy.classes?.find(c => c.id === cs._classId || c.id === cs.classId);
                                        const className = cls?.name || (isBn ? 'সাধারণ শ্রেণি' : 'General Class');
                                        
                                        // Search query filter
                                        const q = teacherSubjectSearch.toLowerCase();
                                        const matchName = (cs.name || '').toLowerCase().includes(q) || (cs.subjectName || '').toLowerCase().includes(q);
                                        const matchClass = className.toLowerCase().includes(q);
                                        if (q && !matchName && !matchClass) return;

                                        if (!grouped[className]) {
                                            grouped[className] = { cls, subjects: [] };
                                        }
                                        grouped[className].subjects.push(cs);
                                    });

                                    const classNames = Object.keys(grouped);
                                    if (classNames.length === 0) {
                                        return (
                                            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                                                {isBn ? 'অনুসন্ধানের সাথে কোনো বিষয় মেলেনি।' : 'No subjects match your search.'}
                                            </div>
                                        );
                                    }

                                    return classNames.map((className) => {
                                        const group = grouped[className];
                                        return (
                                            <div key={className} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
                                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                                                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                                        <GraduationCap size={14} className="text-indigo-600" />
                                                        {className}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                        {group.subjects.length} {isBn ? 'টি বিষয়' : 'Subjects'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {group.subjects.map(cs => {
                                                        const isChecked = teacherSubjectIds.includes(cs.id);
                                                        return (
                                                            <label
                                                                key={cs.id}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setTeacherSubjectIds(prev => 
                                                                        prev.includes(cs.id) 
                                                                            ? prev.filter(id => id !== cs.id)
                                                                            : [...prev, cs.id]
                                                                    );
                                                                }}
                                                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition select-none ${
                                                                    isChecked 
                                                                        ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 shadow-2xs' 
                                                                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                                                                        isChecked 
                                                                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                                                                            : 'border-slate-300 bg-white'
                                                                    }`}>
                                                                        {isChecked && <Check size={11} strokeWidth={3} />}
                                                                    </div>
                                                                    <span className="text-xs font-bold truncate">
                                                                        {cs.name || cs.subjectName}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0 border border-slate-200/60">
                                                                    {(cs.approvedQuestionCount || 0).toLocaleString(isBn ? 'bn-BD' : 'en-US')} {isBn ? 'প্রশ্ন' : 'Qs'}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                                <div className="text-xs">
                                    <span className="font-semibold text-slate-500">{isBn ? 'নির্বাচিত বিষয়:' : 'Selected:'} </span>
                                    <span className="font-black text-indigo-600">
                                        {teacherSubjectIds.length === 0 
                                            ? (isBn ? 'সকল সক্রিয় বিষয় (ডিফল্ট)' : 'All Active Subjects (Default)')
                                            : (isBn ? `${teacherSubjectIds.length}টি বিষয় নির্দিষ্ট` : `${teacherSubjectIds.length} Subjects Specific`)}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={savingTeacherSubjects}
                                        onClick={() => setSubjectModalTeacher(null)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                                    >
                                        {isBn ? 'বাতিল' : 'Cancel'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={savingTeacherSubjects}
                                        onClick={handleSaveTeacherSubjects}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                                    >
                                        {savingTeacherSubjects ? (
                                            <RefreshCw size={13} className="animate-spin" />
                                        ) : <Check size={13} />}
                                        <span>{savingTeacherSubjects ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'পারমিশন সংরক্ষণ করুন' : 'Save Permissions')}</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                            />

                            {/* Modal Content */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                                className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 text-slate-900"
                            >
                                {/* Close Button */}
                                {paymentStep !== 'submitting' && (
                                    <button 
                                        onClick={() => setShowPaymentModal(false)}
                                        className="absolute right-3.5 top-3.5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                )}

                                {paymentStep === 'confirm' && (
                                    <div className="p-5">
                                        <div className="text-center pb-3 border-b border-slate-100">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 border border-indigo-100">
                                                <BookOpen size={18} />
                                            </div>
                                            <h3 className="text-base font-black text-slate-900">{isBn ? 'বিষয় সক্রিয়করণ নিশ্চিত করুন' : 'Confirm Subject Activation'}</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {isBn ? 'আপনার ওয়ার্কস্পেসে নতুন একটি বিষয় যোগ করতে পেমেন্ট করুন' : 'Make a payment to add a new subject to your workspace'}
                                            </p>
                                        </div>

                                        <div className="py-4 space-y-3">
                                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-500">{isBn ? 'বিষয়ের নাম:' : 'Subject Name:'}</span>
                                                    <span className="font-bold text-slate-900">{subjectToActivate.classSubject.name}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-500">{isBn ? 'শ্রেণী:' : 'Class:'}</span>
                                                    <span className="font-semibold text-slate-700">
                                                        {hierarchy.classes?.find(c => c.id === subjectToActivate.classSubject._classId)?.name || 'Class'}
                                                    </span>
                                                </div>
                                                <div className="h-px bg-slate-200 my-1.5"></div>
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-500">{isBn ? 'মোট মূল্য:' : 'Total Price:'}</span>
                                                    <span className="text-base font-black text-indigo-600">৳{activePrice}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2.5">
                                            <button 
                                                onClick={() => setShowPaymentModal(false)}
                                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition active:scale-95"
                                            >
                                                {isBn ? 'বাতিল করুন' : 'Cancel'}
                                            </button>
                                            <button 
                                                onClick={() => setPaymentStep('method')}
                                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition"
                                            >
                                                {isBn ? 'পে করুন' : 'Pay'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {paymentStep === 'method' && (
                                    <div className="p-5">
                                        <div className="text-center pb-3 border-b border-slate-100">
                                            <h3 className="text-base font-black text-slate-900">{isBn ? 'পেমেন্ট গেটওয়ে নির্বাচন করুন' : 'Select Payment Gateway'}</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {isBn ? 'পেমেন্ট সম্পন্ন করার জন্য গেটওয়ে নির্বাচন করুন' : 'Select gateway to complete your payment'}
                                            </p>
                                        </div>

                                        <div className="py-4 grid grid-cols-2 gap-2.5">
                                            {/* bKash */}
                                            <button 
                                                onClick={() => setSelectedPaymentMethod('bkash')}
                                                className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition ${
                                                    selectedPaymentMethod === 'bkash' 
                                                        ? 'border-[#E2136E] bg-[#E2136E]/5 text-slate-900' 
                                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                                                }`}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-2xs">
                                                    <span className="text-[#E2136E] font-black text-[11px]">bKash</span>
                                                </div>
                                                <span className="text-[10px] font-bold">{isBn ? 'বিকাশ' : 'bKash'}</span>
                                            </button>

                                            {/* Nagad */}
                                            <button 
                                                onClick={() => setSelectedPaymentMethod('nagad')}
                                                className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition ${
                                                    selectedPaymentMethod === 'nagad' 
                                                        ? 'border-[#F7941D] bg-[#F7941D]/5 text-slate-900' 
                                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                                                }`}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-2xs">
                                                    <span className="text-[#F7941D] font-black text-[11px]">Nagad</span>
                                                </div>
                                                <span className="text-[10px] font-bold">{isBn ? 'নগদ' : 'Nagad'}</span>
                                            </button>

                                            {/* Rocket */}
                                            <button 
                                                onClick={() => setSelectedPaymentMethod('rocket')}
                                                className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition ${
                                                    selectedPaymentMethod === 'rocket' 
                                                        ? 'border-[#8C3494] bg-[#8C3494]/5 text-slate-900' 
                                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                                                }`}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-2xs">
                                                    <span className="text-[#8C3494] font-black text-[11px]">Rocket</span>
                                                </div>
                                                <span className="text-[10px] font-bold">{isBn ? 'রকেট' : 'Rocket'}</span>
                                            </button>

                                            {/* Card */}
                                            <button 
                                                onClick={() => setSelectedPaymentMethod('card')}
                                                className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition ${
                                                    selectedPaymentMethod === 'card' 
                                                        ? 'border-indigo-600 bg-indigo-50/50 text-slate-900' 
                                                        : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                                                }`}
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-2xs border border-slate-200">
                                                    <CreditCardIcon />
                                                </div>
                                                <span className="text-[10px] font-bold">{isBn ? 'কার্ড' : 'Card'}</span>
                                            </button>
                                        </div>

                                        <div className="flex gap-2.5 mt-2">
                                            <button 
                                                onClick={() => setPaymentStep('confirm')}
                                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition active:scale-95"
                                            >
                                                {isBn ? 'ফিরে যান' : 'Go Back'}
                                            </button>
                                            <button 
                                                onClick={() => handleActivateSubject(subjectToActivate.classSubject.id)}
                                                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition"
                                            >
                                                {isBn ? 'পেমেন্ট সম্পন্ন করুন' : 'Complete Payment'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {paymentStep === 'submitting' && (
                                    <div className="p-8 text-center space-y-3">
                                        <div className="w-10 h-10 rounded-full border-3 border-slate-200 border-t-indigo-600 animate-spin mx-auto"></div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900">{isBn ? 'পেমেন্ট প্রসেসিং হচ্ছে...' : 'Payment processing...'}</h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {isBn ? 'অনুগ্রহ করে অপেক্ষা করুন' : 'Please wait, verifying transaction'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {paymentStep === 'success' && (
                                    <div className="p-5 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200/80">
                                            <CheckCircle size={24} />
                                        </div>
                                        <h3 className="text-base font-black text-slate-900">{isBn ? 'পেমেন্ট সফল হয়েছে!' : 'Payment Successful!'}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {isBn ? 'বিষয়টি আপনার অ্যাকাউন্টে সফলভাবে সক্রিয় করা হয়েছে' : 'The subject has been successfully activated on your account'}
                                        </p>

                                        <div className="my-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-1.5 text-xs">
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-slate-500">{isBn ? 'বিষয়:' : 'Subject:'}</span>
                                                <span className="font-bold text-slate-800">{subjectToActivate.classSubject.name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-slate-500">{isBn ? 'গেটওয়ে:' : 'Gateway:'}</span>
                                                <span className="font-bold text-slate-800 uppercase">{selectedPaymentMethod}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-semibold text-slate-500">{isBn ? 'মোট মূল্য:' : 'Total Price:'}</span>
                                                <span className="font-black text-emerald-600">৳{activePrice}</span>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => setShowPaymentModal(false)}
                                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition"
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

// Simple Credit Card SVG helper
const CreditCardIcon = () => (
    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
    </svg>
);

export default MyProfile;
