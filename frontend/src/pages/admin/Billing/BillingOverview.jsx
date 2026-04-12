import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, TrendingUp, Users, BrainCircuit, Activity, ArrowUpRight, ArrowDownRight, Bot, Zap, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import api from '../../../utils/axios';

// Real chart data will be constructed dynamically based on current usage.

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const StatCard = ({ title, value, subValue, trend, icon: Icon, colorClass }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all"
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${colorClass}`}>
                <Icon size={24} className="text-white" strokeWidth={1.5} />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-full ${trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                {trend >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(trend)}%
            </div>
        </div>
        <div>
            <h3 className="text-slate-500 font-medium text-sm mb-1">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-800">{value}</span>
                {subValue && <span className="text-sm font-bold text-slate-400">{subValue}</span>}
            </div>
        </div>
    </motion.div>
);

const BillingOverview = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCalls: 0,
        totalQuestions: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        totalCostBdt: 0,
        modelSummary: []
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/v1/ai/usage/dashboard');
                if (response.data?.success) {
                    setStats(response.data.data);
                }
            } catch (err) {
                console.error("Failed to load billing stats: ", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Format tokens (e.g. 1.2M, 400k)
    const formatTokens = (num) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    const currentMonthName = new Date().toLocaleString('default', { month: 'short' });
    const dynamicChartData = [
        { name: currentMonthName, revenue: 0, cost: stats.totalCostUsd ? parseFloat(stats.totalCostUsd.toFixed(4)) : 0 }
    ];

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Billing & AI Quota Overview</h1>
                    <p className="text-slate-500 text-sm mt-1">Monitor revenue, API costs, and AI token usages across the platform.</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Revenue (MRR)" 
                    value="$0.00" 
                    subValue="this month"
                    trend={0.0} 
                    icon={CreditCard} 
                    colorClass="bg-gradient-to-br from-indigo-500 to-violet-500" 
                />
                <StatCard 
                    title="Actual API Cost" 
                    value={`$${stats.totalCostUsd.toFixed(4)}`} 
                    subValue={`(৳${stats.totalCostBdt.toFixed(2)})`}
                    trend={0} 
                    icon={Activity} 
                    colorClass="bg-gradient-to-br from-rose-500 to-orange-500" 
                />
                <StatCard 
                    title="Total Questions AI Generated" 
                    value={stats.totalQuestions.toLocaleString()} 
                    trend={0} 
                    icon={Users} 
                    colorClass="bg-gradient-to-br from-emerald-500 to-teal-500" 
                />
                <StatCard 
                    title="AI Tokens Processed" 
                    value={formatTokens(stats.totalTokens)} 
                    trend={0} 
                    icon={BrainCircuit} 
                    colorClass="bg-gradient-to-br from-blue-500 to-cyan-500" 
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue vs Cost Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-slate-800">Revenue vs API Cost</h2>
                        <p className="text-sm text-slate-500">Monthly comparison of platform earnings versus actual AI provider expenses.</p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dynamicChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} ticketFormatter={(val) => `$${val}`} />
                                <Tooltip 
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="cost" name="API Cost" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Model Usage Distribution */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                    <div className="mb-2">
                        <h2 className="text-lg font-bold text-slate-800">Model Distribution</h2>
                        <p className="text-sm text-slate-500">Token usage by AI model type.</p>
                    </div>
                    {stats.modelSummary && stats.modelSummary.length > 0 ? (
                        <>
                            <div className="flex-1 flex items-center justify-center min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.modelSummary}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.modelSummary.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                                            formatter={(value) => [formatTokens(value) + ' tokens', 'Usage']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3 mt-4 overflow-y-auto max-h-36 pr-1">
                                {stats.modelSummary.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                            <span className="font-medium text-slate-700 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                        </div>
                                        <span className="font-bold text-slate-800">{formatTokens(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center min-h-[200px] text-slate-400 text-sm">
                            No AI usage recorded yet.
                        </div>
                    )}
                </div>
            </div>

             {/* Quick Actions / Up next */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl p-6 border border-indigo-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-600 rounded-lg text-white">
                            <Bot size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800">Setup Pricing Rules</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Configure token costs for Gemini, OpenAI, and Ollama to exactly track your profit margins.</p>
                    <button onClick={() => navigate('/settings/general')} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Configure Pricing &rarr;</button>
                 </div>
                 
                 <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-6 border border-emerald-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-600 rounded-lg text-white">
                            <Zap size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800">Package AI Limits</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Update your subscription packages to include AI credit limitations alongside standard limits.</p>
                    <button onClick={() => navigate('/billing/packages')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Manage Packages &rarr;</button>
                 </div>
            </div>

            {/* AI Logs Table */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mt-6 overflow-hidden">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Recent AI Operations</h2>
                        <p className="text-sm text-slate-500">Detailed token usage and costs from system-wide AI activities.</p>
                    </div>
                    <button className="text-sm px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                        View All Logs
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-3 text-sm font-semibold text-slate-500 whitespace-nowrap">Date & Time</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 whitespace-nowrap">User</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 whitespace-nowrap">Module / Action</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 whitespace-nowrap">Model</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 whitespace-nowrap text-right">Tokens</th>
                                <th className="pb-3 text-sm font-semibold text-slate-500 whitespace-nowrap text-right">Cost (USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentLogs && stats.recentLogs.length > 0 ? (
                                stats.recentLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-3 pr-4">
                                            <div className="text-sm text-slate-800">
                                                {new Date(log.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(log.createdAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm font-medium text-slate-800">{log.userName || 'System'}</div>
                                            <div className="text-xs text-slate-500">{log.userEmail || 'System'}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 mb-1">
                                                {log.questionType || 'General'}
                                            </div>
                                            <div className="text-xs text-slate-500 truncate max-w-[200px]" title={log.action}>
                                                {log.action}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-600">
                                            {log.modelUsed}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="text-sm font-medium text-slate-800">
                                                {log.totalTokens.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {log.processingTimeMs}ms
                                            </div>
                                        </td>
                                        <td className="py-3 pl-4 text-right">
                                            <div className="text-sm font-bold text-slate-800">
                                                ${parseFloat(log.costUsd).toFixed(5)}
                                            </div>
                                            {log.success ? (
                                                <div className="text-xs text-emerald-500 font-medium mt-0.5">Success</div>
                                            ) : (
                                                <div className="text-xs text-rose-500 font-medium mt-0.5" title={log.errorMessage}>Failed</div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-sm text-slate-400">
                                        No recent AI operations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BillingOverview;
