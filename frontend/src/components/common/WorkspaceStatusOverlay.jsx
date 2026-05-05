import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Package, Clock, LogOut, CheckCircle, ArrowRight } from 'lucide-react';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';
import academicService from '../../services/academicService';

const WorkspaceStatusOverlay = ({ user, onLogout }) => {
    const [step, setStep] = useState(1);
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [hierarchy, setHierarchy] = useState(null);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [subjectVersions, setSubjectVersions] = useState({});
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(user?.instituteStatus);

    useEffect(() => {
        if (status === 'INACTIVE') {
            fetchData();
        }
    }, [status]);

    const fetchData = async () => {
        try {
            const [pkgRes, subRes, hierRes] = await Promise.all([
                axios.get('/v1/billing/packages'),
                axios.get('/v1/academic/subjects'),
                academicService.getHierarchy()
            ]);
            
            const availablePackages = pkgRes.data.filter(p => p.status === 'ACTIVE');
            setPackages(availablePackages);
            if (availablePackages.length > 0) {
                setSelectedPackage(availablePackages[0].id);
            }

            setSubjects(subRes.data);
            setHierarchy(hierRes);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    const toggleSubject = (classSubjectId, allowedVersions = []) => {
        setSelectedSubjects(prev => {
            if (prev.includes(classSubjectId)) {
                return prev.filter(id => id !== classSubjectId);
            } else {
                // Add with default first allowed version
                setSubjectVersions(c => ({...c, [classSubjectId]: allowedVersions.length > 0 ? [allowedVersions[0]] : ['Bangla']}));
                return [...prev, classSubjectId];
            }
        });
    };

    const toggleVersion = (classSubjectId, version) => {
        setSubjectVersions(prev => {
            const conf = prev[classSubjectId] || [];
            const newVersions = conf.includes(version)
                ? conf.filter(v => v !== version)
                : [...conf, version];
            return { ...prev, [classSubjectId]: newVersions };
        });
    };

    const handleNext = () => {
        if (!selectedPackage) return;
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!selectedPackage) return;
        setLoading(true);
        try {
            await axios.post('/v1/institutes/request', {
                packageId: selectedPackage,
                subjectIds: selectedSubjects,
                subjectVersions: subjectVersions,
                medium: Object.values(subjectVersions).flat().join(',') || 'Bangla'
            });
            // Update local user state to reflect active status
            const updatedUser = { ...user, instituteStatus: 'ACTIVE' };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setStatus('ACTIVE');
            
            // Reload window to re-mount layouts and remove overlay safely
            window.location.reload();
        } catch (error) {
            console.error('Failed to request workspace:', error);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'ACTIVE' || status === 'SUSPENDED' || user?.instituteName === 'DEFAULT' || user?.roles?.includes('SUPER_ADMIN')) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-2xl w-full"
                >
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="relative z-10">
                            {status === 'INACTIVE' ? (
                                <>
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-400/30">
                                        <Package className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight">Select a Subscription Package</h2>
                                    <p className="text-slate-400 mt-2 text-lg">Choose a package to activate your workspace.</p>
                                </>
                            ) : status === 'SUSPENDED' ? (
                                <>
                                    <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-6 border border-red-400/30">
                                        <LogOut className="w-8 h-8 text-red-400" />
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight">Account Suspended</h2>
                                    <p className="text-slate-400 mt-2 text-lg">Your workspace access has been revoked.</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-6 border border-amber-400/30">
                                        <Clock className="w-8 h-8 text-amber-400" />
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight">Pending Approval</h2>
                                    <p className="text-slate-400 mt-2 text-lg">Your workspace is awaiting admin approval.</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="p-8">
                        {status === 'INACTIVE' ? (
                            <div className="space-y-6">
                                {step === 1 ? (
                                    <>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {packages.map(pkg => (
                                                <div
                                                    key={pkg.id}
                                                    onClick={() => setSelectedPackage(pkg.id)}
                                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedPackage === pkg.id
                                                            ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10'
                                                            : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h3 className="font-bold text-slate-800">{pkg.name}</h3>
                                                        {selectedPackage === pkg.id && (
                                                            <CheckCircle className="text-blue-500 w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <div className="text-2xl font-extrabold text-slate-900 mb-1">
                                                        ৳{pkg.price}
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-500">
                                                        {pkg.billingCycle}
                                                    </div>
                                                    <ul className="mt-4 space-y-2 text-sm text-slate-600">
                                                        <li className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                            Max Teachers: {pkg.maxTeachers}
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                            Max Students: {pkg.maxStudents}
                                                        </li>
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                                            <button
                                                onClick={onLogout}
                                                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                                            >
                                                <LogOut size={16} /> Logout
                                            </button>
                                            <button
                                                onClick={handleNext}
                                                disabled={!selectedPackage}
                                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
                                            >
                                                Next Step
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 mb-2">Select Your Subjects</h3>
                                            <p className="text-sm text-slate-500 mb-4">Choose the subjects you will be managing in your workspace.</p>
                                            
                                            {hierarchy ? (() => {
                                                const selPkg = packages.find(p => p.id === selectedPackage);
                                                let parsedRules = selPkg?.pricingRules;
                                                if (typeof parsedRules === 'string') {
                                                    try { parsedRules = JSON.parse(parsedRules); } catch(e) { parsedRules = {}; }
                                                }
                                                const pricingRules = parsedRules?.subjects || [];

                                                return (
                                                <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                                    {Array.from(new Set(hierarchy.classes?.map(c => c._streamName))).map(streamName => {
                                                        const streamClasses = hierarchy.classes.filter(c => c._streamName === streamName);
                                                        if (streamClasses.length === 0) return null;
                                                        
                                                        const activeStreamClasses = streamClasses.filter(cls => {
                                                            const classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === cls.id) || [];
                                                            return classSubjects.some(cs => pricingRules.find(pr => pr.classSubjectId === cs.id));
                                                        });
                                                        
                                                        if (activeStreamClasses.length === 0) return null;

                                                        return (
                                                            <div key={streamName || 'General'} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm mb-4">
                                                                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex justify-between items-center sticky top-0 z-10">
                                                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                                        <div className="w-2 h-4 bg-blue-500 rounded-full"></div>
                                                                        {streamName || 'General Stream'}
                                                                    </h3>
                                                                </div>
                                                                
                                                                <div className="p-4 space-y-6">
                                                                    {activeStreamClasses.map(cls => {
                                                                        let classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === cls.id) || [];
                                                                        classSubjects = classSubjects.filter(cs => pricingRules.find(pr => pr.classSubjectId === cs.id));
                                                                        
                                                                        if (classSubjects.length === 0) return null;
                                                                        
                                                                        const allClassSubjectIds = classSubjects.map(cs => cs.id);
                                                                        const allSelected = allClassSubjectIds.length > 0 && allClassSubjectIds.every(id => selectedSubjects.includes(id));

                                                                        return (
                                                                            <div key={cls.id} className="border border-slate-100 rounded-lg p-4 bg-white shadow-sm hover:border-blue-100 transition-colors">
                                                                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                                                                                    <div className="font-bold text-sm text-slate-700">{cls.name}</div>
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => {
                                                                                            if (allSelected) {
                                                                                                setSelectedSubjects(prev => prev.filter(id => !allClassSubjectIds.includes(id)));
                                                                                                setSubjectVersions(prev => {
                                                                                                    const next = { ...prev };
                                                                                                    allClassSubjectIds.forEach(id => delete next[id]);
                                                                                                    return next;
                                                                                                });
                                                                                            } else {
                                                                                                const toAdd = allClassSubjectIds.filter(id => !selectedSubjects.includes(id));
                                                                                                toAdd.forEach(id => {
                                                                                                    const pr = pricingRules.find(r => r.classSubjectId === id);
                                                                                                    setSubjectVersions(c => ({...c, [id]: pr?.versions?.length > 0 ? [pr.versions[0]] : ['Bangla']}));
                                                                                                });
                                                                                                setSelectedSubjects(prev => Array.from(new Set([...prev, ...allClassSubjectIds])));
                                                                                            }
                                                                                        }}
                                                                                        className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${allSelected ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                                                                    >
                                                                                        {allSelected ? 'Deselect All' : 'Select All'}
                                                                                    </button>
                                                                                </div>
                                                                                <div className="flex flex-col gap-2.5">
                                                                                        {classSubjects.map(cs => {
                                                                                            const subject = hierarchy.subjects?.find(s => s.id === cs._subjectId);
                                                                                            const rule = pricingRules.find(pr => pr.classSubjectId === cs.id);
                                                                                            if (!subject || !rule) return null;
                                                                                            const isSelected = selectedSubjects.includes(cs.id);
                                                                                            const versions = subjectVersions[cs.id] || [];
                                                                                            const allowedVersions = rule.versions || ['Bangla', 'English', 'Bilingual'];
                                                                                            const pricePerVersion = parseFloat(rule.price) || 0;
                                                                                            
                                                                                            return (
                                                                                                <div key={cs.id} className={`flex flex-col gap-3 px-4 py-3 rounded-lg border transition select-none ${
                                                                                                    isSelected 
                                                                                                        ? 'bg-blue-50 border-blue-400 shadow-sm'
                                                                                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                                                                                }`}>
                                                                                                    <label className="flex items-center justify-between cursor-pointer">
                                                                                                        <div className="flex items-center gap-3">
                                                                                                            <input 
                                                                                                                type="checkbox" 
                                                                                                                checked={isSelected}
                                                                                                                onChange={() => toggleSubject(cs.id, allowedVersions)}
                                                                                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                                                                            />
                                                                                                            <span className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-600'}`}>
                                                                                                                {subject.name} {subject.paper ? <span className="text-blue-500 ml-1">({subject.paper})</span> : ''}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        {pricePerVersion > 0 && (
                                                                                                            <span className="text-xs font-bold text-blue-600 bg-blue-100/50 px-2 py-1 rounded">
                                                                                                                +৳{pricePerVersion}/version
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </label>
                                                                                                    
                                                                                                    {isSelected && allowedVersions.length > 0 && (
                                                                                                        <div className="ml-7 pt-2 border-t border-blue-200/50 flex flex-wrap gap-4 items-center">
                                                                                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Select Versions:</span>
                                                                                                            {allowedVersions.map(v => (
                                                                                                                <label key={v} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer hover:text-blue-600 transition">
                                                                                                                    <input 
                                                                                                                        type="checkbox"
                                                                                                                        checked={versions.includes(v)}
                                                                                                                        onChange={() => toggleVersion(cs.id, v)}
                                                                                                                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 cursor-pointer"
                                                                                                                    />
                                                                                                                    {v}
                                                                                                                </label>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                );
                                            })() : (
                                                <div className="flex justify-center p-8">
                                                    <span className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
                                            <button
                                                onClick={() => setStep(1)}
                                                className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors px-4 py-2 w-full sm:w-auto"
                                            >
                                                Back
                                            </button>
                                            
                                            {(() => {
                                                const selPkg = packages.find(p => p.id === selectedPackage);
                                                let parsedRules = selPkg?.pricingRules;
                                                if (typeof parsedRules === 'string') { try { parsedRules = JSON.parse(parsedRules); } catch(e) { parsedRules = {}; } }
                                                const pricingRules = parsedRules?.subjects || [];
                                                
                                                let extraPrice = 0;
                                                selectedSubjects.forEach(id => {
                                                    const rule = pricingRules.find(pr => pr.classSubjectId === id);
                                                    if (rule) {
                                                        const count = subjectVersions[id]?.length || 0;
                                                        extraPrice += (parseFloat(rule.price) || 0) * count;
                                                    }
                                                });
                                                const totalPrice = parseFloat(selPkg?.price || 0) + extraPrice;
                                                const isValid = selectedSubjects.length > 0 && selectedSubjects.every(id => subjectVersions[id]?.length > 0);

                                                return (
                                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                        <div className="text-right hidden sm:block">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Estimated</div>
                                                            <div className="text-xl font-black text-blue-600">৳{totalPrice.toFixed(0)}</div>
                                                        </div>
                                                        <button
                                                            onClick={handleSubmit}
                                                            disabled={loading || !isValid}
                                                            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                                                        >
                                                            {loading ? 'Submitting...' : `Submit Request`}
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                    <Lock className="w-10 h-10 text-slate-400" />
                                    <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center ${status === 'SUSPENDED' ? 'bg-red-100' : 'bg-amber-100 animate-bounce'}`}>
                                        {status === 'SUSPENDED' ? <LogOut className="w-5 h-5 text-red-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3">
                                    {status === 'SUSPENDED' ? 'Account Suspended' : 'Workspace Restricted'}
                                </h3>
                                <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
                                    {status === 'SUSPENDED' 
                                        ? 'Your workspace access has been suspended. Please contact support for more information.'
                                        : 'Your package request has been submitted successfully. You will be able to access the dashboard once an administrator approves your workspace.'}
                                </p>
                                <button
                                    onClick={onLogout}
                                    className="flex items-center justify-center gap-2 w-full md:w-auto mx-auto bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                                >
                                    <LogOut size={18} /> Back to Login
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default WorkspaceStatusOverlay;
