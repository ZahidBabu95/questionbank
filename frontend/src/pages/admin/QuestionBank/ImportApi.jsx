import React, { useState, useEffect } from 'react';
import {
    Cpu, DollarSign, Zap, Users, Brain, ScanSearch,
    Loader2, AlertTriangle, Check, TrendingUp, Clock, Hash,
    ArrowLeft, RefreshCw, FileText, BadgeDollarSign
} from 'lucide-react';
import axios from '../../../utils/axios';

const ImportApi = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/v1/ai/usage/dashboard');
            setData(res.data?.data || {});
        } catch (err) {
            console.error('Dashboard load error:', err);
            setError('ড্যাশবোর্ড লোড করতে ব্যর্থ। সার্ভার চালু আছে কিনা নিশ্চিত করুন।');
            setData({
                totalCalls: 0, totalQuestions: 0, totalTokens: 0,
                totalCostUsd: 0, totalCostBdt: 0,
                costPerQuestionUsd: 0, costPerQuestionBdt: 0,
                bdtRate: 121, userSummary: [], actionSummary: [], recentLogs: []
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboard(); }, []);

    const fmt = (n, decimals = 2) => {
        if (n === null || n === undefined) return '0';
        return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const fmtBdt = (n) => '৳' + fmt(n);
    const fmtUsd = (n) => '$' + fmt(n, 4);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={32} className="animate-spin mb-3" />
                <p className="text-sm font-medium">AI Usage ড্যাশবোর্ড লোড হচ্ছে...</p>
            </div>
        );
    }

    const d = data || {};
    const userSummary = d.userSummary || [];
    const actionSummary = d.actionSummary || [];
    const recentLogs = d.recentLogs || [];

    return (
        <div className="w-full space-y-5">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Cpu size={22} className="text-violet-500" /> AI API Cost Manager
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">AI ব্যবহারের খরচ, টোকেন ও প্রশ্ন ট্র্যাক করুন</p>
                </div>
                <button onClick={fetchDashboard}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all active:scale-[0.97]">
                    <RefreshCw size={13} /> রিফ্রেশ
                </button>
            </div>

            {error && (
                <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            {/* ═══ STAT CARDS ═══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Questions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <Brain size={18} className="text-white" />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">AI</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{fmt(d.totalQuestions, 0)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">মোট প্রশ্ন তৈরি</p>
                </div>

                {/* Total Cost USD */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                            <DollarSign size={18} className="text-white" />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold">USD</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{fmtUsd(d.totalCostUsd)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">মোট খরচ (ডলার)</p>
                </div>

                {/* Total Cost BDT */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-200">
                            <BadgeDollarSign size={18} className="text-white" />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-bold">BDT</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{fmtBdt(d.totalCostBdt)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">মোট খরচ (টাকা)</p>
                </div>

                {/* Total Tokens */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 group hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                            <Zap size={18} className="text-white" />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold">Tokens</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800">{fmt(d.totalTokens, 0)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">মোট টোকেন ব্যবহৃত</p>
                </div>
            </div>

            {/* ═══ PER-QUESTION COST ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">প্রশ্ন প্রতি খরচ (USD)</p>
                    <p className="text-xl font-black text-blue-800">{fmtUsd(d.costPerQuestionUsd)}</p>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-4">
                    <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">প্রশ্ন প্রতি খরচ (BDT)</p>
                    <p className="text-xl font-black text-violet-800">{fmtBdt(d.costPerQuestionBdt)}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">মোট API কল</p>
                    <p className="text-xl font-black text-slate-800">{fmt(d.totalCalls, 0)} বার</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">রেট: $1 = ৳{d.bdtRate}</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-5">
                {/* ═══ LEFT: User-wise ═══ */}
                <div className="flex-1 min-w-0 space-y-4">

                    {/* Action-wise Summary */}
                    {actionSummary.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                    <TrendingUp size={13} /> ফিচার ভিত্তিক সারাংশ
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {actionSummary.map((a, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.action === 'SCRAPE' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {a.action === 'SCRAPE' ? <ScanSearch size={14} /> : <Brain size={14} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">
                                                    {a.action === 'SCRAPE' ? 'প্রশ্ন স্ক্র্যাপার' : 'প্রশ্ন জেনারেটর'}
                                                </p>
                                                <p className="text-[10px] text-slate-400">{Number(a.totalCalls)} বার ব্যবহৃত</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-700">{Number(a.totalQuestions)} প্রশ্ন</p>
                                            <p className="text-[10px] text-emerald-600 font-bold">{fmtUsd(a.totalCost)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* User-wise Summary Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                <Users size={13} /> ইউজার ভিত্তিক খরচ
                            </h3>
                        </div>
                        {userSummary.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50">
                                        <tr className="text-left text-[10px] text-slate-400 uppercase tracking-wider">
                                            <th className="px-4 py-2.5 font-bold">ব্যবহারকারী</th>
                                            <th className="px-3 py-2.5 font-bold text-center">কল</th>
                                            <th className="px-3 py-2.5 font-bold text-center">প্রশ্ন</th>
                                            <th className="px-3 py-2.5 font-bold text-center">টোকেন</th>
                                            <th className="px-3 py-2.5 font-bold text-right">USD</th>
                                            <th className="px-4 py-2.5 font-bold text-right">BDT</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {userSummary.map((u, i) => (
                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                            {(u.userName || u.userEmail || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700 text-xs">{u.userName || u.userEmail}</p>
                                                            <p className="text-[10px] text-slate-400">{u.userEmail}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-center font-semibold text-slate-600">{Number(u.totalCalls)}</td>
                                                <td className="px-3 py-2.5 text-center font-semibold text-blue-600">{Number(u.totalQuestions)}</td>
                                                <td className="px-3 py-2.5 text-center font-semibold text-amber-600">{Number(u.totalTokens).toLocaleString()}</td>
                                                <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{fmtUsd(u.totalCost)}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-violet-600">{fmtBdt(u.totalCostBdt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                <Users size={32} className="mx-auto mb-2 opacity-30" />
                                কোনো AI ব্যবহারের ডেটা নেই
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ RIGHT: Recent Logs ═══ */}
                <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                <Clock size={13} /> সাম্প্রতিক API কল
                            </h3>
                            <span className="text-[10px] text-slate-400">{recentLogs.length} টি</span>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                            {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                                <div key={i} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center ${log.action === 'SCRAPE'
                                                ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {log.action === 'SCRAPE' ? <ScanSearch size={10} /> : <Brain size={10} />}
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-700">
                                                {log.action === 'SCRAPE' ? 'Scrape' : 'Generate'}
                                            </span>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${log.success
                                                ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {log.success ? 'সফল' : 'ব্যর্থ'}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {log.createdAt ? new Date(log.createdAt).toLocaleDateString('bn-BD') : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                        <span className="flex items-center gap-0.5"><Hash size={9} />{log.questionsCount || 0} প্রশ্ন</span>
                                        <span className="flex items-center gap-0.5"><Zap size={9} />{(log.totalTokens || 0).toLocaleString()} tok</span>
                                        <span className="flex items-center gap-0.5 text-emerald-500 font-bold">{fmtUsd(log.costUsd)}</span>
                                    </div>
                                    {log.userName && (
                                        <p className="text-[10px] text-slate-400 mt-0.5">👤 {log.userName}</p>
                                    )}
                                    {log.errorMessage && (
                                        <p className="text-[10px] text-rose-500 mt-1 bg-rose-50 p-1.5 rounded-md">{log.errorMessage}</p>
                                    )}
                                </div>
                            )) : (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                                    এখনো কোনো API কল হয়নি
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportApi;
