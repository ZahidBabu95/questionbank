import React, { useState, useEffect } from 'react';
import axios from '../../../utils/axios';
import { Key, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Shield, Zap, AlertTriangle, Activity, Check } from 'lucide-react';

export default function AiApiKeys() {
    const [keys, setKeys] = useState([]);
    const [poolStatus, setPoolStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newKey, setNewKey] = useState({ keyName: '', apiKey: '', dailyLimit: 1500 });
    const [message, setMessage] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [keysRes, statusRes] = await Promise.all([
                axios.get('/v1/ai/keys'),
                axios.get('/v1/ai/keys/pool-status'),
            ]);
            setKeys(keysRes.data?.data || []);
            setPoolStatus(statusRes.data?.data || {});
        } catch (e) {
            console.error('Failed to load keys:', e);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddKey = async () => {
        if (!newKey.apiKey) { setMessage({ type: 'error', text: 'API Key is required' }); return; }
        try {
            await axios.post('/v1/ai/keys', {
                keyName: newKey.keyName || `Key ${keys.length + 1}`,
                apiKey: newKey.apiKey,
                dailyLimit: newKey.dailyLimit || 1500,
            });
            setMessage({ type: 'success', text: 'API Key added successfully!' });
            setNewKey({ keyName: '', apiKey: '', dailyLimit: 1500 });
            setShowAddForm(false);
            fetchData();
        } catch (e) {
            setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to add key' });
        }
    };

    const handleToggle = async (id) => {
        try {
            await axios.put(`/v1/ai/keys/${id}/toggle`);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this API key?')) return;
        try {
            await axios.delete(`/v1/ai/keys/${id}`);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const statCards = poolStatus ? [
        { label: 'Total Keys', value: poolStatus.totalKeys || 0, icon: <Key size={20} />, color: 'from-violet-500 to-purple-600' },
        { label: 'Active Keys', value: poolStatus.activeKeys || 0, icon: <Zap size={20} />, color: 'from-emerald-500 to-green-600' },
        { label: 'Available Now', value: poolStatus.availableKeys || 0, icon: <Activity size={20} />, color: 'from-blue-500 to-indigo-600' },
        { label: 'Requests Today', value: `${poolStatus.requestsToday || 0} / ${poolStatus.dailyCapacity || 0}`, icon: <RefreshCw size={20} />, color: 'from-amber-500 to-orange-600' },
    ] : [];

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <Shield size={22} className="text-white" />
                        </div>
                        API Key Pool Manager
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage multiple Gemini API keys for round-robin rotation</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-sm font-medium shadow-sm cursor-pointer">
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all text-sm cursor-pointer">
                        <Plus size={16} /> Add API Key
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {message.text}
                    <button onClick={() => setMessage(null)} className="ml-auto text-xs opacity-60 hover:opacity-100 cursor-pointer">x</button>
                </div>
            )}

            {/* Stats */}
            {poolStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {statCards.map((s, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white`}>
                                    {s.icon}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                                    <p className="text-lg font-bold text-slate-800">{s.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Capacity Progress */}
            {poolStatus && poolStatus.dailyCapacity > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Daily Capacity Usage</span>
                        <span className="text-sm font-bold text-indigo-600">
                            {((poolStatus.requestsToday / poolStatus.dailyCapacity) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((poolStatus.requestsToday / poolStatus.dailyCapacity) * 100, 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        {poolStatus.requestsToday} of {poolStatus.dailyCapacity} requests used today (auto-resets at midnight)
                    </p>
                </div>
            )}

            {/* Add Key Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl shadow-md border border-violet-200 p-6">
                    <h3 className="text-sm font-bold text-violet-700 mb-4 flex items-center gap-2">
                        <Plus size={16} /> Add New API Key
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Key Name</label>
                            <input type="text" value={newKey.keyName}
                                onChange={e => setNewKey(p => ({ ...p, keyName: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 outline-none"
                                placeholder="e.g. Free Key 1" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">API Key *</label>
                            <input type="password" value={newKey.apiKey}
                                onChange={e => setNewKey(p => ({ ...p, apiKey: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 outline-none"
                                placeholder="AIzaSy..." />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Daily Limit</label>
                            <input type="number" value={newKey.dailyLimit}
                                onChange={e => setNewKey(p => ({ ...p, dailyLimit: parseInt(e.target.value) || 1500 }))}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 outline-none"
                                placeholder="1500" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={handleAddKey}
                            className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all cursor-pointer">
                            Save Key
                        </button>
                        <button onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all cursor-pointer">
                            Cancel
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">
                        Free tier: 15 RPM, 1,500 RPD per key. Add multiple keys to multiply capacity!
                    </p>
                </div>
            )}

            {/* Keys Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-700">API Keys ({keys.length})</h3>
                </div>
                {loading ? (
                    <div className="p-10 text-center text-slate-400">Loading...</div>
                ) : keys.length === 0 ? (
                    <div className="p-10 text-center">
                        <Key size={48} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">No API keys added yet</p>
                        <p className="text-xs text-slate-400 mt-1">Add your first Gemini API key to get started</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {keys.map(k => (
                            <div key={k.id} className={`px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors ${!k.active ? 'opacity-50' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.active ? 'bg-gradient-to-br from-emerald-400 to-green-500' : 'bg-slate-200'}`}>
                                        <Key size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-700">{k.keyName || 'Unnamed Key'}</p>
                                        <p className="text-xs text-slate-400 font-mono">{k.apiKey}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">Today</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {k.requestsToday || 0} / {k.dailyLimit || '~'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">Total</p>
                                        <p className="text-sm font-bold text-slate-700">{k.totalRequests || 0}</p>
                                    </div>
                                    {k.lastError && (
                                        <div className="text-right max-w-[150px]" title={k.lastError}>
                                            <p className="text-xs text-rose-500 truncate">{k.lastError}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleToggle(k.id)}
                                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" title={k.active ? 'Deactivate' : 'Activate'}>
                                            {k.active ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-slate-400" />}
                                        </button>
                                        <button onClick={() => handleDelete(k.id)}
                                            className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* How it works */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5">
                <h4 className="font-bold text-violet-800 mb-3">How Round-Robin Key Rotation Works</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-violet-700">
                    <div className="flex gap-2">
                        <span className="text-xl">1️⃣</span>
                        <p>Add multiple free Gemini API keys (each gets 15 RPM, 1,500 RPD)</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-xl">2️⃣</span>
                        <p>System automatically rotates between keys for every AI request</p>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-xl">3️⃣</span>
                        <p>Exhausted keys are skipped. Daily counters reset at midnight</p>
                    </div>
                </div>
                <p className="text-xs text-violet-500 mt-3">
                    Example: 5 free keys = 75 RPM + 7,500 RPD capacity (enough for 10+ active users!)
                </p>
            </div>
        </div>
    );
}
