import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    const handleRevertToAdmin = () => {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
            localStorage.setItem('token', adminToken);
            localStorage.removeItem('adminToken');
            window.location.href = '/dashboard';
        }
    };

    const isImpersonating = !!localStorage.getItem('adminToken');

    const pageVariants = {
        initial: {
            opacity: 0,
            y: 20,
            scale: 0.98
        },
        in: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.4,
                ease: "easeOut"
            }
        },
        out: {
            opacity: 0,
            y: -20,
            scale: 0.98,
            transition: {
                duration: 0.3,
                ease: "easeIn"
            }
        }
    };

    return (
        <div className="flex h-screen bg-[#F8F9FC] font-sans text-slate-900 overflow-hidden">
            {/* Impersonation Banner */}
            {isImpersonating && (
                <div className="fixed top-0 left-0 right-0 h-10 bg-red-600 text-white flex items-center justify-center z-50 px-4 shadow-md">
                    <span className="text-sm font-medium mr-4">
                        You are currently impersonating a user. Restricted access applies.
                    </span>
                    <button
                        onClick={handleRevertToAdmin}
                        className="bg-white text-red-600 px-3 py-1 rounded-full text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-wide"
                    >
                        Back to Super Admin
                    </button>
                </div>
            )}

            {/* Sidebar Overlay for Mobile */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                        style={{ top: isImpersonating ? '40px' : '0' }}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <div className={clsx("h-full", isImpersonating && "pt-10")}>
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    onLogout={handleLogout}
                />
            </div>

            {/* Main Content */}
            <div className={clsx("flex-1 flex flex-col min-w-0 overflow-hidden relative", isImpersonating && "pt-10")}>
                {/* Header */}
                <header className="flex items-center justify-between h-20 px-6 bg-white border-b border-slate-100/80 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 text-slate-500 rounded-lg md:hidden hover:bg-slate-50 transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {/* Search Bar - Hidden on small mobile */}
                        <div className="hidden sm:flex items-center relative">
                            <Search className="w-5 h-5 text-slate-400 absolute left-3 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search orders, products, or customers..."
                                className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm w-64 lg:w-96 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-6">
                        <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                        </button>

                        <div className="h-8 w-[1px] bg-slate-100 hidden sm:block"></div>

                        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-all">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-sm font-bold text-slate-800 leading-tight">Zahid Babu</span>
                                <span className="text-[11px] font-medium text-slate-500">Super Admin</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20">
                                Z
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial="initial"
                                animate="in"
                                exit="out"
                                variants={pageVariants}
                            >
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
