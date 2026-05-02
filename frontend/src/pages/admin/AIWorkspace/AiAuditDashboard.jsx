import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Loader2, MessageSquare, Search, Calendar, ChevronRight, X, User } from 'lucide-react';
import axios from 'axios';

const AiAuditDashboard = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAuditSessions = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/v1/ai/workspace/admin/audit/sessions');
            if (data.success) {
                setSessions(data.data || []);
            }
        } catch (err) {
            console.error("Failed to load audit sessions", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditSessions();
    }, []);

    const handleViewTranscript = async (session) => {
        setSelectedSession(session);
        setLoadingMessages(true);
        setMessages([]);
        try {
            const { data } = await axios.get(`/v1/ai/workspace/sessions/${session.id}/messages`);
            if (data.success) {
                setMessages(data.data || []);
            }
        } catch (err) {
            console.error("Failed to load messages", err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const filteredSessions = sessions.filter(s => 
        (s.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Activity className="text-indigo-600" />
                        AI Audit & Telemetry
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Monitor AI interactions, track hallucinations, and review user transcripts across the workspace.
                    </p>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Total Sessions</p>
                        <h3 className="text-2xl font-black text-slate-800">{sessions.length}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Active Rate</p>
                        <h3 className="text-2xl font-black text-slate-800">Normal</h3>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Hallucination Reports</p>
                        <h3 className="text-2xl font-black text-slate-800">0</h3>
                    </div>
                </div>
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">Recent Interactions</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search email or topic..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs uppercase">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Context Topic</th>
                                <th className="px-6 py-4">Date / Time</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                                        Loading telemetry data...
                                    </td>
                                </tr>
                            ) : filteredSessions.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        No interactions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredSessions.map(session => (
                                    <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                                    <User size={14} />
                                                </div>
                                                <span className="font-medium text-slate-700">{session.userEmail || `User ID: ${session.userId}`}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-800">{session.title || 'Untitled Session'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} />
                                                {new Date(session.updatedAt || session.createdAt).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleViewTranscript(session)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                                            >
                                                Transcript <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transcript Modal */}
            {selectedSession && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
                    <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="p-5 border-b flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Transcript Review</h3>
                                <p className="text-xs text-slate-500">{selectedSession.userEmail} • {new Date(selectedSession.updatedAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedSession(null)} className="p-2 bg-white rounded-lg border text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                            {loadingMessages ? (
                                <div className="flex justify-center items-center h-32">
                                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                                </div>
                            ) : messages.length === 0 ? (
                                <p className="text-center text-slate-500 italic">No messages found in this session.</p>
                            ) : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl p-4 ${
                                            msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-br-sm' 
                                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                                        }`}>
                                            <div className="text-xs font-bold opacity-70 mb-1 uppercase tracking-wider">
                                                {msg.role === 'user' ? 'User' : 'AI Copilot'}
                                            </div>
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                {msg.content}
                                            </div>
                                            {msg.actionableData && (
                                                <div className="mt-3 p-3 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono border border-slate-200 overflow-x-auto">
                                                    <span className="font-bold text-slate-500 mb-1 block">JSON Data Attached:</span>
                                                    {msg.actionableData}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
};

export default AiAuditDashboard;
