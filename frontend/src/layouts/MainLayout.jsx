import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Menu, Search, Bell, ChevronDown, Box,
    LayoutDashboard, FileQuestion, FileText, Settings, X, ArrowLeft, Globe
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import NotificationDropdown from '../components/layout/NotificationDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useBranding } from '../context/BrandingContext';
import { useLanguage } from '../context/LanguageContext';
import WorkspaceStatusOverlay from '../components/common/WorkspaceStatusOverlay';
import IdleSessionTimeout from '../components/common/IdleSessionTimeout';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const branding = useBranding();
    const { currentLang, t, changeLanguage } = useLanguage();

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userRoles = (userData?.roles || []).map(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName;
    });
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ROLE_SUPER_ADMIN') || userData?.email === 'admin' || userData?.email?.includes('admin@');
    const isDefaultInstitute = isSuperAdmin || userData?.instituteName?.toUpperCase() === 'DEFAULT' || userData?.instituteName === 'Default Institute';

    // Robustly check if running inside an iframe, so embedding state is preserved across navigations within the iframe
    const searchParams = new URLSearchParams(location.search);
    const embeddedParam = searchParams.get('embedded');
    if (embeddedParam === 'true') {
        sessionStorage.setItem('embedded', 'true');
    } else if (
        embeddedParam === 'false' || 
        location.pathname === '/dashboard' || 
        (window.innerWidth >= 1024 && !embeddedParam)
    ) {
        sessionStorage.removeItem('embedded');
    }
    const isEmbedded = window !== window.parent || 
                       embeddedParam === 'true' || 
                       sessionStorage.getItem('embedded') === 'true';

    if (isEmbedded) {
        const showFloatingBack = location.pathname !== '/questions/approved' && 
                                 location.pathname !== '/ai-workspace';
        return (
            <div className="w-full h-screen overflow-y-auto bg-slate-50 custom-scrollbar relative">
                {showFloatingBack && (
                    <button
                        onClick={() => navigate(-1)}
                        className="fixed top-4 left-4 z-[9999] flex items-center justify-center w-9 h-9 bg-white/95 backdrop-blur-md border border-slate-200/80 hover:bg-white text-slate-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group"
                        title={t('go_back')}
                    >
                        <ArrowLeft size={16} className="stroke-[2.5] transition-transform group-hover:-translate-x-0.5" />
                    </button>
                )}
                <Outlet />
            </div>
        );
    }


    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        if (branding && branding.refreshBranding) {
            branding.refreshBranding();
        }
        navigate('/login');
    };


    const handleRevertToAdmin = () => {
        const adminToken = localStorage.getItem('adminToken');
        const adminUser = localStorage.getItem('adminUser');
        if (adminToken && adminUser) {
            localStorage.setItem('token', adminToken);
            localStorage.setItem('user', adminUser);
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            if (branding && branding.refreshBranding) {
                branding.refreshBranding();
            }
            window.location.href = '/dashboard';
        }
    };


    const isImpersonating = !!localStorage.getItem('adminToken');

    const pageVariants = {
        initial: {
            opacity: 0,
            y: 12,
        },
        in: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1]
            }
        },
        out: {
            opacity: 0,
            y: -12,
            transition: {
                duration: 0.2,
                ease: [0.4, 0, 1, 1]
            }
        }
    };

    /* ─── Bottom Tab Bar Items (Mobile Only) ─── */
    const bottomTabs = [
        { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
        { icon: FileQuestion, label: 'Questions', path: '/questions' },
        { icon: FileText, label: 'Exams', path: '/exams/generate/auto' },
        { icon: Settings, label: 'Settings', path: '/settings/general' },
    ];

    const isTabActive = (path) => location.pathname.startsWith(path.replace(/\/[^/]*$/, '')) || location.pathname === path;

    const userName = userData.name || 'User';
    const userRole = userData.roles && userData.roles.length > 0
        ? userData.roles[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : 'User';

    const getPageTitle = (path) => {
        // Dashboard & Profile
        if (path.startsWith('/dashboard')) return { title: t('title_dashboard'), subtitle: t('subtitle_dashboard') };
        if (path.startsWith('/ai-workspace')) return { title: t('title_ai_workspace'), subtitle: t('subtitle_ai_workspace') };
        if (path.startsWith('/profile')) return { title: t('title_profile'), subtitle: t('subtitle_profile') };
        if (path.startsWith('/notifications')) return { title: t('title_notifications'), subtitle: t('subtitle_notifications') };

        // Admin & Management
        if (path.startsWith('/institutes')) return { title: t('title_institutes'), subtitle: t('subtitle_institutes') };
        if (path.startsWith('/users')) return { title: t('title_users'), subtitle: t('subtitle_users') };

        // Exams & Questions
        if (path.startsWith('/exams/generate')) return { title: t('title_exams_generate'), subtitle: t('subtitle_exams_generate') };
        if (path.startsWith('/exams/download')) return { title: t('title_exams_download'), subtitle: t('subtitle_exams_download') };
        if (path.startsWith('/exams')) return { title: t('title_exams'), subtitle: t('subtitle_exams') };
        if (path.startsWith('/questions')) return { title: t('title_questions'), subtitle: t('subtitle_questions') };

        // Academic
        if (path.startsWith('/admin/academic')) return { title: t('title_academic'), subtitle: t('subtitle_academic') };
        if (path.startsWith('/admin/curriculum')) return { title: t('title_curriculum'), subtitle: t('subtitle_curriculum') };

        // Knowledge Hub
        if (path.startsWith('/knowledge-hub/library')) return { title: t('title_knowledge_hub_library'), subtitle: t('subtitle_knowledge_hub_library') };
        if (path.startsWith('/knowledge-hub/mapping')) return { title: t('title_knowledge_hub_mapping'), subtitle: t('subtitle_knowledge_hub_mapping') };
        if (path.startsWith('/knowledge-hub/proofreading')) return { title: t('title_knowledge_hub_proofreading'), subtitle: t('subtitle_knowledge_hub_proofreading') };
        if (path.startsWith('/knowledge-hub/digitization')) return { title: t('title_knowledge_hub_digitization'), subtitle: t('subtitle_knowledge_hub_digitization') };
        if (path.startsWith('/knowledge-hub/reader')) return { title: t('title_knowledge_hub_reader'), subtitle: t('subtitle_knowledge_hub_reader') };
        if (path.startsWith('/knowledge-hub/ai-reader')) return { title: t('title_knowledge_hub_ai_reader'), subtitle: t('subtitle_knowledge_hub_ai_reader') };
        if (path.startsWith('/knowledge-hub')) return { title: t('title_knowledge_hub'), subtitle: t('subtitle_knowledge_hub') };

        // AI Tools
        if (path.startsWith('/ai')) return { title: t('title_ai'), subtitle: t('subtitle_ai') };

        // Lectures
        if (path.startsWith('/lectures')) return { title: t('title_lectures'), subtitle: t('subtitle_lectures') };

        // Support & CMS
        if (path.startsWith('/cms')) return { title: t('title_cms'), subtitle: t('subtitle_cms') };
        if (path.startsWith('/support')) return { title: t('title_support'), subtitle: t('subtitle_support') };

        // Reports & Billing
        if (path.startsWith('/reports')) return { title: t('title_reports'), subtitle: t('subtitle_reports') };
        if (path.startsWith('/billing')) return { title: t('title_billing'), subtitle: t('subtitle_billing') };

        // Settings
        if (path.startsWith('/settings')) return { title: t('title_settings'), subtitle: t('subtitle_settings') };

        return { title: t('title_system_default'), subtitle: t('subtitle_system_default') };
    };

    const defaultTitleInfo = getPageTitle(location.pathname);

    const [dynamicTitle, setDynamicTitle] = useState(null);

    useEffect(() => {
        const handleDynamicTitle = (e) => setDynamicTitle(e.detail);
        window.addEventListener('setDynamicPageTitle', handleDynamicTitle);
        return () => window.removeEventListener('setDynamicPageTitle', handleDynamicTitle);
    }, []);

    useEffect(() => {
        setDynamicTitle(null);
        setIsEditingTitle(false);
    }, [location.pathname]);

    const title = dynamicTitle?.title || defaultTitleInfo.title;
    const subtitle = dynamicTitle?.subtitle || defaultTitleInfo.subtitle;

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const titleInputRef = useRef(null);

    const handleTitleClick = () => {
        if (dynamicTitle?.isEditable) {
            setTempTitle(title);
            setIsEditingTitle(true);
            setTimeout(() => {
                if (titleInputRef.current) {
                    titleInputRef.current.focus();
                    titleInputRef.current.select();
                }
            }, 0);
        }
    };

    const handleTitleBlur = () => {
        setIsEditingTitle(false);
        if (tempTitle.trim() !== '' && tempTitle !== title && dynamicTitle?.onTitleChange) {
            dynamicTitle.onTitleChange(tempTitle);
        }
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTitleBlur();
        } else if (e.key === 'Escape') {
            setIsEditingTitle(false);
            setTempTitle(title);
        }
    };

    
    
    // Sidebar, Header, and Bottom Bar can be hidden dynamically
    const hideSidebar = dynamicTitle?.hideLayoutBars === true || 
                        location.pathname === '/ai-workspace' ||
                        location.pathname.includes('/lectures/editor') ||
                        location.pathname.includes('/nexus-editor');

    const isAiWorkspace = location.pathname.startsWith('/ai-workspace');
    const isFullscreenWorkspace = location.pathname.includes('editor') || 
                                  location.pathname.includes('/knowledge-hub/proofreading') || 
                                  location.pathname.includes('/knowledge-hub/digitization') ||
                                  location.pathname.includes('/knowledge-hub/reader') ||
                                  location.pathname.includes('/knowledge-hub/ai-reader') ||
                                  isAiWorkspace;
    
    const isZeroPaddingRoute = isFullscreenWorkspace || location.pathname.startsWith('/questions');

    const isTeacherOrStudent = userRoles.includes('TEACHER') || userRoles.includes('ROLE_TEACHER') || userRoles.includes('STUDENT') || userRoles.includes('ROLE_STUDENT');

    const isPendingApproval = !isTeacherOrStudent && (userData?.instituteStatus === 'INACTIVE' || userData?.instituteStatus === 'PENDING');
    const isSuspended = userData?.instituteStatus === 'SUSPENDED';
    const isMissingInstituteInfo = !isTeacherOrStudent && !isSuperAdmin && !isDefaultInstitute && (!userData?.instituteNameEn || !userData?.instituteNameBn);

    if (!isSuperAdmin && !isDefaultInstitute && (isPendingApproval || isSuspended || isMissingInstituteInfo)) {
        return <WorkspaceStatusOverlay user={userData} onLogout={handleLogout} />;
    }

    return (
        <div className="flex h-screen bg-[#F7F9FC] font-sans text-slate-900 overflow-hidden print:block print:h-auto print:overflow-visible relative">
            {/* Ambient background blur elements for glassmorphism depth */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none select-none z-0"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/5 blur-[120px] pointer-events-none select-none z-0"></div>

            {/* Impersonation Banner */}
            {isImpersonating && (
                <div className="fixed top-0 left-0 right-0 h-10 bg-red-600 text-white flex items-center justify-center z-50 px-4 shadow-md print:hidden">
                    <span className="text-xs sm:text-sm font-medium mr-4 truncate">
                        {t('impersonating_msg')}
                    </span>
                    <button
                        onClick={handleRevertToAdmin}
                        className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-wide shrink-0"
                    >
                        {t('revert')}
                    </button>
                </div>
            )}


            {/* Sidebar */}
            {!hideSidebar && (
            <div className={clsx("h-full print:hidden", isImpersonating && "pt-10")}>
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    onLogout={handleLogout}
                />
            </div>
            )}

            {/* Main Content */}
            <div className={clsx("flex-1 flex flex-col min-w-0 overflow-hidden relative print:static print:block print:p-0 print:m-0 print:overflow-visible", isImpersonating && "pt-10")}>

                {/* Header */}
                {!hideSidebar && (
                <header className="flex items-center justify-between h-14 md:h-[72px] px-4 md:px-6 border-b border-white/60 sticky top-0 z-40 print:hidden shadow-sm shadow-slate-100/40 relative">
                    <div className="absolute inset-0 glass-panel -z-10 pointer-events-none" />
                    <div className="flex items-center gap-2 md:gap-4">
                        {!hideSidebar && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-1 text-slate-500 rounded-xl md:hidden hover:bg-slate-50 transition-colors active:scale-90"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        )}

                        {/* Mobile: Logo / Desktop: Dynamic Header Title */}
                        <div className="md:hidden flex items-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.1 }}
                            >
                                {branding?.logo_url ? (
                                    <img src={branding.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
                                ) : (
                                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                        {branding?.system_name ? branding.system_name.charAt(0) : 'Q'}
                                    </div>
                                )}
                            </motion.div>
                        </div>

                        {/* Desktop: Dynamic Header Title or Logo if sidebar is hidden */}
                        <div className="hidden md:flex items-center gap-3">
                            {hideSidebar ? (
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                                    {branding?.logo_url ? (
                                        <img src={branding.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-md text-white">
                                                <Box strokeWidth={2.5} size={16} />
                                            </div>
                                            <span className="text-[17px] font-black text-slate-800 tracking-tight leading-tight">
                                                {branding?.system_name || 'Question Shaper'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {isEditingTitle ? (
                                        <input
                                            ref={titleInputRef}
                                            type="text"
                                            value={tempTitle}
                                            onChange={(e) => setTempTitle(e.target.value)}
                                            onBlur={handleTitleBlur}
                                            onKeyDown={handleTitleKeyDown}
                                            className="text-[17px] md:text-xl font-black text-slate-800 tracking-tight bg-transparent border-b-2 border-indigo-500 outline-none w-full max-w-[400px] px-1 -ml-1"
                                        />
                                    ) : (
                                        <h1 
                                            onClick={handleTitleClick}
                                            className={clsx(
                                                "text-[17px] md:text-xl font-black text-slate-800 tracking-tight transition-colors px-1 -ml-1 rounded",
                                                dynamicTitle?.isEditable && "cursor-pointer hover:bg-slate-100"
                                            )}
                                            title={dynamicTitle?.isEditable ? "Click to edit" : ""}
                                        >
                                            {title}
                                        </h1>
                                    )}
                                    <p className="text-[11px] md:text-sm font-medium text-slate-500 tracking-wide mt-0.5 px-1 -ml-1">{subtitle}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
                        
                        {/* Dynamic Actions Portal Target */}
                        <div id="topbar-actions" className="flex items-center gap-1 md:gap-2 empty:hidden"></div>

                        {/* Mobile Search toggle */}
                        <button
                            onClick={() => setShowMobileSearch(s => !s)}
                            className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors active:scale-90"
                        >
                            {showMobileSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                        </button>

                        {/* Language Selector Dropdown */}
                        <div className="relative group shrink-0">
                            <button
                                type="button"
                                className="p-2 text-slate-500 hover:bg-slate-150 rounded-xl transition-all active:scale-90 flex items-center gap-1.5 cursor-pointer border border-slate-100 hover:border-slate-200 bg-white/40 shadow-sm"
                                title="ভাষা পরিবর্তন / Switch Language"
                            >
                                <Globe className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                                <span className="text-[10px] font-extrabold text-slate-500 hidden sm:inline uppercase tracking-wider">{currentLang}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-350 transition-transform group-hover:rotate-180 duration-300" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            <div className="absolute right-0 mt-1.5 w-32 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 py-1.5 transform scale-95 group-hover:scale-100 origin-top-right">
                                <button
                                    type="button"
                                    onClick={() => changeLanguage('en')}
                                    className={clsx(
                                        "w-full text-left px-3.5 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer",
                                        currentLang === 'en' ? "text-blue-600 bg-blue-50/50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <span>English</span>
                                    {currentLang === 'en' && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => changeLanguage('bn')}
                                    className={clsx(
                                        "w-full text-left px-3.5 py-2 text-xs font-bold transition-colors flex items-center justify-between cursor-pointer",
                                        currentLang === 'bn' ? "text-blue-600 bg-blue-50/50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <span>বাংলা</span>
                                    {currentLang === 'bn' && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>}
                                </button>
                            </div>
                        </div>

                        <NotificationDropdown />

                        {/* Gamification Badge (XP) */}
                        <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-amber-100 to-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60 shadow-inner" title="Contribution Points">
                            <span className="text-amber-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            </span>
                            <span className="text-sm font-bold text-amber-900 tracking-tight">{userData.contributionPoints || 0} XP</span>
                        </div>

                        <div className="h-6 w-[1px] bg-slate-100 hidden sm:block"></div>

                        <Link to="/profile" className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-xl transition-all active:scale-[0.97]">
                            <div className="hidden sm:flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-800 leading-tight">{userName}</span>
                                <span className="text-[10px] font-medium text-slate-500">{userRole}</span>
                            </div>
                            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-primary/15">
                                {userName.charAt(0)}
                            </div>
                        </Link>
                    </div>
                </header>
                )}


                {/* Mobile Search Bar (Slide Down) */}
                {!hideSidebar && (
                <AnimatePresence>
                    {showMobileSearch && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden bg-white border-b border-slate-100 overflow-hidden print:hidden"
                        >
                            <div className="px-4 py-3">
                                <div className="relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Search anything..."
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                )}

                {/* Page Content — extra bottom padding on mobile for tab bar */}
                <main id="main-scroll-container" className={clsx(
                    "flex-1 overflow-x-hidden pb-16 md:pb-0 scroll-smooth overscroll-contain print:static print:block print:p-0 print:m-0 print:overflow-visible",
                    isFullscreenWorkspace ? "overflow-hidden" : "overflow-y-auto",
                    isZeroPaddingRoute ? "p-0" : "p-3 md:p-6 lg:p-8"
                )}>
                    <div className={clsx(
                        "transition-all duration-300 w-full",
                        isFullscreenWorkspace ? "h-full" : "max-w-none"
                    )}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial="initial"
                                animate="in"
                                exit="out"
                                variants={pageVariants}
                                className={clsx(isFullscreenWorkspace && "h-full")}
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>

                {/* ─── Mobile Bottom Tab Bar ─── */}
                {!hideSidebar && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-100 px-2 safe-area-bottom print:hidden">
                    <div className="flex items-center justify-around h-14">
                        {bottomTabs.map(tab => {
                            const active = isTabActive(tab.path);
                            return (
                                <Link
                                    key={tab.path}
                                    to={tab.path}
                                    className={clsx(
                                        "flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl transition-all active:scale-90 min-w-[56px]",
                                        active ? "text-primary" : "text-slate-400"
                                    )}
                                >
                                    <tab.icon size={20} strokeWidth={active ? 2.2 : 1.5} />
                                    <span className={clsx(
                                        "text-[10px] leading-tight",
                                        active ? "font-bold" : "font-medium"
                                    )}>
                                        {tab.label}
                                    </span>
                                    {active && (
                                        <div className="absolute -top-px left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full"></div>
                                    )}
                                </Link>
                            );
                        })}
                        {/* The Menu button as the 5th tab */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl text-slate-400 transition-all active:scale-90 min-w-[56px]"
                        >
                            <Menu size={20} strokeWidth={1.5} />
                            <span className="text-[10px] font-medium leading-tight">More</span>
                        </button>
                    </div>
                </nav>
                )}
            </div>
            <IdleSessionTimeout />
        </div>
    );
};

export default MainLayout;
