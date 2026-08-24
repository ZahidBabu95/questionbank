import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, BookOpen, FileQuestion, Activity,
    TrendingUp, ArrowUpRight, ArrowDownRight, MoreHorizontal, Calendar,
    Zap, Target, Clock, Plus, ExternalLink, Loader2, FileText, Layers, Sparkles, X,
    Award, CheckCircle, XCircle, AlertCircle, ChevronRight, ChevronDown, ChevronUp, Search, Sliders, Database, ArrowRight
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';
import examService from '../../services/examService';
import axios from '../../utils/axios';
import { formatDistanceToNow, format } from 'date-fns';
import { bn } from 'date-fns/locale/bn';
import { motion, AnimatePresence } from 'framer-motion';
import StudentDashboard from '../student/StudentDashboard';
import { useLanguage } from '../../context/LanguageContext';

/* ─── Mobile-first KPI Card ─── */
const KPICard = ({ title, count, subValue, trend, icon: Icon, gradient, iconBg, onClick }) => {
    const { t } = useLanguage();
    return (
        <motion.div 
            whileHover={onClick ? { y: -4, scale: 1.01, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' } : { y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
            onClick={onClick}
            className={`bg-white/80 backdrop-blur-xl p-4 md:p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white/50 hover:border-slate-200 transition-all duration-300 group relative overflow-hidden ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
        >
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-transparent to-slate-100/50 rounded-full blur-2xl group-hover:bg-blue-50/50 transition-colors"></div>
            <div className="flex items-center gap-4 md:gap-5 relative z-10">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${gradient} text-white flex items-center justify-center shadow-lg shadow-blue-500/10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ring-4 ring-white/50`}>
                    <Icon size={24} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-slate-500 mb-1 truncate tracking-wide">{title}</p>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-none">{count}</h3>
                        {subValue !== undefined && subValue !== null && (
                            <span className="text-[10px] md:text-xs font-bold text-slate-400">/ {subValue} {t('db_kpi_total')}</span>
                        )}
                    </div>
                </div>
                {trend !== 0 && (
                    <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 shadow-sm ${trend > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : 'bg-rose-50 text-rose-600 border border-rose-100/50'}`}>
                        {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        <span>{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

/* ─── Quick Action Button ─── */
const QuickAction = ({ icon: Icon, label, to, color }) => (
    <Link
        to={to}
        className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all active:scale-[0.95] group relative overflow-hidden"
    >
        <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center shadow-md shadow-slate-200 group-hover:scale-110 transition-transform duration-300 ring-4 ring-white`}>
            <Icon size={20} strokeWidth={2} />
        </div>
        <span className="text-xs md:text-sm font-bold text-slate-700 text-center leading-tight">{label}</span>
    </Link>
);

const CustomTooltip = ({ active, payload, label }) => {
    const { t, currentLang } = useLanguage();
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-white/10">
                <p className="font-semibold mb-1.5 text-slate-300">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 mb-0.5 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-slate-400">{t(`db_chart_${entry.name.toLowerCase()}`) || entry.name}:</span>
                        <span className="font-bold">{entry.value.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = ({ view = 'overview' }) => {
    const { currentLang, t } = useLanguage();
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch (e) {
            return null;
        }
    });

    const userRoleNames = useMemo(() => {
        if (!user || !user.roles) return [];
        return user.roles.map(r => (typeof r === 'string' ? r : r.name || '')).map(r => r.toUpperCase());
    }, [user]);

    const isSuperAdmin = useMemo(() => {
        return userRoleNames.includes('SUPER_ADMIN') || userRoleNames.includes('ROLE_SUPER_ADMIN') || user?.email === 'admin' || user?.email?.includes('admin@');
    }, [userRoleNames, user]);

    const isInstituteAdmin = useMemo(() => {
        return userRoleNames.includes('INSTITUTE_ADMIN') || userRoleNames.includes('ROLE_INSTITUTE_ADMIN');
    }, [userRoleNames]);

    const isTeacher = useMemo(() => {
        return userRoleNames.includes('TEACHER') || userRoleNames.includes('ROLE_TEACHER');
    }, [userRoleNames]);

    const [stats, setStats] = useState(() => {
        try {
            const cached = sessionStorage.getItem('dashboard_stats_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                // Auto-purge stale global dumps (> 50 subjects)
                if (parsed?.subjectQuestions && Array.isArray(parsed.subjectQuestions) && parsed.subjectQuestions.length > 50) {
                    sessionStorage.removeItem('dashboard_stats_cache');
                    return null;
                }
                return parsed;
            }
            return null;
        } catch (e) {
            return null;
        }
    });
    const [loading, setLoading] = useState(!stats);
    const [showSubjectsModal, setShowSubjectsModal] = useState(false);
    const [modalTab, setModalTab] = useState('subject'); // 'subject' or 'class'
    const navigate = useNavigate();

    // New state hooks for recent exams monitor and analytics drawer
    const [recentExams, setRecentExams] = useState(() => {
        try {
            const cached = sessionStorage.getItem('dashboard_recent_exams_cache');
            return cached ? JSON.parse(cached) : [];
        } catch (e) {
            return [];
        }
    });
    const [loadingExams, setLoadingExams] = useState(false);
    const [selectedAnalyticsExamId, setSelectedAnalyticsExamId] = useState(null);
    const [analyticsSubmissions, setAnalyticsSubmissions] = useState([]);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');
    const [analyticsSearchTerm, setAnalyticsSearchTerm] = useState('');
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
    const [bookletData, setBookletData] = useState(null);
    const [loadingBooklet, setLoadingBooklet] = useState(false);
    const [selectedClassStats, setSelectedClassStats] = useState(null);
    
    // State hooks for large hierarchical modal
    const [activeLevel, setActiveLevel] = useState('');
    const [activeStream, setActiveStream] = useState('');

    const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);

    const toggleBannerCollapse = () => {
        setIsBannerCollapsed(prev => !prev);
    };

    // Auto-collapse banner after 3 seconds on initial load so user sees welcome greeting
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBannerCollapsed(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);
    const [selectedClassDetail, setSelectedClassDetail] = useState(null);

    // Level-wise filter state for Class-wise progress section (null = collapsed by default)
    const [selectedProgressLevel, setSelectedProgressLevel] = useState(null);

    const subjectQuestions = useMemo(() => {
        const list = stats?.subjectQuestions || [];
        // If list contains all system subjects (> 50), filter out so only user's active assigned subjects show
        if (!Array.isArray(list) || list.length > 50) return [];
        return list;
    }, [stats]);

    const classStatsList = stats?.classStats || [];

    const progressLevelsList = useMemo(() => {
        if (!classStatsList.length) return [];
        return [...new Set(classStatsList.map(c => c.levelName || 'General'))].filter(Boolean).sort();
    }, [classStatsList]);

    const filteredClassStats = useMemo(() => {
        if (!classStatsList.length || !selectedProgressLevel) return [];
        if (selectedProgressLevel === 'ALL') return classStatsList;
        return classStatsList.filter(c => (c.levelName || 'General') === selectedProgressLevel);
    }, [classStatsList, selectedProgressLevel]);

    const handleProgressLevelToggle = (lvl) => {
        setSelectedProgressLevel(prev => prev === lvl ? null : lvl);
    };

    // Automatic hierarchy selection coordination
    useEffect(() => {
        if (stats?.classStats && stats.classStats.length > 0) {
            const levelsList = [...new Set(stats.classStats.map(c => c.levelName || 'General'))].sort();
            if (levelsList.length > 0 && !activeLevel) {
                setActiveLevel(levelsList[0]);
            }
        }
    }, [stats, activeLevel]);

    useEffect(() => {
        if (stats?.classStats && activeLevel) {
            const classesInLevel = stats.classStats.filter(c => (c.levelName || 'General') === activeLevel);
            const streamsList = [...new Set(classesInLevel.map(c => c.streamName || 'General'))].sort();
            if (streamsList.length > 0) {
                setActiveStream(streamsList[0]);
            } else {
                setActiveStream('');
            }
            setSelectedClassDetail(null);
        }
    }, [activeLevel, stats]);

    useEffect(() => {
        setSelectedClassDetail(null);
    }, [activeStream]);

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            if (!stats) setLoading(true);
            try {
                let data;
                let activeRoleViewLoc = view;
                if (view === 'overview') {
                    if (isSuperAdmin || user.permissions?.includes('ROLES_PERMISSIONS_VIEW') || user.permissions?.includes('SUBSCRIPTION_PACKAGE_VIEW')) {
                        activeRoleViewLoc = 'admin';
                    } else if (isInstituteAdmin || user.permissions?.includes('ALL_INSTITUTES_VIEW')) {
                        activeRoleViewLoc = 'institute';
                    } else if (isTeacher || user.permissions?.includes('ADD_QUESTION_VIEW')) {
                        activeRoleViewLoc = 'teacher';
                    } else {
                        activeRoleViewLoc = 'student';
                    }
                }

                if (activeRoleViewLoc === 'admin') {
                    data = await dashboardService.getAdminStats();
                } else if (activeRoleViewLoc === 'institute') {
                    data = await dashboardService.getInstituteStats();
                } else if (activeRoleViewLoc === 'teacher') {
                    data = await dashboardService.getTeacherStats();
                } else {
                    data = await dashboardService.getStudentStats();
                }
                if (data) {
                    if (data.subjectQuestions && Array.isArray(data.subjectQuestions) && data.subjectQuestions.length > 50) {
                        data.subjectQuestions = [];
                    }
                    setStats(data);
                    sessionStorage.setItem('dashboard_stats_cache', JSON.stringify(data));
                }
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user, view, isSuperAdmin, isInstituteAdmin, isTeacher]);

    // Fetch recent exams dynamically for the "Online Exams & OMR Monitor"
    useEffect(() => {
        if (!user) return;
        
        let activeRoleViewLoc = view;
        if (view === 'overview') {
            if (isSuperAdmin || user.permissions?.includes('ROLES_PERMISSIONS_VIEW') || user.permissions?.includes('SUBSCRIPTION_PACKAGE_VIEW')) {
                activeRoleViewLoc = 'admin';
            } else if (isInstituteAdmin || user.permissions?.includes('ALL_INSTITUTES_VIEW')) {
                activeRoleViewLoc = 'institute';
            } else if (isTeacher || user.permissions?.includes('ADD_QUESTION_VIEW')) {
                activeRoleViewLoc = 'teacher';
            } else {
                activeRoleViewLoc = 'student';
            }
        }

        if (activeRoleViewLoc === 'student') return;

        const fetchRecentExams = async () => {
            if (!recentExams.length) setLoadingExams(true);
            try {
                const res = await examService.listExams({ size: 5 });
                if (res.success && res.data && res.data.content) {
                    const mapped = res.data.content.map((exam) => {
                        const submissionsCount = exam.submissionCount || 0;
                        const totalStudents = 40;
                        const progressPercent = Math.min(100, Math.round((submissionsCount / totalStudents) * 100)) || 0;

                        return {
                            id: exam.id,
                            title: exam.title,
                            className: exam.className || (currentLang === 'bn' ? '১০ম শ্রেণী' : 'Class 10'),
                            subject: exam.subjectName || (currentLang === 'bn' ? 'পদার্থবিজ্ঞান' : 'Physics'),
                            mode: exam.examType === 'OMR' ? 'OMR' : 'ONLINE',
                            progress: progressPercent,
                            count: `${submissionsCount}/${totalStudents}`,
                            status: exam.status
                        };
                    });
                    setRecentExams(mapped);
                    sessionStorage.setItem('dashboard_recent_exams_cache', JSON.stringify(mapped));
                }
            } catch (err) {
                console.error("Failed to fetch recent exams for dashboard monitor", err);
            } finally {
                setLoadingExams(false);
            }
        };

        fetchRecentExams();
    }, [user, view, currentLang, isSuperAdmin, isInstituteAdmin, isTeacher]);

    // Fetch submissions list when an exam is selected for inline analytics
    useEffect(() => {
        if (!selectedAnalyticsExamId) {
            setAnalyticsSubmissions([]);
            return;
        }

        if (typeof selectedAnalyticsExamId === 'string' && selectedAnalyticsExamId.startsWith('mock-')) {
            // Provide mock submissions for the mock exams so the demo is perfect!
            const mockSubs = [
                { id: 'sub-mock-1', studentName: currentLang === 'bn' ? 'তাহমিদ হাসান রনি' : 'Tahmid Hasan Roni', studentRoll: '১০১', className: currentLang === 'bn' ? '১০ম শ্রেণী' : 'Class 10', score: 32, totalMarks: 40, submittedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
                { id: 'sub-mock-2', studentName: currentLang === 'bn' ? 'আফরিন সুলতানা' : 'Afrin Sultana', studentRoll: '১০২', className: currentLang === 'bn' ? '১০ম শ্রেণী' : 'Class 10', score: 38, totalMarks: 40, submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
                { id: 'sub-mock-3', studentName: currentLang === 'bn' ? 'মোঃ আসিফুর রহমান' : 'Md Asifur Rahman', studentRoll: '১০৩', className: currentLang === 'bn' ? '১০ম শ্রেণী' : 'Class 10', score: 18, totalMarks: 40, submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
                { id: 'sub-mock-4', studentName: currentLang === 'bn' ? 'নওরিন জাহান' : 'Nowrin Jahan', studentRoll: '১০৪', className: currentLang === 'bn' ? '১০ম শ্রেণী' : 'Class 10', score: 26, totalMarks: 40, submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
                { id: 'sub-mock-5', studentName: currentLang === 'bn' ? 'সায়মন ইসলাম' : 'Saymon Islam', studentRoll: '১০৫', className: currentLang === 'bn' ? '১০ম শ্রেণী' : 'Class 10', score: 12, totalMarks: 40, submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() }
            ];
            setAnalyticsSubmissions(mockSubs);
            setLoadingAnalytics(false);
            return;
        }

        const fetchAnalytics = async () => {
            setLoadingAnalytics(true);
            setAnalyticsError('');
            try {
                const res = await axios.get(`/v1/teacher/exams/${selectedAnalyticsExamId}/submissions`);
                if (res.data) {
                    setAnalyticsSubmissions(res.data);
                }
            } catch (err) {
                console.error("Error loading submissions for dashboard drawer:", err);
                setAnalyticsError(t('db_analytics_error') || 'সাবমিশন তালিকা লোড করতে সমস্যা হয়েছে।');
            } finally {
                setLoadingAnalytics(false);
            }
        };

        fetchAnalytics();
    }, [selectedAnalyticsExamId, t, currentLang]);

    const handleViewBooklet = async (submissionId) => {
        setSelectedSubmissionId(submissionId);
        setLoadingBooklet(true);
        setBookletData(null);

        try {
            const res = await axios.get(`/v1/teacher/results/${submissionId}`);
            if (res.data) {
                setBookletData(res.data);
            }
        } catch (err) {
            console.error("Error fetching student booklet in dashboard modal:", err);
            alert(currentLang === 'bn' ? 'উত্তরপত্র লোড করতে সমস্যা হয়েছে।' : 'Failed to load booklet data.');
            setSelectedSubmissionId(null);
        } finally {
            setLoadingBooklet(false);
        }
    };

    const formatTime = (timeStr) => {
        try {
            return formatDistanceToNow(new Date(timeStr), {
                addSuffix: true,
                locale: currentLang === 'bn' ? bn : undefined
            });
        } catch (e) {
            return t('just_now') || "Just now";
        }
    };

    const formatBookType = (type) => {
        if (!type) return "";
        switch (type.toUpperCase()) {
            case 'TEXTBOOK': return currentLang === 'bn' ? 'পাঠ্যবই' : 'Textbook';
            case 'GUIDE': return currentLang === 'bn' ? 'গাইড বই' : 'Guide';
            case 'QUESTION_BANK': return currentLang === 'bn' ? 'প্রশ্ন ব্যাংক' : 'Question Bank';
            case 'LECTURE_SHEET': return currentLang === 'bn' ? 'লেকচার শিট' : 'Lecture Sheet';
            case 'SUPPLEMENTARY': return currentLang === 'bn' ? 'সহায়ক বই' : 'Supplementary';
            default: return type;
        }
    };

    const translateQuestionType = (typeName) => {
        const key = `QUESTION_BANK_ADD_QUESTION_${typeName.toUpperCase()}`;
        if (typeName.toLowerCase() === 'mcq') return t('QUESTION_BANK_ADD_QUESTION_MCQ');
        if (typeName.toLowerCase().includes('creative') || typeName.toLowerCase() === 'cq') return t('QUESTION_BANK_ADD_QUESTION_CQ_CREATIVE');
        if (typeName.toLowerCase().includes('short')) return t('QUESTION_BANK_ADD_QUESTION_SHORT_QUESTION');
        return t(key) || typeName;
    };

    if (loading && !stats) {
        return (
            <div className="p-6 space-y-6 animate-pulse">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                        <span className="text-sm font-bold text-slate-700">
                            {currentLang === 'bn' ? 'ড্যাশবোর্ড তথ্য লোড হচ্ছে, অনুগ্রহ করে কিছু মুহূর্ত অপেক্ষা করুন...' : 'Preparing dashboard analytics, please wait...'}
                        </span>
                    </div>
                    <div className="h-9 bg-slate-200 rounded-xl w-32"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/50 p-5 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                            </div>
                            <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/50"></div>
                    <div className="h-72 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/50"></div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100 shadow-sm">
                    <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {currentLang === 'bn' ? 'ড্যাশবোর্ড তথ্য লোড হতে সমস্যা হয়েছে' : 'Dashboard Data Loading Issue'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mb-6">
                    {currentLang === 'bn'
                        ? 'সার্ভার থেকে পরিসংখ্যান তথ্য সংগ্রেহ করতে সমস্যা হচ্ছে। অনুগ্রহ করে নিচে ক্লিক করে পুনরায় লোড করার চেষ্টা করুন।'
                        : 'Fetching dashboard statistics is taking longer than expected. Click below to reload data.'}
                </p>
                <button
                    onClick={() => {
                        setLoading(true);
                        try { sessionStorage.removeItem('dashboard_stats_cache'); } catch (e) {}
                        window.location.reload();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Zap size={16} />
                    {currentLang === 'bn' ? 'পুনরায় লোড করুন' : 'Reload Dashboard'}
                </button>
            </div>
        );
    }

    const {
        totalUsers = 0, userTrend = 0,
        activeInstitutes = 0, instituteTrend = 0,
        totalQuestions = 0, questionTrend = 0,
        examsConducted = 0, examTrend = 0,
        approvedQuestionsCount = 0, globalQuestionsCount = 0,
        questionTypes = [], activityAnalytics = [], recentActivities = [],
        subjectQuestions: rawSubjectQuestions = [], classStats = []
    } = stats || {};

    const hasPerm = (permId, action = 'VIEW') => {
        if (!user) return false;
        if (user.roles?.includes('SUPER_ADMIN')) return true;
        return user.permissions?.includes(`${permId}_${action}`);
    };

    let activeRoleView = view;
    if (view === 'overview' && user) {
        if (user.roles.includes('SUPER_ADMIN') || user.permissions?.includes('ROLES_PERMISSIONS_VIEW') || user.permissions?.includes('SUBSCRIPTION_PACKAGE_VIEW')) {
            activeRoleView = 'admin';
        } else if (user.roles.includes('INSTITUTE_ADMIN') || user.permissions?.includes('ALL_INSTITUTES_VIEW')) {
            activeRoleView = 'institute';
        } else if (user.roles.includes('TEACHER') || user.permissions?.includes('ADD_QUESTION_VIEW')) {
            activeRoleView = 'teacher';
        } else {
            activeRoleView = 'student';
        }
    }

    const isAdminView = activeRoleView === 'admin';
    const isStudentView = activeRoleView === 'student';

    const isSuperAdminUser = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    }) || user?.email === 'admin';

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 100, damping: 15 }
        }
    };

    const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy', {
        locale: currentLang === 'bn' ? bn : undefined
    });

    if (activeRoleView === 'student') {
        return <StudentDashboard user={user} />;
    }

    const displayExams = Array.isArray(recentExams) ? recentExams : [];

    // Helper lists for Academic Hierarchy Modal
    const levelsList = stats?.classStats
        ? [...new Set(stats.classStats.map(c => c.levelName || 'General'))].sort()
        : [];

    const classesInLevel = stats?.classStats && activeLevel
        ? stats.classStats.filter(c => (c.levelName || 'General') === activeLevel)
        : [];

    const currentStreamsList = classesInLevel.length > 0
        ? [...new Set(classesInLevel.map(c => c.streamName || 'General'))].sort()
        : [];

    const currentClassesToRender = classesInLevel.length > 0
        ? classesInLevel.filter(c => (c.streamName || 'General') === (activeStream || (currentStreamsList.length > 0 ? currentStreamsList[0] : '')))
        : [];

    // Compute analytics for the selected Level & Stream
    const activeLevelClassesCount = currentClassesToRender.length;
    const activeLevelTotalBooks = currentClassesToRender.reduce((sum, c) => sum + c.totalBooks, 0);
    const activeLevelBooksWithQs = currentClassesToRender.reduce((sum, c) => sum + c.booksWithQuestions, 0);
    const activeLevelTotalQuestions = currentClassesToRender.reduce((sum, c) => sum + c.totalQuestions, 0);
    const activeLevelCoverage = activeLevelTotalBooks > 0 
        ? Math.round((activeLevelBooksWithQs / activeLevelTotalBooks) * 100) 
        : 0;

    // Total approved questions across the user's active/accessible subjects
    const totalActiveApprovedQuestions = useMemo(() => {
        if (approvedQuestionsCount > 0) return approvedQuestionsCount;
        if (subjectQuestions && subjectQuestions.length > 0) {
            return subjectQuestions.reduce((sum, s) => sum + (Number(s.count) || 0), 0);
        }
        return 0;
    }, [approvedQuestionsCount, subjectQuestions]);

    return (
        <motion.div 
            className="space-y-5 md:space-y-6 lg:space-y-7"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ─── Unified Welcome & AI Workspace Banner ─── */}
            <motion.div variants={itemVariants} className="space-y-4">
                {isBannerCollapsed ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-violet-950 border border-indigo-800/40 rounded-2xl px-5 py-3.5 text-white shadow-md">
                        <div className="flex items-center flex-wrap gap-2.5">
                            <span className="px-2.5 py-0.5 bg-white/10 rounded-full text-[11px] font-bold text-amber-300 border border-white/10 flex items-center gap-1.5 shadow-sm">
                                <Sparkles size={13} className="text-amber-400 animate-pulse" />
                                {currentDate}
                            </span>
                            {view !== 'overview' && (
                                <span className="px-2.5 py-0.5 bg-indigo-500/30 rounded-full text-[11px] font-bold text-indigo-200 border border-indigo-400/30">
                                    {view === 'admin' ? t('db_super_admin_view') : view === 'institute' ? t('db_institute_admin_view') : view === 'teacher' ? t('db_teacher_view') : t('db_student_view')}
                                </span>
                            )}
                            <span className="text-sm font-extrabold text-white tracking-tight">
                                {t('db_welcome_back')}, {user?.name || t('db_welcome_fallback_name')}! 👋
                            </span>
                            <span className="hidden md:inline text-xs text-indigo-200/80 font-medium">
                                — {activeRoleView === 'admin' && t('db_admin_welcome_text')}
                                {activeRoleView === 'institute' && t('db_institute_welcome_text')}
                                {activeRoleView === 'teacher' && t('db_teacher_welcome_text')}
                                {activeRoleView === 'student' && t('db_student_welcome_text')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                                onClick={toggleBannerCollapse}
                                className="text-xs font-bold text-indigo-200 hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl transition-all border border-white/10 active:scale-95 shadow-sm"
                                title="AI ব্যানার খুলুন"
                            >
                                <ChevronDown size={14} />
                                <span>{currentLang === 'bn' ? 'AI ব্যানার খুলুন' : 'Show AI Banner'}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-5 md:p-6 text-white shadow-xl border border-white/15">
                        {/* Decorative blur elements */}
                        <div className="absolute -right-12 -top-12 w-56 h-56 bg-white/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
                        <div className="absolute -left-12 -bottom-12 w-56 h-56 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

                        {/* Top Control Bar */}
                        <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wide">
                                    <Sparkles size={13} className="text-amber-300 animate-pulse" />
                                    {currentDate}
                                </span>
                                {view !== 'overview' && (
                                    <span className="px-2.5 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/20">
                                        {view === 'admin' ? t('db_super_admin_view') : view === 'institute' ? t('db_institute_admin_view') : view === 'teacher' ? t('db_teacher_view') : t('db_student_view')}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={toggleBannerCollapse}
                                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/15 transition-all active:scale-90"
                                title="ব্যানার সংকুচিত করুন"
                            >
                                <ChevronUp size={18} />
                            </button>
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                            <div className="space-y-1.5 max-w-2xl">
                                <h1 className="text-xl md:text-3xl font-black tracking-tight">
                                    {t('db_welcome_back')}, {user?.name || t('db_welcome_fallback_name')}! 👋
                                </h1>
                                <p className="text-white/85 text-xs md:text-sm leading-relaxed max-w-xl">
                                    {activeRoleView === 'admin' && t('db_admin_welcome_text')}
                                    {activeRoleView === 'institute' && t('db_institute_welcome_text')}
                                    {activeRoleView === 'teacher' && t('db_teacher_welcome_text')}
                                    {activeRoleView === 'student' && t('db_student_welcome_text')}
                                </p>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-3">
                                <Link 
                                    to="/ai-workspace"
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-extrabold text-xs md:text-sm rounded-xl hover:bg-indigo-50 hover:shadow-lg hover:shadow-white/20 active:scale-[0.98] transition-all duration-300 group shadow-md"
                                >
                                    <span>{t('db_launch_ai')}</span>
                                    <Zap size={15} className="text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform duration-300" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* 🚀 ULTRA-PREMIUM QUICK ACCESS ACTION CARDS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                    {/* Card 1: Auto 1-Click Question Generator */}
                    <motion.div
                        whileHover={{ y: -6, scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <Link 
                            to="/exams/generate/auto" 
                            className="group relative overflow-hidden bg-gradient-to-br from-white/95 via-amber-50/25 to-orange-50/35 backdrop-blur-2xl border border-amber-200/80 hover:border-amber-400/90 rounded-3xl p-5 transition-all duration-300 shadow-[0_6px_25px_rgba(245,158,11,0.06),0_0_1px_1px_rgba(255,255,255,0.9)_inset] hover:shadow-[0_18px_38px_-6px_rgba(245,158,11,0.22)] flex flex-col justify-between h-full min-h-[148px]"
                        >
                            {/* Background Ambient Mesh Glow */}
                            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-t-3xl opacity-80 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 ring-4 ring-amber-100/80">
                                    <Zap size={22} className="animate-pulse fill-white/20" />
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 bg-amber-100/80 text-amber-900 rounded-full uppercase tracking-wider border border-amber-300/70 backdrop-blur-md shadow-xs">
                                    <Sparkles size={11} className="text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                                    {currentLang === 'bn' ? 'অটো ১-ক্লিক' : 'Auto 1-Click'}
                                </span>
                            </div>

                            <div className="relative z-10 mt-4">
                                <h3 className="text-base font-black text-slate-800 group-hover:text-amber-700 transition-colors flex items-center gap-2">
                                    <span>{currentLang === 'bn' ? 'অটো এক-ক্লিক প্রশ্ন তৈরি' : 'Auto 1-Click Question Builder'}</span>
                                    <ArrowRight size={16} className="text-amber-500 transition-all duration-300 group-hover:translate-x-1.5" />
                                </h3>
                                <p className="text-xs font-semibold text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                    {currentLang === 'bn' ? 'সিলেবাস ও বিষয় বেছে ১-ক্লিকে ফুল প্রশ্নপত্র তৈরি করুন।' : 'Generate full question papers in 1 click by syllabus.'}
                                </p>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Card 2: Manual Question Selection */}
                    <motion.div
                        whileHover={{ y: -6, scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <Link 
                            to="/exams/generate/manual" 
                            className="group relative overflow-hidden bg-gradient-to-br from-white/95 via-indigo-50/25 to-violet-50/35 backdrop-blur-2xl border border-indigo-200/80 hover:border-indigo-400/90 rounded-3xl p-5 transition-all duration-300 shadow-[0_6px_25px_rgba(99,102,241,0.06),0_0_1px_1px_rgba(255,255,255,0.9)_inset] hover:shadow-[0_18px_38px_-6px_rgba(99,102,241,0.22)] flex flex-col justify-between h-full min-h-[148px]"
                        >
                            {/* Background Ambient Mesh Glow */}
                            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br from-indigo-400/20 via-purple-400/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-t-3xl opacity-80 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300 ring-4 ring-indigo-100/80">
                                    <Sliders size={22} />
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 bg-indigo-100/80 text-indigo-900 rounded-full uppercase tracking-wider border border-indigo-300/70 backdrop-blur-md shadow-xs">
                                    {currentLang === 'bn' ? 'ম্যানুয়াল সিলেক্ট' : 'Manual Pick'}
                                </span>
                            </div>

                            <div className="relative z-10 mt-4">
                                <h3 className="text-base font-black text-slate-800 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                                    <span>{currentLang === 'bn' ? 'ম্যানুয়ালি প্রশ্ন নির্বাচন' : 'Manual Question Selector'}</span>
                                    <ArrowRight size={16} className="text-indigo-500 transition-all duration-300 group-hover:translate-x-1.5" />
                                </h3>
                                <p className="text-xs font-semibold text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                    {currentLang === 'bn' ? 'অধ্যায় থেকে পছন্দমতো প্রশ্ন বেছে কাস্টম পেপার তৈরি করুন।' : 'Handpick questions from chapters for custom papers.'}
                                </p>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Card 3: Question Bank Repository */}
                    <motion.div
                        whileHover={{ y: -6, scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <Link 
                            to="/questions/approved" 
                            className="group relative overflow-hidden bg-gradient-to-br from-white/95 via-emerald-50/25 to-teal-50/35 backdrop-blur-2xl border border-emerald-200/80 hover:border-emerald-400/90 rounded-3xl p-5 transition-all duration-300 shadow-[0_6px_25px_rgba(16,185,129,0.06),0_0_1px_1px_rgba(255,255,255,0.9)_inset] hover:shadow-[0_18px_38px_-6px_rgba(16,185,129,0.22)] flex flex-col justify-between h-full min-h-[148px]"
                        >
                            {/* Background Ambient Mesh Glow */}
                            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 rounded-t-3xl opacity-80 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 ring-4 ring-emerald-100/80">
                                    <Database size={22} />
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 bg-emerald-100/80 text-emerald-900 rounded-full uppercase tracking-wider border border-emerald-300/70 backdrop-blur-md shadow-xs">
                                    {currentLang === 'bn' ? 'প্রশ্ন ব্যাংক' : 'Question Bank'}
                                </span>
                            </div>

                            <div className="relative z-10 mt-4">
                                <h3 className="text-base font-black text-slate-800 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                                    <span>{currentLang === 'bn' ? 'প্রশ্ন ব্যাংক সংগ্রহশালা' : 'Question Bank Explorer'}</span>
                                    <ArrowRight size={16} className="text-emerald-500 transition-all duration-300 group-hover:translate-x-1.5" />
                                </h3>
                                <p className="text-xs font-semibold text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                    {currentLang === 'bn' ? 'বিষয় ও অধ্যায়ভিত্তিক সকল অনুমোদিত প্রশ্ন ফিল্টার করুন।' : 'Explore and filter approved questions by topic.'}
                                </p>
                            </div>
                        </Link>
                    </motion.div>
                </div>
            </motion.div>

            {/* ─── KPI Cards ─── */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {activeRoleView === 'admin' && (
                    <>
                        <KPICard title={t('db_kpi_total_users')} count={totalUsers.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} trend={userTrend || 0} icon={Users} gradient="bg-gradient-to-br from-blue-500 to-primary" />
                        <KPICard title={t('db_kpi_active_institutes')} count={activeInstitutes.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} trend={instituteTrend || 0} icon={BookOpen} gradient="bg-gradient-to-br from-indigo-500 to-secondary" />
                        <KPICard 
                            title={t('db_kpi_approved_qs')} 
                            count={totalActiveApprovedQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            subValue={globalQuestionsCount > 0 ? globalQuestionsCount.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US') : undefined}
                            trend={questionTrend || 0} 
                            icon={FileQuestion} 
                            gradient="bg-gradient-to-br from-violet-500 to-purple-600" 
                            onClick={() => setShowSubjectsModal(true)}
                        />
                        <KPICard 
                            title={t('db_kpi_exams')} 
                            count={examsConducted.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            trend={examTrend || 0} 
                            icon={Activity} 
                            gradient="bg-gradient-to-br from-emerald-500 to-teal-600" 
                            onClick={() => navigate('/exams/generate/saved')}
                        />
                    </>
                )}
                {activeRoleView === 'institute' && (
                    <>
                        <KPICard 
                            title={t('db_kpi_registered_students')} 
                            count={(stats?.totalStudents ?? 0).toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            trend={0} 
                            icon={Users} 
                            gradient="bg-gradient-to-br from-blue-500 to-primary" 
                        />
                        <KPICard 
                            title={t('db_kpi_active_teachers')} 
                            count={(stats?.totalTeachers ?? 0).toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            trend={0} 
                            icon={BookOpen} 
                            gradient="bg-gradient-to-br from-indigo-500 to-secondary" 
                        />
                        <KPICard 
                            title={t('db_kpi_total_questions_tenant')} 
                            count={totalQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            trend={0} 
                            icon={FileQuestion} 
                            gradient="bg-gradient-to-br from-violet-500 to-purple-600" 
                        />
                        <KPICard 
                            title={t('db_kpi_omr_evaluated')} 
                            count={(stats?.omrEvaluatedCount ?? examsConducted ?? 0).toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            trend={0} 
                            icon={FileText} 
                            gradient="bg-gradient-to-br from-emerald-500 to-teal-600" 
                            onClick={() => navigate('/omr/results')}
                        />
                    </>
                )}
                {activeRoleView === 'teacher' && (
                    <>
                        <KPICard 
                            title={t('db_kpi_contributed_qs')} 
                            count={totalQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            trend={0} 
                            icon={FileQuestion} 
                            gradient="bg-gradient-to-br from-blue-500 to-primary" 
                        />
                        <KPICard 
                            title={t('db_kpi_my_exams_count')} 
                            count={examsConducted.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            trend={0} 
                            icon={Activity} 
                            gradient="bg-gradient-to-br from-indigo-500 to-secondary" 
                            onClick={() => navigate('/exams/generate/saved')}
                        />
                        <KPICard 
                            title={t('db_kpi_approved_qs')} 
                            count={totalActiveApprovedQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            subValue={globalQuestionsCount > 0 ? globalQuestionsCount.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US') : undefined}
                            trend={0} 
                            icon={Layers} 
                            gradient="bg-gradient-to-br from-violet-500 to-purple-600" 
                            onClick={() => setShowSubjectsModal(true)}
                        />
                        <KPICard 
                            title={t('db_kpi_omr_evaluated')} 
                            count={(stats?.omrEvaluatedCount ?? examsConducted ?? 0).toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} 
                            trend={0} 
                            icon={FileText} 
                            gradient="bg-gradient-to-br from-emerald-500 to-teal-600" 
                            onClick={() => navigate('/omr/results')}
                        />
                    </>
                )}
            </motion.div>

            {/* ─── Class-wise Books & Questions Progress ─── */}
            {activeRoleView !== 'student' && classStats && classStats.length > 0 && (
                <motion.div 
                    variants={itemVariants} 
                    className="relative overflow-hidden bg-gradient-to-br from-white/95 via-[#fcfdfe] to-[#f8faff] backdrop-blur-2xl p-6 md:p-7 rounded-3xl border border-white/80 shadow-[0_10px_35px_-5px_rgba(15,23,42,0.04),0_0_1px_1px_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-200/70 space-y-6"
                >
                    {/* Ambient subtle light mesh */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-indigo-100/40 via-violet-100/20 to-transparent rounded-full blur-3xl pointer-events-none"></div>

                    {/* Header Row */}
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-50/80 shrink-0">
                                <Layers size={22} strokeWidth={2.2} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-800 tracking-tight">
                                    {currentLang === 'bn' ? 'শ্রেণিভিত্তিক বই ও প্রশ্ন অগ্রগতি' : 'Class-wise Books & Questions Progress'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {currentLang === 'bn' 
                                        ? 'প্রতিটি শ্রেণি ও স্তরের লাইভ বই এবং প্রশ্ন কভারেজ অগ্রগতি।' 
                                        : 'Live book and question coverage metrics by academic level.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="px-3.5 py-1.5 bg-indigo-50/90 text-indigo-700 rounded-full text-xs font-black border border-indigo-100/80 shadow-xs flex items-center gap-1.5">
                                <BookOpen size={14} className="text-indigo-600" />
                                <span>{classStats.length} {currentLang === 'bn' ? 'টি শ্রেণি' : 'Classes'}</span>
                            </span>
                        </div>
                    </div>

                    {/* Level Filter Selector Bar */}
                    {progressLevelsList.length > 0 && (
                        <div className="relative z-10 flex flex-wrap items-center gap-2.5 pt-1">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider mr-1">
                                {currentLang === 'bn' ? 'স্তর নির্বাচন:' : 'Select Level:'}
                            </span>

                            {progressLevelsList.map(lvl => {
                                const count = classStats.filter(c => (c.levelName || 'General') === lvl).length;
                                const isSelected = selectedProgressLevel === lvl;
                                return (
                                    <button
                                        key={lvl}
                                        onClick={() => handleProgressLevelToggle(lvl)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 active:scale-95 ${
                                            isSelected
                                                ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-300/40'
                                                : 'bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-indigo-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                                        }`}
                                    >
                                        <span>{lvl}</span>
                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                                        }`}>
                                            {count}
                                        </span>
                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isSelected ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => handleProgressLevelToggle('ALL')}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 active:scale-95 ${
                                    selectedProgressLevel === 'ALL'
                                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white shadow-lg shadow-indigo-600/25 ring-2 ring-indigo-300/40'
                                        : 'bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-indigo-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
                                }`}
                            >
                                <span>{currentLang === 'bn' ? 'সব দেখান' : 'Show All'}</span>
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                    selectedProgressLevel === 'ALL' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                                }`}>
                                    {classStats.length}
                                </span>
                                <ChevronDown size={14} className={`transition-transform duration-300 ${selectedProgressLevel === 'ALL' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                            </button>
                        </div>
                    )}

                    {/* Animated Cards or Collapsed Banner */}
                    <AnimatePresence mode="wait">
                        {selectedProgressLevel ? (
                            <motion.div 
                                key={selectedProgressLevel}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2"
                            >
                                {filteredClassStats.map((cls) => (
                                    <motion.div 
                                        key={cls.classId}
                                        whileHover={{ y: -4, boxShadow: '0 14px 30px -5px rgba(99, 102, 241, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03)' }}
                                        className="bg-white/95 hover:bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between group"
                                    >
                                        <div className="space-y-3.5">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                                                    {cls.className}
                                                </h4>
                                                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-extrabold border border-indigo-100 shadow-2xs">
                                                    {cls.totalBooks.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} {currentLang === 'bn' ? 'টি বই' : 'Books'}
                                                </span>
                                            </div>

                                            {/* Stats grid */}
                                            <div className="grid grid-cols-3 gap-2 py-1">
                                                <div className="bg-emerald-50/70 rounded-xl p-2 text-center border border-emerald-100/80 shadow-2xs">
                                                    <span className="text-[10px] text-emerald-600 font-bold block">{currentLang === 'bn' ? 'প্রশ্ন সম্পন্ন' : 'Done'}</span>
                                                    <span className="text-xs font-black text-emerald-700 block mt-0.5">
                                                        {cls.booksWithQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                    </span>
                                                </div>
                                                <div className="bg-rose-50/70 rounded-xl p-2 text-center border border-rose-100/80 shadow-2xs">
                                                    <span className="text-[10px] text-rose-600 font-bold block">{currentLang === 'bn' ? 'প্রশ্ন বাকি' : 'Pending'}</span>
                                                    <span className="text-xs font-black text-rose-700 block mt-0.5">
                                                        {cls.booksWithoutQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50/80 rounded-xl p-2 text-center border border-slate-200/70 shadow-2xs">
                                                    <span className="text-[10px] text-slate-500 font-bold block">{currentLang === 'bn' ? 'মোট প্রশ্ন' : 'Questions'}</span>
                                                    <span className="text-xs font-black text-slate-800 block mt-0.5">
                                                        {cls.totalQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status progress bar */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-600">
                                                    <span>{currentLang === 'bn' ? 'প্রশ্ন কভারেজ' : 'Question Coverage'}</span>
                                                    <span className="text-indigo-600 font-black">
                                                        {cls.totalBooks > 0 
                                                            ? Math.round((cls.booksWithQuestions / cls.totalBooks) * 100) 
                                                            : 0}%
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${
                                                            cls.booksWithoutQuestions === 0 
                                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                                                : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                                                        }`}
                                                        style={{ 
                                                            width: `${cls.totalBooks > 0 ? (cls.booksWithQuestions / cls.totalBooks) * 100 : 0}%` 
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedClassStats(cls)}
                                            className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-700 text-xs font-extrabold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 border border-slate-200/80 hover:border-transparent shadow-2xs active:scale-[0.98]"
                                        >
                                            <ExternalLink size={13} />
                                            <span>{currentLang === 'bn' ? 'বইয়ের তালিকা ও অগ্রগতি' : 'Books List & Progress'}</span>
                                        </button>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative z-10 p-5 rounded-2xl bg-gradient-to-r from-white via-indigo-50/40 to-slate-50 border border-indigo-100/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                                        <Sparkles size={19} className="text-amber-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800">
                                            {currentLang === 'bn' ? 'শ্রেণিভিত্তিক বিস্তারিত তথ্য দেখতে যেকোনো স্তর সিলেক্ট করুন' : 'Select an academic level above to view progress'}
                                        </h4>
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                            {currentLang === 'bn' 
                                                ? 'যেকোনো স্তরের বোতামে ক্লিক করলে প্রশ্ন সম্পন্ন ও বাকি থাকা বইয়ের তালিকা দেখা যাবে।' 
                                                : 'Click any level tab above to expand total books & question metrics.'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleProgressLevelToggle(progressLevelsList[0] || 'ALL')}
                                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/20 shrink-0 active:scale-95 flex items-center gap-1.5"
                                >
                                    <span>{currentLang === 'bn' ? 'স্তর দেখুন' : 'Explore Level'}</span>
                                    <ChevronDown size={14} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}



            {/* ─── Online Exams & OMR Monitor ─── */}
            {activeRoleView !== 'student' && displayExams && displayExams.length > 0 && (
                <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl p-5 md:p-7 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm md:text-base font-bold text-slate-900">{t('db_widget_online_exams_monitor')}</h3>
                            <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">
                                {currentLang === 'bn' ? 'সাম্প্রতিক অনলাইন পরীক্ষা ও ওএমআর শিট মূল্যায়নের লাইভ অগ্রগতি ট্র্যাকার।' : 'Live evaluation progress tracker of recent online and OMR exams.'}
                            </p>
                        </div>
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    <th className="pb-3 pl-3">{t('db_table_exam_title')}</th>
                                    <th className="pb-3">{t('omr_gen_class') || 'Class'} & {t('omr_gen_subject') || 'Subject'}</th>
                                    <th className="pb-3">{t('db_table_exam_mode')}</th>
                                    <th className="pb-3">{t('db_table_exam_progress')}</th>
                                    <th className="pb-3 text-right pr-3">{t('db_quick_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-slate-600">
                                {loadingExams ? (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-slate-400 font-semibold">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            {t('loading') || 'Loading...'}
                                        </td>
                                    </tr>
                                ) : (
                                    displayExams.map((exam) => (
                                        <tr key={exam.id} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3.5 pl-3 font-semibold text-slate-800 text-xs md:text-sm">{exam.title}</td>
                                            <td className="py-3.5 text-xs font-medium text-slate-500">
                                                {exam.className} <span className="text-slate-300 mx-1">|</span> {exam.subject}
                                            </td>
                                            <td className="py-3.5">
                                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border tracking-wide uppercase ${
                                                    exam.mode === 'ONLINE' 
                                                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {exam.mode}
                                                </span>
                                            </td>
                                            <td className="py-3.5">
                                                <div className="flex items-center gap-2 max-w-[150px]">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${exam.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                            style={{ width: `${exam.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-700">{exam.progress}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 text-right pr-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {exam.mode === 'OMR' && exam.progress < 100 && (
                                                        <Link 
                                                            to="/omr/scan" 
                                                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-amber-500/10 active:scale-[0.96]"
                                                        >
                                                            {t('db_btn_scan_omr')}
                                                        </Link>
                                                    )}
                                                    <button 
                                                        onClick={() => setSelectedAnalyticsExamId(exam.id)}
                                                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all active:scale-[0.96]"
                                                    >
                                                        {t('db_btn_view_results')}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Stack View */}
                    <div className="md:hidden space-y-3">
                        {loadingExams ? (
                            <div className="text-center py-6 text-slate-400 font-semibold">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                {t('loading') || 'Loading...'}
                            </div>
                        ) : (
                            displayExams.map((exam) => (
                                <div key={exam.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800 leading-tight">{exam.title}</h4>
                                            <p className="text-[10px] text-slate-400 font-semibold mt-1">
                                                {exam.className} | {exam.subject}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border tracking-wide uppercase ${
                                            exam.mode === 'ONLINE' 
                                                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                            {exam.mode}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${exam.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${exam.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-700">{exam.progress}%</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {exam.mode === 'OMR' && exam.progress < 100 && (
                                                <Link 
                                                    to="/omr/scan" 
                                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all active:scale-[0.96]"
                                                >
                                                    {t('db_btn_scan_omr') || 'Scan'}
                                                </Link>
                                            )}
                                            <button 
                                                onClick={() => setSelectedAnalyticsExamId(exam.id)}
                                                className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all active:scale-[0.96]"
                                            >
                                                {t('db_btn_view_results')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

            {/* ─── Charts Section ─── */}
            {activeRoleView !== 'student' && hasPerm('REPORTS', 'VIEW') && activityAnalytics && activityAnalytics.length > 0 && (
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                    {/* Growth Chart */}
                    <div className="bg-white/80 backdrop-blur-xl p-5 md:p-7 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white lg:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <h3 className="text-sm md:text-base font-bold text-slate-900">{t('db_chart_activity')}</h3>
                            <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">{t('db_chart_sub')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-4 text-[11px] font-medium text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    {t('db_chart_questions')}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                                    {t('db_chart_exams')}
                                </div>
                            </div>
                            <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="h-[200px] md:h-[280px] w-full -ml-2 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityAnalytics} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExams" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    dy={8}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                                    width={35}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="questions"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorQuestions)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="exams"
                                    stroke="#8b5cf6"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorExams)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Question Types */}
                <div className="bg-white/80 backdrop-blur-xl p-5 md:p-7 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white flex flex-col relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <h3 className="text-sm md:text-base font-bold text-slate-900">{t('db_chart_types')}</h3>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        {/* On mobile: Horizontal bars inline. On desktop: chart */}
                        <div className="hidden md:block h-[180px] w-full mb-4 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={questionTypes} layout="vertical" barSize={10}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                        tickFormatter={(value) => translateQuestionType(value)}
                                        width={45}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value, name, props) => [
                                            value.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US') + '%',
                                            translateQuestionType(props.payload.name)
                                        ]}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                        {questionTypes.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Mobile-friendly inline bars */}
                        <div className="space-y-3">
                            {questionTypes.map((item, index) => (
                                <div key={index} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span className="text-slate-600 font-medium">{translateQuestionType(item.name)}</span>
                                        </div>
                                        <span className="font-bold text-slate-900">{item.value.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}%</span>
                                    </div>
                                    {/* Progress bar: visible on mobile, hidden md+ */}
                                    <div className="md:hidden w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${item.value}%`, backgroundColor: item.color }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
            )}

            {/* ─── Recent Activity ─── */}
            {isSuperAdminUser && recentActivities && recentActivities.length > 0 && (
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl p-5 md:p-7 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm md:text-base font-bold text-slate-900">{t('db_chart_recent')}</h3>
                    <button className="text-xs font-semibold text-primary hover:text-blue-700 active:scale-[0.97]">{t('db_chart_view_all')}</button>
                </div>

                {/* ─── Desktop Table ─── */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-slate-100">
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider pl-3">{t('db_table_id')}</th>
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">{t('db_table_user')}</th>
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">{t('db_table_activity')}</th>
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">{t('db_table_status')}</th>
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider text-right pr-3">{t('db_table_time')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {recentActivities.map((activity) => (
                                <tr key={activity.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 text-slate-600">
                                    <td className="py-3 pl-3 font-medium font-mono text-slate-400 text-xs">#{activity.id.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</td>
                                    <td className="py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500 uppercase">
                                                {activity.avatar}
                                            </div>
                                            <span className="font-semibold text-slate-900 text-xs">{activity.user}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 text-xs">{activity.action}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${activity.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            activity.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {t(`db_status_${activity.status.toLowerCase()}`) || activity.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right pr-3 text-slate-400 text-xs">{formatTime(activity.time)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ─── Mobile Cards (Stacked) ─── */}
                <div className="md:hidden space-y-2">
                    {recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-xl active:bg-slate-100 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center font-bold text-[10px] text-primary flex-shrink-0 uppercase">
                                {activity.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 truncate">{activity.user}</span>
                                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatTime(activity.time)}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{activity.action}</p>
                            </div>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activity.status === 'APPROVED' ? 'bg-emerald-400' :
                                activity.status === 'REJECTED' ? 'bg-rose-400' :
                                    'bg-amber-400'
                                }`}></span>
                        </div>
                    ))}
                </div>
            </motion.div>
            )}

            {/* Subject Breakdown Modal */}
            {showSubjectsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-6xl w-full h-[85vh] flex flex-col relative overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                            <div>
                                <h3 className="text-base md:text-lg font-black text-slate-900">{t('db_modal_approved_qs')}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {modalTab === 'subject' 
                                        ? (currentLang === 'bn' ? 'বিষয়ভিত্তিক প্রশ্ন ও লাইভ অগ্রগতি পরিসংখ্যান' : 'Approved questions breakdown and statistics by subject') 
                                        : (currentLang === 'bn' ? 'অ্যাকাডেমিক হায়ারার্কি অনুযায়ী বই ও প্রশ্নের পরিপূর্ণ অগ্রগতি' : 'Hierarchical academic level, stream, class, and subject progress overview')}
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowSubjectsModal(false);
                                    setModalTab('subject'); // Reset tab on close
                                }}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tab Headers */}
                        <div className="flex gap-4 border-b border-slate-100 px-6 pt-2 shrink-0 bg-slate-50/30">
                            <button
                                onClick={() => setModalTab('subject')}
                                className={`pb-3 text-xs md:text-sm font-black transition-all border-b-2 ${
                                    modalTab === 'subject'
                                        ? 'text-indigo-600 border-indigo-600'
                                        : 'text-slate-400 border-transparent hover:text-slate-600'
                                }`}
                            >
                                {currentLang === 'bn' ? 'বিষয়ভিত্তিক অ্যানালিটিক্স' : 'By Subject Analytics'}
                            </button>
                            <button
                                onClick={() => setModalTab('class')}
                                className={`pb-3 text-xs md:text-sm font-black transition-all border-b-2 ${
                                    modalTab === 'class'
                                        ? 'text-indigo-600 border-indigo-600'
                                        : 'text-slate-400 border-transparent hover:text-slate-600'
                                }`}
                            >
                                {currentLang === 'bn' ? 'অ্যাকাডেমিক হায়ারার্কি ও অগ্রগতি (Level-Stream-Class)' : 'Academic Hierarchy & Progress (Level-Stream-Class)'}
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {modalTab === 'subject' ? (
                                <div className="flex-1 p-6 flex flex-col overflow-hidden">
                                    {/* Search & Statistics summary */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
                                        <div className="relative w-full sm:max-w-xs">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                            <input 
                                                type="text"
                                                placeholder={currentLang === 'bn' ? 'বিষয় অনুসন্ধান করুন...' : 'Search subjects...'}
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                onChange={(e) => setAnalyticsSearchTerm(e.target.value)}
                                                value={analyticsSearchTerm}
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                            {currentLang === 'bn' 
                                                ? `সর্বমোট বিষয়: ${(subjectQuestions?.length || 0).toLocaleString('bn-BD')} টি` 
                                                : `Total Subjects: ${subjectQuestions?.length || 0}`}
                                        </div>
                                    </div>

                                    {/* Subject Table */}
                                    <div className="flex-1 overflow-auto border border-slate-100 rounded-2xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-100">
                                                    <th className="py-3 px-4 text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider">{currentLang === 'bn' ? 'বিষয়' : 'Subject'}</th>
                                                    <th className="py-3 px-4 text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider">{currentLang === 'bn' ? 'শ্রেণি' : 'Class'}</th>
                                                    <th className="py-3 px-4 text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider">{currentLang === 'bn' ? 'স্তর' : 'Level'}</th>
                                                    <th className="py-3 px-4 text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider">{currentLang === 'bn' ? 'ভার্সন' : 'Version'}</th>
                                                    <th className="py-3 px-4 text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-wider text-right">{currentLang === 'bn' ? 'অনুমোদিত প্রশ্ন' : 'Approved Questions'}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {subjectQuestions && subjectQuestions.length > 0 ? (
                                                    subjectQuestions
                                                        .filter(sub => 
                                                            sub.subjectName.toLowerCase().includes(analyticsSearchTerm.toLowerCase()) ||
                                                            sub.className.toLowerCase().includes(analyticsSearchTerm.toLowerCase())
                                                        )
                                                        .map((sub, index) => (
                                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="py-3 px-4 text-xs md:text-sm font-extrabold text-slate-800">{sub.subjectName}</td>
                                                                <td className="py-3 px-4 text-xs font-semibold text-slate-600">{sub.className}</td>
                                                                <td className="py-3 px-4 text-xs font-semibold text-slate-500">{sub.levelName}</td>
                                                                <td className="py-3 px-4 text-[10px] font-bold">
                                                                    <span className={`px-2 py-0.5 rounded-lg ${
                                                                        sub.version.includes("English") 
                                                                            ? "bg-blue-50 text-blue-600 border border-blue-100/50" 
                                                                            : "bg-amber-50 text-amber-700 border border-amber-100/50"
                                                                    }`}>
                                                                        {sub.version}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-4 text-xs md:text-sm font-black text-slate-900 text-right">
                                                                    {sub.count.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                                </td>
                                                            </tr>
                                                        ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="5" className="py-12 text-center text-slate-400 font-medium text-xs">
                                                            {t('db_modal_no_metrics')}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Left Sidebar - Levels List */}
                                    <div className="w-full md:w-[260px] border-r border-slate-100 bg-slate-50/40 p-4 overflow-y-auto shrink-0">
                                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 pl-2">
                                            {currentLang === 'bn' ? 'অ্যাকাডেমিক স্তরসমূহ' : 'Academic Levels'}
                                        </h4>
                                        <div className="space-y-1">
                                            {levelsList.map((lvl) => (
                                                <button
                                                    key={lvl}
                                                    onClick={() => {
                                                        setActiveLevel(lvl);
                                                        setSelectedClassDetail(null);
                                                    }}
                                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-between ${
                                                        (activeLevel || (levelsList.length > 0 ? levelsList[0] : '')) === lvl
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                                            : 'text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <span>{lvl}</span>
                                                    <ChevronRight size={14} className={(activeLevel || (levelsList.length > 0 ? levelsList[0] : '')) === lvl ? 'text-white' : 'text-slate-400'} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right Main Area */}
                                    <div className="flex-1 p-6 overflow-y-auto flex flex-col min-w-0">
                                        {selectedClassDetail ? (
                                            /* Class Book Details View inside Modal */
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                                                    <button
                                                        onClick={() => setSelectedClassDetail(null)}
                                                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-[10px] font-black text-slate-600 transition-all flex items-center gap-1 active:scale-[0.97]"
                                                    >
                                                        {currentLang === 'bn' ? '← শ্রেণিসমূহ' : '← Classes'}
                                                    </button>
                                                    <div>
                                                        <h4 className="text-sm md:text-base font-extrabold text-slate-800">
                                                            {selectedClassDetail.className} {currentLang === 'bn' ? 'বইয়ের তালিকা ও অগ্রগতি' : 'Books List & Progress'}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-semibold">
                                                            {selectedClassDetail.levelName} • {selectedClassDetail.streamName} • {selectedClassDetail.totalBooks} {currentLang === 'bn' ? 'টি বই' : 'Books'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{currentLang === 'bn' ? 'বইয়ের নাম' : 'Book Title'}</th>
                                                                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{currentLang === 'bn' ? 'বিষয়' : 'Subject'}</th>
                                                                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{currentLang === 'bn' ? 'বইয়ের ধরন' : 'Book Type'}</th>
                                                                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-right">{currentLang === 'bn' ? 'লাইভ প্রশ্ন' : 'Live Questions'}</th>
                                                                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center">{currentLang === 'bn' ? 'অগ্রগতি স্ট্যাটাস' : 'Status'}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {selectedClassDetail.books && selectedClassDetail.books.length > 0 ? (
                                                                selectedClassDetail.books.map((book) => (
                                                                    <tr key={book.bookId} className="hover:bg-slate-50/30 transition-colors">
                                                                        <td className="py-2.5 px-4 text-xs font-extrabold text-slate-800">{book.title}</td>
                                                                        <td className="py-2.5 px-4 text-xs font-semibold text-slate-600">{book.subjectName}</td>
                                                                        <td className="py-2.5 px-4 text-xs font-semibold text-slate-500">
                                                                            {formatBookType(book.bookType)}
                                                                        </td>
                                                                        <td className="py-2.5 px-4 text-xs md:text-sm font-black text-slate-800 text-right">
                                                                            {book.questionCount.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                                        </td>
                                                                        <td className="py-2.5 px-4 text-center">
                                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wide inline-block ${
                                                                                book.questionCount > 0 
                                                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' 
                                                                                    : 'bg-rose-50 text-rose-500 border border-rose-100/50'
                                                                            }`}>
                                                                                {book.questionCount > 0 
                                                                                    ? (currentLang === 'bn' ? 'চলমান' : 'ACTIVE') 
                                                                                    : (currentLang === 'bn' ? 'শুরু হয়নি' : 'NOT STARTED')}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="5" className="py-8 text-center text-slate-400 font-medium text-xs">
                                                                        {currentLang === 'bn' ? 'এই শ্রেণিতে কোনো বই পাওয়া যায়নি।' : 'No books found in this class.'}
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Stream selector and Class cards Grid */
                                            <>
                                                {/* Streams selector tabs */}
                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 shrink-0">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {currentStreamsList.map((strm) => (
                                                            <button
                                                                key={strm}
                                                                onClick={() => setActiveStream(strm)}
                                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                                                                    (activeStream || (currentStreamsList.length > 0 ? currentStreamsList[0] : '')) === strm
                                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-black shadow-sm'
                                                                        : 'bg-white border-slate-200/60 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                {strm}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-extrabold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                                                        {activeLevel} • {activeStream || (currentStreamsList.length > 0 ? currentStreamsList[0] : '')}
                                                    </span>
                                                </div>

                                                {/* Hierarchy Summary Analytics */}
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                                                    <div className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:shadow-indigo-500/5 transition-all">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentLang === 'bn' ? 'মোট শ্রেণি' : 'Total Classes'}</span>
                                                        <div className="flex items-baseline gap-1 mt-2">
                                                            <span className="text-xl font-black text-slate-800">{activeLevelClassesCount.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">{currentLang === 'bn' ? 'টি' : ''}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:shadow-purple-500/5 transition-all">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentLang === 'bn' ? 'মোট বই' : 'Total Books'}</span>
                                                        <div className="flex items-baseline gap-1 mt-2">
                                                            <span className="text-xl font-black text-slate-800">{activeLevelTotalBooks.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">{currentLang === 'bn' ? 'টি' : ''}</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:shadow-emerald-500/5 transition-all">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentLang === 'bn' ? 'প্রশ্ন কভারেজ' : 'Question Coverage'}</span>
                                                        <div className="flex items-baseline gap-1 mt-2">
                                                            <span className="text-xl font-black text-emerald-600">{activeLevelCoverage}%</span>
                                                        </div>
                                                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activeLevelCoverage}%` }}></div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-slate-100 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:shadow-amber-500/5 transition-all">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentLang === 'bn' ? 'মোট প্রশ্ন' : 'Total Questions'}</span>
                                                        <div className="flex items-baseline gap-1 mt-2">
                                                            <span className="text-xl font-black text-orange-600">{activeLevelTotalQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">{currentLang === 'bn' ? 'টি' : ''}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Classes Grid */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
                                                    {currentClassesToRender && currentClassesToRender.length > 0 ? (
                                                        currentClassesToRender.map((cls) => (
                                                            <div 
                                                                key={cls.classId}
                                                                onClick={() => setSelectedClassDetail(cls)}
                                                                className="group bg-white/80 p-4.5 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer active:scale-[0.99] flex flex-col justify-between"
                                                            >
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <h5 className="text-xs md:text-sm font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors">{cls.className}</h5>
                                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-bold border border-blue-100/50">
                                                                            {cls.totalBooks.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} {currentLang === 'bn' ? 'টি বই' : 'Books'}
                                                                        </span>
                                                                    </div>

                                                                    {/* Mini Stats Grid */}
                                                                    <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
                                                                        <div className="bg-emerald-50/30 rounded-lg p-1.5 border border-emerald-100/20">
                                                                            <span className="text-[8px] text-slate-400 font-bold block">{currentLang === 'bn' ? 'সম্পন্ন' : 'Done'}</span>
                                                                            <span className="text-xs font-black text-emerald-600 block">{cls.booksWithQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                                        </div>
                                                                        <div className="bg-rose-50/30 rounded-lg p-1.5 border border-rose-100/20">
                                                                            <span className="text-[8px] text-slate-400 font-bold block">{currentLang === 'bn' ? 'বাকি' : 'Pending'}</span>
                                                                            <span className="text-xs font-black text-rose-500 block">{cls.booksWithoutQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                                        </div>
                                                                        <div className="bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                                                            <span className="text-[8px] text-slate-400 font-bold block">{currentLang === 'bn' ? 'প্রশ্ন' : 'Questions'}</span>
                                                                            <span className="text-xs font-black text-slate-700 block">{cls.totalQuestions.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Progress coverage bar */}
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                                                            <span>{currentLang === 'bn' ? 'প্রশ্ন কভারেজ' : 'Coverage'}</span>
                                                                            <span className="text-slate-600">
                                                                                {cls.totalBooks > 0 ? Math.round((cls.booksWithQuestions / cls.totalBooks) * 100) : 0}%
                                                                            </span>
                                                                        </div>
                                                                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div 
                                                                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                                                style={{ width: `${cls.totalBooks > 0 ? (cls.booksWithQuestions / cls.totalBooks) * 100 : 0}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3.5 pt-2.5 border-t border-slate-100/50 flex items-center justify-end text-[9px] font-bold text-indigo-600 group-hover:translate-x-1 transition-transform gap-0.5">
                                                                    <span>{currentLang === 'bn' ? 'বিস্তারিত তালিকা' : 'View Details'}</span>
                                                                    <ChevronRight size={10} />
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-full py-12 text-center text-slate-400 font-medium text-xs">
                                                            {currentLang === 'bn' ? 'এই বিভাগে কোনো শ্রেণি পাওয়া যায়নি।' : 'No classes found in this category.'}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-auto px-6 py-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
                            <button 
                                onClick={() => {
                                    setShowSubjectsModal(false);
                                    setModalTab('subject'); // Reset tab on close
                                }}
                                className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all active:scale-[0.97]"
                            >
                                {t('db_modal_close')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Class Book Details Modal */}
            {selectedClassStats && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 relative overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {selectedClassStats.className}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    {currentLang === 'bn' 
                                        ? `শ্রেণিভিত্তিক মোট বইয়ের সংখ্যা ও প্রশ্ন অগ্রগতি (${selectedClassStats.totalBooks}টি বই)` 
                                        : `Class-wise total books count and question progress (${selectedClassStats.totalBooks} books)`}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedClassStats(null)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Book list */}
                        <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1">
                            {selectedClassStats.books && selectedClassStats.books.length > 0 ? (
                                selectedClassStats.books.map((book) => (
                                    <div key={book.bookId} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-slate-50 transition-all group">
                                        <div className="min-w-0 flex-1">
                                            <span className="font-extrabold text-slate-800 text-xs md:text-sm truncate block leading-tight group-hover:text-primary transition-colors">
                                                {book.title}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                <span className="px-1.5 py-0.5 bg-slate-200/50 text-slate-600 rounded text-[9px] font-bold">
                                                    {book.subjectName}
                                                </span>
                                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold border border-indigo-100/30">
                                                    {book.bookType}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="font-extrabold text-slate-800 text-xs md:text-sm">
                                                {book.questionCount.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} {currentLang === 'bn' ? 'টি প্রশ্ন' : 'Qs'}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider uppercase mt-1 ${
                                                book.status === 'ACTIVE' 
                                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/30' 
                                                    : 'bg-rose-50 text-rose-500 border border-rose-100/30'
                                            }`}>
                                                {book.status === 'ACTIVE' 
                                                    ? (currentLang === 'bn' ? 'প্রশ্ন তৈরি হয়েছে' : 'ACTIVE') 
                                                    : (currentLang === 'bn' ? 'কোনো প্রশ্ন নেই' : 'NOT STARTED')}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-slate-400 font-semibold">
                                    {currentLang === 'bn' ? 'এই শ্রেণিতে কোনো বই পাওয়া যায়নি।' : 'No books found in this class.'}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => setSelectedClassStats(null)}
                                className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                            >
                                {t('db_modal_close')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* ─── Inline Exam Analytics Drawer ─── */}
            <AnimatePresence>
                {selectedAnalyticsExamId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
                        {/* Backdrop Click */}
                        <div className="absolute inset-0" onClick={() => setSelectedAnalyticsExamId(null)} />
                        
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="relative bg-white h-full w-full max-w-4xl shadow-2xl flex flex-col justify-between border-l border-slate-100 z-10 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-base leading-snug flex items-center gap-2">
                                        <Award className="text-indigo-600" size={18} />
                                        {t('db_analytics_title')}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        {displayExams.find(e => e.id === selectedAnalyticsExamId)?.title || ''}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedAnalyticsExamId(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
                                {loadingAnalytics ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                        <p className="mt-4 text-slate-400 font-bold text-xs">{t('db_analytics_loading')}</p>
                                    </div>
                                ) : analyticsError ? (
                                    <div className="text-center py-16 text-rose-500 font-bold text-xs">{analyticsError}</div>
                                ) : (
                                    <>
                                        {/* Dynamic Calculations */}
                                        {(() => {
                                            const totalSub = analyticsSubmissions.length;
                                            const scs = analyticsSubmissions.map(s => s.score);
                                            const avg = totalSub > 0 ? (scs.reduce((a, b) => a + b, 0) / totalSub).toFixed(1) : 0;
                                            const highest = totalSub > 0 ? Math.max(...scs) : 0;
                                            const maxMarks = totalSub > 0 ? analyticsSubmissions[0].totalMarks : 40;
                                            const passed = analyticsSubmissions.filter(s => (s.score / maxMarks) >= 0.4).length;
                                            const passRate = totalSub > 0 ? Math.round((passed / totalSub) * 100) : 0;

                                            // Recharts distribution data
                                            const distributionData = [
                                                { name: currentLang === 'bn' ? 'উচ্চ (>=৮০%)' : 'Excellent (>=80%)', value: analyticsSubmissions.filter(s => (s.score / maxMarks) >= 0.8).length, color: '#10b981' },
                                                { name: currentLang === 'bn' ? 'মধ্যম (৬০-৭৯%)' : 'Good (60-79%)', value: analyticsSubmissions.filter(s => { const r = s.score / maxMarks; return r >= 0.6 && r < 0.8; }).length, color: '#3b82f6' },
                                                { name: currentLang === 'bn' ? 'উত্তীর্ণ (৪০-৫৯%)' : 'Passed (40-59%)', value: analyticsSubmissions.filter(s => { const r = s.score / maxMarks; return r >= 0.4 && r < 0.6; }).length, color: '#fb7185' },
                                                { name: currentLang === 'bn' ? 'অকৃতকার্য (<৪০%)' : 'Failed (<40%)', value: analyticsSubmissions.filter(s => (s.score / maxMarks) < 0.4).length, color: '#f43f5e' }
                                            ];

                                            const filteredSubs = analyticsSubmissions.filter(s => {
                                                const term = analyticsSearchTerm.toLowerCase();
                                                return (s.studentName || '').toLowerCase().includes(term) || (s.studentRoll || '').toString().includes(term);
                                            });

                                            return (
                                                <div className="space-y-6">
                                                    {/* Stats Cards Grid */}
                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                                <Users size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t('db_analytics_participants')}</p>
                                                                <h4 className="text-base font-extrabold text-slate-800 mt-0.5">{totalSub.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} {currentLang === 'bn' ? 'জন' : ''}</h4>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                                <Award size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t('db_analytics_avg_score')}</p>
                                                                <h4 className="text-base font-extrabold text-slate-800 mt-0.5">
                                                                    {avg.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                                    <span className="text-[10px] text-slate-400 font-bold">/{maxMarks.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                                </h4>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                                <Award size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t('db_analytics_highest_score')}</p>
                                                                <h4 className="text-base font-extrabold text-emerald-600 mt-0.5">
                                                                    {highest.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                                    <span className="text-[10px] text-slate-400 font-bold">/{maxMarks.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</span>
                                                                </h4>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                                                <CheckCircle size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t('db_analytics_pass_rate')}</p>
                                                                <h4 className="text-base font-extrabold text-purple-600 mt-0.5">{passRate.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}%</h4>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Chart & Table */}
                                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                                        {/* Distribution Chart */}
                                                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-[300px]">
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-800">{t('db_analytics_score_dist')}</h4>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{currentLang === 'bn' ? 'স্কোর রেঞ্জ ও পারফরম্যান্স বণ্টন' : 'Score Range & Performance Distribution'}</p>
                                                            </div>
                                                            <div className="h-44 w-full relative">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <BarChart data={distributionData}>
                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                                        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8' }} />
                                                                        <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} allowDecimals={false} />
                                                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                                                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={20}>
                                                                            {distributionData.map((entry, index) => (
                                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                                            ))}
                                                                        </Bar>
                                                                    </BarChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        </div>

                                                        {/* Submissions List */}
                                                        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-[300px]">
                                                            <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-slate-800">{t('db_analytics_sub_list')}</h4>
                                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{filteredSubs.length.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} {currentLang === 'bn' ? 'জন পাওয়া গেছে' : 'found'}</p>
                                                                </div>
                                                                <div className="relative w-44">
                                                                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                                                                        <Search size={12} />
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        placeholder={t('db_analytics_search_placeholder')}
                                                                        value={analyticsSearchTerm}
                                                                        onChange={(e) => setAnalyticsSearchTerm(e.target.value)}
                                                                        className="w-full pl-7 pr-3 py-1.5 border border-slate-200/80 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-50 focus:bg-white outline-none"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 overflow-y-auto pr-1">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr className="border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                                            <th className="pb-2 text-center w-12">{t('db_analytics_roll')}</th>
                                                                            <th className="pb-2">{t('db_analytics_student')}</th>
                                                                            <th className="pb-2 text-center">{t('db_analytics_score')}</th>
                                                                            <th className="pb-2 text-center w-20">{t('db_analytics_action')}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="text-[11px] text-slate-600 font-bold">
                                                                        {filteredSubs.length > 0 ? (
                                                                            filteredSubs.map((sub) => (
                                                                                <tr key={sub.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                                                    <td className="py-2 text-center font-mono text-slate-400">{sub.studentRoll ? sub.studentRoll.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US') : '—'}</td>
                                                                                    <td className="py-2 text-slate-800 font-bold truncate max-w-[120px]">{sub.studentName || 'Student'}</td>
                                                                                    <td className="py-2 text-center text-blue-600">{sub.score.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} / {sub.totalMarks.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}</td>
                                                                                    <td className="py-2 text-center">
                                                                                        <button
                                                                                            onClick={() => handleViewBooklet(sub.id)}
                                                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[9px] font-bold active:scale-[0.96]"
                                                                                        >
                                                                                            <span>{t('db_analytics_booklet')}</span>
                                                                                            <ChevronRight size={10} />
                                                                                        </button>
                                                                                    </td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan="4" className="py-8 text-center text-slate-400 font-semibold">{t('db_analytics_no_data')}</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-slate-100 flex justify-end bg-white">
                                <button
                                    onClick={() => setSelectedAnalyticsExamId(null)}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all"
                                >
                                    {t('db_analytics_close')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─── Student Booklet Overlay Modal ─── */}
            <AnimatePresence>
                {selectedSubmissionId && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
                        <div className="absolute inset-0" onClick={() => setSelectedSubmissionId(null)} />

                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="relative bg-white h-full w-full max-w-3xl shadow-2xl flex flex-col justify-between border-l border-slate-100 z-10"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-base leading-snug">
                                        {loadingBooklet ? t('loading') : t('db_analytics_booklet_title')}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        {bookletData?.studentName || ''} {bookletData?.studentRoll ? `• Roll: ${bookletData.studentRoll}` : ''}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedSubmissionId(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                                {loadingBooklet ? (
                                    <div className="flex flex-col items-center justify-center py-24">
                                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                        <p className="mt-4 text-slate-400 font-bold text-xs">{t('db_analytics_booklet_loading')}</p>
                                    </div>
                                ) : bookletData ? (
                                    <>
                                        {/* Score bar */}
                                        <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{t('db_analytics_score_obtained')}</p>
                                                <p className="text-base font-black text-blue-600 mt-0.5">
                                                    {bookletData.score.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} / {bookletData.totalMarks.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{t('db_analytics_correct_count')}</p>
                                                <p className="text-base font-black text-emerald-600 mt-0.5">
                                                    {(bookletData.answers?.filter(a => a.isCorrect).length || 0).toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} {currentLang === 'bn' ? 'টি' : ''}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{t('db_analytics_skipped_count')}</p>
                                                <p className="text-base font-black text-slate-500 mt-0.5">
                                                    {(bookletData.answers?.filter(a => a.isSkipped).length || 0).toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} {currentLang === 'bn' ? 'টি' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Answers list */}
                                        <div className="space-y-4">
                                            {bookletData.answers?.map((ans, idx) => {
                                                const isCorrect = ans.isCorrect;
                                                const isSkipped = ans.isSkipped;
                                                const optionLabels = currentLang === 'bn' ? ['ক', 'খ', 'গ', 'ঘ'] : ['A', 'B', 'C', 'D'];
                                                
                                                return (
                                                    <div key={ans.questionId || idx} className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4 shadow-sm">
                                                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                            <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg">
                                                                {currentLang === 'bn' ? 'প্রশ্ন:' : 'Question:'} {(idx + 1).toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                            </span>

                                                            <div className="flex items-center gap-2">
                                                                {isSkipped ? (
                                                                    <span className="text-[9px] font-black bg-slate-50 border text-slate-400 px-2 py-0.5 rounded">
                                                                        {t('db_analytics_skipped')}
                                                                    </span>
                                                                ) : isCorrect ? (
                                                                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                                        <CheckCircle size={10} /> {t('db_analytics_correct')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded flex items-center gap-1">
                                                                        <XCircle size={10} /> {t('db_analytics_incorrect')}
                                                                    </span>
                                                                )}
                                                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                                                                    {t('db_analytics_marks_val')}: {ans.marksObtained.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')} / {ans.marks.toLocaleString(currentLang === 'bn' ? 'bn-BD' : 'en-US')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Text */}
                                                        <div className="space-y-3">
                                                            {ans.stimulus && (
                                                                <div className="p-3 bg-slate-50 border rounded-xl text-slate-600 font-semibold text-xs leading-relaxed">
                                                                    {ans.stimulus}
                                                                </div>
                                                            )}
                                                            <h5 className="font-extrabold text-slate-800 text-sm leading-relaxed">
                                                                {ans.questionText}
                                                            </h5>
                                                        </div>

                                                        {/* Options */}
                                                        <div className="space-y-2">
                                                            {ans.options?.map((opt, oIdx) => {
                                                                const isSelected = ans.selectedOptionId === opt.id.toString();
                                                                const isCorrectOpt = opt.isCorrect;
                                                                
                                                                let boxStyle = "w-full text-left p-3 rounded-xl border font-semibold text-xs transition-all flex items-center gap-3 ";
                                                                let labelStyle = "w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ";

                                                                if (isCorrectOpt) {
                                                                    boxStyle += "bg-emerald-50/50 border-emerald-500 text-emerald-900";
                                                                    labelStyle += "bg-emerald-600 text-white";
                                                                } else if (isSelected && !isCorrectOpt) {
                                                                    boxStyle += "bg-red-50/50 border-red-300 text-red-900";
                                                                    labelStyle += "bg-red-600 text-white";
                                                                } else {
                                                                    boxStyle += "bg-white border-slate-200/60 text-slate-600";
                                                                    labelStyle += "bg-slate-50 border border-slate-200 text-slate-400";
                                                                }

                                                                return (
                                                                    <div key={opt.id} className={boxStyle}>
                                                                        <div className={labelStyle}>
                                                                            {optionLabels[oIdx] || (oIdx + 1)}
                                                                        </div>
                                                                        <div className="flex-1 flex justify-between items-center gap-2">
                                                                            <span className="leading-snug">{opt.optionText}</span>
                                                                            <div className="flex gap-1">
                                                                                {isCorrectOpt && (
                                                                                    <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">{t('db_analytics_correct')}</span>
                                                                                )}
                                                                                {isSelected && (
                                                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                                                                        isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                                                    }`}>{currentLang === 'bn' ? 'উত্তর' : 'Answer'}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Explanation */}
                                                        {ans.explanation && (
                                                            <div className="p-3.5 bg-blue-50/30 border border-blue-100/50 rounded-xl flex gap-2">
                                                                <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-[10px] font-black text-blue-900">{t('db_analytics_explanation')}:</p>
                                                                    <p className="text-slate-500 text-[11px] font-semibold leading-relaxed mt-0.5">{ans.explanation}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-20 text-slate-400 font-bold text-xs">{t('db_analytics_no_data')}</div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-slate-100 flex justify-end bg-white">
                                <button
                                    onClick={() => setSelectedSubmissionId(null)}
                                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all"
                                >
                                    {t('db_analytics_close')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Dashboard;
