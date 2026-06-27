import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from '../utils/axios';
import { Mail, Lock, User, ArrowRight, CheckCircle, Smartphone, Eye, EyeOff, Circle, BookOpen, Award, Zap, Users, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBranding } from '../context/BrandingContext';
import { useLanguage } from '../context/LanguageContext';


const getRoleDetails = (roleName) => {
    switch(roleName.toUpperCase()) {
        case 'STUDENT': 
            return { 
                icon: BookOpen, 
                color: 'text-emerald-500', 
                bg: 'bg-emerald-50', 
                border: 'border-emerald-200', 
                activeBorder: 'border-emerald-600 bg-emerald-50/20 ring-emerald-500 shadow-emerald-50/30' 
            };
        case 'TEACHER': 
            return { 
                icon: Award, 
                color: 'text-indigo-500', 
                bg: 'bg-indigo-50', 
                border: 'border-indigo-200', 
                activeBorder: 'border-indigo-600 bg-indigo-50/20 ring-indigo-500 shadow-indigo-50/30' 
            };
        case 'BETA USER': 
            return { 
                icon: Zap, 
                color: 'text-amber-500', 
                bg: 'bg-amber-50', 
                border: 'border-amber-200', 
                activeBorder: 'border-amber-600 bg-amber-50/20 ring-amber-500 shadow-amber-50/30' 
            };
        case 'INSTITUTE_ADMIN': 
            return { 
                icon: Users, 
                color: 'text-blue-500', 
                bg: 'bg-blue-50', 
                border: 'border-blue-200', 
                activeBorder: 'border-blue-600 bg-blue-50/20 ring-blue-500 shadow-blue-50/30' 
            };
        default: 
            return { 
                icon: User, 
                color: 'text-slate-500', 
                bg: 'bg-slate-50', 
                border: 'border-slate-200', 
                activeBorder: 'border-slate-600 bg-slate-50/20 ring-slate-500' 
            };
    }
};

const Signup = () => {
    const { currentLang, t, changeLanguage } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        classId: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const paramRole = queryParams.get('role');
        return paramRole ? paramRole.toUpperCase() : 'TEACHER';
    });
    const [rolesLoading, setRolesLoading] = useState(true);
    
    // Hierarchy States
    const [hierarchy, setHierarchy] = useState(null);
    const [hierarchyLoading, setHierarchyLoading] = useState(false);
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [selectedStreamId, setSelectedStreamId] = useState('');
    
    const [packages, setPackages] = useState([]);
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [packagesLoading, setPackagesLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const branding = useBranding();

    // Get redirect URL from query params
    const redirectUrl = new URLSearchParams(location.search).get('redirect') || '/dashboard';

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await axios.get('/v1/auth/roles');
                if (res.data && res.data.success && res.data.data.length > 0) {
                    setRoles(res.data.data);
                    const queryParams = new URLSearchParams(location.search);
                    const paramRole = queryParams.get('role');
                    if (paramRole) {
                        setSelectedRole(paramRole.toUpperCase());
                    } else {
                        setSelectedRole(res.data.data[0].name);
                    }
                }
            } catch (err) {
                console.error("Error loading registration roles:", err);
            } finally {
                setRolesLoading(false);
            }
        };
        fetchRoles();
    }, [location.search]);

    useEffect(() => {
        const fetchPackages = async () => {
            setPackagesLoading(true);
            try {
                const res = await axios.get('/v1/public/packages');
                if (res.data) {
                    setPackages(res.data);
                }
            } catch (err) {
                console.error("Error loading packages:", err);
            } finally {
                setPackagesLoading(false);
            }
        };
        fetchPackages();
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const paramRole = queryParams.get('role');
        const paramPkgId = queryParams.get('packageId');

        if (paramRole) {
            setSelectedRole(paramRole.toUpperCase());
        }
        if (paramPkgId) {
            setSelectedPackageId(paramPkgId);
        }
    }, [location.search]);

    useEffect(() => {
        if (selectedPackageId && packages.length > 0) {
            const pkg = packages.find(p => p.id === selectedPackageId);
            if (pkg && pkg.associatedRole) {
                setSelectedRole(pkg.associatedRole.toUpperCase());
            }
        }
    }, [selectedPackageId, packages]);

    const filteredPackages = packages.filter(pkg => {
        const pkgRole = (pkg.associatedRole || '').toUpperCase();
        const selRole = (selectedRole || '').toUpperCase();
        
        // Exact match
        if (pkgRole === selRole) return true;
        
        // Fallback for default/legacy packages:
        // If selected role is TEACHER and package has no role associated, show it.
        if (selRole === 'TEACHER' && (pkgRole === '' || !pkg.associatedRole)) return true;
        
        return false;
    });

    useEffect(() => {
        if (filteredPackages.length > 0) {
            const currentIsFiltered = filteredPackages.some(p => p.id === selectedPackageId);
            if (!currentIsFiltered) {
                setSelectedPackageId(filteredPackages[0].id);
            }
        } else {
            setSelectedPackageId('');
        }
    }, [selectedRole, packages, selectedPackageId]);

    // Load Public Hierarchy
    useEffect(() => {
        if (selectedRole === 'STUDENT' && !hierarchy) {
            const fetchHierarchy = async () => {
                setHierarchyLoading(true);
                try {
                    const res = await axios.get('/v1/public/hierarchy');
                    if (res.data) {
                        setHierarchy(res.data);
                    }
                } catch (err) {
                    console.error("Error loading academic hierarchy:", err);
                } finally {
                    setHierarchyLoading(false);
                }
            };
            fetchHierarchy();
        }
    }, [selectedRole, hierarchy]);

    // Filter allowed levels, streams, and classes based on selected package subjects
    const selectedPackage = packages.find(p => p.id === selectedPackageId);
    
    let levelsToShow = [];
    let streamsToShow = [];
    let classesToShow = [];

    if (hierarchy) {
        let allowedClassIds = null;
        if (selectedPackage && selectedPackage.pricingRules && selectedPackage.pricingRules.subjects && selectedPackage.pricingRules.subjects.length > 0) {
            const allowedClassSubjectIds = selectedPackage.pricingRules.subjects.map(s => s.classSubjectId);
            const packageClassSubjects = (hierarchy.classSubjects || []).filter(cs => 
                allowedClassSubjectIds.includes(cs.id)
            );
            allowedClassIds = packageClassSubjects.map(cs => cs._classId);
        }

        if (allowedClassIds) {
            classesToShow = (hierarchy.classes || []).filter(c => allowedClassIds.includes(c.id));
            const allowedStreamIds = classesToShow.map(c => c._streamId);
            streamsToShow = (hierarchy.streams || []).filter(s => allowedStreamIds.includes(s.id));
            const allowedLevelIds = streamsToShow.map(s => s._levelId);
            levelsToShow = (hierarchy.levels || []).filter(l => allowedLevelIds.includes(l.id));
        } else {
            levelsToShow = hierarchy.levels || [];
            streamsToShow = hierarchy.streams || [];
            classesToShow = hierarchy.classes || [];
        }
    }

    const visibleLevels = levelsToShow;
    const visibleStreams = selectedLevelId ? streamsToShow.filter(s => s._levelId === selectedLevelId) : [];
    const visibleClasses = selectedStreamId ? classesToShow.filter(c => c._streamId === selectedStreamId) : [];

    // Auto-prefill Class, Stream, and Level from query params once hierarchy is loaded
    useEffect(() => {
        if (hierarchy && selectedRole === 'STUDENT') {
            const queryParams = new URLSearchParams(location.search);
            const paramClassId = queryParams.get('classId');
            if (paramClassId) {
                const targetClass = (hierarchy.classes || []).find(c => c.id === paramClassId);
                if (targetClass) {
                    const streamId = targetClass._streamId;
                    const targetStream = (hierarchy.streams || []).find(s => s.id === streamId);
                    if (targetStream) {
                        const levelId = targetStream._levelId;
                        setSelectedLevelId(levelId);
                        setSelectedStreamId(streamId);
                        setFormData(prev => ({ ...prev, classId: paramClassId }));
                    }
                }
            }
        }
    }, [hierarchy, selectedRole, location.search]);

    // Auto-select Level
    useEffect(() => {
        if (selectedRole === 'STUDENT' && visibleLevels.length === 1) {
            const onlyLvlId = visibleLevels[0].id;
            if (selectedLevelId !== onlyLvlId) {
                setSelectedLevelId(onlyLvlId);
            }
        }
    }, [visibleLevels, selectedLevelId, selectedRole]);

    // Auto-select Stream
    useEffect(() => {
        if (selectedRole === 'STUDENT' && selectedLevelId && visibleStreams.length === 1) {
            const onlyStrId = visibleStreams[0].id;
            if (selectedStreamId !== onlyStrId) {
                setSelectedStreamId(onlyStrId);
            }
        }
    }, [visibleStreams, selectedLevelId, selectedStreamId, selectedRole]);

    // Auto-select Class
    useEffect(() => {
        if (selectedRole === 'STUDENT' && selectedStreamId && visibleClasses.length === 1) {
            const onlyClsId = visibleClasses[0].id;
            if (formData.classId !== onlyClsId) {
                setFormData(prev => ({ ...prev, classId: onlyClsId }));
            }
        }
    }, [visibleClasses, selectedStreamId, formData.classId, selectedRole]);

    const passwordRules = {
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
    };
    const isPasswordValid = Object.values(passwordRules).every(Boolean);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isPasswordValid) {
            setError("Password does not meet all security requirements.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams(location.search);
            const paramInstituteId = queryParams.get('instituteId');

            const signupPayload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
                roles: [selectedRole],
                packageId: selectedPackageId || null,
                instituteId: paramInstituteId || null
            };

            if (selectedRole === 'STUDENT') {
                if (!formData.classId) {
                    setError("Class selection is required for students.");
                    setIsLoading(false);
                    return;
                }
                signupPayload.classId = formData.classId;
            }

            const response = await axios.post('/v1/auth/signup', signupPayload);
            // const response = { data: { success: true, message: "Account created successfully" } };

            // Artificial delay
            // await new Promise(resolve => setTimeout(resolve, 1000));

            if (response.data.success) {
                // Auto-login after successful signup
                const loginResponse = await axios.post('/v1/auth/login', {
                    email: formData.email,
                    password: formData.password
                });
                
                if (loginResponse.data.success) {
                    localStorage.setItem('token', loginResponse.data.data);
                    localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
                    axios.defaults.headers.common['Authorization'] = `Bearer ${loginResponse.data.data}`;
                    
                    navigate(redirectUrl);
                } else {
                    navigate('/login');
                }
            } else {
                setError(response.data.message || 'Signup failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred during signup');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        alert("Google Signup is under development.");
    };

    return (
        <div className="min-h-screen flex bg-white font-sans text-slate-900">
            {/* Left Side - Visual & Branding */}
            <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative overflow-hidden flex-col justify-between p-16 text-white shrink-0">
                <div className="absolute inset-0 z-0 select-none">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute top-0 right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]"
                    ></motion.div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                        className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]"
                    ></motion.div>
                </div>

                <div className="relative z-10 flex flex-col items-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.8 }}
                    >
                        {branding?.logo_url ? (
                            <motion.img
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                src={branding.logo_url}
                                alt="Logo"
                                className="h-48 w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                            />
                        ) : (
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-40 h-40 bg-gradient-to-br from-primary to-secondary rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/40 text-white"
                            >
                                <span className="text-7xl font-black">Q</span>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                <div className="relative z-10 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h2 className="text-5xl font-bold mb-8 leading-tight tracking-tight">
                            {currentLang === 'bn' ? (
                                <>
                                    আজই শুরু করুন <br />
                                    <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">আপনার যাত্রা।</span>
                                </>
                            ) : (
                                <>
                                    Start your journey <br />
                                    <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">with us today.</span>
                                </>
                            )}
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed mb-12">
                            {currentLang === 'bn' 
                                ? "বাংলাদেশ তথা বিশ্বের সবচেয়ে উন্নত প্রশ্নব্যাংক এবং পরীক্ষা ব্যবস্থাপনা সফটওয়্যার ব্যবহার করতে অ্যাকাউন্ট তৈরি করুন।" 
                                : "Create an account to access the most advanced question bank and exam management tools."}
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="space-y-5"
                    >
                        <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors duration-300">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">{t('signup_free_trial')}</h4>
                                <p className="text-sm text-slate-400">{t('signup_trial_desc')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 px-6 py-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors duration-300">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white">{t('signup_no_card')}</h4>
                                <p className="text-sm text-slate-400">{t('signup_no_card_desc')}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="relative z-10 flex justify-between items-center text-sm text-slate-500 font-medium"
                >
                    <p>{branding?.footer_text || `© ${new Date().getFullYear()} QuestionShaper Inc.`}</p>
                </motion.div>
            </div>

            {/* Right Side - Signup Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 bg-white relative overflow-y-auto">
                {/* Language Switcher in top right corner */}
                <div className="absolute top-6 right-8 flex items-center gap-2 z-10">
                    <button 
                        type="button"
                        onClick={() => changeLanguage('en')}
                        className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl border transition-all uppercase tracking-wider ${
                            currentLang === 'en' 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                            : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        EN
                    </button>
                    <button 
                        type="button"
                        onClick={() => changeLanguage('bn')}
                        className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl border transition-all uppercase tracking-wider ${
                            currentLang === 'bn' 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                            : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        BN
                    </button>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-[420px] space-y-4 py-8"
                >
                    <div className="text-center lg:text-left flex flex-col items-center lg:items-start gap-1">
                        {/* Logo visible only on mobile/tablet */}
                        <div className="lg:hidden block mb-2">
                            {branding?.logo_url ? (
                                <img
                                    src={branding.logo_url}
                                    alt="Logo"
                                    className="h-10 w-auto object-contain"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md">
                                    Q
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{t('signup_title')}</h2>
                            <p className="text-xs text-slate-500">{t('signup_subtitle')}</p>
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </motion.div>
                    )}

                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full h-10 flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 text-slate-700 text-xs font-bold shadow-sm"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {t('signup_with_google')}
                        </button>

                        <div className="relative flex items-center justify-center">
                            <div className="border-t border-slate-100 w-full absolute"></div>
                            <span className="bg-white px-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest relative z-10">{t('signup_or_email')}</span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            {/* Select Role Card Selector */}
                            {!rolesLoading && roles.length > 0 && (
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_registering_as')}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {roles.map(role => {
                                            const isSelected = selectedRole === role.name;
                                            const rDetails = getRoleDetails(role.name);
                                            const RoleIcon = rDetails.icon;
                                            
                                            return (
                                                <button
                                                    key={role.name}
                                                    type="button"
                                                    onClick={() => setSelectedRole(role.name)}
                                                    className={`p-1.5 rounded-xl border text-center transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center gap-1 w-full group hover:-translate-y-0.5 ${
                                                        isSelected
                                                        ? `border-indigo-600 shadow-sm ring-2 ring-indigo-500/10 bg-indigo-50/10`
                                                        : `border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/30`
                                                    }`}
                                                >
                                                    <div className={`p-1 rounded-lg shrink-0 ${rDetails.bg} ${rDetails.color} group-hover:scale-105 transition-transform duration-300`}>
                                                        <RoleIcon size={14} />
                                                    </div>
                                                    <span className={`text-[8px] font-black uppercase tracking-wider block ${
                                                        isSelected ? 'text-indigo-900' : 'text-slate-500'
                                                    }`}>
                                                        {role.name.replace('_', ' ')}
                                                    </span>
                                                    {isSelected && (
                                                        <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-1.5 w-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Select Subscription Package */}
                            {!packagesLoading && (
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                                        {selectedRole === 'STUDENT' ? t('signup_plan_student') : t('signup_plan_workspace')}
                                    </label>
                                    
                                    {filteredPackages.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {filteredPackages.map(pkg => {
                                                const isSelected = selectedPackageId === pkg.id;
                                                
                                                // Format limits summary
                                                const limitsSummary = [];
                                                if (pkg.maxExamsPerMonth) limitsSummary.push(`${pkg.maxExamsPerMonth} Exams/mo`);
                                                if (pkg.aiLimitPerMonth) limitsSummary.push(`${pkg.aiLimitPerMonth >= 1000000 ? (pkg.aiLimitPerMonth / 1000000) + 'M' : pkg.aiLimitPerMonth >= 1000 ? (pkg.aiLimitPerMonth / 1000) + 'k' : pkg.aiLimitPerMonth} AI Credits`);
                                                if (pkg.storageLimitMb) limitsSummary.push(`${pkg.storageLimitMb}MB Storage`);
                                                if (pkg.maxTeachers) limitsSummary.push(`${pkg.maxTeachers} Teachers`);
                                                if (pkg.maxStudents) limitsSummary.push(`${pkg.maxStudents} Students`);
                                                
                                                return (
                                                    <button
                                                        key={pkg.id}
                                                        type="button"
                                                        onClick={() => setSelectedPackageId(pkg.id)}
                                                        className={`w-full py-1.5 px-2.5 rounded-xl border text-left transition-all duration-300 relative overflow-hidden flex flex-col gap-1 group hover:border-slate-300 ${
                                                            isSelected
                                                            ? 'border-indigo-600 bg-indigo-50/10 shadow-sm ring-2 ring-indigo-500/10'
                                                            : 'border-slate-200 bg-white hover:bg-slate-50/30'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 w-full">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
                                                                    isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                                                                }`}>
                                                                    {isSelected && <div className="w-1 h-1 rounded-full bg-white"></div>}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1 flex-wrap">
                                                                        <span className="font-extrabold text-[10px] text-slate-800 truncate">{pkg.displayName || pkg.name}</span>
                                                                        {pkg.highlightBadge && (
                                                                            <span className="text-[6px] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0">
                                                                                {pkg.highlightBadge}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0 flex items-baseline gap-0.5">
                                                                <span className="text-[10px] font-black text-slate-900">${pkg.price}</span>
                                                                <span className="text-[7px] text-slate-400 font-bold uppercase">/{pkg.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {limitsSummary.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100/50 w-full">
                                                                {limitsSummary.map((limit, idx) => (
                                                                    <span key={idx} className="bg-slate-50 border border-slate-100 text-slate-500 text-[8px] font-semibold px-1 py-0.2 rounded">
                                                                        {limit}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-1">
                                            <Settings className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                                            <p className="text-[10px] font-bold text-slate-600">{t('signup_no_packages')}</p>
                                            <p className="text-[8px] text-slate-400 max-w-[240px]">
                                                {t('signup_no_packages_desc')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section 1: User Profile Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_full_name')}</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <User size={12} />
                                        </div>
                                        <input
                                            type="text"
                                            name="name"
                                            className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-xs text-slate-900 placeholder:text-slate-400"
                                            placeholder="John Doe"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_email')}</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <Mail size={12} />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-xs text-slate-900 placeholder:text-slate-400"
                                            placeholder="you@example.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-0.5">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_phone')}</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                        <Smartphone size={12} />
                                    </div>
                                    <input
                                        type="tel"
                                        name="phone"
                                        className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-xs text-slate-900 placeholder:text-slate-400"
                                        placeholder="+880 1XXX XXXXXX"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {selectedRole === 'STUDENT' && (
                                hierarchyLoading ? (
                                    <div className="p-2 border border-dashed border-indigo-200/50 rounded-xl bg-indigo-50/10 flex items-center justify-center gap-2">
                                        <Settings className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                                        <span className="text-[10px] font-semibold text-slate-500">{t('signup_academic_loading')}</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {/* Academic Level */}
                                        <div className="space-y-0.5">
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_level')}</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                                    <Award size={12} />
                                                </div>
                                                <select
                                                    name="levelId"
                                                    className="w-full pl-6 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-xs text-slate-900 appearance-none cursor-pointer"
                                                    value={selectedLevelId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSelectedLevelId(val);
                                                        setSelectedStreamId('');
                                                        setFormData(prev => ({ ...prev, classId: '' }));
                                                    }}
                                                    required
                                                >
                                                    <option value="">{t('signup_select_level')}</option>
                                                    {visibleLevels.map(lvl => (
                                                        <option key={lvl.id} value={lvl.id}>
                                                            {lvl.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Academic Stream */}
                                        <div className="space-y-0.5">
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_stream')}</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                                    <Zap size={12} />
                                                </div>
                                                <select
                                                    name="streamId"
                                                    className="w-full pl-6 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-xs text-slate-900 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                    value={selectedStreamId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setSelectedStreamId(val);
                                                        setFormData(prev => ({ ...prev, classId: '' }));
                                                    }}
                                                    disabled={!selectedLevelId}
                                                    required
                                                >
                                                    <option value="">{t('signup_select_stream')}</option>
                                                    {visibleStreams.map(strm => (
                                                        <option key={strm.id} value={strm.id}>
                                                            {strm.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Academic Class */}
                                        <div className="space-y-0.5">
                                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_class')}</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                                    <BookOpen size={12} />
                                                </div>
                                                <select
                                                    name="classId"
                                                    className="w-full pl-6 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-xs text-slate-900 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                    value={formData.classId}
                                                    onChange={handleChange}
                                                    disabled={!selectedStreamId}
                                                    required
                                                >
                                                    <option value="">{t('signup_select_class')}</option>
                                                    {visibleClasses.map(cls => (
                                                        <option key={cls.id} value={cls.id}>
                                                            {cls.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Section 2: Security & Password */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_password')}</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <Lock size={12} />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            className="w-full pl-7 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-xs text-slate-900 placeholder:text-slate-400"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">{t('signup_confirm_password')}</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <Lock size={12} />
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            className="w-full pl-7 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold text-xs text-slate-900 placeholder:text-slate-400"
                                            placeholder="••••••••"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        >
                                            {showConfirmPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Password Requirements Guidance */}
                            {formData.password && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-2 bg-slate-50 rounded-lg border border-slate-100/50 text-[8px] space-y-1"
                                >
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-between">
                                        <div className={`flex items-center gap-0.5 font-semibold transition-colors duration-200 ${passwordRules.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {passwordRules.length ? <CheckCircle size={8} className="shrink-0" /> : <Circle size={8} className="shrink-0 opacity-50" />}
                                            Min 8 chars
                                        </div>
                                        <div className={`flex items-center gap-0.5 font-semibold transition-colors duration-200 ${passwordRules.uppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {passwordRules.uppercase ? <CheckCircle size={8} className="shrink-0" /> : <Circle size={8} className="shrink-0 opacity-50" />}
                                            1 Uppercase
                                        </div>
                                        <div className={`flex items-center gap-0.5 font-semibold transition-colors duration-200 ${passwordRules.lowercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {passwordRules.lowercase ? <CheckCircle size={8} className="shrink-0" /> : <Circle size={8} className="opacity-50" />}
                                            1 Lowercase
                                        </div>
                                        <div className={`flex items-center gap-0.5 font-semibold transition-colors duration-200 ${passwordRules.number ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {passwordRules.number ? <CheckCircle size={8} className="shrink-0" /> : <Circle size={8} className="shrink-0 opacity-50" />}
                                            1 Number
                                        </div>
                                        <div className={`flex items-center gap-0.5 font-semibold transition-colors duration-200 ${passwordRules.special ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {passwordRules.special ? <CheckCircle size={8} className="shrink-0" /> : <Circle size={8} className="opacity-50" />}
                                            1 Special
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div className="flex items-start ml-1 pt-0.5">
                                <div className="flex items-center h-5">
                                    <input
                                        id="terms"
                                        name="terms"
                                        type="checkbox"
                                        required
                                        className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                    />
                                </div>
                                <div className="ml-2 text-[10px] leading-tight">
                                    <label htmlFor="terms" className="font-medium text-slate-500 cursor-pointer">
                                        {currentLang === 'bn' ? (
                                            <>
                                                আমি <Link to="/terms" target="_blank" className="font-bold text-indigo-600 hover:text-indigo-700">শর্তাবলী</Link> এবং <Link to="/privacy" target="_blank" className="font-bold text-indigo-600 hover:text-indigo-700">গোপনীয়তা নীতি</Link> মেনে চলতে সম্মত আছি
                                            </>
                                        ) : (
                                            <>
                                                I agree to the <Link to="/terms" target="_blank" className="font-bold text-indigo-600 hover:text-indigo-700">Terms</Link> and <Link to="/privacy" target="_blank" className="font-bold text-indigo-600 hover:text-indigo-700">Privacy Policy</Link>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-100 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        {t('signup_btn')} <ArrowRight size={14} className="ml-1.5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="text-center pt-1">
                        <p className="text-slate-500 text-[11px] font-semibold">
                            {t('signup_already_account')}{' '}
                            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors hover:underline">
                                {t('signup_sign_in')}
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Signup;

