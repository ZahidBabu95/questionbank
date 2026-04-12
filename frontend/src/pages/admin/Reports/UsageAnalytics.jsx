import React, { useState, useEffect } from 'react';
import {
    BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import {
    Calendar, Download, Users, FileText, FileQuestion, BookOpen,
    Filter, TrendingUp, Award, Clock
} from 'lucide-react';
import reportService from '../../../services/reportService';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const MetricCard = ({ title, value, icon: Icon, color, trend }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 flex items-start justify-between"
    >
        <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{value}</h3>
            {trend && (
                <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    <TrendingUp size={14} className={trend < 0 ? 'rotate-180' : ''} />
                    <span>{Math.abs(trend)}% from last month</span>
                </div>
            )}
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100`}>
            <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
    </motion.div>
);

const UsageAnalytics = () => {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0] + 'T00:00:00',
        end: new Date().toISOString().split('T')[0] + 'T23:59:59'
    });

    const [overview, setOverview] = useState(null);
    const [questionData, setQuestionData] = useState([]);
    const [examData, setExamData] = useState([]);
    const [teacherData, setTeacherData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ov, q, e, t] = await Promise.all([
                reportService.getOverview(dateRange.start, dateRange.end),
                reportService.getQuestionsReport(dateRange.start, dateRange.end),
                reportService.getExamsReport(dateRange.start, dateRange.end),
                reportService.getTeachersReport(dateRange.start, dateRange.end)
            ]);

            setOverview(ov);

            // Format question data for pie chart
            const qMapped = Object.entries(q.byType || {}).map(([name, value]) => ({ name, value }));
            setQuestionData(qMapped);

            // Mock exam activity for line chart (in production this would come from a tailored endpoint)
            setExamData([
                { name: 'Week 1', exams: 12 },
                { name: 'Week 2', exams: 19 },
                { name: 'Week 3', exams: 15 },
                { name: 'Week 4', exams: e.totalExams }
            ]);

            setTeacherData(t);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        alert('Exporting report as CSV...');
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Usage Analytics</h1>
                    <p className="text-slate-500 mt-1 font-medium">Insights and metrics across your entire institute network.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                        <Calendar size={18} className="mr-2 text-indigo-500" />
                        <input
                            type="datetime-local"
                            className="bg-transparent border-none focus:ring-0 text-xs"
                            value={dateRange.start.slice(0, 16)}
                            onChange={e => setDateRange({ ...dateRange, start: e.target.value + ':00' })}
                        />
                        <span className="mx-2 text-slate-300">to</span>
                        <input
                            type="datetime-local"
                            className="bg-transparent border-none focus:ring-0 text-xs"
                            value={dateRange.end.slice(0, 16)}
                            onChange={e => setDateRange({ ...dateRange, end: e.target.value + ':00' })}
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
                    >
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Overview Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Questions"
                    value={overview?.totalQuestions || 0}
                    icon={FileQuestion}
                    color="bg-indigo-500"
                    trend={12}
                />
                <MetricCard
                    title="Exams Generated"
                    value={overview?.totalExams || 0}
                    icon={FileText}
                    color="bg-emerald-500"
                    trend={8}
                />
                <MetricCard
                    title="Active Lectures"
                    value={overview?.totalLectures || 0}
                    icon={BookOpen}
                    color="bg-amber-500"
                    trend={-2}
                />
                <MetricCard
                    title="Total Users"
                    value={overview?.totalUsers || 0}
                    icon={Users}
                    color="bg-rose-500"
                    trend={5}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Question Distribution */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Question Distribution</h3>
                            <p className="text-slate-400 text-sm">Breakdown by question types</p>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={questionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {questionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Exam Activity */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Exam Activity</h3>
                            <p className="text-slate-400 text-sm">Generation trends over time</p>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500">
                            <Clock size={20} />
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={examData}>
                                <defs>
                                    <linearGradient id="colorExams" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="exams" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorExams)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Teacher Activity Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Teacher Performance</h3>
                        <p className="text-slate-400 text-sm">Activity ranking based on content creation</p>
                    </div>
                    <button className="text-secondary font-bold text-sm hover:underline">View All Teachers</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Rank</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Teacher</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Questions</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Exams</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {teacherData.slice(0, 5).map((teacher, index) => (
                                <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-100 text-amber-600' : 'text-slate-400'}`}>
                                            #{index + 1}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-secondary group-hover:text-white transition-all">
                                                {teacher.teacherName[0]}
                                            </div>
                                            <span className="font-bold text-slate-800">{teacher.teacherName}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 font-semibold text-slate-600">{teacher.questionsCreated}</td>
                                    <td className="px-8 py-5 font-semibold text-slate-600">{teacher.examsGenerated}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${Math.min(teacher.activityScore, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-secondary">{Math.round(teacher.activityScore)}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UsageAnalytics;
