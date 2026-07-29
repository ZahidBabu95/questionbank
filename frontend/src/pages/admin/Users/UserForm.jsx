import React, { useState, useEffect } from 'react';
import userService from '../../../services/userService';
import instituteService from '../../../services/instituteService';
import { User, Mail, Phone, Lock, Shield, Building, X, Save, AlertCircle, Eye, EyeOff, Copy, Check, Zap } from 'lucide-react';

const UserForm = ({ user, onClose, onSuccess }) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser.roles?.includes('SUPER_ADMIN');
    const isEdit = !!user;
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        roles: user?.roles || ['STUDENT'],
        password: '', // Only for create
        instituteId: user?.instituteId || currentUser?.instituteId || ''
    });
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [institutes, setInstitutes] = useState([]);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyCredentials = () => {
        const passText = isEdit ? '(Unchanged / Ask User)' : formData.password;
        const text = `*Login Credentials*\nEmail: ${formData.email}\nPassword: ${passText}\nRole: ${formData.roles[0]}\nLogin at: ${window.location.origin}/login`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const generateRandomPassword = () => {
        const length = 10;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        setFormData(prev => ({ ...prev, password }));
        setShowPassword(true);
    };

    useEffect(() => {
        const loadInstitutes = async () => {
            try {
                const res = await instituteService.getAllInstitutes({ size: 1000 });
                // Handle different backend response structures
                if (res?.content) {
                    setInstitutes(res.content);
                } else if (res?.success && res?.data?.content) {
                    setInstitutes(res.data.content);
                }
            } catch (err) {
                console.error("Failed to load institutes for form", err);
            }
        };

        const loadRoles = async () => {
            try {
                const res = await userService.getRoles();
                if (res?.success && res?.data) {
                    setRoles(res.data);
                } else if (Array.isArray(res)) {
                    setRoles(res);
                } else if (res?.data) {
                    setRoles(res.data);
                }
            } catch (err) {
                console.error("Failed to load roles for form", err);
            }
        };

        loadInstitutes();
        loadRoles();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = { ...formData };
        if (!payload.instituteId) {
            delete payload.instituteId;
        }

        try {
            if (isEdit) {
                await userService.updateUser(user.id, payload);
            } else {
                await userService.createUser(payload);
            }
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save user. Please check the details and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white backdrop-blur-md">
                            {isEdit ? <User size={20} /> : <User className="rotate-12" size={20} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{isEdit ? 'Edit User Profile' : 'Add New User'}</h2>
                            <p className="text-indigo-100 text-xs mt-0.5">{isEdit ? `Modifying access for ${user?.name}` : 'Create a new user account with specific permissions'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-3">
                            <AlertCircle className="shrink-0 mt-0.5" size={18} />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-5">
                            {/* Full Name */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5">
                                    <User size={15} className="text-indigo-500" /> Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. John Doe"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5">
                                    <Mail size={15} className="text-indigo-500" /> Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. john@example.com"
                                    autoComplete="off"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5">
                                    <Phone size={15} className="text-indigo-500" /> Phone <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="+8801..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-5">
                            {/* Role */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5">
                                    <Shield size={15} className="text-indigo-500" /> Select Role
                                </label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none"
                                    value={formData.roles[0] || 'STUDENT'}
                                    onChange={e => setFormData({ ...formData, roles: [e.target.value] })}
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
                                >
                                    {roles.length > 0 ? (
                                        roles.filter(r => isSuperAdmin || r.name === 'REVIEWER' || r.name === 'TEACHER' || r.name === 'STUDENT').map(role => (
                                            <option key={role.id || role.name} value={role.name}>
                                                {role.description || role.name.replace(/_/g, ' ')}
                                            </option>
                                        ))
                                    ) : (
                                        <>
                                            {isSuperAdmin && (
                                                <>
                                                    <option value="SUPER_ADMIN">Super Admin</option>
                                                    <option value="INSTITUTE_ADMIN">Institute Admin</option>
                                                </>
                                            )}
                                            <option value="REVIEWER">Subject Reviewer</option>
                                            <option value="TEACHER">Teacher</option>
                                            <option value="STUDENT">Student</option>
                                        </>
                                    )}

                                </select>
                            </div>

                            {/* Institute */}
                            {isSuperAdmin && (
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5">
                                        <Building size={15} className="text-indigo-500" /> Assign Institute
                                        <span className="text-slate-400 font-normal text-xs ml-auto">(Optional)</span>
                                    </label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none appearance-none"
                                        value={formData.instituteId || ''}
                                        onChange={e => setFormData({ ...formData, instituteId: e.target.value })}
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
                                    >
                                        <option value="">
                                            {formData.roles[0] === 'SUPER_ADMIN' ? 'Global / System Level' : 'Personal Workspace (Auto Create)'}
                                        </option>
                                        {institutes.map(inst => (
                                            <option key={inst.id} value={inst.id}>
                                                {inst.name} {inst.code ? `(${inst.code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Password */}
                            {!isEdit && (
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1.5 w-full justify-between">
                                        <span className="flex items-center gap-2">
                                            <Lock size={15} className="text-indigo-500" /> Temporary Password
                                        </span>
                                        <button
                                            type="button"
                                            onClick={generateRandomPassword}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-all"
                                        >
                                            <Zap size={12} /> Auto Generate
                                        </button>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            placeholder="Min 6 characters"
                                            autoComplete="new-password"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleCopyCredentials}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copied to Clipboard' : 'Copy Credentials'}
                        </button>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                ) : (
                                    <Save size={16} />
                                )}
                                {isEdit ? 'Update Profile' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;

