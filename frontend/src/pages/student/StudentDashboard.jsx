import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../utils/axios';
import questionService from '../../services/questionService';
import academicService from '../../services/academicService';
import { useLanguage } from '../../context/LanguageContext';
import {
    BookOpen, Clock, Award, Play, AlertCircle, Loader2, Trophy,
    TrendingUp, Star, Sparkles, ArrowRight, Search, Filter,
    CheckCircle2, XCircle, X, ChevronRight, ChevronDown, ChevronUp, Info, Eye, ExternalLink, HelpCircle,
    Sliders, FileText, Database, Zap, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend
} from 'recharts';

const StudentDashboard = ({ user }) => {
    const { t, currentLang } = useLanguage();
    const [exams, setExams] = useState(() => {
        try {
            const cached = sessionStorage.getItem('student_assigned_exams_cache');
            return cached ? JSON.parse(cached) : [];
        } catch(e) { return []; }
    });
    const [completedExams, setCompletedExams] = useState(() => {
        try {
            const cached = sessionStorage.getItem('student_completed_exams_cache');
            return cached ? JSON.parse(cached) : [];
        } catch(e) { return []; }
    });
    const [questions, setQuestions] = useState([]);
    const [subjects, setSubjects] = useState(() => {
        try {
            const cached = sessionStorage.getItem('student_subjects_cache');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 50) {
                    sessionStorage.removeItem('student_subjects_cache');
                    return [];
                }
                return parsed;
            }
            return [];
        } catch(e) { return []; }
    });
    
    // Question Bank States
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedType, setSelectedType] = useState('ALL');
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [questionOptions, setQuestionOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    // General States
    const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);

    const toggleBannerCollapse = () => {
        setIsBannerCollapsed(prev => !prev);
    };

    // Filter display subjects so global dumps (> 50) never show
    const displaySubjects = useMemo(() => {
        if (!Array.isArray(subjects) || subjects.length > 50) return [];
        return subjects;
    }, [subjects]);

    // Auto-collapse banner after 3 seconds on initial load so user sees welcome greeting
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsBannerCollapsed(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);
    const [loading, setLoading] = useState(!exams.length && !completedExams.length);
    const [topicAccuracy, setTopicAccuracy] = useState({});
    const [loadingTopicAnalytics, setLoadingTopicAnalytics] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview'); // overview, exams, questions, history
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch assigned exams, results, and subjects in parallel
                const [resExams, resResults, resSubjects] = await Promise.allSettled([
                    axios.get('/v1/student/exams/assigned'),
                    axios.get('/v1/student/results'),
                    user?.classId ? academicService.getSubjectsByClass(user.classId) : Promise.resolve([])
                ]);

                if (resExams.status === 'fulfilled' && resExams.value?.data) {
                    setExams(resExams.value.data);
                    sessionStorage.setItem('student_assigned_exams_cache', JSON.stringify(resExams.value.data));
                }

                if (resResults.status === 'fulfilled' && resResults.value?.data) {
                    setCompletedExams(resResults.value.data);
                    sessionStorage.setItem('student_completed_exams_cache', JSON.stringify(resResults.value.data));
                }

                if (resSubjects.status === 'fulfilled' && resSubjects.value) {
                    const rawSubj = resSubjects.value;
                    let subjList = Array.isArray(rawSubj) ? rawSubj : (rawSubj.data || []);
                    if (subjList.length > 50) {
                        subjList = [];
                        sessionStorage.removeItem('student_subjects_cache');
                    }
                    setSubjects(subjList);
                    if (subjList.length > 0) {
                        sessionStorage.setItem('student_subjects_cache', JSON.stringify(subjList));
                    }
                }
            } catch (err) {
                console.error("Error loading student dashboard data:", err);
                setError(t('db_welcome_fallback_name') + ' - Data loading error');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user, t]);

    // Fetch shared questions based on search & filters
    useEffect(() => {
        const fetchQuestions = async () => {
            setLoadingQuestions(true);
            try {
                const params = {
                    status: 'APPROVED',
                    classId: user?.classId || '',
                    search: searchQuery,
                    subjectId: selectedSubject || '',
                    filterType: selectedType === 'ALL' ? '' : selectedType,
                    size: 8,
                    page: 0
                };
                const res = await questionService.getAllQuestionsPaginated(params);
                if (res && res.content) {
                    setQuestions(res.content);
                }
            } catch (err) {
                console.error("Failed to load shared questions:", err);
            } finally {
                setLoadingQuestions(false);
            }
        };

        if (user && activeTab === 'questions') {
            fetchQuestions();
        }
    }, [searchQuery, selectedSubject, selectedType, activeTab, user]);

    // Fetch options when a question is selected for preview
    const handleViewQuestion = async (q) => {
        setSelectedQuestion(q);
        if (q.type === 'MCQ') {
            setLoadingOptions(true);
            try {
                const opts = await questionService.getOptions(q.id);
                setQuestionOptions(opts || []);
            } catch (err) {
                console.error("Failed to load options:", err);
                setQuestionOptions([]);
            } finally {
                setLoadingOptions(false);
            }
        } else {
            setQuestionOptions([]);
        }
    };

    const formatDigits = (num) => {
        if (num === null || num === undefined) return '';
        if (currentLang === 'en') return num.toString();
        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return num.toString().replace(/[0-9]/g, m => enToBn[m]);
    };

    // Calculations
    const totalExamsTaken = completedExams.length;
    const avgScorePercent = totalExamsTaken > 0
        ? Math.round(completedExams.reduce((sum, item) => sum + ((item.score || 0) / (item.totalMarks || 1)), 0) / totalExamsTaken * 100)
        : 0;

    const totalXP = user?.contributionPoints || 0;
    const currentLevel = Math.floor(totalXP / 100) + 1;
    const xpProgressToNextLevel = totalXP % 100;

    let badgeTitle = t('db_student_badge_beginner');
    let badgeColor = 'from-cyan-500 to-blue-500';
    let badgeBorder = 'border-cyan-400/30';
    
    if (totalXP >= 500) {
        badgeTitle = t('db_student_badge_grandmaster');
        badgeColor = 'from-amber-500 via-orange-600 to-rose-600';
        badgeBorder = 'border-amber-400/40';
    } else if (totalXP >= 200) {
        badgeTitle = t('db_student_badge_expert');
        badgeColor = 'from-indigo-500 via-purple-500 to-pink-500';
        badgeBorder = 'border-purple-400/40';
    }

    const translateSubject = (subName) => {
        if (!subName) return '';
        if (currentLang === 'bn') return subName;
        const mapping = {
            'উচ্চতর গণিত': 'Higher Mathematics',
            'গণিত': 'Mathematics',
            'পদার্থবিজ্ঞান': 'Physics',
            'রসায়ন': 'Chemistry',
            'জীববিজ্ঞান': 'Biology',
            'ইংরেজি': 'English',
            'বাংলা': 'Bangla',
            'শব্দার্থ ও টীকা': 'Vocabulary & Notes',
            'সুভার আত্ম-অনুভব ও পিতামাতার উদ্বেগ': 'Subha\'s Self-Feelings & Parent\'s Concern',
            'খলিফার মহত্ব ও পুরস্কার': 'Caliph\'s Nobility & Reward',
            'গোলাপের মহিমা ও বিবাহের প্রস্তুতি': 'Rose\'s Glory & Marriage Preparation',
            'পাঠ পরিচিতি': 'Lesson Introduction',
            'প্রকৃতির সাথে সুভার সম্পর্ক': 'Subha\'s Relation with Nature',
            'দেমাকাসে প্রাণরক্ষা': 'Saving Life in Demakas',
            'প্রतापকে সাহায্য করার সুভার আকাঙ্ক্ষা': 'Subha\'s Desire to Help Pratap',
            'সভার কালো চোখ ও নীরব ভাষা': 'Subha\'s Black Eyes & Silent Language',
            'সাধারণ টপিক': 'General Topic'
        };
        return mapping[subName] || subName;
    };

    // Load student's topic accuracy analytics
    useEffect(() => {
        const fetchTopicAnalytics = async () => {
            if (completedExams.length === 0) return;
            setLoadingTopicAnalytics(true);
            try {
                const topicsMap = {};
                for (const exam of completedExams) {
                    const res = await axios.get(`/v1/student/results/${exam.id}`);
                    if (res.data && res.data.answers) {
                        res.data.answers.forEach(ans => {
                            const topic = ans.topicName || (currentLang === 'bn' ? 'সাধারণ টপিক' : 'General Topic');
                            if (!topicsMap[topic]) {
                                topicsMap[topic] = { correct: 0, total: 0 };
                            }
                            topicsMap[topic].total += 1;
                            if (ans.isCorrect) {
                                topicsMap[topic].correct += 1;
                            }
                        });
                    }
                }
                setTopicAccuracy(topicsMap);
            } catch (err) {
                console.error("Error fetching student topic analytics:", err);
            } finally {
                setLoadingTopicAnalytics(false);
            }
        };

        fetchTopicAnalytics();
    }, [completedExams, currentLang]);

    // Chart Data Construction
    const rawChartData = [...completedExams]
        .reverse()
        .map((exam, index) => ({
            name: exam.examTitle ? (exam.examTitle.length > 12 ? exam.examTitle.substring(0, 10) + '..' : exam.examTitle) : `Exam ${index + 1}`,
            fullTitle: exam.examTitle,
            percentage: Math.round((exam.score / exam.totalMarks) * 100),
            marks: `${exam.score}/${exam.totalMarks}`
        }));

    const chartData = rawChartData.length === 1 
        ? [
            { name: currentLang === 'bn' ? 'শুরু' : 'Start', fullTitle: currentLang === 'bn' ? 'যাত্রা শুরু' : 'Journey Start', percentage: 0, marks: '0/0' },
            ...rawChartData
          ]
        : rawChartData;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                <p className="mt-4 text-slate-500 font-bold text-sm">{t('loading_dashboard')}</p>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    };

    const cardVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 100, damping: 15 }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 font-sans pb-10"
        >
            {/* 🌟 HERO HERO SECTION (COMPACT & AUTO-HIDEABLE) */}
            <motion.div variants={cardVariants} className="space-y-4">
                {isBannerCollapsed ? (
                    <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-white shadow-md">
                        <div className="flex items-center gap-2.5 text-xs font-extrabold">
                            <Sparkles size={15} className="text-amber-400 animate-pulse" />
                            <span>{t('db_welcome_back')}, {user?.name || t('db_student_welcome_fallback')}! 👋</span>
                        </div>
                        <button
                            onClick={toggleBannerCollapse}
                            className="text-xs font-bold text-indigo-300 hover:text-white flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all border border-white/10 active:scale-95"
                            title="ব্যানার খুলুন"
                        >
                            <ChevronDown size={14} />
                            <span>{currentLang === 'bn' ? 'ব্যানার খুলুন' : 'Show Banner'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 md:p-5 text-white shadow-lg border border-white/10">
                        <div className="absolute -right-24 -top-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
                        <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                        {/* Top Banner Control Bar */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] md:text-xs font-extrabold tracking-wider uppercase border border-white/10 text-indigo-200">
                                <Sparkles size={12} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                                <span>{t('db_student_portal')}</span>
                            </div>
                            <button
                                onClick={toggleBannerCollapse}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all active:scale-90"
                                title="ব্যানার কোলাপ্স করুন / লুকান"
                            >
                                <ChevronUp size={16} />
                            </button>
                        </div>

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1.5">
                                <h1 className="text-xl md:text-3xl font-extrabold tracking-tight">
                                    {t('db_welcome_back')}, <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">{user?.name || t('db_student_welcome_fallback')}</span>! 👋
                                </h1>
                                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
                                    <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/5 backdrop-blur-sm">
                                        {t('db_student_class')}{user?.className || t('db_student_unassigned')}
                                    </span>
                                    {user?.studentRoll && (
                                        <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/5 backdrop-blur-sm">
                                            {t('db_student_roll')}{formatDigits(user.studentRoll)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Scholar Progress */}
                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-lg border border-white/10 p-3 rounded-xl flex-shrink-0">
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${badgeColor} text-white flex items-center justify-center shadow-md font-extrabold text-base flex-shrink-0 border ${badgeBorder}`}>
                                    {formatDigits(currentLevel)}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('db_student_level_title')}</p>
                                    <p className="text-xs font-extrabold text-white">{badgeTitle}</p>
                                    <div className="w-32">
                                        <div className="flex justify-between text-[8px] font-bold text-indigo-300 mb-0.5">
                                            <span>{formatDigits(xpProgressToNextLevel)} XP</span>
                                            <span>{formatDigits(100)} XP</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full" style={{ width: `${xpProgressToNextLevel}%` }}></div>
                                        </div>
                                    </div>
                                </div>
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
                            className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-amber-200/80 dark:border-amber-700/40 rounded-3xl p-5 transition-all duration-300 shadow-[0_4px_20px_rgba(245,158,11,0.06)] hover:shadow-[0_16px_35px_-6px_rgba(245,158,11,0.22)] hover:border-amber-400 flex flex-col justify-between h-full min-h-[148px]"
                        >
                            {/* Background Ambient Mesh Glow */}
                            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 rounded-t-3xl opacity-80 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/35 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                                    <Zap size={22} className="animate-pulse fill-white/20" />
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 bg-amber-500/15 text-amber-800 dark:text-amber-300 rounded-full uppercase tracking-wider border border-amber-400/30 backdrop-blur-md shadow-sm">
                                    <Sparkles size={11} className="text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                                    {currentLang === 'bn' ? 'অটো ১-ক্লিক' : 'Auto 1-Click'}
                                </span>
                            </div>

                            <div className="relative z-10 mt-4">
                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors flex items-center gap-2">
                                    <span>{currentLang === 'bn' ? 'অটো এক-ক্লিক প্রশ্ন তৈরি' : 'Auto 1-Click Question Builder'}</span>
                                    <ArrowRight size={16} className="text-amber-500 transition-all duration-300 group-hover:translate-x-1.5" />
                                </h3>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
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
                            className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-indigo-200/80 dark:border-indigo-700/40 rounded-3xl p-5 transition-all duration-300 shadow-[0_4px_20px_rgba(99,102,241,0.06)] hover:shadow-[0_16px_35px_-6px_rgba(99,102,241,0.22)] hover:border-indigo-400 flex flex-col justify-between h-full min-h-[148px]"
                        >
                            {/* Background Ambient Mesh Glow */}
                            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br from-indigo-400/20 via-purple-400/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 rounded-t-3xl opacity-80 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/35 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                                    <Sliders size={22} />
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 rounded-full uppercase tracking-wider border border-indigo-400/30 backdrop-blur-md shadow-sm">
                                    {currentLang === 'bn' ? 'ম্যানুয়াল সিলেক্ট' : 'Manual Pick'}
                                </span>
                            </div>

                            <div className="relative z-10 mt-4">
                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                    <span>{currentLang === 'bn' ? 'ম্যানুয়ালি প্রশ্ন নির্বাচন' : 'Manual Question Selector'}</span>
                                    <ArrowRight size={16} className="text-indigo-500 transition-all duration-300 group-hover:translate-x-1.5" />
                                </h3>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
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
                            className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-emerald-200/80 dark:border-emerald-700/40 rounded-3xl p-5 transition-all duration-300 shadow-[0_4px_20px_rgba(16,185,129,0.06)] hover:shadow-[0_16px_35px_-6px_rgba(16,185,129,0.22)] hover:border-emerald-400 flex flex-col justify-between h-full min-h-[148px]"
                        >
                            {/* Background Ambient Mesh Glow */}
                            <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 rounded-t-3xl opacity-80 group-hover:opacity-100 transition-opacity"></div>

                            <div className="relative z-10 flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                                    <Database size={22} />
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 rounded-full uppercase tracking-wider border border-emerald-400/30 backdrop-blur-md shadow-sm">
                                    {currentLang === 'bn' ? 'প্রশ্ন ব্যাংক' : 'Question Bank'}
                                </span>
                            </div>

                            <div className="relative z-10 mt-4">
                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                                    <span>{currentLang === 'bn' ? 'প্রশ্ন ব্যাংক সংগ্রহশালা' : 'Question Bank Explorer'}</span>
                                    <ArrowRight size={16} className="text-emerald-500 transition-all duration-300 group-hover:translate-x-1.5" />
                                </h3>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                                    {currentLang === 'bn' ? 'বিষয় ও অধ্যায়ভিত্তিক সকল অনুমোদিত প্রশ্ন ফিল্টার করুন।' : 'Explore and filter approved questions by topic.'}
                                </p>
                            </div>
                        </Link>
                    </motion.div>
                </div>
            </motion.div>

            {/* 📊 CORE KPIs */}
            <motion.div variants={cardVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Exams */}
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-indigo-200 transition-all cursor-pointer" onClick={() => setActiveTab('exams')}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('db_student_active_exams')}</p>
                            <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{formatDigits(exams.length)}{t('db_student_count_suffix')}</h3>
                        </div>
                    </div>
                </div>

                {/* Exams Attempted */}
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer" onClick={() => setActiveTab('history')}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Trophy size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('db_student_exams_attempted')}</p>
                            <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{formatDigits(totalExamsTaken)}{t('db_student_times')}</h3>
                        </div>
                    </div>
                </div>

                {/* Avg Accuracy */}
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-amber-200 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('db_student_avg_accuracy')}</p>
                            <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{formatDigits(avgScorePercent)}%</h3>
                            <div className="w-full h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${avgScorePercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total XP points */}
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-purple-200 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Star size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('db_student_total_xp')}</p>
                            <h3 className="text-xl font-extrabold text-slate-800 mt-0.5">{formatDigits(totalXP)} XP</h3>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ERROR ALERT */}
            {error && (
                <motion.div variants={cardVariants} className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                </motion.div>
            )}

            {/* TAB CONTAINER */}
            <motion.div variants={cardVariants} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm p-4 md:p-6 space-y-6">
                {/* Tabs selection */}
                <div className="flex border-b border-slate-100 overflow-x-auto pb-px custom-scrollbar gap-6">
                    {[
                        { id: 'overview', label: t('db_student_tab_overview'), icon: TrendingUp },
                        { id: 'exams', label: t('db_student_tab_exams'), icon: Play, badge: exams.length },
                        { id: 'questions', label: t('db_student_tab_questions'), icon: HelpCircle },
                        { id: 'history', label: t('db_student_tab_history'), icon: Clock }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all relative outline-none flex-shrink-0 ${
                                    isActive
                                        ? 'border-indigo-600 text-indigo-600 font-extrabold'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                                {tab.badge > 0 && (
                                    <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        {formatDigits(tab.badge)}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content */}
                <div className="min-h-[300px]">
                    <AnimatePresence mode="wait">
                        {/* Tab 1: Overview & Progress */}
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                            >
                                {/* Chart */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                        <TrendingUp className="text-indigo-600" size={18} />
                                        <span>{t('db_student_chart_title')}</span>
                                    </h4>
                                    {chartData.length === 0 ? (
                                        <div className="h-[260px] bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                                            <TrendingUp size={36} className="mb-2" />
                                            <p className="text-sm font-semibold">{t('db_student_chart_empty')}</p>
                                        </div>
                                    ) : (
                                        <div className="h-[280px] w-full pt-4 pr-4 border border-slate-100 rounded-2xl bg-white">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-white/10">
                                                                        <p className="font-bold mb-1">{payload[0].payload.fullTitle}</p>
                                                                        <p className="text-indigo-300 font-semibold">{t('db_student_chart_obtained')}: {payload[0].payload.marks}</p>
                                                                        <p className="text-emerald-400 font-bold">{t('db_student_chart_accuracy')}: {payload[0].value}%</p>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Area type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>

                                {/* Summary List */}
                                <div className="space-y-4">
                                    <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                        <Award className="text-indigo-600" size={18} />
                                        <span>{t('db_student_level_rewards')}</span>
                                    </h4>
                                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-indigo-100/50 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${badgeColor} text-white flex items-center justify-center font-bold text-lg`}>
                                                {formatDigits(currentLevel)}
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('db_student_level_title')}</p>
                                                <h5 className="font-extrabold text-slate-800 text-sm">{badgeTitle}</h5>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-xs text-slate-600 font-medium">
                                            <div className="flex justify-between">
                                                <span>{t('db_student_next_level_progress')}</span>
                                                <span className="font-bold text-slate-800">{formatDigits(xpProgressToNextLevel)} / {formatDigits(100)} XP</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${xpProgressToNextLevel}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-100 pt-4 mt-2">
                                            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                                                {t('db_student_xp_gain_tip')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-colors cursor-pointer" onClick={() => setActiveTab('exams')}>
                                        <div className="flex items-center gap-3">
                                            <Play size={16} className="text-indigo-600" />
                                            <span className="text-sm font-bold text-slate-700">{t('db_student_take_exam')}</span>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-400" />
                                    </div>
                                </div>

                                {/* Topic-wise Performance Analytics */}
                                {Object.keys(topicAccuracy).length > 0 && (
                                    <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 p-5 space-y-4">
                                        <div>
                                            <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                                <Trophy className="text-indigo-600" size={18} />
                                                <span>{currentLang === 'bn' ? 'আমার টপিক-ভিত্তিক পারফরম্যান্স' : 'My Topic-wise Performance'}</span>
                                            </h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                {currentLang === 'bn' ? 'অধ্যায়ভিত্তিক সঠিক উত্তরের হার ও অগ্রগতি বিশ্লেষণ' : 'Analysis of correct answer rate and progress by chapter'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {Object.keys(topicAccuracy).map((topicName, idx) => {
                                                const stats = topicAccuracy[topicName];
                                                const pct = Math.round((stats.correct / stats.total) * 100);
                                                
                                                let progressColor = "bg-indigo-600";
                                                let badgeColor = "bg-indigo-50 text-indigo-700";
                                                if (pct >= 70) {
                                                    progressColor = "bg-emerald-500";
                                                    badgeColor = "bg-emerald-50 text-emerald-700";
                                                } else if (pct < 40) {
                                                    progressColor = "bg-rose-500";
                                                    badgeColor = "bg-rose-50 text-rose-700";
                                                }

                                                return (
                                                    <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all space-y-2">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <span className="text-xs font-black text-slate-800">{translateSubject(topicName)}</span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${badgeColor}`}>
                                                                {formatDigits(pct)}%
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                                            <span>{currentLang === 'bn' ? 'সঠিক উত্তর:' : 'Correct:'} {formatDigits(stats.correct)}/{formatDigits(stats.total)}</span>
                                                        </div>
                                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                            <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Tab 2: Assigned Exams */}
                        {activeTab === 'exams' && (
                            <motion.div
                                key="exams"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="flex justify-between items-center pl-1">
                                    <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">{t('db_student_active_exams_class')}</h4>
                                </div>
                                {exams.length === 0 ? (
                                    <div className="bg-slate-50 rounded-2xl p-12 text-center border border-slate-100">
                                        <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                                        <h4 className="text-slate-700 font-bold text-lg">{t('db_student_no_exams')}</h4>
                                        <p className="text-slate-400 text-sm mt-1">{t('db_student_no_exams_desc')}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {exams.map((exam) => (
                                            <div
                                                key={exam.id}
                                                className="bg-white rounded-2xl border border-slate-200/60 p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between h-48 group relative overflow-hidden"
                                            >
                                                <div className="absolute inset-x-0 top-0 h-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                                            {exam.subjectName || t('db_student_welcome_fallback')}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                            <Clock size={14} />
                                                            <span>{formatDigits(exam.durationMinutes)}{t('db_student_minute_suffix')}</span>
                                                        </div>
                                                    </div>
                                                    <h4 className="font-extrabold text-slate-800 text-base line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                                                        {exam.title}
                                                    </h4>
                                                </div>
                                                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                        <Award size={16} className="text-purple-500" />
                                                        <span>{t('db_student_total_marks')}{formatDigits(exam.totalMarks)}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/student/exams/take/${exam.id}`)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 active:scale-[0.97] transition-all"
                                                    >
                                                        <span>{t('db_student_take_exam')}</span>
                                                        <Play size={10} className="fill-white" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Tab 3: Shared Questions */}
                        {activeTab === 'questions' && (
                            <motion.div
                                key="questions"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                {/* Filters */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/50">
                                    {/* Search input */}
                                    <div className="relative flex-1">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder={t('db_student_search_questions')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-sm text-slate-800"
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Subject Filter */}
                                        <div className="flex items-center gap-2">
                                            <Filter size={14} className="text-slate-400" />
                                            <select
                                                value={selectedSubject}
                                                onChange={(e) => setSelectedSubject(e.target.value)}
                                                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100"
                                            >
                                                <option value="">{t('db_student_all_subjects')}</option>
                                                {subjects.map(s => (
                                                    <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Type Filter */}
                                        <select
                                            value={selectedType}
                                            onChange={(e) => setSelectedType(e.target.value)}
                                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100"
                                        >
                                            <option value="ALL">{t('db_student_all_types')}</option>
                                            <option value="MCQ">MCQ</option>
                                            <option value="CQ">CQ (Creative)</option>
                                            <option value="SHORT">Short Q</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Questions List */}
                                {loadingQuestions ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                        <p className="mt-2 text-xs text-slate-400 font-bold">{t('db_student_loading_questions')}</p>
                                    </div>
                                ) : questions.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400">
                                        <HelpCircle size={36} className="mx-auto mb-2" />
                                        <p className="text-sm font-semibold">{t('db_student_no_questions')}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {questions.map((q) => {
                                            const getTranslatedDiff = (d) => {
                                                const norm = (d || '').toLowerCase();
                                                if (norm === 'easy') return t('db_student_difficulty_easy');
                                                if (norm === 'medium') return t('db_student_difficulty_medium');
                                                if (norm === 'hard') return t('db_student_difficulty_hard');
                                                return d;
                                            };
                                            return (
                                                <div
                                                    key={q.id}
                                                    className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors"
                                                >
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                                                                {q.classSubject?.subject?.name || q.classSubject?.name || t('db_student_welcome_fallback')}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400 capitalize px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg">
                                                                {q.type} • {getTranslatedDiff(q.difficulty)}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-extrabold text-slate-800 leading-snug line-clamp-2">
                                                            {q.title ? q.title.replace(/<[^>]*>?/gm, '') : 'No question content'}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-50">
                                                        <button
                                                            onClick={() => handleViewQuestion(q)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            <Eye size={12} />
                                                            <span>{t('db_student_view_details')}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Tab 4: History & Results */}
                        {activeTab === 'history' && (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="flex justify-between items-center pl-1">
                                    <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">{t('db_student_history_timeline')}</h4>
                                </div>
                                {completedExams.length === 0 ? (
                                    <div className="bg-slate-50 rounded-2xl p-12 text-center border border-slate-100">
                                        <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                                        <h4 className="text-slate-700 font-bold text-lg">{t('db_student_no_history')}</h4>
                                        <p className="text-slate-400 text-sm mt-1">{t('db_student_no_history_desc')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {completedExams.map((result) => {
                                            const scorePercentage = Math.round((result.score / result.totalMarks) * 100);
                                            const formattedDate = result.submittedAt 
                                                ? new Date(result.submittedAt).toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                                                : '';
                                            return (
                                                <div
                                                    key={result.id}
                                                    className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-200 transition-colors"
                                                >
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                                {result.subjectName}
                                                            </span>
                                                            {formattedDate && (
                                                                <span className="text-[9px] text-slate-400 font-bold">
                                                                    • {formattedDate}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h5 className="font-extrabold text-slate-800 text-sm leading-snug">
                                                            {result.examTitle}
                                                        </h5>
                                                    </div>

                                                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-50 pt-3 md:pt-0">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                                                                <span>{t('db_student_chart_obtained')}: {formatDigits(result.score)} / {formatDigits(result.totalMarks)}</span>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                                    scorePercentage >= 80 ? 'bg-emerald-50 text-emerald-600' :
                                                                    scorePercentage >= 50 ? 'bg-amber-50 text-amber-600' :
                                                                    'bg-rose-50 text-rose-600'
                                                                }`}>
                                                                    {formatDigits(scorePercentage)}%
                                                                </span>
                                                            </div>
                                                            <div className="w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${
                                                                    scorePercentage >= 80 ? 'bg-emerald-500' :
                                                                    scorePercentage >= 50 ? 'bg-amber-500' :
                                                                    'bg-rose-500'
                                                                }`} style={{ width: `${scorePercentage}%` }}></div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={() => navigate(`/student/results/view/${result.id}`)}
                                                            className="flex items-center gap-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                                                        >
                                                            <span>{t('db_student_analysis')}</span>
                                                            <ArrowRight size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* ═══ QUESTION PREVIEW MODAL ═══ */}
            <AnimatePresence>
                {selectedQuestion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col relative"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-shrink-0">
                                <div>
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                        {selectedQuestion.classSubject?.subject?.name || selectedQuestion.classSubject?.name || t('db_student_question_details')}
                                    </span>
                                    <h4 className="text-sm font-extrabold text-slate-400 mt-1 uppercase tracking-widest">
                                        {t('db_student_question_type')}{selectedQuestion.type}
                                    </h4>
                                </div>
                                <button
                                    onClick={() => setSelectedQuestion(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto space-y-4 text-slate-700 flex-1">
                                {/* Stimulus / Uddipok */}
                                {selectedQuestion.stimulus && (
                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs leading-relaxed">
                                        <p className="font-extrabold text-[10px] text-indigo-500 uppercase tracking-wider mb-2">{t('db_student_stimulus')}</p>
                                        <div dangerouslySetInnerHTML={{ __html: selectedQuestion.stimulus }}></div>
                                    </div>
                                )}

                                {/* Question Title/Text */}
                                <div className="space-y-1">
                                    <p className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">{t('db_student_question')}</p>
                                    <div 
                                        className="text-base font-extrabold text-slate-900 leading-snug"
                                        dangerouslySetInnerHTML={{ __html: selectedQuestion.title || '' }}
                                    ></div>
                                </div>

                                {/* Options (MCQ ONLY) */}
                                {selectedQuestion.type === 'MCQ' && (
                                    <div className="space-y-2.5">
                                        <p className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">{t('db_student_options')}</p>
                                        {loadingOptions ? (
                                            <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                                                <Loader2 size={14} className="animate-spin" />
                                                <span>{t('db_student_loading_options')}</span>
                                            </div>
                                        ) : questionOptions && questionOptions.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-2">
                                                {questionOptions.map((opt, i) => (
                                                    <div
                                                        key={opt.id}
                                                        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                                                            opt.correct
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                                : 'bg-slate-50 border-slate-100 text-slate-600'
                                                        }`}
                                                    >
                                                        <span>{formatDigits(i + 1)}. {opt.optionText}</span>
                                                        {opt.correct && (
                                                            <span className="px-2 py-0.5 bg-emerald-100 rounded text-[9px] font-black uppercase text-emerald-800 tracking-wide">
                                                                {t('db_student_correct_badge')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 font-semibold italic">No options found</p>
                                        )}
                                    </div>
                                )}

                                {/* Explanation */}
                                {selectedQuestion.explanation && (
                                    <div className="bg-indigo-50/30 border border-indigo-100/30 p-4 rounded-2xl text-xs leading-relaxed">
                                        <p className="font-extrabold text-[10px] text-indigo-600 uppercase tracking-wider mb-1">{t('db_student_explanation')}</p>
                                        <div dangerouslySetInnerHTML={{ __html: selectedQuestion.explanation }}></div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-100 flex justify-end flex-shrink-0">
                                <button
                                    onClick={() => setSelectedQuestion(null)}
                                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-900/10"
                                >
                                    {t('db_student_close')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default StudentDashboard;
