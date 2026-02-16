import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, School, BookOpen, FileQuestion,
    FileText, Layers, BarChart, CreditCard, Settings,
    MessageSquare, ChevronDown, ChevronRight, X, LogOut,
    Globe, Shield, Box, Building2
} from 'lucide-react';
import clsx from 'clsx';

const MENU_ITEMS = [
    {
        title: 'Dashboard',
        icon: <LayoutDashboard size={22} strokeWidth={1.5} />,
        path: '/dashboard'
    },
    {
        title: 'User Management',
        icon: <Users size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'All Users', path: '/users' },
            { title: 'Teachers', path: '/users/teachers' },
            { title: 'Students', path: '/users/students' },
            { title: 'Pending Approvals', path: '/users/pending' },
            { title: 'Roles & Permissions', path: '/users/roles' },
            { title: 'Blocked Users', path: '/users/blocked' },
        ]
    },
    {
        title: 'Institute Management',
        icon: <School size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'All Institutes', path: '/institutes' },
            { title: 'Add Institute', path: '/institutes/add' },
            { title: 'Institute Admin List', path: '/institutes/admins' },
            { title: 'Subscription / Package', path: '/institutes/subscriptions' },
        ]
    },
    {
        title: 'Academic Structure',
        icon: <BookOpen size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'Overview', path: '/admin/academic/structure' },
            { title: 'Classes / Grades', path: '/admin/academic/classes' },
            { title: 'Subjects', path: '/admin/academic/subjects' },
            { title: 'Chapters', path: '/admin/academic/chapters' },
            { title: 'Topics', path: '/admin/academic/topics' },
        ]
    },
    {
        title: 'Question Bank',
        icon: <FileQuestion size={22} strokeWidth={1.5} />,
        submenu: [
            {
                title: 'Repository',
                submenu: [
                    { title: 'All Questions', path: '/questions' },
                    { title: 'Pending', path: '/questions/pending' },
                    { title: 'Approved', path: '/questions/approved' },
                    { title: 'Rejected', path: '/questions/rejected' },
                ]
            },
            {
                title: 'Add Question',
                submenu: [
                    { title: 'MCQ', path: '/questions/create/mcq' },
                    { title: 'CQ (Creative)', path: '/questions/add/cq' },
                    { title: 'Short Question', path: '/questions/add/short' },
                ]
            },
            {
                title: 'Bulk Import',
                submenu: [
                    { title: 'Import Excel', path: '/questions/import/excel' },
                    { title: 'Import API', path: '/questions/import/api' },
                ]
            }
        ]
    },
    {
        title: 'Exam & Paper',
        icon: <FileText size={22} strokeWidth={1.5} />,
        submenu: [
            {
                title: 'Generator',
                submenu: [
                    { title: 'Auto Generate', path: '/exams/generate/auto' },
                    { title: 'Manual Select', path: '/exams/generate/manual' },
                ]
            },
            {
                title: 'Download',
                submenu: [
                    { title: 'PDF Format', path: '/exams/download/pdf' },
                    { title: 'Word Format', path: '/exams/download/word' },
                ]
            }
        ]
    },
    {
        title: 'Lectures',
        icon: <Layers size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'Create Sheet', path: '/lectures/create' },
            { title: 'Attach Questions', path: '/lectures/attach' },
        ]
    },
    {
        title: 'Reports',
        icon: <BarChart size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'Question Usage', path: '/reports/usage' },
            { title: 'Exam Performance', path: '/reports/performance' },
        ]
    },
    {
        title: 'Subscription',
        icon: <CreditCard size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'Packages', path: '/billing/packages' },
            { title: 'Transactions', path: '/billing/transactions' },
        ]
    },
    {
        title: 'CMS',
        icon: <Globe size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'Landing Page', path: '/cms/landing' },
            { title: 'Blog', path: '/cms/blog' },
        ]
    },
    {
        title: 'Settings',
        icon: <Settings size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'Security', path: '/settings/security' },
            { title: 'General', path: '/settings/general' },
            { title: 'Backup', path: '/settings/backup' },
        ]
    },
    {
        title: 'Support',
        icon: <MessageSquare size={22} strokeWidth={1.5} />,
        submenu: [
            { title: 'All Tickets', path: '/support/all' },
        ]
    }
];

const SidebarItem = ({ item, isExpanded, onToggle, expandedMenus, level = 0, isActive }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isItemActive = item.path ? isActive(item.path) : false;
    const isChildActive = hasSubmenu && item.submenu.some(child =>
        child.path ? isActive(child.path) : (child.submenu && child.submenu.some(grandChild => isActive(grandChild.path)))
    );

    return (
        <div className="mb-0.5">
            {hasSubmenu ? (
                <>
                    <button
                        onClick={() => onToggle(item.title)}
                        className={clsx(
                            "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                            (isExpanded || isChildActive)
                                ? "text-blue-600 bg-blue-50/80"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                        )}
                        style={{ paddingLeft: level > 0 ? `${level * 1.25 + 1}rem` : '1rem' }}
                    >
                        <div className="flex items-center gap-3.5">
                            {item.icon && <span className={clsx("transition-transform duration-300 group-hover:scale-110", (isExpanded || isChildActive) && "text-blue-600")}>{item.icon}</span>}
                            <span className={clsx((isExpanded || isChildActive) && "font-semibold")}>{item.title}</span>
                        </div>
                        <div className={clsx("ml-2 p-1 rounded-full transition-colors", (isExpanded || isChildActive) ? "bg-blue-100/50 text-blue-600" : "text-slate-400")}>
                            {isExpanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
                        </div>
                    </button>

                    <div className={clsx(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        isExpanded ? "max-h-[1000px] opacity-100 mt-1" : "max-h-0 opacity-0"
                    )}>
                        {item.submenu.map((subItem) => (
                            <SidebarItem
                                key={subItem.title}
                                item={subItem}
                                isExpanded={expandedMenus[subItem.title]}
                                onToggle={onToggle}
                                expandedMenus={expandedMenus}
                                isActive={isActive}
                                level={level + 1}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <Link
                    to={item.path}
                    className={clsx(
                        "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                        isItemActive
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                    style={{ paddingLeft: level > 0 ? `${level * 1.25 + 1}rem` : '1rem' }}
                >
                    {item.icon && <span className="mr-3.5 transition-transform duration-300 group-hover:scale-110">{item.icon}</span>}
                    <span className="relative z-10">{item.title}</span>
                </Link>
            )}
        </div>
    );
};


const Sidebar = ({ isOpen, onClose, onLogout }) => {
    const location = useLocation();
    const [expandedMenus, setExpandedMenus] = useState({});

    const toggleMenu = (title) => {
        setExpandedMenus(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    const isActive = (path) => location.pathname === path;

    // Helper to render recursively
    const renderSidebarItem = (item) => {
        const isExpanded = expandedMenus[item.title];
        return (
            <SidebarItem
                key={item.title}
                item={item}
                isExpanded={isExpanded}
                onToggle={toggleMenu}
                expandedMenus={expandedMenus}
                isActive={isActive}
            />
        );
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside className={clsx(
                "fixed md:static inset-y-0 left-0 z-30 w-[280px] bg-white flex flex-col transition-transform duration-300 ease-out md:translate-x-0 border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                            <Box strokeWidth={2.5} size={22} />
                        </div>
                        <div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight block leading-none">
                                QuestionShaper
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CMS v2.0</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
                    <div className="pb-4">
                        <p className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
                        {MENU_ITEMS.map(item => renderSidebarItem(item))}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100/80 hover:text-red-600 rounded-xl transition-all duration-200 gap-2 group"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
