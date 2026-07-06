import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Package, Clock, LogOut, CheckCircle, ArrowRight, Globe } from 'lucide-react';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';
import academicService from '../../services/academicService';

const WorkspaceStatusOverlay = ({ user, onLogout }) => {
    const isMissingInstituteInfo = !user?.instituteNameEn || !user?.instituteNameBn;
    const [step, setStep] = useState((user?.instituteStatus === 'ACTIVE' && isMissingInstituteInfo) ? 3 : 1);
    const [packages, setPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [hierarchy, setHierarchy] = useState(null);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [subjectVersions, setSubjectVersions] = useState({});
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(user?.instituteStatus);
    const [direction, setDirection] = useState(1);

    const [instituteNameEn, setInstituteNameEn] = useState(user?.instituteNameEn || '');
    const [instituteNameBn, setInstituteNameBn] = useState(user?.instituteNameBn || '');

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
        setDirection(1);
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
            const updatedUser = { ...user, instituteStatus: 'ACTIVE' };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setStatus('ACTIVE');
            window.location.reload();
        } catch (error) {
            console.error('Failed to request workspace:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInstituteInfo = async () => {
        if (!instituteNameEn.trim() || !instituteNameBn.trim()) {
            alert('উভয় ফিল্ড পূরণ করা আবশ্যক / Both fields are required');
            return;
        }
        setLoading(true);
        try {
            const profileRes = await axios.patch('/v1/users/profile', {
                name: user.name,
                phone: user.phone || '',
                instituteNameEn: instituteNameEn.trim(),
                instituteNameBn: instituteNameBn.trim()
            });

            if (profileRes.data.success) {
                const updatedProfile = profileRes.data.data;
                
                if (status === 'INACTIVE') {
                    await axios.post('/v1/institutes/request', {
                        packageId: selectedPackage,
                        subjectIds: selectedSubjects,
                        subjectVersions: subjectVersions,
                        medium: Object.values(subjectVersions).flat().join(',') || 'Bangla'
                    });
                }

                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                const newUserData = {
                    ...storedUser,
                    name: updatedProfile.name,
                    phone: updatedProfile.phone,
                    instituteNameEn: updatedProfile.instituteNameEn,
                    instituteNameBn: updatedProfile.instituteNameBn,
                    instituteStatus: status === 'INACTIVE' ? 'ACTIVE' : storedUser.instituteStatus
                };
                localStorage.setItem('user', JSON.stringify(newUserData));
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to save institute info:', error);
            alert(error.response?.data?.message || 'তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        } finally {
            setLoading(false);
        }
    };

    const isDefaultOrSuper = user?.instituteName?.toUpperCase() === 'DEFAULT' || 
                             user?.roles?.includes('SUPER_ADMIN') || 
                             user?.roles?.includes('ROLE_SUPER_ADMIN') || 
                             user?.email === 'admin' || 
                             user?.email?.includes('admin@');

    const showStepUI = status === 'INACTIVE' || (status === 'ACTIVE' && isMissingInstituteInfo);

    if (isDefaultOrSuper || (status === 'ACTIVE' && !isMissingInstituteInfo)) {
        return null;
    }

    const slideVariants = {
        enter: (dir) => ({
            x: dir > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.25, ease: 'easeOut' }
        },
        exit: (dir) => ({
            x: dir < 0 ? 50 : -50,
            opacity: 0,
            transition: { duration: 0.2, ease: 'easeIn' }
        })
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="relative z-10 flex items-center gap-4">
                            {status === 'INACTIVE' ? (
                                <>
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-400/30 flex-shrink-0">
                                        <Package className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Select Subscription & Subjects</h2>
                                        <p className="text-slate-400 text-xs md:text-sm mt-0.5">Activate your workspace by setting up your package</p>
                                    </div>
                                </>
                            ) : status === 'SUSPENDED' ? (
                                <>
                                    <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-400/30 flex-shrink-0">
                                        <LogOut className="w-6 h-6 text-red-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Account Suspended</h2>
                                        <p className="text-slate-400 text-xs md:text-sm mt-0.5">Your workspace access has been revoked</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-400/30 flex-shrink-0">
                                        <Clock className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Pending Approval</h2>
                                        <p className="text-slate-400 text-xs md:text-sm mt-0.5">Your workspace is awaiting admin approval</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {showStepUI ? (
                        <>
                            {/* Scrollable step contents */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                                <AnimatePresence mode="wait" custom={direction}>
                                    {step === 1 ? (
                                        <motion.div
                                            key="step1"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            className="space-y-6"
                                        >
                                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                                {packages.map(pkg => (
                                                    <motion.div
                                                        key={pkg.id}
                                                        onClick={() => setSelectedPackage(pkg.id)}
                                                        whileHover={{ y: -4, scale: 1.01 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${selectedPackage === pkg.id
                                                                ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/5'
                                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                                            }`}
                                                    >
                                                        <div>
                                                            <div className="flex justify-between items-start mb-3">
                                                                <h3 className="font-bold text-slate-800">{pkg.name}</h3>
                                                                {selectedPackage === pkg.id && (
                                                                    <CheckCircle className="text-blue-500 w-5 h-5 flex-shrink-0" />
                                                                )}
                                                            </div>
                                                            <div className="text-2xl font-extrabold text-slate-900 mb-1">
                                                                ৳{pkg.price}
                                                            </div>
                                                            <div className="text-sm font-medium text-slate-500 mb-4">
                                                                {pkg.billingCycle}
                                                            </div>
                                                        </div>
                                                        <ul className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-3">
                                                            <li className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                                Max Teachers: {pkg.maxTeachers}
                                                            </li>
                                                            <li className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                                Max Students: {pkg.maxStudents}
                                                            </li>
                                                        </ul>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : step === 2 ? (
                                        <motion.div
                                            key="step2"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            className="space-y-6"
                                        >
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-800 mb-1">Select Your Subjects</h3>
                                                <p className="text-sm text-slate-500 mb-6">Choose the subjects and versions you will be managing in your workspace.</p>
                                                
                                                {hierarchy ? (() => {
                                                    const selPkg = packages.find(p => p.id === selectedPackage);
                                                    let parsedRules = selPkg?.pricingRules;
                                                    if (typeof parsedRules === 'string') {
                                                        try { parsedRules = JSON.parse(parsedRules); } catch(e) { parsedRules = {}; }
                                                    }
                                                    const pricingRules = parsedRules?.subjects || [];

                                                    return (
                                                    <div className="space-y-6">
                                                        {Array.from(new Set(hierarchy.classes?.map(c => c._streamName))).map(streamName => {
                                                            const streamClasses = hierarchy.classes.filter(c => c._streamName === streamName);
                                                            if (streamClasses.length === 0) return null;
                                                            
                                                            const activeStreamClasses = streamClasses.filter(cls => {
                                                                const classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === cls.id) || [];
                                                                return classSubjects.some(cs => pricingRules.find(pr => pr.classSubjectId === cs.id));
                                                            });
                                                            
                                                            if (activeStreamClasses.length === 0) return null;

                                                            return (
                                                                <div key={streamName || 'General'} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm mb-4">
                                                                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
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
                                                                                <div key={cls.id} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:border-blue-100 transition-colors">
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
                                                                                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors ${allSelected ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
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
                                                                                                <div key={cs.id} className={`flex flex-col gap-3 px-4 py-3 rounded-xl border transition select-none ${
                                                                                                    isSelected 
                                                                                                        ? 'bg-blue-50/50 border-blue-300 shadow-sm'
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
                                                                                                    
                                                                                                    <AnimatePresence>
                                                                                                        {isSelected && allowedVersions.length > 0 && (
                                                                                                            <motion.div
                                                                                                                initial={{ opacity: 0, height: 0 }}
                                                                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                                                                exit={{ opacity: 0, height: 0 }}
                                                                                                                className="ml-7 pt-2 border-t border-blue-200/30 flex flex-wrap gap-4 items-center overflow-hidden"
                                                                                                            >
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
                                                                                                            </motion.div>
                                                                                                        )}
                                                                                                    </AnimatePresence>
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
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="step3"
                                            custom={direction}
                                            variants={slideVariants}
                                            initial="enter"
                                            animate="center"
                                            exit="exit"
                                            className="space-y-6"
                                        >
                                            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5 text-indigo-950 text-sm">
                                                <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                                    <Globe size={18} className="text-indigo-600" />
                                                    প্রতিষ্ঠানের নাম যুক্ত করার গাইডলাইন
                                                </h4>
                                                <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
                                                    আপনার প্রতিষ্ঠানের নাম বাংলা এবং ইংরেজি উভয় ভাষায় নির্ভুলভাবে প্রদান করুন। এটি আপনার তৈরি করা প্রশ্নপত্র, নোটিশ বোর্ড এবং অন্যান্য সমস্ত ডকুমেন্টের হেডার বা শিরোনামে ব্যবহৃত হবে।
                                                </p>
                                                <ul className="mt-3 space-y-1.5 text-xs text-slate-500 list-disc pl-5">
                                                    <li><strong>বাংলা নাম:</strong> এটি বাংলা ভার্সন বা বাংলা মাধ্যমের প্রশ্নপত্র তৈরিতে ব্যবহৃত হবে। (যেমন: আইডিয়াল স্কুল এন্ড কলেজ)</li>
                                                    <li><strong>ইংরেজি নাম:</strong> এটি ইংরেজি ভার্সন বা ইংরেজি মাধ্যমের প্রশ্নপত্র তৈরিতে ব্যবহৃত হবে। (যেমন: Ideal School and College)</li>
                                                </ul>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-2">
                                                        প্রতিষ্ঠানের নাম (বাংলায়) <span className="text-rose-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <Globe className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                        <input
                                                            type="text"
                                                            value={instituteNameBn}
                                                            onChange={(e) => setInstituteNameBn(e.target.value)}
                                                            placeholder="যেমন: আইডিয়াল স্কুল এন্ড কলেজ"
                                                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none rounded-2xl text-slate-800 text-sm font-semibold transition duration-200"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-2">
                                                        Institution Name (in English) <span className="text-rose-500">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <Globe className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                                        <input
                                                            type="text"
                                                            value={instituteNameEn}
                                                            onChange={(e) => setInstituteNameEn(e.target.value)}
                                                            placeholder="e.g. Ideal School and College"
                                                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none rounded-2xl text-slate-800 text-sm font-semibold transition duration-200"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Sticky Footer */}
                            <div className="border-t border-slate-100 p-4 md:p-6 bg-slate-50 flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                                {step === 1 ? (
                                    <>
                                        <button
                                            onClick={onLogout}
                                            className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors w-full sm:w-auto px-4 py-2"
                                        >
                                            <LogOut size={16} /> Logout
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            disabled={!selectedPackage}
                                            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                                        >
                                            Next Step
                                            <ArrowRight size={18} />
                                        </button>
                                    </>
                                ) : step === 2 ? (
                                    <>
                                        <button
                                            onClick={() => { setDirection(-1); setStep(1); }}
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
                                                        onClick={() => { setDirection(1); setStep(3); }}
                                                        disabled={!isValid}
                                                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                                                    >
                                                        Next Step
                                                        <ArrowRight size={18} />
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <>
                                        {user?.instituteStatus === 'ACTIVE' ? (
                                            <button
                                                onClick={onLogout}
                                                className="flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors w-full sm:w-auto px-4 py-2"
                                            >
                                                <LogOut size={16} /> Logout
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { setDirection(-1); setStep(2); }}
                                                className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors px-4 py-2 w-full sm:w-auto"
                                            >
                                                Back
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSaveInstituteInfo}
                                            disabled={loading || !instituteNameEn.trim() || !instituteNameBn.trim()}
                                            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30 w-full sm:w-auto"
                                        >
                                            {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন ও ড্যাশবোর্ডে যান'}
                                            <ArrowRight size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                    <Lock className="w-8 h-8 text-slate-400" />
                                    <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center ${status === 'SUSPENDED' ? 'bg-red-100' : 'bg-amber-100 animate-bounce'}`}>
                                        {status === 'SUSPENDED' ? <LogOut className="w-4 h-4 text-red-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">
                                    {status === 'SUSPENDED' ? 'Account Suspended' : 'Workspace Restricted'}
                                </h3>
                                <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed mb-8">
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
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default WorkspaceStatusOverlay;
