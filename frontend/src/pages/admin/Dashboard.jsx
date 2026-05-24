import React, { useState, useEffect } from 'react';
import {
    Users, BookOpen, FileQuestion, Activity,
    TrendingUp, ArrowUpRight, ArrowDownRight, MoreHorizontal, Calendar,
    Zap, Target, Clock, Plus, ExternalLink, Loader2, FileText, Layers, Sparkles, X
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';
import { formatDistanceToNow, format } from 'date-fns';
import { motion } from 'framer-motion';

/* ─── Mobile-first KPI Card ─── */
const KPICard = ({ title, count, subValue, trend, icon: Icon, gradient, iconBg, onClick }) => (
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
                        <span className="text-[10px] md:text-xs font-bold text-slate-400">/ {subValue} total</span>
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
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-white/10">
                <p className="font-semibold mb-1.5 text-slate-300">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 mb-0.5 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="capitalize text-slate-400">{entry.name}:</span>
                        <span className="font-bold">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = ({ view = 'overview' }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showSubjectsModal, setShowSubjectsModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            
            const isSuperAdmin = parsedUser?.roles?.some(r => {
                const roleName = typeof r === 'string' ? r : (r.name || '');
                return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
            }) || parsedUser?.email === 'admin';
            
            const isDefaultInstitute = isSuperAdmin || parsedUser?.instituteName === 'DEFAULT' || parsedUser?.instituteName === 'Default Institute';
            
            if (!isDefaultInstitute) {
                navigate('/ai-workspace', { replace: true });
                return;
            }
            
            setUser(parsedUser);
        }
    }, [navigate]);

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                let data;
                let activeRoleViewLoc = view;
                if (view === 'overview') {
                    if (user.roles.includes('SUPER_ADMIN') || user.permissions?.includes('ROLES_PERMISSIONS_VIEW') || user.permissions?.includes('SUBSCRIPTION_PACKAGE_VIEW')) {
                        activeRoleViewLoc = 'admin';
                    } else if (user.roles.includes('INSTITUTE_ADMIN') || user.permissions?.includes('ALL_INSTITUTES_VIEW')) {
                        activeRoleViewLoc = 'institute';
                    } else if (user.roles.includes('TEACHER') || user.permissions?.includes('ADD_QUESTION_VIEW')) {
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
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [user, view]);

    const formatTime = (timeStr) => {
        try {
            return formatDistanceToNow(new Date(timeStr), { addSuffix: true });
        } catch (e) {
            return "Just now";
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="mt-4 text-slate-500 font-medium">Loading dashboard data...</p>
            </div>
        );
    }

    if (!stats) return null;

    const {
        totalUsers = 0, userTrend = 0,
        activeInstitutes = 0, instituteTrend = 0,
        totalQuestions = 0, questionTrend = 0,
        examsConducted = 0, examTrend = 0,
        approvedQuestionsCount = 0, globalQuestionsCount = 0,
        questionTypes = [], activityAnalytics = [], recentActivities = [],
        subjectQuestions = []
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

    const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

    return (
        <motion.div 
            className="space-y-6 md:space-y-8 lg:space-y-10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ─── Header ─── */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-6 rounded-3xl border border-white shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-white rounded-full text-xs font-bold text-primary shadow-sm border border-slate-100 flex items-center gap-1.5">
                            <Sparkles size={14} className="text-amber-500" />
                            {currentDate}
                        </span>
                        {view !== 'overview' && (
                            <span className="px-3 py-1 bg-blue-100 rounded-full text-xs font-bold text-blue-700 shadow-sm border border-blue-200 capitalize">
                                {view === 'admin' ? 'Super Admin' : view === 'institute' ? 'Institute Admin' : view === 'teacher' ? 'Teacher' : 'Student'} View
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Welcome back, {user?.name || 'there'}! 👋</h1>
                    <p className="text-slate-500 text-sm md:text-base mt-2 max-w-xl leading-relaxed">
                        {activeRoleView === 'admin' && "Here's the global system overview and metrics across all institutes."}
                        {activeRoleView === 'institute' && "Here's the administrative summary for your institute."}
                        {activeRoleView === 'teacher' && "Monitor your questions, class activities, and exam metrics."}
                        {activeRoleView === 'student' && "Track your progress, practice exams, and lectures."}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200/60 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-[0.97]">
                        <Calendar size={16} />
                        <span className="hidden sm:inline">Last 30 Days</span>
                        <span className="sm:hidden">30 Days</span>
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-[0.97]">
                        <ExternalLink size={16} />
                        <span className="hidden sm:inline">Export Report</span>
                        <span className="sm:hidden">Export</span>
                    </button>
                </div>
            </motion.div>

            {/* ─── AI Workspace Banner ─── */}
            <motion.div 
                variants={itemVariants} 
                className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 md:p-8 text-white shadow-xl shadow-indigo-100/30 border border-white/10"
            >
                {/* Decorative blur elements */}
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/15 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] md:text-xs font-bold tracking-wider uppercase">
                            <Sparkles size={12} className="text-amber-300 animate-pulse" />
                            <span>Next-Gen AI Assistant</span>
                        </div>
                        <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight">
                            AI Co-Pilot Workspace
                        </h2>
                        <p className="text-white/80 text-xs md:text-sm leading-relaxed max-w-xl">
                            Create exams instantly, auto-generate standard question banks, search smart content, and optimize your teaching workflow with our advanced AI tools.
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <Link 
                            to="/ai-workspace"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-indigo-700 font-extrabold text-sm rounded-2xl hover:bg-indigo-50 hover:shadow-lg hover:shadow-white/20 active:scale-[0.98] transition-all duration-300 group"
                        >
                            <span>Launch AI Workspace</span>
                            <Zap size={16} className="text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform duration-300" />
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* ─── KPI Cards ─── */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                {(activeRoleView === 'admin' || activeRoleView === 'institute') && (
                    <KPICard title="Total Users" count={totalUsers.toLocaleString()} trend={userTrend} icon={Users} gradient="bg-gradient-to-br from-blue-500 to-primary" />
                )}
                {activeRoleView === 'admin' && (
                    <KPICard title="Active Institutes" count={activeInstitutes.toLocaleString()} trend={instituteTrend} icon={BookOpen} gradient="bg-gradient-to-br from-indigo-500 to-secondary" />
                )}
                <KPICard 
                    title="Active Approved Questions" 
                    count={approvedQuestionsCount.toLocaleString()} 
                    subValue={globalQuestionsCount.toLocaleString()}
                    trend={questionTrend || 0} 
                    icon={FileQuestion} 
                    gradient="bg-gradient-to-br from-violet-500 to-purple-600" 
                    onClick={() => setShowSubjectsModal(true)}
                />
                <KPICard 
                    title={activeRoleView === 'student' ? "My Exams" : activeRoleView === 'teacher' ? "My Exams" : "Exams Conducted"} 
                    count={examsConducted.toLocaleString()} 
                    trend={examTrend || 0} 
                    icon={Activity} 
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-600" 
                    onClick={() => navigate('/exams/generate/saved')}
                />
            </motion.div>

            {/* ─── Quick Actions ─── */}
            <motion.div variants={itemVariants}>
                <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-[0.2em] mb-4 pl-1">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                    {/* Admin/Institute/Teacher Quick Actions */}
                    {activeRoleView !== 'student' ? (
                        <>
                            <QuickAction icon={FileText} label="Manual Exam" to="/exams/generate/manual" color="bg-blue-500" />
                            <QuickAction icon={Zap} label="Auto Exam Generator" to="/exams/generate/auto" color="bg-indigo-500" />
                            <QuickAction icon={BookOpen} label="Question Bank" to="/questions/approved" color="bg-violet-500" />
                            <QuickAction icon={Clock} label="Pending Review" to="/questions/pending" color="bg-amber-500" />
                        </>
                    ) : (
                        /* Student Quick Actions */
                        <>
                            <QuickAction icon={FileText} label="Practice Exam" to="/exams/generate/auto" color="bg-blue-500" />
                            <QuickAction icon={Layers} label="Lecture Sheets" to="/lectures/attach" color="bg-indigo-500" />
                            <QuickAction icon={FileQuestion} label="Q-Bank" to="/questions" color="bg-violet-500" />
                            <QuickAction icon={Target} label="My Progress" to="/reports/performance" color="bg-emerald-500" />
                        </>
                    )}
                </div>
            </motion.div>

            {/* ─── Charts Section ─── */}
            {activeRoleView !== 'student' && hasPerm('REPORTS', 'VIEW') && (
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                    {/* Growth Chart */}
                    <div className="bg-white/80 backdrop-blur-xl p-5 md:p-7 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white lg:col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div>
                            <h3 className="text-sm md:text-base font-bold text-slate-900">Activity Analytics</h3>
                            <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">Questions vs Exams</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-4 text-[11px] font-medium text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    Questions
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                                    Exams
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
                        <h3 className="text-sm md:text-base font-bold text-slate-900">Question Types</h3>
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
                                        width={45}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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
                                            <span className="text-slate-600 font-medium">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-900">{item.value}%</span>
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
            {isSuperAdminUser && (
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl p-5 md:p-7 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm md:text-base font-bold text-slate-900">Recent Activity</h3>
                    <button className="text-xs font-semibold text-primary hover:text-blue-700 active:scale-[0.97]">View All</button>
                </div>

                {/* ─── Desktop Table ─── */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-slate-100">
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider pl-3">ID</th>
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">User</th>
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">Activity</th>
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider">Status</th>
                                <th className="pb-3 font-semibold text-slate-400 text-[10px] uppercase tracking-wider text-right pr-3">Time</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {recentActivities.map((activity) => (
                                <tr key={activity.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 text-slate-600">
                                    <td className="py-3 pl-3 font-medium font-mono text-slate-400 text-xs">#{activity.id}</td>
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
                                            {activity.status}
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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Approved Questions</h3>
                                <p className="text-xs text-slate-500 mt-1">Breakdown by Subject</p>
                            </div>
                            <button 
                                onClick={() => setShowSubjectsModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
                            {subjectQuestions && subjectQuestions.length > 0 ? (
                                subjectQuestions.map((sub, index) => {
                                    const total = subjectQuestions.reduce((acc, curr) => acc + curr.count, 0);
                                    const percent = total > 0 ? Math.round((sub.count / total) * 100) : 0;
                                    
                                    const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-emerald-500'];
                                    const colorClass = colors[index % colors.length];

                                    return (
                                        <div key={index} className="space-y-1.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <span className="font-bold text-slate-800 text-xs md:text-sm leading-tight block">{sub.subjectName}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                                                        {sub.version} • {sub.levelName} • {sub.className}
                                                    </span>
                                                </div>
                                                <span className="font-extrabold text-slate-900 text-xs md:text-sm">{sub.count.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                                                <div 
                                                    className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-semibold text-right mt-1">{percent}% of total approved</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-slate-400 font-medium">
                                    No subject metrics available
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                            <button 
                                onClick={() => setShowSubjectsModal(false)}
                                className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default Dashboard;
