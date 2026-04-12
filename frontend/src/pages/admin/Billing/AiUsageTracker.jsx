import React, { useState, useEffect } from 'react';
import { Database, Search, Filter, Server, CheckCircle, XCircle, Clock, Zap, User } from 'lucide-react';
import axios from '../../../utils/axios';

const AiUsageTracker = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 0, size: 50, totalPages: 0, totalElements: 0 });

    useEffect(() => {
        fetchLogs(pagination.page);
    }, []);

    const fetchLogs = async (page) => {
        setLoading(true);
        try {
            const res = await axios.get(`/v1/ai/usage/logs?page=${page}&size=${pagination.size}`);
            setLogs(res.data.content || []);
            setPagination(prev => ({
                ...prev,
                page: res.data.number,
                totalPages: res.data.totalPages,
                totalElements: res.data.totalElements
            }));
        } catch (error) {
            console.error("Failed to fetch AI logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNextPage = () => {
        if (pagination.page < pagination.totalPages - 1) {
            fetchLogs(pagination.page + 1);
        }
    };

    const handlePrevPage = () => {
        if (pagination.page > 0) {
            fetchLogs(pagination.page - 1);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                    <Database size={32} className="text-emerald-500" />
                    AI Usage Tracker
                </h1>
                <p className="text-slate-500 mt-1">Detailed raw logs of all AI API calls across the platform.</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
                    <div className="flex gap-4 items-center w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search logs (UI Filter)..." 
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition text-sm"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 text-sm">
                            <Filter size={16} /> Filters
                        </button>
                    </div>
                    <div className="text-sm font-medium text-slate-500">
                        Showing {logs.length} of {pagination.totalElements} records
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 uppercase tracking-wider text-xs">Timestamp</th>
                                <th className="px-6 py-4 uppercase tracking-wider text-xs">Type & Model</th>
                                <th className="px-6 py-4 uppercase tracking-wider text-xs">Tokens</th>
                                <th className="px-6 py-4 uppercase tracking-wider text-xs">Cost (USD)</th>
                                <th className="px-6 py-4 uppercase tracking-wider text-xs">User / Institute</th>
                                <th className="px-6 py-4 uppercase tracking-wider text-xs">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center p-12 text-slate-400">Loading tracking data...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center p-12 text-slate-400">No usage logs recorded yet.</td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Clock size={14} className="text-slate-400" />
                                                {new Date(log.createdAt).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">{log.action || 'AI Request'}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Server size={10} /> {log.modelUsed || 'unknown'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-emerald-600 font-bold flex items-center gap-1">
                                                <Zap size={14} /> {log.totalTokens}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                P: {log.promptTokens} | C: {log.completionTokens}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600">
                                            ${log.costUsd?.toFixed(5)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                                                    <User size={12} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-700">{log.userName || 'System'}</div>
                                                    <div className="text-xs text-slate-400 truncate w-32">{log.userEmail}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.success ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                                                    <CheckCircle size={12} /> Success
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100" title={log.errorMessage}>
                                                    <XCircle size={12} /> Error
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white text-sm">
                    <span className="text-slate-500 font-medium">Page {pagination.page + 1} of {pagination.totalPages || 1}</span>
                    <div className="flex gap-2">
                        <button 
                            onClick={handlePrevPage} disabled={pagination.page === 0}
                            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-600 transition"
                        >
                            Previous
                        </button>
                        <button 
                            onClick={handleNextPage} disabled={pagination.page >= pagination.totalPages - 1}
                            className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-600 transition"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiUsageTracker;
