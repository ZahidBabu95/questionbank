import React, { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, CheckCircle, XCircle, ChevronRight, ChevronDown,
    Zap, Users, FileText, Layout, Save, X, Settings, DollarSign
} from 'lucide-react';
import billingService from '../../../services/billingService';
import userService from '../../../services/userService';
import academicService from '../../../services/academicService';
import { motion, AnimatePresence } from 'framer-motion';

const PackageManagement = () => {
    const [packages, setPackages] = useState([]);
    const [editingPkg, setEditingPkg] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const initialFormState = {
        name: '',
        packageCode: '',
        description: '',
        price: 0,
        currency: 'USD',
        billingCycle: 'MONTHLY',
        status: 'ACTIVE',
        maxTeachers: 5,
        maxStudents: 100,
        maxQuestions: 1000,
        maxExamsPerMonth: 20,
        maxLectures: 10,
        aiLimitPerMonth: 100000,
        storageLimitMb: 500,
        featureFlags: {
            aiGenerator: false,
            lectureBuilder: false,
            autoExam: false,
            manualExam: true,
            pdfExport: true,
            wordExport: false,
            analytics: false
        },
        pricingRules: {
            subjects: []
        },
        displayName: '',
        highlightBadge: '',
        sortOrder: 0,
        associatedRole: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    const [roles, setRoles] = useState([]);
    const [hierarchy, setHierarchy] = useState(null);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [expandedStreams, setExpandedStreams] = useState({});
    const [expandedClasses, setExpandedClasses] = useState({});

    useEffect(() => {
        fetchPackages();
        fetchRoles();
        fetchHierarchy();
    }, []);

    const fetchHierarchy = async () => {
        try {
            const res = await academicService.getHierarchy();
            setHierarchy(res);
        } catch (err) {
            console.error('Failed to fetch hierarchy:', err);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await userService.getRoles();
            setRoles(res.data || res || []);
        } catch (err) {
            console.error('Failed to fetch roles:', err);
        }
    };

    const fetchPackages = async () => {
        setLoading(true);
        try {
            const res = await billingService.getPackages();
            // Handle both direct array and wrapped standard response
            const packagesData = Array.isArray(res) ? res : (res?.data || []);
            setPackages(packagesData);
        } catch (err) {
            console.error('Failed to fetch packages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPkg) {
                await billingService.updatePackage(editingPkg.id, formData);
            } else {
                await billingService.createPackage(formData);
            }
            setShowForm(false);
            setEditingPkg(null);
            setFormData(initialFormState);
            fetchPackages();
        } catch (err) {
            alert('Error saving package: ' + err.message);
        }
    };

    const handleEdit = (pkg) => {
        setEditingPkg(pkg);
        setFormData({
            ...initialFormState,
            ...pkg,
            featureFlags: pkg.featureFlags || initialFormState.featureFlags,
            pricingRules: pkg.pricingRules || initialFormState.pricingRules
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this package?')) {
            await billingService.deletePackage(id);
            fetchPackages();
        }
    };

    const toggleStatus = async (pkg) => {
        const newStatus = pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        await billingService.updateStatus(pkg.id, newStatus);
        fetchPackages();
    };

    const handleFeatureToggle = (feature) => {
        setFormData({
            ...formData,
            featureFlags: {
                ...formData.featureFlags,
                [feature]: !formData.featureFlags[feature]
            }
        });
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Subscription Packages</h1>
                    <p className="text-slate-500 mt-1">Manage system limits and pricing for all institutes.</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => { setShowForm(true); setEditingPkg(null); setFormData(initialFormState); }}
                        className="flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
                    >
                        <Plus size={20} />
                        Create New Package
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-900">
                                {editingPkg ? 'Edit Package' : 'Create New Package'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Package Name</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Professional Plan"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Package Code</label>
                                    <input
                                        type="text" required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition"
                                        value={formData.packageCode}
                                        onChange={e => setFormData({ ...formData, packageCode: e.target.value.toUpperCase() })}
                                        placeholder="PRO_PLAN"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Price ({formData.currency})</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="number" required step="0.01"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Associated Role</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 transition"
                                        value={formData.associatedRole || ''}
                                        onChange={e => setFormData({ ...formData, associatedRole: e.target.value })}
                                    >
                                        <option value="">-- Select a Role (Optional) --</option>
                                        {Array.isArray(roles) && roles.map(role => (
                                            <option key={role.id || role.name} value={role.name}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-slate-50 rounded-2xl">
                                {[
                                    { label: 'Max Teachers', key: 'maxTeachers', icon: Users },
                                    { label: 'Max Students', key: 'maxStudents', icon: Users },
                                    { label: 'Max Questions', key: 'maxQuestions', icon: FileText },
                                    { label: 'Exams / Month', key: 'maxExamsPerMonth', icon: Layout },
                                    { label: 'Max Lectures', key: 'maxLectures', icon: CheckCircle },
                                    { label: 'AI Credits', key: 'aiLimitPerMonth', icon: Zap },
                                    { label: 'Storage (MB)', key: 'storageLimitMb', icon: Settings },
                                    { label: 'Sort Order', key: 'sortOrder', icon: ChevronRight },
                                ].map((item) => (
                                    <div key={item.key} className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500"
                                            value={formData[item.key]}
                                            onChange={e => setFormData({ ...formData, [item.key]: parseInt(e.target.value) })}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Academic Access & Pricing</h3>
                                        <p className="text-xs text-slate-500 mt-1">Select active subjects for this package, and assign prices and versions (Bangla/English).</p>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search subjects..."
                                        className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm w-64 shadow-sm"
                                        value={subjectSearch}
                                        onChange={e => setSubjectSearch(e.target.value)}
                                    />
                                </div>
                                
                                {hierarchy ? (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Array.from(new Set(hierarchy.classes?.map(c => c._streamName))).map(streamName => {
                                            const streamClasses = hierarchy.classes.filter(c => c._streamName === streamName);
                                            if (streamClasses.length === 0) return null;
                                            
                                            // Check if any class in this stream matches search filter
                                            const hasMatchingSubjectsInStream = streamClasses.some(cls => {
                                                const classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === cls.id) || [];
                                                return classSubjects.some(cs => cs.name.toLowerCase().includes(subjectSearch.toLowerCase()));
                                            });
                                            
                                            if (subjectSearch && !hasMatchingSubjectsInStream) return null;
                                            
                                            const isStreamExpanded = subjectSearch || expandedStreams[streamName];

                                            return (
                                                <div key={streamName || 'General'} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mb-4">
                                                    <div 
                                                        className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10 cursor-pointer hover:bg-slate-200 transition-colors"
                                                        onClick={() => setExpandedStreams(prev => ({ ...prev, [streamName]: !prev[streamName] }))}
                                                    >
                                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                            <div className="w-2.5 h-5 bg-indigo-500 rounded-full"></div>
                                                            {streamName || 'General Stream'}
                                                        </h3>
                                                        <div className="text-slate-400">
                                                            {isStreamExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                        </div>
                                                    </div>
                                                    
                                                    {isStreamExpanded && (
                                                        <div className="p-4 space-y-4">
                                                            {streamClasses.map(cls => {
                                                                const classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === cls.id) || [];
                                                                if (classSubjects.length === 0) return null;
                                                                
                                                                const filteredClassSubjects = classSubjects.filter(cs => cs.name.toLowerCase().includes(subjectSearch.toLowerCase()));
                                                                if (subjectSearch && filteredClassSubjects.length === 0) return null;
                                                                
                                                                const isClassExpanded = subjectSearch || expandedClasses[cls.id];

                                                                return (
                                                                    <div key={cls.id} className="border border-slate-100 rounded-lg bg-slate-50/50 shadow-sm overflow-hidden">
                                                                        <div 
                                                                            className="font-bold text-sm text-slate-700 p-3 bg-white border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                                                                            onClick={() => setExpandedClasses(prev => ({ ...prev, [cls.id]: !prev[cls.id] }))}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                                                                {cls.name}
                                                                                <span className="text-xs text-slate-400 ml-2 bg-slate-100 px-2 py-0.5 rounded-full">{classSubjects.length} subjects</span>
                                                                            </div>
                                                                            <div className="text-slate-400">
                                                                                {isClassExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {isClassExpanded && (
                                                                            <div className="p-4 flex flex-col gap-3">
                                                                                {(subjectSearch ? filteredClassSubjects : classSubjects).map(cs => {
                                                                                    const subject = hierarchy.subjects?.find(s => s.id === cs._subjectId);
                                                                                    if (!subject) return null;
                                                                                    
                                                                                    const currentRule = formData.pricingRules?.subjects?.find(s => s.classSubjectId === cs.id);
                                                                                    const isSelected = !!currentRule;
                                                                                    
                                                                                    return (
                                                                                        <div key={cs.id} className={`flex flex-col gap-2 p-3.5 rounded-xl border-2 transition-all shadow-sm ${isSelected ? 'bg-white border-indigo-400' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                                                                            <label className="flex items-center gap-3 cursor-pointer">
                                                                                                <input 
                                                                                                    type="checkbox" 
                                                                                                    checked={isSelected}
                                                                                                    onChange={(e) => {
                                                                                                        const checked = e.target.checked;
                                                                                                        let newSubjects = [...(formData.pricingRules?.subjects || [])];
                                                                                                        if (checked) {
                                                                                                            newSubjects.push({ classSubjectId: cs.id, price: 0, versions: ['Bangla', 'English', 'Bilingual'] });
                                                                                                        } else {
                                                                                                            newSubjects = newSubjects.filter(s => s.classSubjectId !== cs.id);
                                                                                                        }
                                                                                                        setFormData({
                                                                                                            ...formData,
                                                                                                            pricingRules: { ...formData.pricingRules, subjects: newSubjects }
                                                                                                        });
                                                                                                    }}
                                                                                                    className="w-5 h-5 rounded text-indigo-600 border-slate-300 cursor-pointer"
                                                                                                />
                                                                                                <span className={`text-sm font-black ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                                                                    {subject.name} {subject.paper ? <span className="text-indigo-500 ml-1">({subject.paper})</span> : ''}
                                                                                                </span>
                                                                                                
                                                                                                {isSelected && <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold uppercase tracking-wider">Active in Package</span>}
                                                                                            </label>
                                                                                            
                                                                                            {isSelected && (
                                                                                                <div className="ml-8 mt-2 p-3 bg-slate-50 border border-slate-100 rounded-lg flex flex-wrap items-center gap-x-8 gap-y-4">
                                                                                                    <div className="flex items-center gap-3">
                                                                                                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Extra Price ({formData.currency})</span>
                                                                                                        <input 
                                                                                                            type="number" min="0" step="0.01"
                                                                                                            value={currentRule.price || 0}
                                                                                                            onChange={(e) => {
                                                                                                                const val = parseFloat(e.target.value) || 0;
                                                                                                                const newSubjects = formData.pricingRules.subjects.map(s => 
                                                                                                                    s.classSubjectId === cs.id ? { ...s, price: val } : s
                                                                                                                );
                                                                                                                setFormData({ ...formData, pricingRules: { ...formData.pricingRules, subjects: newSubjects } });
                                                                                                            }}
                                                                                                            className="w-24 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
                                                                                                    <div className="flex items-center gap-4">
                                                                                                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Allowed Versions</span>
                                                                                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition">
                                                                                                            <input 
                                                                                                                type="checkbox" 
                                                                                                                checked={currentRule.versions?.includes('Bangla')}
                                                                                                                onChange={(e) => {
                                                                                                                    const checked = e.target.checked;
                                                                                                                    const versions = currentRule.versions || [];
                                                                                                                    const newVersions = checked ? [...versions, 'Bangla'] : versions.filter(v => v !== 'Bangla');
                                                                                                                    const newSubjects = formData.pricingRules.subjects.map(s => 
                                                                                                                        s.classSubjectId === cs.id ? { ...s, versions: newVersions } : s
                                                                                                                    );
                                                                                                                    setFormData({ ...formData, pricingRules: { ...formData.pricingRules, subjects: newSubjects } });
                                                                                                                }}
                                                                                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                                                            /> Bangla
                                                                                                        </label>
                                                                                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition">
                                                                                                            <input 
                                                                                                                type="checkbox" 
                                                                                                                checked={currentRule.versions?.includes('English')}
                                                                                                                onChange={(e) => {
                                                                                                                    const checked = e.target.checked;
                                                                                                                    const versions = currentRule.versions || [];
                                                                                                                    const newVersions = checked ? [...versions, 'English'] : versions.filter(v => v !== 'English');
                                                                                                                    const newSubjects = formData.pricingRules.subjects.map(s => 
                                                                                                                        s.classSubjectId === cs.id ? { ...s, versions: newVersions } : s
                                                                                                                    );
                                                                                                                    setFormData({ ...formData, pricingRules: { ...formData.pricingRules, subjects: newSubjects } });
                                                                                                                }}
                                                                                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                                                                            /> English
                                                                                                        </label>
                                                                                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer hover:text-indigo-600 transition">
                                                                                                            <input 
                                                                                                                type="checkbox" 
                                                                                                                checked={currentRule.versions?.includes('Bilingual')}
                                                                                                                onChange={(e) => {
                                                                                                                    const checked = e.target.checked;
                                                                                                                    const versions = currentRule.versions || [];
                                                                                                                    const newVersions = checked ? [...versions, 'Bilingual'] : versions.filter(v => v !== 'Bilingual');
                                                                                                                    const newSubjects = formData.pricingRules.subjects.map(s => 
                                                                                                                        s.classSubjectId === cs.id ? { ...s, versions: newVersions } : s
                                                                                                                    );
                                                                                                                    setFormData({ ...formData, pricingRules: { ...formData.pricingRules, subjects: newSubjects } });
                                                                                                                }}
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
                                    <div className="text-sm text-slate-500 p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center gap-3">
                                        <span className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></span>
                                        Loading academic structure...
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Feature Flags</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.keys(formData.featureFlags).map(feature => (
                                        <button
                                            key={feature}
                                            type="button"
                                            onClick={() => handleFeatureToggle(feature)}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${formData.featureFlags[feature]
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            <span className="text-sm font-bold capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                                            {formData.featureFlags[feature] ? <CheckCircle size={18} /> : <XCircle size={18} className="text-slate-200" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t border-slate-50">
                                <button
                                    type="button" onClick={() => setShowForm(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 bg-secondary text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                                >
                                    <Save size={20} />
                                    {editingPkg ? 'Update Package' : 'Save Package'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Package Cards */}
            {!showForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array.isArray(packages) && packages.map((pkg) => (
                        <motion.div
                            key={pkg.id}
                            whileHover={{ y: -5 }}
                            className={`bg-white rounded-3xl border ${pkg.status === 'ACTIVE' ? 'border-slate-100' : 'border-slate-200 opacity-60'} shadow-sm relative overflow-hidden`}
                        >
                            {pkg.highlightBadge && (
                                <div className="absolute top-4 right-[-35px] bg-amber-400 text-white text-[10px] font-black uppercase px-12 py-1.5 rotate-45 shadow-sm">
                                    {pkg.highlightBadge}
                                </div>
                            )}
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-1">{pkg.packageCode}</div>
                                        <h3 className="text-2xl font-bold text-slate-900">{pkg.name}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-black text-slate-900">${pkg.price}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{pkg.billingCycle}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-3 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                        <Users size={16} /> <span>{pkg.maxTeachers} Teachers</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                        <FileText size={16} /> <span>{pkg.maxQuestions} Questions/mo</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                        <Zap size={16} /> <span title="AI Tokens/Credits">{pkg.aiLimitPerMonth >= 1000000 ? (pkg.aiLimitPerMonth/1000000)+'M' : pkg.aiLimitPerMonth >= 1000 ? (pkg.aiLimitPerMonth/1000)+'k' : pkg.aiLimitPerMonth} AI Credits</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                        <Settings size={16} /> <span>{pkg.storageLimitMb}MB Storage</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-6">
                                    <button
                                        onClick={() => handleEdit(pkg)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition"
                                    >
                                        <Edit2 size={16} /> Edit
                                    </button>
                                    <button
                                        onClick={() => toggleStatus(pkg)}
                                        className={`p-2.5 rounded-xl border font-bold text-sm transition ${pkg.status === 'ACTIVE'
                                            ? 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                                            : 'border-rose-100 text-rose-600 hover:bg-rose-50'
                                            }`}
                                    >
                                        {pkg.status === 'ACTIVE' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pkg.id)}
                                        className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Empty State / Add Card */}
                    <button
                        onClick={() => { setShowForm(true); setEditingPkg(null); setFormData(initialFormState); }}
                        className="rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition group"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition mb-4">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold">Add New Package</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PackageManagement;
