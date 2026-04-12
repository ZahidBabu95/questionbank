import React, { useState, useEffect } from 'react';
import {
    Users, BookOpen, FileQuestion, Activity,
    TrendingUp, ArrowUpRight, ArrowDownRight, MoreHorizontal, Calendar,
    Zap, Target, Clock, Plus, ExternalLink, Loader2, FileText, Layers
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';
import { formatDistanceToNow } from 'date-fns';

/* ─── Mobile-first KPI Card ─── */
const KPICard = ({ title, count, trend, icon: Icon, gradient, iconBg }) => (
    <div className="bg-white p-4 md:p-5 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-slate-100/60 hover:shadow-md transition-all duration-300 group active:scale-[0.98]">
        <div className="flex items-center gap-3 md:gap-4">
            <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl ${gradient} text-white flex items-center justify-center shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={20} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight leading-none">{count}</h3>
                <p className="text-[11px] md:text-xs font-medium text-slate-400 mt-0.5 truncate">{title}</p>
            </div>
            {trend !== 0 && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] md:text-xs font-bold shrink-0 ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span>{Math.abs(trend)}%</span>
                </div>
            )}
        </div>
    </div>
);

/* ─── Quick Action Button ─── */
const QuickAction = ({ icon: Icon, label, to, color }) => (
    <Link
        to={to}
        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.95] group"
    >
        <div className={`w-10 h-10 rounded-xl ${color} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
            <Icon size={18} strokeWidth={2} />
        </div>
        <span className="text-[10px] md:text-[11px] font-bold text-slate-600 text-center leading-tight">{label}</span>
    </Link>
);

const activityData = [
    { name: 'Jan', questions: 240, exams: 120 },
    { name: 'Feb', questions: 300, exams: 139 },
    { name: 'Mar', questions: 200, exams: 480 },
    { name: 'Apr', questions: 278, exams: 390 },
    { name: 'May', questions: 189, exams: 480 },
    { name: 'Jun', questions: 239, exams: 380 },
    { name: 'Jul', questions: 349, exams: 430 },
];

const questionTypeData = [
    { name: 'MCQ', value: 45, color: '#3b82f6' },
    { name: 'CQ', value: 25, color: '#6366f1' },
    { name: 'Short', value: 20, color: '#8b5cf6' },
    { name: 'Other', value: 10, color: '#cbd5e1' },
];

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

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            try {
                let data;
                if (user.roles.includes('SUPER_ADMIN')) {
                    data = await dashboardService.getAdminStats();
                } else if (user.roles.includes('INSTITUTE_ADMIN')) {
                    data = await dashboardService.getInstituteStats();
                } else if (user.roles.includes('TEACHER')) {
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
    }, [user]);

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
        questionTypes = [], activityAnalytics = [], recentActivities = []
    } = stats || {};

    const hasPerm = (permId, action = 'VIEW') => {
        if (!user) return false;
        if (user.roles?.includes('SUPER_ADMIN')) return true;
        return user.permissions?.includes(`${permId}_${action}`);
    };

    return (
        <div className="space-y-4 md:space-y-6 lg:space-y-8">
            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Welcome back, {user?.name || 'there'}! 👋</h1>
                    <p className="text-slate-500 text-xs md:text-sm mt-0.5">Here's what's happening today.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 rounded-xl text-xs md:text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm active:scale-[0.97]">
                        <Calendar size={14} />
                        <span className="hidden sm:inline">Last 30 Days</span>
                        <span className="sm:hidden">30 Days</span>
                    </button>
                    <button className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-xs md:text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-primary/20 active:scale-[0.97]">
                        <span className="hidden sm:inline">Download Report</span>
                        <span className="sm:hidden flex items-center gap-1"><ExternalLink size={14} /> Report</span>
                    </button>
                </div>
            </div>

            {/* ─── KPI Cards ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {hasPerm('USER_MANAGEMENT', 'VIEW') && (
                    <KPICard title={user?.roles?.includes('SUPER_ADMIN') ? "Total Users" : "Total Teachers"} count={totalUsers.toLocaleString()} trend={userTrend} icon={Users} gradient="bg-gradient-to-br from-blue-500 to-primary" />
                )}
                {hasPerm('INSTITUTE_MANAGEMENT', 'VIEW') && (
                    <KPICard title="Active Institutes" count={activeInstitutes.toLocaleString()} trend={instituteTrend} icon={BookOpen} gradient="bg-gradient-to-br from-indigo-500 to-secondary" />
                )}
                {hasPerm('QUESTION_BANK', 'VIEW') && (
                    <KPICard title={user?.roles?.includes('STUDENT') ? "My Questions" : "Total Questions"} count={totalQuestions.toLocaleString()} trend={questionTrend || 0} icon={FileQuestion} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
                )}
                {hasPerm('EXAM_PAPER', 'VIEW') && (
                    <KPICard title={user?.roles?.includes('STUDENT') ? "My Exams" : "Exams Conducted"} count={examsConducted.toLocaleString()} trend={examTrend || 0} icon={Activity} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
                )}
            </div>

            {/* ─── Quick Actions ─── */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    {/* Admin/Teacher Quick Actions */}
                    {hasPerm('QUESTION_BANK_ADD_QUESTION_MCQ', 'VIEW') && <QuickAction icon={Plus} label="Add MCQ" to="/questions/create/mcq" color="bg-blue-500" />}
                    {hasPerm('EXAM_PAPER_GENERATOR_AUTO_GENERATE', 'VIEW') && <QuickAction icon={Zap} label="Auto Exam" to="/exams/generate/auto" color="bg-indigo-500" />}
                    {hasPerm('REPORTS_USAGE_SUMMARY', 'VIEW') && <QuickAction icon={Target} label="Reports" to="/reports/usage" color="bg-violet-500" />}
                    {hasPerm('QUESTION_BANK_REPOSITORY_PENDING', 'VIEW') && <QuickAction icon={Clock} label="Pending Review" to="/questions/pending" color="bg-amber-500" />}
                    
                    {/* Student/Basic Quick Actions */}
                    {hasPerm('EXAM_PAPER', 'VIEW') && !hasPerm('REPORTS_USAGE_SUMMARY', 'VIEW') && <QuickAction icon={FileText} label="Practice Exam" to="/exams/generate/auto" color="bg-blue-500" />}
                    {hasPerm('LECTURES_MANAGE_ATTACHMENTS', 'VIEW') && !hasPerm('QUESTION_BANK_REPOSITORY_PENDING', 'VIEW') && <QuickAction icon={Layers} label="Lecture Sheets" to="/lectures/attach" color="bg-indigo-500" />}
                    {hasPerm('QUESTION_BANK_REPOSITORY_APPROVED', 'VIEW') && !hasPerm('QUESTION_BANK_ADD_QUESTION_MCQ', 'VIEW') && <QuickAction icon={FileQuestion} label="Q-Bank" to="/questions" color="bg-violet-500" />}
                    {hasPerm('REPORTS_PERFORMANCE_INSIGHTS', 'VIEW') && !hasPerm('REPORTS_USAGE_SUMMARY', 'VIEW') && <QuickAction icon={Target} label="My Progress" to="/reports/performance" color="bg-emerald-500" />}
                </div>
            </div>

            {/* ─── Charts Section ─── */}
            {hasPerm('REPORTS', 'VIEW') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Growth Chart */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-[0_1px_6px_rgba(0,0,0,0.03)] border border-slate-100 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
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
                <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-[0_1px_6px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
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
            </div>
            )}

            {/* ─── Recent Activity ─── */}
            {hasPerm('DASHBOARD', 'VIEW') && (
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-[0_1px_6px_rgba(0,0,0,0.03)] border border-slate-100">
                <div className="flex items-center justify-between mb-4 md:mb-6">
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
            </div>
            )}
        </div>
    );
};

export default Dashboard;
