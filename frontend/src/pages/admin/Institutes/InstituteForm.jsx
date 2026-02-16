import React, { useState, useEffect } from 'react';
import { Save, X, Upload } from 'lucide-react';
import instituteService from '../../../services/instituteService';
import { useNavigate, useParams } from 'react-router-dom';

const InstituteForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        code: '',
        type: 'SCHOOL',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'Bangladesh',
        website: '',
        establishedYear: new Date().getFullYear(),
        planType: 'FREE',
        billingCycle: 'MONTHLY',
        maxTeachers: 5,
        maxStudents: 50,
        aiLimitPerMonth: 100,
        storageLimitMb: 500
    });

    const [logo, setLogo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEdit) {
            fetchInstitute();
        }
    }, [id]);

    const fetchInstitute = async () => {
        try {
            const data = await instituteService.getInstitute(id);
            setFormData(data);
        } catch (err) {
            setError("Failed to fetch institute details.");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e) => {
        setLogo(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const data = new FormData();
        data.append('institute', new Blob([JSON.stringify(formData)], { type: 'application/json' }));
        if (logo) {
            data.append('logo', logo);
        }

        try {
            if (isEdit) {
                await instituteService.updateInstitute(id, data);
            } else {
                await instituteService.createInstitute(data);
            }
            navigate('/institutes');
        } catch (err) {
            setError("Failed to save institute. " + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'Edit Institute' : 'Add New Institute'}</h1>
                <button onClick={() => navigate('/institutes')} className="text-slate-500 hover:text-slate-700">
                    <X size={24} />
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Institute Name *</label>
                        <input name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Short Name</label>
                        <input name="shortName" value={formData.shortName} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Institute Code *</label>
                        <input name="code" value={formData.code} onChange={handleChange} required disabled={isEdit} className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg">
                            <option value="SCHOOL">School</option>
                            <option value="COLLEGE">College</option>
                            <option value="UNIVERSITY">University</option>
                            <option value="COACHING">Coaching</option>
                        </select>
                    </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                        <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                        <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                        <input name="city" value={formData.city} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                        <input name="country" value={formData.country} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                </div>

                {/* Subscription & Limits */}
                <fieldset className="border border-slate-200 p-4 rounded-lg">
                    <legend className="text-sm font-medium text-slate-600 px-2">Subscription & Limits</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Plan Type</label>
                            <select name="planType" value={formData.planType} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg">
                                <option value="FREE">Free</option>
                                <option value="BASIC">Basic</option>
                                <option value="PREMIUM">Premium</option>
                                <option value="ENTERPRISE">Enterprise</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Max Teachers</label>
                            <input type="number" name="maxTeachers" value={formData.maxTeachers} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Max Students</label>
                            <input type="number" name="maxStudents" value={formData.maxStudents} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">AI Limit (Month)</label>
                            <input type="number" name="aiLimitPerMonth" value={formData.aiLimitPerMonth} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Storage Limit (MB)</label>
                            <input type="number" name="storageLimitMb" value={formData.storageLimitMb} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                        </div>
                    </div>
                </fieldset>

                {/* Logo Upload */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Institute Logo</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 transition">
                        <input type="file" onChange={handleLogoChange} className="hidden" id="logoUpload" accept="image/*" />
                        <label htmlFor="logoUpload" className="cursor-pointer flex flex-col items-center">
                            <Upload size={32} className="mb-2" />
                            <span>{logo ? logo.name : "Click to upload logo"}</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="button" onClick={() => navigate('/institutes')} className="px-4 py-2 text-slate-600 mr-2 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {loading ? 'Saving...' : <><Save size={18} className="inline mr-2" /> Save Institute</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InstituteForm;
