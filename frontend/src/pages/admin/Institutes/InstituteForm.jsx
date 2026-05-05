import React, { useState, useEffect } from 'react';
import { Save, X, Upload, Zap, Database, Users, ChevronDown, ChevronUp } from 'lucide-react';
import instituteService from '../../../services/instituteService';
import billingService from '../../../services/billingService';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../../utils/axios';

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
        medium: 'Bangla',
        planType: 'FREE',
        billingCycle: 'MONTHLY',
        subscriptionPackage: null,
        maxTeachers: 5,
        maxStudents: 50,
        maxQuestions: 500,
        aiLimitPerMonth: 100,
        storageLimitMb: 500
    });

    const [packages, setPackages] = useState([]);
    const [logo, setLogo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [hierarchy, setHierarchy] = useState(null);
    const [assignedSubjectIds, setAssignedSubjectIds] = useState([]);
    const [subjectConfigs, setSubjectConfigs] = useState({});
    const [expandedStreams, setExpandedStreams] = useState({});
    const [expandedClasses, setExpandedClasses] = useState({});

    const toggleStream = (stream) => setExpandedStreams(prev => ({ ...prev, [stream]: !prev[stream] }));
    const toggleClass = (classId) => setExpandedClasses(prev => ({ ...prev, [classId]: !prev[classId] }));

    useEffect(() => {
        fetchPackages();
        fetchHierarchy();
        if (isEdit) {
            fetchInstitute();
            fetchAssignedSubjects();
        }
    }, [id]);

    const fetchHierarchy = async () => {
        try {
            const res = await axios.get('/v1/academic/hierarchy');
            setHierarchy(res.data);
        } catch (err) {
            console.error("Failed to fetch hierarchy", err);
        }
    };

    const fetchAssignedSubjects = async () => {
        try {
            const res = await instituteService.getAssignedSubjects(id);
            setAssignedSubjectIds(res || []);
        } catch (err) {
            console.error("Failed to fetch assigned subjects", err);
        }
    };

    const handleSubjectToggle = (classSubjectId) => {
        setAssignedSubjectIds(prev => {
            if (prev.includes(classSubjectId)) {
                // remove
                return prev.filter(i => i !== classSubjectId);
            } else {
                // add with default config
                setSubjectConfigs(c => ({...c, [classSubjectId]: { versions: ['Bangla', 'English', 'Bilingual'] }}));
                return [...prev, classSubjectId];
            }
        });
    };

    const handleVersionToggle = (classSubjectId, version) => {
        setSubjectConfigs(prev => {
            const conf = prev[classSubjectId] || { versions: [] };
            const newVersions = conf.versions.includes(version) 
                ? conf.versions.filter(v => v !== version)
                : [...conf.versions, version];
            return { ...prev, [classSubjectId]: { ...conf, versions: newVersions } };
        });
    };

    const fetchPackages = async () => {
        try {
            const res = await billingService.getPackages();
            setPackages(Array.isArray(res) ? res : (res?.data || []));
        } catch (err) {
            console.error("Failed to fetch packages", err);
        }
    };

    const fetchInstitute = async () => {
        try {
            const data = await instituteService.getInstitute(id);
            setFormData({
                ...data,
                // Ensure default values if null inside payload
                maxQuestions: data.maxQuestions || 500
            });
        } catch (err) {
            setError("Failed to fetch institute details.");
        }
    };

    const handlePackageSelect = (e) => {
        const pkgId = e.target.value;
        if (!pkgId) {
            setFormData(prev => ({ ...prev, subscriptionPackage: null }));
            return;
        }
        
        const selectedPackage = packages.find(p => p.id === pkgId);
        if (selectedPackage) {
            setFormData(prev => ({
                ...prev,
                subscriptionPackage: { id: selectedPackage.id },
                maxTeachers: selectedPackage.maxTeachers || prev.maxTeachers,
                maxStudents: selectedPackage.maxStudents || prev.maxStudents,
                maxQuestions: selectedPackage.maxQuestions || prev.maxQuestions,
                aiLimitPerMonth: selectedPackage.aiLimitPerMonth || prev.aiLimitPerMonth,
                storageLimitMb: selectedPackage.storageLimitMb || prev.storageLimitMb,
            }));
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
            let targetId = id;
            if (isEdit) {
                await instituteService.updateInstitute(id, data);
            } else {
                const newInst = await instituteService.createInstitute(data);
                targetId = newInst.id;
            }
            
            // Assign subjects
            await instituteService.assignSubjects(targetId, assignedSubjectIds);
            
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
                    <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                            <input name="contactEmail" value={formData.contactEmail || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                            <input name="contactPhone" value={formData.contactPhone || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded-lg" />
                        </div>
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
                {/* Subscription & Limits */}
                <fieldset className="border border-slate-200 p-6 rounded-xl bg-slate-50/50">
                    <legend className="text-sm font-bold text-slate-700 px-3 bg-white border border-slate-200 rounded-full py-1">Subscription & AI Quota</legend>
                    
                    <div className="mb-6 border-b border-slate-200 pb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Assign Billing Package</label>
                        <select 
                            value={formData.subscriptionPackage?.id || ''} 
                            onChange={handlePackageSelect} 
                            className="w-full md:w-1/2 p-3 border border-indigo-200 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                        >
                            <option value="">-- No Package Assigned (Custom Limits) --</option>
                            {packages.map(pkg => (
                                <option key={pkg.id} value={pkg.id}>
                                    {pkg.name} - ${pkg.price} / {pkg.billingCycle} (Up to {pkg.maxQuestions} Qs)
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2">Selecting a package will automatically apply its limits below. You can still manually override them.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide flex items-center gap-1"><Users size={12}/> Max Teachers</label>
                            <input type="number" name="maxTeachers" value={formData.maxTeachers} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide flex items-center gap-1"><Users size={12}/> Max Students</label>
                            <input type="number" name="maxStudents" value={formData.maxStudents} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide flex items-center gap-1 text-primary">Max Questions</label>
                            <input type="number" name="maxQuestions" value={formData.maxQuestions} onChange={handleChange} className="w-full p-2.5 border border-blue-200 bg-blue-50 bg-opacity-30 rounded-lg font-medium text-blue-900 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide flex items-center gap-1 text-emerald-600"><Zap size={12}/> AI Tokens / mo</label>
                            <input type="number" name="aiLimitPerMonth" value={formData.aiLimitPerMonth} onChange={handleChange} className="w-full p-2.5 border border-emerald-200 bg-emerald-50 bg-opacity-30 rounded-lg font-medium text-emerald-900 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide flex items-center gap-1"><Database size={12}/> Storage (MB)</label>
                            <input type="number" name="storageLimitMb" value={formData.storageLimitMb} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                        </div>
                    </div>
                </fieldset>

                {/* Academic Access Control */}
                <fieldset className="border border-slate-200 p-6 rounded-xl bg-slate-50/50">
                    <legend className="text-sm font-bold text-slate-700 px-3 bg-white border border-slate-200 rounded-full py-1">Academic Access Control (Assigned Subjects)</legend>
                    <p className="text-xs text-slate-500 mb-4">Select which subjects this workspace can access. Leave completely blank to allow access to ALL subjects (default), or restrict them to specific subjects.</p>
                    
                    {hierarchy ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {/* Group classes by Stream to make it much more organized */}
                            {Array.from(new Set(hierarchy.classes?.map(c => c._streamName))).map(streamName => {
                                const streamClasses = hierarchy.classes.filter(c => c._streamName === streamName);
                                if (streamClasses.length === 0) return null;
                                
                                return (
                                    <div key={streamName || 'General'} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mb-4">
                                        <div 
                                            className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10 cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => toggleStream(streamName || 'General')}
                                        >
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                <div className="w-2 h-4 bg-indigo-500 rounded-full"></div>
                                                {streamName || 'General Stream'}
                                            </h3>
                                            {expandedStreams[streamName || 'General'] ? <ChevronUp size={18} className="text-slate-500"/> : <ChevronDown size={18} className="text-slate-500"/>}
                                        </div>
                                        
                                        {expandedStreams[streamName || 'General'] && (
                                            <div className="p-4 space-y-4">
                                                {streamClasses.map(cls => {
                                                    const classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === cls.id) || [];
                                                    if (classSubjects.length === 0) return null;
                                                    
                                                    const allClassSubjectIds = classSubjects.map(cs => cs.id);
                                                    const allSelected = allClassSubjectIds.length > 0 && allClassSubjectIds.every(id => assignedSubjectIds.includes(id));
                                                    const isClassExpanded = expandedClasses[cls.id];

                                                    return (
                                                        <div key={cls.id} className="border border-slate-100 rounded-lg bg-white shadow-sm hover:border-indigo-100 transition-colors">
                                                            <div 
                                                                className="flex flex-wrap md:flex-nowrap justify-between items-center p-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-t-lg"
                                                                onClick={() => toggleClass(cls.id)}
                                                            >
                                                                <div className="font-bold text-sm text-slate-700 flex items-center gap-2">
                                                                    {isClassExpanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                                                                    {cls.name}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (allSelected) {
                                                                                setAssignedSubjectIds(prev => prev.filter(id => !allClassSubjectIds.includes(id)));
                                                                            } else {
                                                                                setAssignedSubjectIds(prev => Array.from(new Set([...prev, ...allClassSubjectIds])));
                                                                            }
                                                                        }}
                                                                        className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${allSelected ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                                                                    >
                                                                        {allSelected ? 'Deselect All' : 'Select All Subjects'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {isClassExpanded && (
                                                                <div className="flex flex-col gap-3 p-4 border-t border-slate-50 bg-slate-50/30">
                                                                    {classSubjects.map(cs => {
                                                                        const subject = hierarchy.subjects?.find(s => s.id === cs._subjectId);
                                                                        if (!subject) return null;
                                                                        
                                                                        const isSelected = assignedSubjectIds.includes(cs.id);
                                                                        const config = subjectConfigs[cs.id] || { versions: ['Bangla', 'English', 'Bilingual'] };
                                                                        
                                                                        return (
                                                                            <div key={cs.id} className={`flex flex-col gap-2 p-3.5 rounded-xl border-2 transition-all shadow-sm ${isSelected ? 'bg-white border-indigo-400' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                                                                <label className="flex items-center gap-3 cursor-pointer">
                                                                                    <input 
                                                                                        type="checkbox" 
                                                                                        checked={isSelected} 
                                                                                        onChange={() => handleSubjectToggle(cs.id)}
                                                                                        className="w-5 h-5 rounded text-indigo-600 border-slate-300 cursor-pointer"
                                                                                    />
                                                                                    <span className={`text-sm font-black ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                                                        {subject.name} {subject.paper ? <span className="text-indigo-500 ml-1">({subject.paper})</span> : ''}
                                                                                    </span>
                                                                                    
                                                                                    {isSelected && <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold uppercase tracking-wider">Active in Workspace</span>}
                                                                                </label>

                                                                                {isSelected && (
                                                                                    <div className="ml-8 mt-2 p-3 bg-slate-50 border border-slate-100 rounded-lg flex flex-wrap items-center gap-x-8 gap-y-4">
                                                                                        <div className="flex items-center gap-4">
                                                                                            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Allowed Versions</span>
                                                                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition">
                                                                                                <input 
                                                                                                    type="checkbox" 
                                                                                                    checked={config.versions.includes('Bangla')}
                                                                                                    onChange={() => handleVersionToggle(cs.id, 'Bangla')}
                                                                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                                                /> Bangla
                                                                                            </label>
                                                                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition">
                                                                                                <input 
                                                                                                    type="checkbox" 
                                                                                                    checked={config.versions.includes('English')}
                                                                                                    onChange={() => handleVersionToggle(cs.id, 'English')}
                                                                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                                                /> English
                                                                                            </label>
                                                                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition">
                                                                                                <input 
                                                                                                    type="checkbox" 
                                                                                                    checked={config.versions.includes('Bilingual')}
                                                                                                    onChange={() => handleVersionToggle(cs.id, 'Bilingual')}
                                                                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                                                /> Bilingual
                                                                                            </label>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin"></span>
                            Loading curriculum hierarchy...
                        </div>
                    )}
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
                    <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {loading ? 'Saving...' : <><Save size={18} className="inline mr-2" /> Save Institute</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InstituteForm;
