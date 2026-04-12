import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Eye, EyeOff, Save, Key, Shield, AlertTriangle } from 'lucide-react';
import axios from '../../../utils/axios';

const MyProfile = () => {
    const [user, setUser] = useState({ name: '', email: '', phone: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { text: '', type: '' }

    // Password State
    const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [showPwd, setShowPwd] = useState({ old: false, new: false, confirm: false });
    const [pwdSaving, setPwdSaving] = useState(false);
    const [pwdMessage, setPwdMessage] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                // Fetch basic info from local storage or better yet, from an endpoint.
                // We mock it first from localStorage, then trigger a refresh if we had a dedicated /v1/users/me endpoint.
                // Since we only have /v1/users/{id}, we can get id from localStorage token/user.
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                if (storedUser.id) {
                    const res = await axios.get(`/v1/users/${storedUser.id}`);
                    if (res.data.success) {
                        setUser(res.data.data);
                    }
                }
            } catch (err) {
                console.error(err);
                setMessage({ text: 'Failed to load profile', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const showMsg = (text, type, isPwd = false) => {
        if (isPwd) {
            setPwdMessage({ text, type });
            setTimeout(() => setPwdMessage(null), 5000);
        } else {
            setMessage({ text, type });
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axios.patch('/v1/users/profile', {
                name: user.name,
                phone: user.phone || ''
            });
            if (res.data.success) {
                showMsg('Profile updated successfully!', 'success');
                // Update local storage
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...storedUser, name: user.name, phone: user.phone }));
                window.dispatchEvent(new Event('storage')); // trigger update on layout
            }
        } catch (err) {
            showMsg(err.response?.data?.message || 'Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
            return showMsg('New passwords do not match!', 'error', true);
        }
        if (pwdForm.newPassword.length < 6) {
            return showMsg('Password must be at least 6 characters!', 'error', true);
        }

        setPwdSaving(true);
        try {
            const res = await axios.patch('/v1/users/profile/password', {
                oldPassword: pwdForm.oldPassword,
                newPassword: pwdForm.newPassword
            });
            if (res.data.success) {
                showMsg('Password changed successfully!', 'success', true);
                setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                // If it's a good practice, sometimes logout the user, but we'll let them stay for now.
            }
        } catch (err) {
            showMsg(err.response?.data?.message || 'Failed to change password. Ensure old password is correct.', 'error', true);
        } finally {
            setPwdSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse font-medium">Loading Profile...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">My Profile</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your personal information and security settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Profile Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <span className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><User size={18} /></span>
                            <h2 className="font-bold text-slate-800">Personal Information</h2>
                        </div>
                        
                        <form onSubmit={handleProfileSubmit} className="p-6">
                            
                            {message && !pwdMessage && (
                                <div className={`p-4 mb-6 rounded-xl text-sm font-bold flex items-center gap-2 ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {message.type === 'error' ? <AlertTriangle size={16}/> : <Shield size={16}/>}
                                    {message.text}
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Mail size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            disabled
                                            value={user.email || ''}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 ml-1">Email address cannot be changed</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Default Role</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={(user.roles && user.roles.length > 0) ? user.roles[0] : 'User'}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Institute</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={user.instituteName || 'Global Access'}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 my-6"></div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <User size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={user.name || ''}
                                            onChange={(e) => setUser({ ...user, name: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <Phone size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            value={user.phone || ''}
                                            onChange={(e) => setUser({ ...user, phone: e.target.value })}
                                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                                            placeholder="e.g. +880 1XXX XXXXXX"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-600/20 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                                >
                                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                                    {saving ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Change Password Form */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <span className="p-2 bg-rose-100 text-rose-600 rounded-lg"><Key size={18} /></span>
                            <h2 className="font-bold text-slate-800">Change Password</h2>
                        </div>
                        
                        <form onSubmit={handlePasswordSubmit} className="p-6">
                            
                            {pwdMessage && (
                                <div className={`p-4 mb-6 rounded-xl text-sm font-bold flex items-center gap-2 ${pwdMessage.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {pwdMessage.type === 'error' ? <AlertTriangle size={16}/> : <Shield size={16}/>}
                                    {pwdMessage.text}
                                </div>
                            )}

                            <div className="space-y-5">
                                {/* Old Password */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPwd.old ? 'text' : 'password'}
                                            required
                                            value={pwdForm.oldPassword}
                                            onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                                            className="w-full pl-11 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                                            placeholder="••••••••"
                                        />
                                        <button type="button" onClick={() => setShowPwd(p => ({ ...p, old: !p.old }))} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
                                            {showPwd.old ? <EyeOff size={18}/> : <Eye size={18}/>}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="h-px bg-slate-100 my-4"></div>

                                {/* New Password */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                                <Key size={18} />
                                            </div>
                                            <input
                                                type={showPwd.new ? 'text' : 'password'}
                                                required
                                                minLength={6}
                                                value={pwdForm.newPassword}
                                                onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                                                className="w-full pl-11 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setShowPwd(p => ({ ...p, new: !p.new }))} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
                                                {showPwd.new ? <EyeOff size={18}/> : <Eye size={18}/>}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                                <Shield size={18} />
                                            </div>
                                            <input
                                                type={showPwd.confirm ? 'text' : 'password'}
                                                required
                                                minLength={6}
                                                value={pwdForm.confirmPassword}
                                                onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                                                className={`w-full pl-11 pr-12 py-3 bg-white border rounded-xl focus:ring-2 outline-none transition-all font-medium text-slate-800 ${pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'}`}
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setShowPwd(p => ({ ...p, confirm: !p.confirm }))} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600">
                                                {showPwd.confirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={pwdSaving || !pwdForm.oldPassword || !pwdForm.newPassword || pwdForm.newPassword !== pwdForm.confirmPassword}
                                    className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-rose-600/20 disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                                >
                                    {pwdSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Lock size={18} />}
                                    {pwdSaving ? 'Updating...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right sidebar info */}
                <div className="space-y-6">
                    <div className="bg-slate-800 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-[40px]"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-2xl font-black shadow-lg mb-5 border-2 border-white/20">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <h3 className="text-xl font-bold mb-1">{user.name}</h3>
                            <p className="text-slate-400 text-sm">{user.email}</p>

                            <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Account Status</p>
                                    <p className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Active
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Member Since</p>
                                    <p className="text-slate-300 font-medium mt-1">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Unknown'}
                                    </p>
                                </div>
                                
                                <div className="pt-4 border-t border-white/10">
                                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Contribution Rank</p>
                                    <div className="flex bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 rounded-xl p-3 items-center gap-4">
                                        <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center font-black shadow-inner border border-amber-500/30">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                        </div>
                                        <div>
                                            <span className="block text-2xl font-black text-white drop-shadow-md">{user.contributionPoints || 0} <span className="text-sm text-amber-400 uppercase">XP</span></span>
                                            <span className="block text-[10px] text-slate-400 font-medium">Earned by contributing</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MyProfile;
