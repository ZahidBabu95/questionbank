import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, Shield, Building2, Mail, Phone, CheckCircle, XCircle } from 'lucide-react';
import userService from '../../../services/userService';
import { useNavigate } from 'react-router-dom';

const InstituteAdminList = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchAdmins();
    }, [search]);

    const fetchAdmins = async () => {
        setLoading(true);
        try {
            // Reusing existing user search with ROLE filter
            const params = {
                role: 'INSTITUTE_ADMIN',
                query: search || null,
                page: 0,
                size: 20
            };
            const data = await userService.getAllUsers(params);
            setAdmins(data.content || []);
        } catch (error) {
            console.error("Failed to fetch admins", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Institute Admins</h1>
                    <p className="text-slate-500">List of all administrators managing institutes.</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search admins by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Admin</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Institute</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Contact</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center p-8 text-slate-500">Loading...</td></tr>
                        ) : !admins || admins.length === 0 ? (
                            <tr><td colSpan="5" className="text-center p-8 text-slate-500">No institute admins found.</td></tr>
                        ) : (
                            admins.map(admin => (
                                <tr key={admin.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <Shield size={20} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800">{admin.name}</div>
                                                <div className="text-xs text-slate-500">{admin.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {admin.institute ? (
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <Building2 size={16} className="text-slate-400" />
                                                <span
                                                    className="hover:text-blue-600 hover:underline cursor-pointer"
                                                    onClick={() => navigate(`/institutes/${admin.institute.id}`)}
                                                >
                                                    {admin.institute.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">No Institute</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                                            <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {admin.email}</div>
                                            {admin.phone && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {admin.phone}</div>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {admin.active ?
                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><CheckCircle size={12} /> Active</span> :
                                            <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit"><XCircle size={12} /> Inactive</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-blue-600">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InstituteAdminList;
