import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Building2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import instituteService from '../../../services/instituteService';
import { useNavigate } from 'react-router-dom';

const InstituteList = () => {
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchInstitutes();
    }, [search, statusFilter]);

    const fetchInstitutes = async () => {
        setLoading(true);
        try {
            const params = {
                search: search || null,
                status: statusFilter || null,
                page: 0,
                size: 10
            };
            const data = await instituteService.getAllInstitutes(params);
            setInstitutes(data.content);
        } catch (error) {
            console.error("Failed to fetch institutes", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle size={12} /> Active</span>;
            case 'INACTIVE': return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium flex items-center gap-1"><XCircle size={12} /> Inactive</span>;
            case 'SUSPENDED': return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium flex items-center gap-1"><AlertTriangle size={12} /> Suspended</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Institute Management</h1>
                    <p className="text-slate-500">Manage all registered institutes and tenants.</p>
                </div>
                <button
                    onClick={() => navigate('/institutes/add')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} /> Add Institute
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search institutes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg outline-none"
                >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                </select>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Institute</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Code</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Plan</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="6" className="text-center p-8 text-slate-500">Loading...</td></tr>
                        ) : institutes.length === 0 ? (
                            <tr><td colSpan="6" className="text-center p-8 text-slate-500">No institutes found.</td></tr>
                        ) : (
                            institutes.map(institute => (
                                <tr key={institute.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-800">{institute.name}</div>
                                                <div className="text-xs text-slate-500">{institute.city}, {institute.country}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{institute.code}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{institute.type}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold uppercase">{institute.planType}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(institute.status)}
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

export default InstituteList;
