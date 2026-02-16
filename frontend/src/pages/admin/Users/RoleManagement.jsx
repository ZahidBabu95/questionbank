import React, { useState, useEffect } from 'react';
import { Shield, Lock, Check, X, Plus, Edit2, Trash2, Save } from 'lucide-react';
import userService from '../../../services/userService';

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    // Form State
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rolesRes, permsRes] = await Promise.all([
                userService.getRoles(),
                userService.getPermissions()
            ]);

            if (rolesRes.success) setRoles(rolesRes.data);
            if (permsRes.success) setPermissions(permsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddClick = () => {
        setEditingRole(null);
        setRoleName('');
        setRoleDescription('');
        setSelectedPermissions([]);
        setShowModal(true);
    };

    const handleEditClick = (role) => {
        setEditingRole(role);
        setRoleName(role.name);
        setRoleDescription(role.description || '');
        setSelectedPermissions(role.permissions ? role.permissions.map(p => p.id) : []);
        setShowModal(true);
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this role?')) {
            try {
                await userService.deleteRole(id);
                fetchData();
            } catch (error) {
                console.error('Error deleting role:', error);
                alert('Failed to delete role');
            }
        }
    };

    const handlePermissionToggle = (permId) => {
        setSelectedPermissions(prev => {
            if (prev.includes(permId)) {
                return prev.filter(id => id !== permId);
            } else {
                return [...prev, permId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const roleData = {
                name: roleName,
                description: roleDescription,
                permissions: selectedPermissions.map(id => ({ id }))
            };

            if (editingRole) {
                await userService.updateRole(editingRole.id, roleData);
            } else {
                await userService.createRole(roleData);
            }
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving role:', error);
            alert('Failed to save role');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Roles & Permissions</h1>
                    <p className="text-slate-500 mt-1">Manage system roles and their associated permissions</p>
                </div>
                <button
                    onClick={handleAddClick}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
                >
                    <Plus size={20} />
                    <span>Add Role</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role) => (
                    <div key={role.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100/50 text-blue-600 rounded-lg">
                                        <Shield size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">{role.name}</h3>
                                </div>
                                <p className="text-sm text-slate-500">{role.description || 'No description provided.'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditClick(role)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteClick(role.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 flex-1">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Lock size={12} />
                                Permissions ({role.permissions ? role.permissions.length : 0})
                            </h4>

                            <div className="space-y-3">
                                {role.permissions && role.permissions.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {role.permissions.map((perm) => (
                                            <span key={perm.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200" title={perm.description}>
                                                <Check size={10} className="text-emerald-500" />
                                                {perm.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 italic flex items-center gap-2">
                                        <X size={14} />
                                        No specific permissions assigned.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingRole ? 'Edit Role' : 'Create New Role'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Role Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={roleName}
                                        onChange={(e) => setRoleName(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. EDITOR"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        value={roleDescription}
                                        onChange={(e) => setRoleDescription(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        rows="2"
                                        placeholder="Describe what this role can do..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Permissions</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                                        {permissions.map((perm) => (
                                            <label key={perm.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedPermissions.includes(perm.id)
                                                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                                                    : 'bg-white border-slate-200 hover:border-blue-300'
                                                }`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.includes(perm.id)}
                                                    onChange={() => handlePermissionToggle(perm.id)}
                                                    className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-800">{perm.name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{perm.description}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/20 transition-all font-medium flex items-center gap-2"
                            >
                                <Save size={18} />
                                {editingRole ? 'Update Role' : 'Create Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleManagement;
