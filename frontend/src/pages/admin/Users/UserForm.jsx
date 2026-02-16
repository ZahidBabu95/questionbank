import React, { useState } from 'react';
import userService from '../../../services/userService';

const UserForm = ({ user, onClose, onSuccess }) => {
    const isEdit = !!user;
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        roles: user?.roles || ['STUDENT'],
        password: '', // Only for create
        instituteId: user?.instituteId || null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEdit) {
                await userService.updateUser(user.id, formData);
            } else {
                await userService.createUser(formData);
            }
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit User' : 'Add New User'}</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone (Optional)</label>
                        <input
                            type="text"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    {!isEdit && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <select
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                            value={formData.roles[0] || 'STUDENT'}
                            onChange={e => setFormData({ ...formData, roles: [e.target.value] })}
                        >
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="INSTITUTE_ADMIN">Institute Admin</option>
                            <option value="TEACHER">Teacher</option>
                            <option value="STUDENT">Student</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20"
                        >
                            {loading ? 'Saving...' : 'Save User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default UserForm;
