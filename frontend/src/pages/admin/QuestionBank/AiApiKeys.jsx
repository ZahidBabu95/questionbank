import React, { useState, useEffect } from 'react';
import axios from '../../../utils/axios';
import { Key, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Shield, Zap, AlertTriangle, Activity, Check, Eye, EyeOff, RotateCcw } from 'lucide-react';

export default function AiApiKeys() {
    const [keys, setKeys] = useState([]);
    const [deletedKeys, setDeletedKeys] = useState([]);
    const [activeTab, setActiveTab] = useState('active');
    const [poolStatus, setPoolStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newKey, setNewKey] = useState({ keyName: '', apiKey: '', dailyLimit: 1500, isPaid: false });
    const [message, setMessage] = useState(null);
    const [revealModal, setRevealModal] = useState({ show: false, keyId: null, password: '', revealedKey: null, error: null });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [keysRes, statusRes, deletedRes] = await Promise.all([
                axios.get('/v1/ai/keys'),
                axios.get('/v1/ai/keys/pool-status'),
                axios.get('/v1/ai/keys/deleted')
            ]);
            setKeys(keysRes.data?.data || []);
            setPoolStatus(statusRes.data?.data || {});
            setDeletedKeys(deletedRes.data?.data || []);
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
                isPaid: newKey.isPaid
            });
            setMessage({ type: 'success', text: 'API Key added successfully!' });
            setNewKey({ keyName: '', apiKey: '', dailyLimit: 1500, isPaid: false });
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
        if (!confirm('Soft delete this API key?')) return;
        try {
            await axios.delete(`/v1/ai/keys/${id}`);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleRestore = async (id) => {
        try {
            await axios.put(`/v1/ai/keys/${id}/restore`);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleHardDelete = async (id) => {
        if (!confirm('PERMANENTLY delete this API key? This action cannot be undone.')) return;
        try {
            await axios.delete(`/v1/ai/keys/hard/${id}`);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleRevealKey = async () => {
        if (!revealModal.password) {
            setRevealModal(p => ({ ...p, error: 'Password is required' }));
            return;
        }
        try {
            const res = await axios.post(`/v1/ai/keys/${revealModal.keyId}/reveal`, { password: revealModal.password });
            setRevealModal(p => ({ ...p, revealedKey: res.data.data.apiKey, error: null }));
        } catch (e) {
            setRevealModal(p => ({ ...p, error: e.response?.data?.message || 'Incorrect password' }));
        }
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
                            <input type="number" value={newKey.dailyLimit} disabled={newKey.isPaid}
                                onChange={e => setNewKey(p => ({ ...p, dailyLimit: parseInt(e.target.value) || 1500 }))}
                                className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 outline-none ${newKey.isPaid ? 'bg-slate-100 opacity-60' : ''}`}
                                placeholder="1500" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-lg">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={newKey.isPaid} 
                                   onChange={e => setNewKey(p => ({ ...p, isPaid: e.target.checked, dailyLimit: e.target.checked ? 0 : 1500 }))} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                        <div>
                            <p className="text-sm font-bold text-indigo-900">Mark as PAID API Key (Unlimited Tier)</p>
                            <p className="text-xs text-indigo-600">Paid keys have Top Priority for heavy load. Free keys act as backup and load balancers.</p>
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

            {/* Keys Table & Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 flex">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'active' ? 'border-violet-600 text-violet-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                    >
                        Active Pool ({keys.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('trash')}
                        className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${activeTab === 'trash' ? 'border-rose-500 text-rose-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                    >
                        Trash / Disabled ({deletedKeys.length})
                    </button>
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
                        {(activeTab === 'active' ? keys : deletedKeys).length === 0 ? (
                            <div className="p-10 text-center text-slate-400">
                                No keys found in this section.
                            </div>
                        ) : (
                            (activeTab === 'active' ? keys : deletedKeys).map(k => (
                                <div key={k.id} className={`px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors ${!k.active ? 'opacity-60' : ''} ${activeTab === 'trash' ? 'bg-rose-50/30 line-through decoration-slate-300' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeTab === 'trash' ? 'bg-rose-100' : k.active ? 'bg-gradient-to-br from-emerald-400 to-green-500' : 'bg-slate-200'}`}>
                                            <Key size={18} className={activeTab === 'trash' ? 'text-rose-400' : 'text-white'} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm text-slate-700">{k.keyName || 'Unnamed Key'}</p>
                                                {(k.paidTier || k.isPaid) ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">PAID TIER</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">FREE TIER</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-slate-400 font-mono tracking-widest">{k.apiKey}</p>
                                                <button onClick={() => setRevealModal({ show: true, keyId: k.id, password: '', revealedKey: null, error: null })} title="Reveal API Key" className="text-slate-300 hover:text-violet-500 cursor-pointer">
                                                    <Eye size={14} />
                                                </button>
                                            </div>
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
                                        <div className="flex items-center gap-2 ml-4 border-l border-slate-200 pl-4">
                                            {activeTab === 'active' ? (
                                                <>
                                                    <button onClick={() => handleToggle(k.id)}
                                                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" title={k.active ? 'Deactivate' : 'Activate'}>
                                                        {k.active ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-slate-400" />}
                                                    </button>
                                                    <button onClick={() => handleDelete(k.id)}
                                                        className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer" title="Move to Trash">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleRestore(k.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer">
                                                        <RotateCcw size={14} /> Restore
                                                    </button>
                                                    <button onClick={() => handleHardDelete(k.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer">
                                                        <Trash2 size={14} /> Hard Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* How it works */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-5">
                <h4 className="font-bold text-violet-800 mb-3">কিভাবে API Load Balancing (Tiered System) কাজ করে?</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-violet-700">
                    <div className="flex gap-3 bg-white p-4 rounded-xl shadow-sm border border-violet-100">
                        <span className="text-2xl mt-1">1️⃣</span>
                        <div>
                            <p className="font-bold text-violet-900 mb-1">Free Tier (Backup)</p>
                            <p className="text-xs text-violet-600">আপনি আনলিমিটেড ফ্রী কি যোগ করতে পারবেন। সাধারণ কাজের সময় সিস্টেম ফ্রি কি গুলো থেকে রাউন্ড-রবিন করে কাজ করবে (15 RPM)। এতে টাকা বাঁচবে।</p>
                        </div>
                    </div>
                    <div className="flex gap-3 bg-white p-4 rounded-xl shadow-sm border border-violet-100">
                        <span className="text-2xl mt-1">2️⃣</span>
                        <div>
                            <p className="font-bold text-violet-900 mb-1">Paid Tier (Speed Boost)</p>
                            <p className="text-xs text-violet-600">যখন সিস্টেমে প্রচুর চাপ (Load) পড়বে, ডিস্ট্রিবিউটেড পুল তখন ফ্রী কি এর লিমিট বুঝে অটোম্যাটিক্যালি PAID কি গুলো ইউজ করে সুপার-ফাস্ট স্পিডে কাজ করবে।</p>
                        </div>
                    </div>
                    <div className="flex gap-3 bg-white p-4 rounded-xl shadow-sm border border-violet-100">
                        <span className="text-2xl mt-1">3️⃣</span>
                        <div>
                            <p className="font-bold text-violet-900 mb-1">Smart Failover</p>
                            <p className="text-xs text-violet-600">পেইড এপিআই কোটা শেষ হলে বা কোনো কি 429 এরর খেলে সিস্টেম অটো বাকি কি গুলোতে সুইচ করবে, কোনো কাজ হারাবে না বা ক্র্যাশ হবে না।</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reveal Modal */}
            {revealModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Shield size={20} className="text-violet-600" /> API Key Security
                            </h3>
                            <button onClick={() => setRevealModal({ show: false, keyId: null, password: '', revealedKey: null, error: null })} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                                ✖
                            </button>
                        </div>
                        
                        {!revealModal.revealedKey ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600">Please enter the super admin password to reveal this API key.</p>
                                {revealModal.error && (
                                    <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">{revealModal.error}</p>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                                    <input 
                                        type="password" 
                                        autoFocus
                                        value={revealModal.password} 
                                        onChange={e => setRevealModal(p => ({ ...p, password: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleRevealKey()}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500/30 outline-none"
                                        placeholder="Enter password..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setRevealModal({ show: false, keyId: null, password: '', revealedKey: null, error: null })} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer">
                                        Cancel
                                    </button>
                                    <button onClick={handleRevealKey} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors cursor-pointer">
                                        Reveal Key
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <Check size={18} /> Access Granted
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Full API Key</label>
                                    <textarea 
                                        readOnly 
                                        value={revealModal.revealedKey} 
                                        className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 break-all resize-none h-24 focus:outline-none"
                                        onFocus={e => e.target.select()}
                                    />
                                    <p className="text-xs text-slate-400 mt-2">Click inside the box and press Ctrl+C to copy.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
