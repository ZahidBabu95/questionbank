import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, Mail, Phone, Building, Calendar, Shield, Activity,
    Clock, LogIn, CheckCircle, XCircle, Globe, Loader2, Edit2, Key,
    Lock, Unlock, Trash2, AlertTriangle, RefreshCw, Download
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import userService from '../../../services/userService';
import UserForm from './UserForm';

// ─── Role Badge ──────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
    const cfg = {
        SUPER_ADMIN:     { bg: 'bg-violet-100 text-violet-700', label: 'Super Admin' },
        INSTITUTE_ADMIN: { bg: 'bg-indigo-100 text-indigo-700', label: 'Inst. Admin' },
        TEACHER:         { bg: 'bg-sky-100    text-sky-700',    label: 'Teacher'     },
        STUDENT:         { bg: 'bg-emerald-100 text-emerald-700', label: 'Student'   },
    };
    const c = cfg[role] || { bg: 'bg-slate-100 text-slate-600', label: role };
    return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${c.bg}`}>{c.label}</span>;
};

// ─── Section Card ─────────────────────────────────────────────────────────────
const Section = ({ title, icon, children, action }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-700">
                <span className="text-slate-400">{icon}</span>
                <h3 className="font-bold text-sm">{title}</h3>
            </div>
            {action}
        </div>
        <div className="p-6">{children}</div>
    </div>
);

// ─── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
        <span className="mt-0.5 text-slate-300">{icon}</span>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{value || '—'}</p>
        </div>
    </div>
);

// ─── Parse User Agent Helper ──────────────────────────────────────────────────
const parseUserAgent = (userAgent) => {
    if (!userAgent) return "Unknown Device";
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    if (userAgent.includes("Chrome")) browser = "Google Chrome";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
    else if (userAgent.includes("Firefox")) browser = "Mozilla Firefox";
    else if (userAgent.includes("Edge")) browser = "Microsoft Edge";

    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Macintosh")) os = "macOS";
    else if (userAgent.includes("Android")) os = "Android";
    else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
    else if (userAgent.includes("Linux")) os = "Linux";

    return `${browser} on ${os}`;
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const UserProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [user,          setUser]          = useState(null);
    const [activityLogs,  setActivityLogs]  = useState([]);
    const [loginHistory,  setLoginHistory]  = useState([]);
    const [loginChart,    setLoginChart]    = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [activeTab,     setActiveTab]     = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const [toast,         setToast]         = useState(null);
    const [activityPage,  setActivityPage]  = useState(0);
    const [loginPage,     setLoginPage]     = useState(0);
    const [activityTotal, setActivityTotal] = useState(0);
    const [loginTotal,    setLoginTotal]    = useState(0);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchUser = async () => {
        try {
            const res = await userService.getUserById(id);
            if (res.success) setUser(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchActivity = async (page = 0) => {
        try {
            const res = await userService.getActivityLog(id, page, 10);
            if (res.success) {
                setActivityLogs(res.data.content || []);
                setActivityTotal(res.data.totalPages || 0);
            }
        } catch (e) { console.error(e); }
    };

    const fetchLoginHistory = async (page = 0) => {
        try {
            const res = await userService.getLoginHistory(id, page, 10);
            if (res.success) {
                setLoginHistory(res.data.content || []);
                setLoginTotal(res.data.totalPages || 0);
                // Build chart data from history
                const monthMap = {};
                (res.data.content || []).forEach(h => {
                    if (h.createdAt) {
                        const m = h.createdAt.substring(0, 7);
                        monthMap[m] = (monthMap[m] || 0) + 1;
                    }
                });
                setLoginChart(Object.entries(monthMap).map(([month, count]) => ({ month, count })).slice(-6));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchUser();
            await fetchActivity(0);
            await fetchLoginHistory(0);
            setLoading(false);
        };
        init();
    }, [id]);

    const handleStatusToggle = async () => {
        try {
            user.active ? await userService.deactivateUser(id) : await userService.activateUser(id);
            setUser(prev => ({ ...prev, active: !prev.active }));
            showToast(user.active ? 'User deactivated' : 'User activated');
        } catch (e) { showToast('Failed', 'error'); }
    };

    const handleResetPassword = async () => {
        if (!window.confirm('Reset password to Default@123?')) return;
        try {
            await userService.resetPassword(id);
            showToast('Password reset — New password: Default@123', 'warning');
        } catch (e) { showToast('Failed', 'error'); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-indigo-500" size={36} />
        </div>
    );

    if (!user) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <AlertTriangle size={40} />
            <p>User not found</p>
            <button onClick={() => navigate('/users')} className="text-indigo-600 font-bold text-sm">← Back to Users</button>
        </div>
    );

    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const joinDate  = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';

    const tabs = [
        { id: 'overview',  label: 'Overview'      },
        { id: 'activity',  label: 'Activity Log'  },
        { id: 'logins',    label: 'Login History' },
    ];

    return (
        <div className="space-y-6 pb-10 max-w-5xl">
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-white font-medium text-sm shadow-2xl animate-fade-in ${toast.type === 'error' ? 'bg-rose-600' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate('/users')}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-black text-slate-800">User Profile</h1>
                    <p className="text-slate-400 text-sm">বিস্তারিত তথ্য ও কার্যক্রম</p>
                </div>
            </div>

            {/* Hero Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 h-28 relative">
                    <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                </div>
                <div className="px-6 pb-6">
                    <div className="flex flex-wrap items-end justify-between gap-4 -mt-12">
                        <div className="flex items-end gap-4">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 border-4 border-white shadow-xl flex items-center justify-center text-3xl font-black text-white">
                                {initials}
                            </div>
                            <div className="mb-2">
                                <h2 className="text-2xl font-black text-slate-800">{user.name}</h2>
                                <p className="text-slate-400 text-sm">{user.email}</p>
                                <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {(user.roles || []).map(r => <RoleBadge key={r} role={r} />)}
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {user.active ? '● Active' : '● Inactive'}
                                    </span>
                                    {user.accountLocked && <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700">🔒 Locked</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mb-2 flex-wrap">
                            <button onClick={() => setShowEditModal(true)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm">
                                <Edit2 size={13} /> Edit
                            </button>
                            <button onClick={handleStatusToggle}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all border ${user.active ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>
                                {user.active ? <><Lock size={12} /> Deactivate</> : <><Unlock size={12} /> Activate</>}
                            </button>
                            <button onClick={handleResetPassword}
                                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 rounded-xl font-bold text-xs transition-all">
                                <Key size={12} /> Reset Password
                            </button>
                        </div>
                    </div>

                    {/* Quick stats */}
                    <div className="grid grid-cols-3 gap-4 mt-5">
                        {[
                            { label: 'যোগদান', value: joinDate },
                            { label: 'Failed Logins', value: user.failedLoginAttempts ?? 0 },
                            { label: 'Institute', value: user.instituteName || 'Global' },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                                <p className="font-bold text-slate-700 text-sm mt-0.5 truncate">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ── */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Section title="Contact Info" icon={<User size={16} />}>
                        <InfoRow icon={<Mail size={14}/>}     label="Email"   value={user.email} />
                        <InfoRow icon={<Phone size={14}/>}    label="Phone"   value={user.phone} />
                        <InfoRow icon={<Building size={14}/>} label="Institute" value={user.instituteName || 'Global / No Institute'} />
                        <InfoRow icon={<Calendar size={14}/>} label="Joined"  value={joinDate} />
                        <InfoRow icon={<Globe size={14}/>}    label="User ID" value={user.id?.substring(0, 18) + '...'} />
                    </Section>

                    <Section title="Security Info" icon={<Shield size={16} />}>
                        <InfoRow icon={<CheckCircle size={14}/>} label="Account Status" value={user.active ? 'Active ✅' : 'Inactive ❌'} />
                        <InfoRow icon={<Lock size={14}/>}        label="Account Lock"   value={user.accountLocked ? '🔒 Locked' : 'Not Locked'} />
                        <InfoRow icon={<AlertTriangle size={14}/>} label="Failed Login Attempts" value={`${user.failedLoginAttempts ?? 0} attempts`} />
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                            💡 পাসওয়ার্ড রিসেট করলে নতুন পাসওয়ার্ড হবে: <span className="font-bold text-indigo-600 font-mono">Default@123</span>
                        </div>
                    </Section>
                </div>
            )}

            {activeTab === 'activity' && (
                <Section title="Activity Log" icon={<Activity size={16} />}
                    action={<button onClick={() => fetchActivity(activityPage)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><RefreshCw size={14} /></button>}>
                    {activityLogs.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                            <Activity size={36} className="mx-auto mb-3 opacity-30" />
                            <p>কোনো activity log পাওয়া যায়নি</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {activityLogs.map(log => (
                                <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                        log.action?.includes('DELETE') ? 'bg-rose-100 text-rose-600' :
                                        log.action?.includes('CREATE') ? 'bg-emerald-100 text-emerald-600' :
                                        log.action?.includes('ACTIVATE') ? 'bg-green-100 text-green-600' :
                                        'bg-indigo-100 text-indigo-600'
                                    }`}>
                                        {log.action?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-sm text-slate-700">{log.action}</span>
                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB') : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>
                                        {log.actorName && <p className="text-[10px] text-slate-400 mt-1">by <span className="font-bold">{log.actorName}</span></p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {activityTotal > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                            <button disabled={activityPage === 0} onClick={() => { setActivityPage(p => p-1); fetchActivity(activityPage-1); }}
                                className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40">← Prev</button>
                            <button disabled={activityPage >= activityTotal-1} onClick={() => { setActivityPage(p => p+1); fetchActivity(activityPage+1); }}
                                className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40">Next →</button>
                        </div>
                    )}
                </Section>
            )}

            {activeTab === 'logins' && (
                <div className="space-y-5">
                    {/* Login chart */}
                    {loginChart.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <h3 className="font-bold text-slate-700 text-sm mb-4 flex items-center gap-2"><LogIn size={15}/> Login Activity</h3>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={loginChart}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="count" fill="#6366f1" radius={[6,6,0,0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <Section title="Login History" icon={<Clock size={16}/>}
                        action={<button onClick={() => fetchLoginHistory(loginPage)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><RefreshCw size={14}/></button>}>
                        {loginHistory.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                                <Clock size={36} className="mx-auto mb-3 opacity-30" />
                                <p>কোনো login history পাওয়া যায়নি</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {loginHistory.map(h => (
                                    <div key={h.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${h.success ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                                            {h.success ? <CheckCircle size={14}/> : <XCircle size={14}/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`font-bold text-sm ${h.success ? 'text-emerald-700' : 'text-rose-600'}`}>
                                                    {h.success ? 'Successful Login' : 'Failed Login'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 shrink-0">
                                                    {h.createdAt ? new Date(h.createdAt).toLocaleString('en-GB') : ''}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5">
                                                {h.ipAddress && <span className="text-[10px] text-slate-400">IP: {h.ipAddress}</span>}
                                                {h.userAgent && <span className="text-[10px] text-slate-400">Device: {parseUserAgent(h.userAgent)}</span>}
                                                {h.failureReason && <span className="text-[10px] text-rose-400 font-medium">Reason: {h.failureReason}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {loginTotal > 1 && (
                            <div className="flex justify-center gap-2 mt-4">
                                <button disabled={loginPage === 0} onClick={() => { setLoginPage(p => p-1); fetchLoginHistory(loginPage-1); }}
                                    className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40">← Prev</button>
                                <button disabled={loginPage >= loginTotal-1} onClick={() => { setLoginPage(p => p+1); fetchLoginHistory(loginPage+1); }}
                                    className="px-3 py-1 text-xs rounded-lg border border-slate-200 disabled:opacity-40">Next →</button>
                            </div>
                        )}
                    </Section>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <UserForm user={user} onClose={() => setShowEditModal(false)}
                    onSuccess={() => { setShowEditModal(false); fetchUser(); }} />
            )}
        </div>
    );
};

export default UserProfilePage;
