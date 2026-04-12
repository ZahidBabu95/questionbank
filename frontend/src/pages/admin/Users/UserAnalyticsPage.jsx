import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, UserCheck, GraduationCap, BookOpen, Shield, Loader2 } from 'lucide-react';
import userService from '../../../services/userService';

const COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xl text-sm">
                <p className="font-bold text-slate-700">{label}</p>
                <p className="text-indigo-600 font-bold">{payload[0]?.value} users</p>
            </div>
        );
    }
    return null;
};

const UserAnalyticsPage = () => {
    const [monthly,   setMonthly]   = useState([]);
    const [roles,     setRoles]     = useState([]);
    const [stats,     setStats]     = useState(null);
    const [loading,   setLoading]   = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [m, r, s] = await Promise.all([
                    userService.getMonthlyAnalytics(),
                    userService.getRoleBreakdown(),
                    userService.getUserStats(),
                ]);
                if (m.success) setMonthly(m.data);
                if (r.success) setRoles(r.data);
                if (s.success) setStats(s.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-indigo-500" size={36} />
        </div>
    );

    const pieData = roles.map(r => ({ name: r.role, value: Number(r.count) }));

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-black text-slate-800">User Analytics</h1>
                <p className="text-slate-400 text-sm mt-0.5">ব্যবহারকারীর পরিসংখ্যান ও প্রবণতা</p>
            </div>

            {/* Summary cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: <Users size={20} className="text-indigo-600"/>, label: 'মোট Users', value: stats.total, bg: 'bg-indigo-50', sub: `+${stats.newLast30Days} this month` },
                        { icon: <UserCheck size={20} className="text-emerald-600"/>, label: 'Active', value: stats.active, bg: 'bg-emerald-50' },
                        { icon: <GraduationCap size={20} className="text-sky-600"/>, label: 'শিক্ষার্থী', value: stats.students, bg: 'bg-sky-50' },
                        { icon: <BookOpen size={20} className="text-violet-600"/>, label: 'শিক্ষক', value: stats.teachers, bg: 'bg-violet-50' },
                    ].map(({ icon, label, value, bg, sub }) => (
                        <div key={label} className={`${bg} rounded-2xl border border-white/60 p-5 shadow-sm`}>
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm mb-3">{icon}</div>
                            <p className="text-2xl font-black text-slate-800">{value ?? '—'}</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
                            {sub && <p className="text-[10px] font-bold text-emerald-600 mt-1">{sub}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Monthly registrations */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-700 mb-5 flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-500"/> মাসিক নতুন নিবন্ধন
                </h3>
                {monthly.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-300">কোনো ডেটা নেই</div>
                ) : (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={monthly} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" fill="url(#gradient)" radius={[8, 8, 0, 0]} maxBarSize={40} />
                            <defs>
                                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Role breakdown pie + table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-700 mb-5 flex items-center gap-2"><Shield size={16} className="text-violet-500"/> Role Distribution</h3>
                    {pieData.some(d => d.value > 0) ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${name.replace('_', ' ')} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => [v, 'Users']} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-slate-300">ডেটা নেই</div>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-700 mb-5">Role Breakdown</h3>
                    <div className="space-y-3">
                        {roles.map((r, i) => {
                            const total = roles.reduce((s, x) => s + Number(x.count), 0);
                            const pct = total > 0 ? Math.round((Number(r.count) / total) * 100) : 0;
                            return (
                                <div key={r.role}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-slate-600">{r.role.replace(/_/g, ' ')}</span>
                                        <span className="text-sm font-black text-slate-800">{r.count}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserAnalyticsPage;
