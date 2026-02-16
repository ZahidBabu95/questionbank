import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import instituteService from '../../../services/instituteService';
import { Building2, Users, HardDrive, Cpu, ArrowLeft, Edit } from 'lucide-react';

const InstituteDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [institute, setInstitute] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const data = await instituteService.getInstitute(id);
            setInstitute(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!institute) return <div>Institute not found.</div>;

    const aiUsagePercent = Math.min((institute.aiUsedCurrentMonth / institute.aiLimitPerMonth) * 100, 100);
    const storageUsagePercent = Math.min((institute.storageUsedMb / institute.storageLimitMb) * 100, 100);

    return (
        <div className="space-y-6">
            <button onClick={() => navigate('/institutes')} className="text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <ArrowLeft size={18} /> Back to List
            </button>

            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-start">
                <div className="flex gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <Building2 size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{institute.name}</h1>
                        <p className="text-slate-500">{institute.code} • {institute.city}, {institute.country}</p>
                        <div className="mt-2 flex gap-2">
                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">{institute.status}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">{institute.planType}</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => navigate(`/institutes/edit/${institute.id}`)} className="text-blue-600 hover:text-blue-700 flex items-center gap-2">
                    <Edit size={18} /> Edit
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI Usage */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Cpu className="text-purple-500" size={20} />
                        <h3 className="font-semibold text-slate-700">AI Usage (Current Month)</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-2">{institute.aiUsedCurrentMonth} <span className="text-base font-normal text-slate-500">/ {institute.aiLimitPerMonth}</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${aiUsagePercent}%` }}></div>
                    </div>
                </div>

                {/* Storage Usage */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <HardDrive className="text-orange-500" size={20} />
                        <h3 className="font-semibold text-slate-700">Storage Usage</h3>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-2">{institute.storageUsedMb.toFixed(2)} MB <span className="text-base font-normal text-slate-500">/ {institute.storageLimitMb} MB</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${storageUsagePercent}%` }}></div>
                    </div>
                </div>

                {/* Users (Placeholder) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="text-blue-500" size={20} />
                        <h3 className="font-semibold text-slate-700">Users Limits</h3>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-600">Teachers</span>
                        <span className="font-bold">{institute.maxTeachers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-600">Students</span>
                        <span className="font-bold">{institute.maxStudents}</span>
                    </div>
                </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase">Email</span>
                        <span className="text-slate-700">{institute.contactEmail || "N/A"}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase">Phone</span>
                        <span className="text-slate-700">{institute.contactPhone || "N/A"}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase">Website</span>
                        <span className="text-slate-700">{institute.website || "N/A"}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold text-slate-400 uppercase">Address</span>
                        <span className="text-slate-700">{institute.address || "N/A"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstituteDetails;
