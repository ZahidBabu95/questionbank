import React from 'react';
import {
    Users, BookOpen, FileQuestion, Activity,
    TrendingUp, ArrowUpRight, ArrowDownRight, MoreHorizontal, Calendar
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

const KPICard = ({ title, count, trend, icon: Icon, colorClass, trendColor }) => (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100/60 hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-300 group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${colorClass} text-white shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} strokeWidth={2} />
            </div>
            {trend !== 0 && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="leading-none">{Math.abs(trend)}%</span>
                </div>
            )}
        </div>
        <div>
            <h3 className="text-3xl font-bold text-slate-800 tracking-tight mb-1">{count}</h3>
            <p className="text-sm font-medium text-slate-400">{title}</p>
        </div>
    </div>
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
    { name: 'MCQ', value: 45, color: '#3b82f6' }, // Blue
    { name: 'CQ', value: 25, color: '#6366f1' },  // Indigo
    { name: 'Short', value: 20, color: '#8b5cf6' }, // Violet
    { name: 'Other', value: 10, color: '#cbd5e1' }, // Slate
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs">
                <p className="font-semibold mb-2 text-slate-300">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="capitalize">{entry.name}:</span>
                        <span className="font-bold">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-slate-500 text-sm mt-1">Here's what's happening with your platform today.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                        <Calendar size={16} />
                        <span>Last 30 Days</span>
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                        Download Report
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Users"
                    count="2,543"
                    trend={12.5}
                    icon={Users}
                    colorClass="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <KPICard
                    title="Active Institutes"
                    count="45"
                    trend={-2.4}
                    icon={BookOpen}
                    colorClass="bg-gradient-to-br from-indigo-500 to-indigo-600"
                />
                <KPICard
                    title="Total Questions"
                    count="15,678"
                    trend={8.2}
                    icon={FileQuestion}
                    colorClass="bg-gradient-to-br from-violet-500 to-purple-600"
                />
                <KPICard
                    title="Exams Conducted"
                    count="1,890"
                    trend={24}
                    icon={Activity}
                    colorClass="bg-gradient-to-br from-emerald-500 to-teal-600"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Growth Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-slate-100 lg:col-span-2">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Activity Analytics</h3>
                            <p className="text-sm text-slate-500">Questions added vs Exams taken</p>
                        </div>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExams" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="questions"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorQuestions)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="exams"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorExams)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Question Breakdown */}
                <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-slate-900">Question Types</h3>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        <div className="h-[200px] w-full mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={questionTypeData} layout="vertical" barSize={12}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                        width={50}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                        {questionTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-4">
                            {questionTypeData.map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-slate-600 font-medium">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{item.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-8 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
                    <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-slate-100">
                                <th className="pb-4 font-semibold text-slate-400 text-xs uppercase tracking-wider pl-4">ID</th>
                                <th className="pb-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">User</th>
                                <th className="pb-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Activity</th>
                                <th className="pb-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">Status</th>
                                <th className="pb-4 font-semibold text-slate-400 text-xs uppercase tracking-wider text-right pr-4">Time</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {[1, 2, 3, 4].map((i) => (
                                <tr key={i} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 text-slate-600">
                                    <td className="py-4 pl-4 font-medium font-mono text-slate-400">#TRX-245{i}</td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                                                JD
                                            </div>
                                            <span className="font-semibold text-slate-900">John Doe</span>
                                        </div>
                                    </td>
                                    <td className="py-4">Added 15 Questions to <strong>Physics 1st Paper</strong></td>
                                    <td className="py-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            Completed
                                        </span>
                                    </td>
                                    <td className="py-4 text-right pr-4 text-slate-400">2 mins ago</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
