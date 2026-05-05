import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Menu, Search, Bell, ChevronDown, Box,
    LayoutDashboard, FileQuestion, FileText, Settings, X
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import NotificationDropdown from '../components/layout/NotificationDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useBranding } from '../context/BrandingContext';
import WorkspaceStatusOverlay from '../components/common/WorkspaceStatusOverlay';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const branding = useBranding();

    // Robustly check if running inside an iframe, so embedding state is preserved across navigations within the iframe
    const isEmbedded = window !== window.parent || new URLSearchParams(location.search).get('embedded') === 'true';

    if (isEmbedded) {
        return (
            <div className="w-full h-screen overflow-y-auto bg-slate-50 custom-scrollbar">
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

    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = userData.name || 'User';
    const userRole = userData.roles && userData.roles.length > 0
        ? userData.roles[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : 'User';

    const getPageTitle = (path) => {
        // Dashboard & Profile
        if (path.startsWith('/dashboard')) return { title: 'Dashboard', subtitle: 'Overview & Statistics' };
        if (path.startsWith('/ai-workspace')) return { title: 'AI Workspace', subtitle: 'Smart Chat & Content Engine' };
        if (path.startsWith('/profile')) return { title: 'My Profile', subtitle: 'Manage your account settings' };
        if (path.startsWith('/notifications')) return { title: 'Notifications', subtitle: 'All system alerts and updates' };

        // Admin & Management
        if (path.startsWith('/institutes')) return { title: 'Institutes', subtitle: 'Manage connected institutions' };
        if (path.startsWith('/users')) return { title: 'User Management', subtitle: 'Manage roles and user access' };

        // Exams & Questions
        if (path.startsWith('/exams/generate')) return { title: 'Exam Generator', subtitle: 'Auto-generate AI exams or construct manually' };
        if (path.startsWith('/exams/download')) return { title: 'Download Exams', subtitle: 'Export your saved exams' };
        if (path.startsWith('/exams')) return { title: 'Exam Controller', subtitle: 'Manage all exams & papers' };
        if (path.startsWith('/questions')) return { title: 'Question Bank', subtitle: 'Manage and explore questions in the repository' };

        // Academic
        if (path.startsWith('/admin/academic')) return { title: 'Academic Structure', subtitle: 'Configure classes, subjects & curriculum' };
        if (path.startsWith('/admin/curriculum')) return { title: 'Curriculum Library', subtitle: 'Manage curriculum guidelines' };

        // Knowledge Hub
        if (path.startsWith('/knowledge-hub/library')) return { title: 'Resource Library', subtitle: 'Manage PDF books and files' };
        if (path.startsWith('/knowledge-hub/mapping')) return { title: 'Curriculum Mapping', subtitle: 'Bridge source indices to canonical topics' };
        if (path.startsWith('/knowledge-hub/proofreading')) return { title: 'Digitization Workspace', subtitle: 'Extract, Map & Ingest to Vector DB' };
        if (path.startsWith('/knowledge-hub/digitization')) return { title: 'Upload Workspace', subtitle: 'Upload pages for digitization' };
        if (path.startsWith('/knowledge-hub')) return { title: 'Knowledge Hub', subtitle: 'AI brain and knowledge resources' };

        // AI Tools
        if (path.startsWith('/ai')) return { title: 'AI Integration', subtitle: 'API keys and history tracking' };

        // Lectures
        if (path.startsWith('/lectures')) return { title: 'Lecture Sheets', subtitle: 'Manage and build learning materials' };

        // Support & CMS
        if (path.startsWith('/cms')) return { title: 'Content Management (CMS)', subtitle: 'Manage blogs, news, and landing pages' };
        if (path.startsWith('/support')) return { title: 'Support & Tickets', subtitle: 'Customer support and knowledge base' };

        // Reports & Billing
        if (path.startsWith('/reports')) return { title: 'Analytics & Reports', subtitle: 'Detailed usage and performance stats' };
        if (path.startsWith('/billing')) return { title: 'Billing & Packages', subtitle: 'Manage subscriptions and invoices' };

        // Settings
        if (path.startsWith('/settings')) return { title: 'Settings', subtitle: 'System configurations' };

        return { title: 'Question Shaper', subtitle: 'Core System Platform' };
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
    }, [location.pathname]);

    const title = dynamicTitle?.title || defaultTitleInfo.title;
    const subtitle = dynamicTitle?.subtitle || defaultTitleInfo.subtitle;

    const isSuperAdmin = userData?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    }) || userData?.email === 'admin';
    const isDefaultInstitute = isSuperAdmin || userData?.instituteName === 'DEFAULT' || userData?.instituteName === 'Default Institute';
    
    // Sidebar is entirely restricted to Admins & Default Institute users
    const hideSidebar = !isDefaultInstitute;

    const isAiWorkspace = location.pathname.startsWith('/ai-workspace');
    const isFullscreenWorkspace = location.pathname.includes('editor') || 
                                  location.pathname.includes('/knowledge-hub/proofreading') || 
                                  location.pathname.includes('/knowledge-hub/digitization') ||
                                  isAiWorkspace;
    
    const isZeroPaddingRoute = isFullscreenWorkspace || location.pathname.startsWith('/questions');

    const isPendingApproval = userData?.instituteStatus === 'INACTIVE' || userData?.instituteStatus === 'PENDING';
    const isSuspended = userData?.instituteStatus === 'SUSPENDED';

    if (!isSuperAdmin && !isDefaultInstitute && (isPendingApproval || isSuspended)) {
        return <WorkspaceStatusOverlay user={userData} onLogout={handleLogout} />;
    }

    return (
        <div className="flex h-screen bg-[#F8F9FC] font-sans text-slate-900 overflow-hidden print:block print:h-auto print:overflow-visible">
            {/* Impersonation Banner */}
            {isImpersonating && (
                <div className="fixed top-0 left-0 right-0 h-10 bg-red-600 text-white flex items-center justify-center z-50 px-4 shadow-md print:hidden">
                    <span className="text-xs sm:text-sm font-medium mr-4 truncate">
                        Impersonating a user. Restricted access applies.
                    </span>
                    <button
                        onClick={handleRevertToAdmin}
                        className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-wide shrink-0"
                    >
                        Revert
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
                <header className="flex items-center justify-between h-14 md:h-[72px] px-4 md:px-6 bg-white border-b border-slate-100/80 sticky top-0 z-30 print:hidden">
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
                                    <h1 className="text-[17px] md:text-xl font-black text-slate-800 tracking-tight">{title}</h1>
                                    <p className="text-[11px] md:text-sm font-medium text-slate-500 tracking-wide mt-0.5">{subtitle}</p>
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
                    "flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 scroll-smooth overscroll-contain print:static print:block print:p-0 print:m-0 print:overflow-visible",
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
        </div>
    );
};

export default MainLayout;
