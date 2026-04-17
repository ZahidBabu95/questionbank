import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Search, Edit2, Trash2, Shield, Building, Lock, Unlock,
    RefreshCw, LogIn, Download, Users, UserCheck, UserX, AlertTriangle,
    Key, ChevronLeft, ChevronRight, X, Check, CheckSquare,
    Square, Eye, BookOpen, GraduationCap, Calendar, Mail, Phone,
    Activity, Loader2, Upload, BarChart2
} from 'lucide-react';
import userService from '../../../services/userService';
import UserForm from './UserForm';
import RoleManagement from './RoleManagement';
import UserImportModal from './UserImportModal';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Role Badge ──────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
    const cfg = {
        SUPER_ADMIN:      { bg: 'bg-violet-100 text-violet-700 border-violet-200',  label: 'Super Admin' },
        INSTITUTE_ADMIN:  { bg: 'bg-indigo-100 text-indigo-700 border-indigo-200',  label: 'Inst. Admin' },
        TEACHER:          { bg: 'bg-sky-100    text-sky-700    border-sky-200',      label: 'Teacher'     },
        STUDENT:          { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Student'    },
    };
    const c = cfg[role] || { bg: 'bg-slate-100 text-slate-600 border-slate-200', label: role };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${c.bg}`}>
            {c.label}
        </span>
    );
};

// ─── Stats Card ──────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, sub }) => (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                {icon}
            </div>
            {sub && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{sub}</span>}
        </div>
        <div className="mt-3">
            <p className="text-2xl font-black text-slate-800">{value ?? '—'}</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">{label}</p>
        </div>
    </div>
);

// ─── User Detail Panel ────────────────────────────────────────────────────────
const UserDetailPanel = ({ user, onClose, onEdit, onStatusToggle, onResetPassword, onImpersonate }) => {
    if (!user) return null;
    const initials = (user.name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

    return (
        <div className="fixed inset-0 z-40 flex" onClick={onClose}>
            <div className="flex-1 bg-black/40 backdrop-blur-sm" />
            <div className="w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 h-full overflow-y-auto flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                        <X size={14} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                            {initials}
                        </div>
                        <div>
                            <h2 className="text-xl font-black">{user.name}</h2>
                            <p className="text-indigo-200 text-sm mt-0.5">{user.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 flex-wrap">
                        {(user.roles || []).map(r => (
                            <span key={r} className="px-2.5 py-1 text-[10px] font-bold bg-white/20 border border-white/30 rounded-lg uppercase tracking-wide">{r}</span>
                        ))}
                    </div>
                </div>

                {/* Status strip */}
                <div className={`px-6 py-2 text-xs font-bold flex items-center gap-2 ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    {user.active ? 'Active Account' : 'Inactive Account'}
                    {user.accountLocked && <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 rounded-md">🔒 Locked</span>}
                </div>

                {/* Details */}
                <div className="p-6 flex-1 space-y-5">
                    <div className="space-y-3">
                        {[
                            { icon: <Mail size={14} />, label: 'Email', value: user.email },
                            { icon: <Phone size={14} />, label: 'Phone', value: user.phone || 'Not set' },
                            { icon: <Building size={14} />, label: 'Institute', value: user.instituteName || 'Global / No Institute' },
                            { icon: <Calendar size={14} />, label: 'Joined', value: joinedDate },
                            { icon: <Activity size={14} />, label: 'Failed Logins', value: user.failedLoginAttempts ?? 0 },
                        ].map(({ icon, label, value }) => (
                            <div key={label} className="flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-400 mt-0.5">{icon}</span>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                                    <p className="text-sm font-semibold text-slate-700">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
                    <button onClick={() => onEdit(user)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm">
                        <Edit2 size={14} /> Edit Profile
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => onStatusToggle(user)}
                            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs transition-all border ${user.active ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                            {user.active ? <><Lock size={12} /> Deactivate</> : <><Unlock size={12} /> Activate</>}
                        </button>
                        <button onClick={() => onResetPassword(user)}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-all">
                            <Key size={12} /> Reset Password
                        </button>
                    </div>
                    <button onClick={() => onImpersonate(user)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition-all">
                        <LogIn size={12} /> Login as this User
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Toast Notification ───────────────────────────────────────────────────────
const Toast = ({ msg, type, onClose }) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
    const cfg = {
        success: 'bg-emerald-600',
        error:   'bg-rose-600',
        info:    'bg-indigo-600',
        warning: 'bg-amber-500',
    };
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 ${cfg[type] || cfg.info} text-white rounded-2xl shadow-2xl max-w-xs animate-fade-in font-medium text-sm`}>
            {type === 'success' && <Check size={16} />}
            {type === 'error'   && <AlertTriangle size={16} />}
            {type === 'info'    && <Activity size={16} />}
            <span>{msg}</span>
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserList = () => {
    const navigate  = useNavigate();
    const location  = useLocation();

    const [users,        setUsers]        = useState([]);
    const [stats,        setStats]        = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [searchTerm,   setSearchTerm]   = useState('');
    const [showModal,    setShowModal]    = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [detailUser,   setDetailUser]   = useState(null);
    const [showImport,   setShowImport]   = useState(false);
    const [activeTab,    setActiveTab]    = useState('unverified');
    const [page,         setPage]         = useState(0);
    const [totalPages,   setTotalPages]   = useState(0);
    const [selected,     setSelected]     = useState(new Set());
    const [bulkLoading,  setBulkLoading]  = useState(false);
    const [toast,        setToast]        = useState(null);
    const [exportLoading,setExportLoading]= useState(false);
    const pageSize = 12;

    const showToast = (msg, type = 'success') => setToast({ msg, type });

    // Route → filter mapping
    const getRouteState = (pathname, tab) => {
        if (pathname.includes('/users/teachers'))  return { filter: { role: 'TEACHER'  }, title: 'শিক্ষক', subtitle: 'Manage registered teachers' };
        if (pathname.includes('/users/students'))  return { filter: { role: 'STUDENT'  }, title: 'শিক্ষার্থী', subtitle: 'Manage registered students' };
        if (pathname.includes('/users/blocked'))   return { filter: { accountLocked: true }, title: 'Blocked Users', subtitle: 'Locked / blocked accounts' };
        if (pathname.includes('/users/roles'))     return { filter: {}, title: 'Roles & Permissions', subtitle: 'Manage system roles' };
        if (pathname.includes('/users/pending')) {
            return tab === 'verified'
                ? { filter: { active: true  }, title: 'Pending Approvals', subtitle: 'Verified users' }
                : { filter: { active: false }, title: 'Pending Approvals', subtitle: 'Users waiting for verification' };
        }
        return { filter: {}, title: 'User Management', subtitle: 'Manage all platform users' };
    };

    const { filter: currentFilter, title: pageTitle, subtitle: pageSubtitle } = getRouteState(location.pathname, activeTab);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, size: pageSize, query: searchTerm, ...currentFilter };
            if (!params.role) delete params.role;
            if (params.active === null || params.active === undefined) delete params.active;
            const response = await userService.getAllUsers(params);
            if (response.success && response.data) {
                setUsers(response.data.content);
                setTotalPages(response.data.totalPages);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, searchTerm, location.pathname, activeTab]);

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            const res = await userService.getUserStats();
            if (res.success) setStats(res.data);
        } catch (e) { console.error(e); } finally { setStatsLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    useEffect(() => { fetchStats(); }, []);
    useEffect(() => { setPage(0); setSelected(new Set()); }, [location.pathname, activeTab]);

    // Selection helpers
    const toggleSelect = (id) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const toggleAll = () => setSelected(prev => prev.size === users.length ? new Set() : new Set(users.map(u => u.id)));
    const allSelected = users.length > 0 && selected.size === users.length;

    // Actions
    const handleEdit   = (user) => { setSelectedUser(user); setShowModal(true); };
    const handleView   = (user) => setDetailUser(user);

    const handleDelete = async (id) => {
        if (!window.confirm('এই ব্যবহারকারীকে মুছে ফেলতে চান?')) return;
        try {
            await userService.deleteUser(id);
            fetchUsers(); fetchStats();
            showToast('User deleted successfully');
        } catch (e) { showToast('Delete failed', 'error'); }
    };

    const handleStatusToggle = async (user) => {
        try {
            user.active ? await userService.deactivateUser(user.id) : await userService.activateUser(user.id);
            fetchUsers(); fetchStats();
            showToast(user.active ? 'User deactivated' : 'User activated', 'success');
            if (detailUser?.id === user.id) setDetailUser(prev => ({ ...prev, active: !prev.active }));
        } catch (e) { showToast('Status change failed', 'error'); }
    };

    const handleResetPassword = async (user) => {
        if (!window.confirm(`Reset password for ${user.name}?\nNew password will be: Default@123`)) return;
        try {
            await userService.resetPassword(user.id);
            showToast(`Password reset for ${user.name}. New password: Default@123`, 'warning');
        } catch (e) { showToast('Reset failed', 'error'); }
    };

    const handleImpersonate = async (user) => {
        if (!window.confirm(`Login as ${user.name}?`)) return;
        try {
            const res = await userService.impersonateUser(user.id);
            if (res.success) {
                localStorage.setItem('adminToken', localStorage.getItem('token'));
                localStorage.setItem('adminUser',  localStorage.getItem('user'));
                localStorage.setItem('token', res.data);
                if (res.user) localStorage.setItem('user', JSON.stringify(res.user));
                window.location.href = '/dashboard';
            }
        } catch (e) { showToast('Impersonation failed', 'error'); }
    };

    // Bulk actions
    const handleBulkAction = async (action) => {
        if (selected.size === 0) return showToast('কোনো user select করুন', 'info');
        const ids = [...selected];
        const confirm_msg = action === 'delete' ? `${ids.length} user মুছে ফেলতে চান?` : `${ids.length} user ${action === 'activate' ? 'activate' : 'deactivate'} করতে চান?`;
        if (!window.confirm(confirm_msg)) return;
        setBulkLoading(true);
        try {
            if (action === 'activate')   await userService.bulkActivate(ids);
            if (action === 'deactivate') await userService.bulkDeactivate(ids);
            if (action === 'delete')     await userService.bulkDelete(ids);
            setSelected(new Set());
            fetchUsers(); fetchStats();
            showToast(`${ids.length} users ${action}d successfully`);
        } catch (e) { showToast('Bulk action failed', 'error'); } finally { setBulkLoading(false); }
    };

    const handleExport = async () => {
        setExportLoading(true);
        try {
            await userService.exportCsv(currentFilter.role, currentFilter.active);
            showToast('CSV exported successfully', 'success');
        } catch (e) { showToast('Export failed', 'error'); } finally { setExportLoading(false); }
    };

    if (location.pathname.includes('/users/roles')) return <RoleManagement />;

    const isPending = location.pathname.includes('/users/pending');

    return (
        <div className="space-y-5 pb-8">
            {/* ── Toast ── */}
            {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Header ── */}
            <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">{pageTitle}</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{pageSubtitle}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => navigate('/users/analytics')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all shadow-sm">
                        <BarChart2 size={15} /> Analytics
                    </button>
                    <button onClick={handleExport} disabled={exportLoading}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-all shadow-sm">
                        {exportLoading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export CSV
                    </button>
                    <button onClick={() => setShowImport(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-semibold transition-all shadow-sm">
                        <Upload size={15} /> Import
                    </button>
                    <button onClick={() => { setSelectedUser(null); setShowModal(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md shadow-indigo-200">
                        <Plus size={16} /> নতুন User
                    </button>
                </div>
            </div>

            {/* ── Stats Cards ── */}
            {!isPending && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    <StatCard icon={<Users size={20} className="text-indigo-600" />}     label="মোট Users"    value={stats?.total}    color="bg-indigo-50"  sub={stats?.newLast30Days ? `+${stats.newLast30Days} this month` : null} />
                    <StatCard icon={<UserCheck size={20} className="text-emerald-600" />} label="Active"       value={stats?.active}   color="bg-emerald-50" />
                    <StatCard icon={<UserX size={20} className="text-amber-600" />}       label="Inactive"     value={stats?.inactive} color="bg-amber-50"   />
                    <StatCard icon={<Lock size={20} className="text-rose-600" />}          label="Locked"       value={stats?.locked}   color="bg-rose-50"    />
                </div>
            )}

            {/* Role breakdown cards */}
            {!isPending && stats && (
                <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={<GraduationCap size={18} className="text-sky-600" />}    label="শিক্ষার্থী" value={stats.students} color="bg-sky-50"    />
                    <StatCard icon={<BookOpen size={18} className="text-violet-600" />}       label="শিক্ষক"    value={stats.teachers} color="bg-violet-50" />
                    <StatCard icon={<Shield size={18} className="text-orange-600" />}          label="Admins"     value={stats.admins}   color="bg-orange-50" />
                </div>
            )}

            {/* ── Pending Tabs ── */}
            {isPending && (
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                    {['unverified', 'verified'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                            {tab === 'unverified' ? '⏳ Pending' : '✅ Verified'}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Bulk action bar ── */}
            {selected.size > 0 && (
                <div className="bg-indigo-600 text-white rounded-xl px-5 py-3 flex items-center gap-4 shadow-lg shadow-indigo-200">
                    <span className="font-bold text-sm">{selected.size} user selected</span>
                    <div className="flex gap-2 ml-auto flex-wrap">
                        <button onClick={() => handleBulkAction('activate')} disabled={bulkLoading}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                            <Unlock size={12} /> Activate All
                        </button>
                        <button onClick={() => handleBulkAction('deactivate')} disabled={bulkLoading}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                            <Lock size={12} /> Deactivate All
                        </button>
                        <button onClick={() => handleBulkAction('delete')} disabled={bulkLoading}
                            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                            <Trash2 size={12} /> Delete All
                        </button>
                        <button onClick={() => setSelected(new Set())}
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* ── Search & Filter bar ── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[260px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input type="text" placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
                        value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300" />
                </div>
                <button onClick={fetchUsers}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                    <RefreshCw size={15} />
                </button>
            </div>

            {/* ── Table & Mobile Cards ── */}
            <div className="bg-white md:rounded-2xl border-y md:border border-slate-200 overflow-hidden shadow-sm -mx-4 md:mx-0">
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 w-10">
                                <button onClick={toggleAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                    {allSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                                </button>
                            </th>
                            <th className="p-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">ব্যবহারকারী</th>
                            <th className="p-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Role</th>
                            <th className="p-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Institute</th>
                            <th className="p-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</th>
                            <th className="p-4 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">যোগদান</th>
                            <th className="p-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i}>
                                    {[...Array(7)].map((_, j) => (
                                        <td key={j} className="p-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                                    ))}
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-16 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <Users size={40} className="opacity-30" />
                                        <p className="font-medium">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
                                    </div>
                                </td>
                            </tr>
                        ) : users.map(user => {
                            const isChecked = selected.has(user.id);
                            const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }) : '—';
                            return (
                                <tr key={user.id}
                                    className={`group transition-colors hover:bg-slate-50/80 cursor-pointer ${isChecked ? 'bg-indigo-50/40' : ''}`}>
                                    <td className="p-4" onClick={e => { e.stopPropagation(); toggleSelect(user.id); }}>
                                        {isChecked
                                            ? <CheckSquare size={16} className="text-indigo-600" />
                                            : <Square size={16} className="text-slate-300 group-hover:text-slate-400" />}
                                    </td>
                                    <td className="p-4" onClick={() => handleView(user)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                                                {(user.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(user.roles || []).map(r => <RoleBadge key={r} role={r} />)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.instituteName
                                            ? <div className="flex items-center gap-1.5 text-sm text-slate-600"><Building size={13} className="text-slate-300" />{user.instituteName}</div>
                                            : <span className="text-xs text-slate-300 italic">Global</span>}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${user.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                                                {user.active ? 'Active' : 'Inactive'}
                                            </span>
                                            {user.accountLocked && <span className="text-rose-500 text-xs" title="Locked"><Lock size={12} /></span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-slate-400">{joinDate}</td>
                                    <td className="p-4" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => navigate(`/users/profile/${user.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="View Profile"><Eye size={14} /></button>
                                            <button onClick={() => handleImpersonate(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all" title="Login as"><LogIn size={14} /></button>
                                            <button onClick={() => handleStatusToggle(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all" title={user.active ? 'Deactivate' : 'Activate'}>
                                                {user.active ? <Lock size={14} /> : <Unlock size={14} />}
                                            </button>
                                            <button onClick={() => handleResetPassword(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all" title="Reset Password"><Key size={14} /></button>
                                            <button onClick={() => handleEdit(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Delete"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>

                {/* ── Mobile Card View (Visible only on < md) ── */}
                <div className="md:hidden flex flex-col divide-y divide-slate-100">
                    {/* Select All Bar Mobile */}
                    {users.length > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 text-sm border-b border-slate-100">
                            <button onClick={toggleAll} className="flex items-center gap-2 font-bold text-slate-600 transition-colors">
                                {allSelected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-400" />}
                                {allSelected ? 'Unselect All' : 'Select All'}
                            </button>
                        </div>
                    )}

                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="p-4 flex gap-3 animate-pulse">
                                <div className="w-4 h-4 bg-slate-200 rounded shrink-0"></div>
                                <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                    <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                                </div>
                            </div>
                        ))
                    ) : users.length === 0 ? (
                        <div className="py-12 flex flex-col items-center gap-3 text-slate-400 text-center px-4">
                            <Users size={32} className="opacity-30" />
                            <p className="font-medium text-sm">কোনো ব্যবহারকারী পাওয়া যায়নি</p>
                        </div>
                    ) : users.map(user => {
                        const isChecked = selected.has(user.id);
                        return (
                            <div key={user.id} 
                                onClick={() => handleView(user)}
                                className={`relative flex flex-col gap-3 p-4 transition-colors cursor-pointer active:bg-slate-50 ${isChecked ? 'bg-indigo-50/40' : 'bg-white'}`}>
                                
                                <div className="flex items-start gap-3">
                                    <button onClick={e => { e.stopPropagation(); toggleSelect(user.id); }} className="mt-1 shrink-0">
                                        {isChecked ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-slate-300" />}
                                    </button>
                                    
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                                        {(user.name || '?').charAt(0).toUpperCase()}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 pr-8">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{user.name}</h4>
                                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {(user.roles || []).map(r => <RoleBadge key={r} role={r} />)}
                                        </div>
                                    </div>
                                    
                                    <button onClick={e => { e.stopPropagation(); handleView(user); }} 
                                        className="absolute top-4 right-4 text-slate-400 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                
                                <div className="ml-7 pl-6 mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-50 pt-3">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                                        <span className={`text-[10px] font-bold ${user.active ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {user.active ? 'Active' : 'Inactive'}
                                        </span>
                                        {user.accountLocked && <Lock size={10} className="text-rose-500 ml-0.5" />}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium shrink-0">
                                        <Building size={10} />
                                        {user.instituteName ? <span className="truncate max-w-[100px]">{user.instituteName}</span> : <i>Global</i>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Pagination ── */}
                <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                        Page <span className="font-bold text-slate-600">{page + 1}</span> of <span className="font-bold text-slate-600">{totalPages || 1}</span>
                        {selected.size > 0 && <span className="ml-3 text-indigo-600 font-bold">{selected.size} selected</span>}
                    </p>
                    <div className="flex gap-1">
                        <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40 hover:bg-slate-50 hover:text-indigo-600 transition-all">
                            <ChevronLeft size={15} />
                        </button>
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                            <button key={i} onClick={() => setPage(i)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${page === i ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                {i + 1}
                            </button>
                        ))}
                        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40 hover:bg-slate-50 hover:text-indigo-600 transition-all">
                            <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            {showImport && (
                <UserImportModal onClose={() => setShowImport(false)}
                    onSuccess={() => { fetchUsers(); fetchStats(); }} />
            )}

            {showModal && (
                <UserForm user={selectedUser} onClose={() => { setShowModal(false); setSelectedUser(null); }}
                    onSuccess={() => { setShowModal(false); setSelectedUser(null); fetchUsers(); fetchStats(); showToast(selectedUser ? 'User updated!' : 'User created!'); }} />
            )}

            {detailUser && (
                <UserDetailPanel
                    user={detailUser}
                    onClose={() => setDetailUser(null)}
                    onEdit={(u) => { setDetailUser(null); handleEdit(u); }}
                    onStatusToggle={(u) => { handleStatusToggle(u); }}
                    onResetPassword={(u) => { handleResetPassword(u); setDetailUser(null); }}
                    onImpersonate={(u) => { handleImpersonate(u); }}
                />
            )}
        </div>
    );
};

export default UserList;
