import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, MoreVertical, Shield, Building, Mail, Phone, Lock, Unlock, RefreshCw, LogIn } from 'lucide-react';
import userService from '../../../services/userService';
import UserForm from './UserForm';
import RoleManagement from './RoleManagement';
import { useNavigate, useLocation } from 'react-router-dom';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Tab state for Pending Users page
    const [activeTab, setActiveTab] = useState('unverified');

    // Helper to derive state from location & tab
    const getRouteState = (pathname, tab) => {
        let filter = { role: '', active: null };
        let title = 'Users';
        let subtitle = 'Manage platform access';

        if (pathname.includes('/users/teachers')) {
            filter = { role: 'TEACHER' };
            title = 'Teachers';
            subtitle = 'Manage registered teachers';
        } else if (pathname.includes('/users/students')) {
            filter = { role: 'STUDENT' };
            title = 'Students';
            subtitle = 'Manage registered students';
        } else if (pathname.includes('/users/pending')) {
            // Tab logic for Pending page
            if (tab === 'verified') {
                filter = { active: true };
                subtitle = 'Verified users';
            } else {
                filter = { active: false };
                subtitle = 'Users waiting for verification';
            }
            title = 'Pending Approvals';
        } else if (pathname.includes('/users/blocked')) {
            // blocked users are active=false AND accountLocked=true?
            // Or just accountLocked=true. 
            // For now let's assume blocked means accountLocked=true.
            // If active=false is also needed, add it.
            filter = { accountLocked: true };
            title = 'Blocked Users';
            subtitle = 'Manage blocked or locked accounts';
        } else if (pathname.includes('/users/roles')) {
            title = 'Roles & Permissions';
            subtitle = 'Manage system roles';
        }
        return { filter, title, subtitle };
    };

    const initialState = getRouteState(location.pathname, 'unverified');

    // Pagination state
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const pageSize = 10;

    // Derived state from location
    const [currentFilter, setCurrentFilter] = useState(initialState.filter);
    const [pageTitle, setPageTitle] = useState(initialState.title);
    const [pageSubtitle, setPageSubtitle] = useState(initialState.subtitle);

    useEffect(() => {
        // Reset tab to unverified when route changes (optional, but good for UX)
        if (!location.pathname.includes('/users/pending')) {
            setActiveTab('unverified');
        }
    }, [location.pathname]);

    useEffect(() => {
        const { filter, title, subtitle } = getRouteState(location.pathname, activeTab);
        setCurrentFilter(filter);
        setPageTitle(title);
        setPageSubtitle(subtitle);
        setPage(0); // Reset to first page on route change
    }, [location.pathname, activeTab]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                size: pageSize,
                query: searchTerm,
                ...currentFilter // Spread current filters into params
            };

            // Clean up null/undefined params
            if (!params.role) delete params.role;
            if (params.active === null) delete params.active;

            const response = await userService.getAllUsers(params);
            if (response.success && response.data) {
                setUsers(response.data.content);
                setTotalPages(response.data.totalPages);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [searchTerm, page, currentFilter]); // Re-fetch when filter changes

    const handleEdit = (user) => {
        setSelectedUser(user);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await userService.deleteUser(id);
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    const handleStatusToggle = async (user) => {
        // If current view is "Pending" (Unverified), action should be Verify (Activate)
        // If current view is "Verified", action should be Deactivate?
        try {
            if (user.active) {
                await userService.deactivateUser(user.id);
            } else {
                await userService.activateUser(user.id);
            }
            fetchUsers();
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const handleImpersonate = async (user) => {
        if (window.confirm(`Login as ${user.name}?`)) {
            try {
                const response = await userService.impersonateUser(user.id);
                if (response.success) {
                    const adminToken = localStorage.getItem('token');
                    localStorage.setItem('adminToken', adminToken); // Save admin session
                    localStorage.setItem('token', response.data); // Set user session

                    // Force reload to update app state/context
                    window.location.href = '/dashboard';
                }
            } catch (error) {
                console.error('Impersonation failed:', error);
                alert('Failed to login as user.');
            }
        }
    };

    const handleFormSubmit = () => {
        setShowModal(false);
        setSelectedUser(null);
        fetchUsers();
    };



    if (location.pathname.includes('/users/roles')) {
        return <RoleManagement />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
                    <p className="text-slate-500 mt-1">{pageSubtitle}</p>
                </div>
                <button
                    onClick={() => { setSelectedUser(null); setShowModal(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
                >
                    <Plus size={20} />
                    <span>Add User</span>
                </button>
            </div>

            {/* Tabs for Pending Approvals */}
            {location.pathname.includes('/users/pending') && (
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('unverified')}
                        className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'unverified'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Unverified
                    </button>
                    <button
                        onClick={() => setActiveTab('verified')}
                        className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'verified'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Verified
                    </button>
                </div>
            )}

            {/* Filters & Search */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-200">
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Institute</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500 animate-pulse">Loading users...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No users found.</td></tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800">{user.name}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.map(role => (
                                                    <span key={role} className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 border border-blue-100">
                                                        {role}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {user.instituteName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Building size={14} className="text-slate-400" />
                                                    {user.instituteName}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">Global</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${user.active
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                {user.active ? 'Active' : 'Inactive'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Impersonation Button */}
                                                <button
                                                    onClick={() => handleImpersonate(user)}
                                                    className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title={`Login as ${user.name}`}
                                                >
                                                    <LogIn size={16} />
                                                </button>

                                                <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

                                                <button
                                                    onClick={() => handleStatusToggle(user)}
                                                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title={user.active ? "Deactivate" : "Activate"}
                                                >
                                                    {user.active ? <Lock size={16} /> : <Unlock size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="p-2 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Page <span className="font-medium text-slate-700">{page + 1}</span> of <span className="font-medium text-slate-700">{totalPages || 1}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                        >
                            Previous
                        </button>
                        <button
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <UserForm
                    user={selectedUser}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleFormSubmit}
                />
            )}
        </div>
    );
};
export default UserList;
