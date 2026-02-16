import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle, AlertTriangle, ArrowUpCircle } from 'lucide-react';
import instituteService from '../../../services/instituteService';
import { useNavigate } from 'react-router-dom';

const SubscriptionManagement = () => {
    const [institutes, setInstitutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInstitute, setSelectedInstitute] = useState(null); // For upgrade modal
    const navigate = useNavigate();

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            // Fetching all institutes to display their subscription status
            // Ideally, the backend would have a simplified DTO for this view
            const data = await instituteService.getAllInstitutes({ size: 100 });
            setInstitutes(data.content);
        } catch (error) {
            console.error("Failed to fetch subscriptions", error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Stats
    const totalSubscribers = institutes.filter(i => i.planType !== 'FREE').length;
    const expiringSoon = institutes.filter(i => {
        if (!i.planEndDate) return false;
        const daysLeft = (new Date(i.planEndDate) - new Date()) / (1000 * 60 * 60 * 24);
        return daysLeft > 0 && daysLeft <= 7;
    }).length;

    // Estimate Revenue (Mock logic)
    const calculateRevenue = () => {
        let revenue = 0;
        institutes.forEach(i => {
            if (i.planType === 'BASIC') revenue += 29;
            if (i.planType === 'PREMIUM') revenue += 99;
            if (i.planType === 'ENTERPRISE') revenue += 299;
        });
        return revenue;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Subscription Management</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><CreditCard size={20} /></div>
                        <h3 className="font-semibold text-slate-700">Total Subscribers</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{totalSubscribers}</p>
                    <p className="text-sm text-slate-500">Paid Plans Active</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><ArrowUpCircle size={20} /></div>
                        <h3 className="font-semibold text-slate-700">Monthly Revenue (Est.)</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">${calculateRevenue()}</p>
                    <p className="text-sm text-slate-500">Based on current plans</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><AlertTriangle size={20} /></div>
                        <h3 className="font-semibold text-slate-700">Expiring Soon</h3>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{expiringSoon}</p>
                    <p className="text-sm text-slate-500">Within next 7 days</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Institute</th>
                            <th className="px-6 py-4">Current Plan</th>
                            <th className="px-6 py-4">Cycle</th>
                            <th className="px-6 py-4">Start Date</th>
                            <th className="px-6 py-4">Expiry Date</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="7" className="text-center p-8 text-slate-500">Loading subscriptions...</td></tr>
                        ) : institutes.length === 0 ? (
                            <tr><td colSpan="7" className="text-center p-8 text-slate-500">No data found.</td></tr>
                        ) : (
                            institutes.map(inst => (
                                <tr key={inst.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{inst.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inst.planType === 'FREE' ? 'bg-slate-100 text-slate-600' :
                                                inst.planType === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {inst.planType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 lowercase text-slate-600">{inst.billingCycle}</td>
                                    <td className="px-6 py-4 text-slate-600">{inst.planStartDate ? new Date(inst.planStartDate).toLocaleDateString() : '-'}</td>
                                    <td className="px-6 py-4">
                                        {inst.planEndDate ? (
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className={new Date(inst.planEndDate) < new Date() ? 'text-rose-600 font-medium' : 'text-slate-600'}>
                                                    {new Date(inst.planEndDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {inst.status === 'ACTIVE' ?
                                            <span className="text-emerald-600 flex items-center gap-1 text-xs font-medium"><CheckCircle size={12} /> Active</span> :
                                            <span className="text-slate-500 flex items-center gap-1 text-xs font-medium"><AlertTriangle size={12} /> {inst.status}</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => navigate(`/institutes/edit/${inst.id}`)}
                                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                        >
                                            Manage Plan
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

export default SubscriptionManagement;
