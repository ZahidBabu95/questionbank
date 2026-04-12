import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import {
    Calendar, Download, Users, FileText, FileQuestion, BookOpen,
    TrendingUp, Award, Clock, Target, Zap
} from 'lucide-react';
import performanceService from '../../../services/performanceService';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const MetricCard = ({ title, value, subtext, icon: Icon, color }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm shadow-slate-200/50 flex items-start justify-between"
    >
        <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{value}</h3>
            <p className="text-slate-400 text-xs mt-1 font-medium">{subtext}</p>
        </div>
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
            <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
    </motion.div>
);

const PerformanceAnalytics = () => {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0] + 'T00:00:00',
        end: new Date().toISOString().split('T')[0] + 'T23:59:59'
    });

    const [studentMetrics, setStudentMetrics] = useState(null);
    const [questionPerformance, setQuestionPerformance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sm, qp] = await Promise.all([
                performanceService.getStudentPerformance(dateRange.start, dateRange.end),
                performanceService.getQuestionPerformance(dateRange.start, dateRange.end)
            ]);

            setStudentMetrics(sm);
            setQuestionPerformance(qp);
        } catch (err) {
            console.error('Failed to fetch performance analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const scoreDistData = Object.entries(studentMetrics?.scoreDistribution || {}).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Academic Performance</h1>
                    <p className="text-slate-500 mt-1 font-medium">Detailed analysis of student scores and question effectiveness.</p>
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

                    <button className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition">
                        <Download size={18} />
                        <span>Download Results</span>
                    </button>
                </div>
            </div>

            {/* Performance Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Average Score"
                    value={`${(studentMetrics?.averageScore || 0).toFixed(1)}%`}
                    subtext="Overall student average"
                    icon={Target}
                    color="bg-indigo-500"
                />
                <MetricCard
                    title="Pass Rate"
                    value={`${(studentMetrics?.passRate || 0).toFixed(1)}%`}
                    subtext="Students above 40%"
                    icon={Award}
                    color="bg-emerald-500"
                />
                <MetricCard
                    title="Highest Peak"
                    value={`${(studentMetrics?.highestScore || 0).toFixed(1)}%`}
                    subtext="Top score in this period"
                    icon={Zap}
                    color="bg-amber-500"
                />
                <MetricCard
                    title="Lower Bound"
                    value={`${(studentMetrics?.lowestScore || 0).toFixed(1)}%`}
                    subtext="Lowest student record"
                    icon={TrendingUp}
                    color="bg-rose-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Score Distribution */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Score Distribution</h3>
                            <p className="text-slate-400 text-sm">Number of students by score range</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreDistData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                                    {scoreDistData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Difficulty Effectiveness */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Performance Trend</h3>
                            <p className="text-slate-400 text-sm">Weekly score improvements</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[
                                { name: 'Week 1', score: 65 },
                                { name: 'Week 2', score: 68 },
                                { name: 'Week 3', score: 75 },
                                { name: 'Week 4', score: 72 },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Toughest Questions Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">Question Performance</h3>
                        <p className="text-slate-400 text-sm">Effectiveness of questions in recent exams</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Question Text</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Difficulty</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Correct Rate</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Skip Rate</th>
                                <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Effectiveness</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {questionPerformance.map((q, index) => (
                                <tr key={index} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="font-medium text-slate-800 line-clamp-1 max-w-sm">{q.questionText}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${q.difficulty === 'HARD' ? 'bg-rose-100 text-rose-600' :
                                                q.difficulty === 'MEDIUM' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-emerald-100 text-emerald-600'
                                            }`}>
                                            {q.difficulty}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 font-semibold text-slate-600">{q.correctRate.toFixed(1)}%</td>
                                    <td className="px-8 py-5 font-semibold text-slate-600">{q.skipRate.toFixed(1)}%</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-24">
                                                <div
                                                    className={`h-full rounded-full ${q.correctRate > 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                    style={{ width: `${q.correctRate}%` }}
                                                />
                                            </div>
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

export default PerformanceAnalytics;
