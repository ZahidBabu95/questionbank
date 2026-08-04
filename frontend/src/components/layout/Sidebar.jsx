import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
    LayoutDashboard, Users, School, BookOpen, FileQuestion,
    FileText, Layers, BarChart, CreditCard, Settings,
    MessageSquare, ChevronDown, ChevronRight, X, LogOut,
    Globe, Shield, Box, Building2, PanelLeftClose, PanelLeftOpen, Brain, Sparkles,

    // Submenu distinct icons:
    ClipboardList, GraduationCap, UserCheck, UserX, Calendar,
    Database, Book, Library, Compass, List, Clock,
    CheckCircle2, AlertOctagon, HelpCircle, PenTool,
    AlignLeft, Grid, FileSpreadsheet, DollarSign, History,
    Zap, Save, Cpu, Edit2, Play, FileDown, Paperclip,
    PieChart, LineChart, ShieldAlert, Sliders, Bot, LifeBuoy, FileEdit,
    QrCode, Scan, GitCompare, Code
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranding } from '../../context/BrandingContext';




export const MENU_ITEMS = [
    {
        id: 'DASHBOARD',
        title: 'Dashboard',
        icon: <LayoutDashboard size={20} strokeWidth={1.8} />,
        path: '/dashboard',
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'],
        submenu: [
            { id: 'DASHBOARD_OVERVIEW', title: 'Overview', path: '/dashboard', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <ClipboardList size={20} strokeWidth={1.8} /> },
            { id: 'DASHBOARD_ADMIN', title: 'Institute Admin', path: '/dashboard/admin', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Building2 size={20} strokeWidth={1.8} /> },
            { id: 'DASHBOARD_TEACHER', title: 'Teacher Metrics', path: '/dashboard/teacher', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <GraduationCap size={20} strokeWidth={1.8} /> },
            { id: 'DASHBOARD_STUDENT', title: 'Student Performance', path: '/dashboard/student', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <UserCheck size={20} strokeWidth={1.8} /> }
        ]
    },
    {
        id: 'AI_WORKSPACE',
        title: 'AI Workspace',
        icon: <Sparkles size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'],
        submenu: [
            { id: 'AI_WORKSPACE_CHAT_CONSOLE', title: 'Chat Console', path: '/ai-workspace', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <MessageSquare size={20} strokeWidth={1.8} /> },
            { id: 'AI_WORKSPACE_TOOL_WIDGET_MANAGER', title: 'Tool & Widget Manager', path: '/ai-workspace/admin/tools', roles: ['SUPER_ADMIN'], icon: <Box size={20} strokeWidth={1.8} /> },
            { id: 'AI_WORKSPACE_COMMAND_SETTINGS', title: 'Command & Settings', path: '/ai-workspace/admin/settings', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Sliders size={20} strokeWidth={1.8} /> },
            { id: 'AI_WORKSPACE_PROMPT_RULES', title: 'Prompt Rules', path: '/ai-workspace/admin/prompts', roles: ['SUPER_ADMIN'], icon: <ShieldAlert size={20} strokeWidth={1.8} /> },
            { id: 'AI_WORKSPACE_PERSONAS_MAPPING', title: 'Personas Mapping', path: '/ai-workspace/admin/personas', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Users size={20} strokeWidth={1.8} /> },
            { id: 'AI_WORKSPACE_AUDIT_TELEMETRY', title: 'Audit & Telemetry', path: '/ai-workspace/admin/audit', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <LineChart size={20} strokeWidth={1.8} /> }
        ]
    },
    {
        id: 'USER_MANAGEMENT',
        title: 'User Management',
        icon: <Users size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'],
        submenu: [
            { id: 'USER_MANAGEMENT_ALL_USERS', title: 'All Users', path: '/users', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Users size={20} strokeWidth={1.8} /> },
            { id: 'USER_MANAGEMENT_TEACHERS', title: 'Teachers', path: '/users/teachers', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <GraduationCap size={20} strokeWidth={1.8} /> },
            { id: 'USER_MANAGEMENT_STUDENTS', title: 'Students', path: '/users/students', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <UserCheck size={20} strokeWidth={1.8} /> },
            { id: 'USER_MANAGEMENT_ROLES_PERMISSIONS', title: 'Roles & Permissions', path: '/users/roles', roles: ['SUPER_ADMIN'], icon: <Shield size={20} strokeWidth={1.8} /> },
            { id: 'USER_MANAGEMENT_BLOCKED_USERS', title: 'Blocked Users', path: '/users/blocked', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <UserX size={20} strokeWidth={1.8} /> },
        ]
    },
    {
        id: 'INSTITUTE_MANAGEMENT',
        title: 'Institute Management',
        icon: <School size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN'],
        submenu: [
            { id: 'INSTITUTE_MANAGEMENT_ALL_INSTITUTES', title: 'All Institutes', path: '/institutes', roles: ['SUPER_ADMIN'], icon: <Building2 size={20} strokeWidth={1.8} /> },
            { id: 'INSTITUTE_MANAGEMENT_ADD_INSTITUTE', title: 'Add Institute', path: '/institutes/add', roles: ['SUPER_ADMIN'], icon: <School size={20} strokeWidth={1.8} /> },
            { id: 'INSTITUTE_MANAGEMENT_INSTITUTE_ADMIN_LIST', title: 'Institute Admin List', path: '/institutes/admins', roles: ['SUPER_ADMIN'], icon: <Users size={20} strokeWidth={1.8} /> },
            { id: 'INSTITUTE_MANAGEMENT_SUBSCRIPTION_PACKAGE', title: 'Subscription / Package', path: '/institutes/subscriptions', roles: ['SUPER_ADMIN'], icon: <CreditCard size={20} strokeWidth={1.8} /> },
        ]
    },
    {
        id: 'ACADEMIC_STRUCTURE',
        title: 'Academic Structure',
        icon: <BookOpen size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'],
        submenu: [
            { id: 'ACADEMIC_STRUCTURE_CURRICULUM_HIERARCHY', title: 'Curriculum Hierarchy', path: '/admin/academic/structure', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Layers size={20} strokeWidth={1.8} /> },
            { id: 'ACADEMIC_STRUCTURE_ACADEMIC_SESSIONS', title: 'Academic Sessions', path: '/admin/academic/sessions', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Calendar size={20} strokeWidth={1.8} /> },
            { id: 'ACADEMIC_STRUCTURE_CURRICULUM_REPOSITORY', title: 'Curriculum Repository', path: '/admin/curriculum', roles: ['SUPER_ADMIN'], icon: <Database size={20} strokeWidth={1.8} /> },
        ]
    },
    {
        id: 'KNOWLEDGE_HUB',
        title: 'Knowledge Hub',
        icon: <Brain size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'],
        submenu: [
            { id: 'KNOWLEDGE_HUB_GENERAL_READER', title: 'General Book Reader', path: '/knowledge-hub/reader', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Book size={20} strokeWidth={1.8} /> },
            { id: 'KNOWLEDGE_HUB_AI_READER', title: 'AI Book Reader', path: '/knowledge-hub/ai-reader', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Sparkles size={20} strokeWidth={1.8} /> },
            { id: 'KNOWLEDGE_HUB_RESOURCE_LIBRARY', title: 'Resource Library', path: '/knowledge-hub/library', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Library size={20} strokeWidth={1.8} /> },
            { id: 'KNOWLEDGE_HUB_SYNCHRONIZED_LIBRARY', title: 'Synchronized Library', path: '/knowledge-hub/sync-library', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Library size={20} strokeWidth={1.8} /> },
            { id: 'KNOWLEDGE_HUB_COURSE_MAPPING', title: 'Course Mapping', path: '/knowledge-hub/mapping', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Compass size={20} strokeWidth={1.8} /> }
        ]
    },
    {
        id: 'QUESTION_BANK',
        title: 'Question Bank',
        icon: <FileQuestion size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'],
        submenu: [
            {
                id: 'QUESTION_BANK_REPOSITORY',
                title: 'Repository',
                roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'],
                submenu: [
                    { id: 'QUESTION_BANK_REPOSITORY_ALL_QUESTIONS', title: 'All Questions', path: '/questions', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <List size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_REPOSITORY_DRAFTS_AI_GENERATED', title: 'Drafts (AI Generated)', path: '/questions/drafts', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <FileEdit size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_REPOSITORY_PENDING', title: 'Pending', path: '/questions/pending', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Clock size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_REPOSITORY_APPROVED', title: 'Question Bank', path: '/questions/approved', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <CheckCircle2 size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_REPOSITORY_REJECTED', title: 'Rejected', path: '/questions/rejected', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <AlertOctagon size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_REPOSITORY_REVISED', title: 'Revised Requests', path: '/questions/revised', roles: ['SUPER_ADMIN'], icon: <GitCompare size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_REPOSITORY_SOURCE_MANAGEMENT', title: 'Source Management', path: '/questions/sources', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <HelpCircle size={20} strokeWidth={1.8} /> },
                ]
            },
            {
                id: 'QUESTION_BANK_ADD_QUESTION',
                title: 'Add Question',
                roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'],
                submenu: [
                    { id: 'QUESTION_BANK_ADD_QUESTION_MCQ', title: 'MCQ', path: '/questions/create/mcq', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <AlignLeft size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_ADD_QUESTION_CQ_CREATIVE', title: 'CQ (Creative)', path: '/questions/add/cq', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <PenTool size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_ADD_QUESTION_SHORT_QUESTION', title: 'Short Question', path: '/questions/add/short', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <AlignLeft size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_ADD_DYNAMIC', title: 'Dynamic Types', path: '/questions/create/dynamic', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Grid size={20} strokeWidth={1.8} /> },
                ]
            },
            {
                id: 'QUESTION_BANK_BULK_IMPORT',
                title: 'Bulk Import',
                roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'],
                submenu: [
                    { id: 'QUESTION_BANK_BULK_IMPORT_IMPORT_EXCEL', title: 'Import Excel', path: '/questions/import/excel', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <FileSpreadsheet size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_BULK_IMPORT_IMPORT_WITH_AI', title: 'Import With AI', path: '/questions/import/ai', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Sparkles size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_BULK_IMPORT_AI_COST_MANAGER', title: 'AI Cost Manager', path: '/questions/import/api', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <DollarSign size={20} strokeWidth={1.8} /> },
                    { id: 'QUESTION_BANK_BULK_IMPORT_UPLOAD_HISTORY', title: 'Upload History', path: '/ai/upload-history', roles: ['SUPER_ADMIN'], icon: <History size={20} strokeWidth={1.8} /> },
                ]
            }
        ]
    },
    {
        id: 'EXAM_PAPER',
        title: 'Exam & Paper',
        icon: <FileText size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'],
        submenu: [
            {
                id: 'EXAM_PAPER_GENERATOR',
                title: 'Generator',
                roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'],
                submenu: [
                    { id: 'EXAM_PAPER_GENERATOR_AUTO_GENERATE', title: 'Auto Generate', path: '/exams/generate/auto', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Zap size={20} strokeWidth={1.8} /> },
                    { id: 'EXAM_PAPER_GENERATOR_SAVED_EXAMS', title: 'Saved Exams', path: '/exams/generate/saved', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Save size={20} strokeWidth={1.8} /> },
                    { id: 'EXAM_PAPER_GENERATOR_NEXUS_PAPER_ENGINE_V2', title: 'Nexus Paper Engine (V2)', path: '/exams/generate/nexus-editor', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Cpu size={20} strokeWidth={1.8} /> },
                    { id: 'EXAM_PAPER_GENERATOR_LEGACY_EDITOR', title: 'Legacy Editor', path: '/exams/generate/editor', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Edit2 size={20} strokeWidth={1.8} /> },
                    { id: 'EXAM_PAPER_GENERATOR_MANUAL_SELECT', title: 'Manual Select', path: '/exams/generate/manual', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Play size={20} strokeWidth={1.8} /> },
                ]
            },
            {
                id: 'EXAM_PAPER_DOWNLOAD',
                title: 'Download',
                roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'],
                submenu: [
                    { id: 'EXAM_PAPER_DOWNLOAD_PDF_FORMAT', title: 'PDF Format', path: '/exams/download/pdf', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <FileDown size={20} strokeWidth={1.8} /> },
                    { id: 'EXAM_PAPER_DOWNLOAD_WORD_FORMAT', title: 'Word Format', path: '/exams/download/word', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <FileDown size={20} strokeWidth={1.8} /> },
                ]
            }
        ]
    },
    {
        id: 'OMR_MANAGEMENT',
        title: 'OMR Exam',
        icon: <QrCode size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'],
        submenu: [
            { id: 'OMR_MANAGEMENT_GENERATE', title: 'Generate OMR Sheets', path: '/omr/generate', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <FileDown size={20} strokeWidth={1.8} /> },
            { id: 'OMR_MANAGEMENT_SCAN', title: 'OMR Scanner', path: '/omr/scan', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <Scan size={20} strokeWidth={1.8} /> },
            { id: 'OMR_MANAGEMENT_RESULTS', title: 'OMR Results', path: '/omr/results', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <BarChart size={20} strokeWidth={1.8} /> }
        ]
    },
    {
        id: 'LECTURES',
        title: 'Lectures',
        icon: <Layers size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'],
        submenu: [
            { id: 'LECTURES_CREATE_SHEET', title: 'Create Sheet', path: '/lectures/editor', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <FileText size={20} strokeWidth={1.8} /> },
            { id: 'LECTURES_MANAGE_ATTACHMENTS', title: 'Saved Lecture Sheets', path: '/lectures/attach', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <Paperclip size={20} strokeWidth={1.8} /> },
        ]
    },
    {
        id: 'REPORTS',
        title: 'Reports',
        icon: <BarChart size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'],
        submenu: [
            { id: 'REPORTS_USAGE_SUMMARY', title: 'Usage Summary', path: '/reports/usage', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <PieChart size={20} strokeWidth={1.8} /> },
            { id: 'REPORTS_PERFORMANCE_INSIGHTS', title: 'Performance Insights', path: '/reports/performance', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER'], icon: <LineChart size={20} strokeWidth={1.8} /> },
            { id: 'REPORTS_KNOWLEDGE_HUB_REPORT', title: 'Knowledge Hub Report', path: '/reports/knowledge-hub', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Database size={20} strokeWidth={1.8} /> },
        ]
    },
    {
        id: 'BILLING_AI_QUOTA',
        title: 'Billing & AI Quota',
        icon: <CreditCard size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'],
        submenu: [
            { id: 'BILLING_AI_QUOTA_OVERVIEW', title: 'Overview', path: '/billing/overview', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <CreditCard size={20} strokeWidth={1.8} /> },
            { id: 'BILLING_AI_QUOTA_SUBSCRIPTION_PACKAGES', title: 'Subscription Packages', path: '/billing/packages', roles: ['SUPER_ADMIN'], icon: <Box size={20} strokeWidth={1.8} /> },
            { id: 'BILLING_AI_QUOTA_MANAGE_SUBSCRIPTIONS', title: 'Manage Subscriptions', path: '/billing/subscriptions', roles: ['SUPER_ADMIN'], icon: <Settings size={20} strokeWidth={1.8} /> },
            { id: 'BILLING_AI_QUOTA_INVOICES', title: 'Invoices', path: '/billing/invoices', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <FileText size={20} strokeWidth={1.8} /> },
            { id: 'BILLING_AI_QUOTA_AI_USAGE_TRACKER', title: 'AI Usage & Tracker', path: '/billing/ai-usage', roles: ['SUPER_ADMIN'], icon: <LineChart size={20} strokeWidth={1.8} /> },
        ]
    },
    {
        id: 'CMS',
        title: 'CMS',
        icon: <Globe size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN'],
        submenu: [
            { id: 'CMS_LANDING_PAGE', title: 'Landing Page', path: '/cms/landing', roles: ['SUPER_ADMIN'], icon: <Globe size={20} strokeWidth={1.8} /> },
            { id: 'CMS_BLOG_REPOSITORY', title: 'Blog Repository', path: '/cms/blog/posts', roles: ['SUPER_ADMIN'], icon: <FileText size={20} strokeWidth={1.8} /> },
        ]
    },
    {
        id: 'SETTINGS',
        title: 'Settings',
        icon: <Settings size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'],
        submenu: [
            { id: 'SETTINGS_API_MANAGER', title: 'API Manager', path: '/settings/api-manager', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Code size={20} strokeWidth={1.8} /> },
            { id: 'SETTINGS_SECURITY', title: 'Security', path: '/settings/security', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Shield size={20} strokeWidth={1.8} /> },
            { id: 'SETTINGS_GENERAL', title: 'General', path: '/settings/general', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN'], icon: <Sliders size={20} strokeWidth={1.8} /> },
            { id: 'SETTINGS_QUESTION_TYPES', title: 'Question Types', path: '/settings/question-types', roles: ['SUPER_ADMIN'], icon: <List size={20} strokeWidth={1.8} /> },
            { id: 'SETTINGS_BACKUP', title: 'Backup', path: '/settings/backup', roles: ['SUPER_ADMIN'], icon: <Database size={20} strokeWidth={1.8} /> },
        ]
    },
    {
        id: 'SUPPORT',
        title: 'Support',
        icon: <MessageSquare size={20} strokeWidth={1.8} />,
        roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'],
        submenu: [
            { id: 'SUPPORT_ALL_TICKETS', title: 'All Tickets', path: '/support/all', roles: ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'STUDENT'], icon: <LifeBuoy size={20} strokeWidth={1.8} /> },
            { id: 'SUPPORT_AI_SUPPORT_ENGINE', title: 'AI Support Engine', path: '/support/knowledge', roles: ['SUPER_ADMIN'], icon: <Bot size={20} strokeWidth={1.8} /> },
        ]
    }
];

/* ─── Accordion Sidebar Item ─── */
const SidebarItem = ({ item, isExpanded, onToggle, expandedMenus, level = 0, isActive, onLinkClick, isCollapsed = false }) => {
    const { t } = useLanguage();
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isItemActive = item.path ? isActive(item.path) : false;
    const isChildActive = hasSubmenu && item.submenu.some(child =>
        child.path ? isActive(child.path) : (child.submenu && child.submenu.some(grandChild => isActive(grandChild.path)))
    );

    // Collapsed mode: only show icon, clicking navigates directly
    if (isCollapsed && level === 0) {
        return (
            <div className="mb-px" title={item.title}>
                {item.path ? (
                    <Link to={item.path} onClick={onLinkClick}
                        target={item.path?.startsWith('/ai-workspace') ? "_blank" : undefined}
                        className={clsx(
                            "flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200",
                            isItemActive ? "bg-gradient-to-br from-primary to-secondary text-white shadow-md" : "text-slate-400 hover:bg-slate-100 hover:text-primary"
                        )}>
                        {item.icon}
                    </Link>
                ) : (
                    <div className={clsx(
                        "flex items-center justify-center w-full h-11 rounded-xl transition-all duration-200 cursor-default",
                        isChildActive ? "text-primary bg-blue-50" : "text-slate-400 hover:bg-slate-100"
                    )}>
                        {item.icon}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="mb-px">
            {hasSubmenu ? (
                <>
                    <button
                        onClick={() => onToggle(item.title, level)}
                        className={clsx(
                            "w-full flex items-center justify-between rounded-2xl text-[13px] font-bold transition-all duration-200 group active:scale-[0.98]",
                            level === 0 ? "px-3 py-2.5" : "px-3 py-2",
                            (isExpanded || isChildActive)
                                ? "text-blue-700 bg-blue-500/10"
                                : "text-slate-600 hover:bg-slate-500/5 hover:text-slate-900",
                        )}
                        style={{ paddingLeft: level > 0 ? `${level * 1 + 0.75}rem` : '0.75rem' }}
                    >
                        <div className="flex items-center gap-3">
                            {item.icon && (
                                <span className={clsx(
                                    "transition-all duration-300 group-hover:scale-110 flex-shrink-0",
                                    (isExpanded || isChildActive) ? "text-primary" : "text-slate-400"
                                )}>
                                    {item.icon}
                                </span>
                            )}
                            <span className={clsx(
                                "truncate",
                                (isExpanded || isChildActive) && "font-semibold"
                             )}>
                                {t(item.id) || item.title}
                            </span>
                        </div>
                        <div className={clsx(
                            "ml-1 p-0.5 rounded-md transition-all duration-300",
                            (isExpanded || isChildActive) ? "text-blue-500 rotate-0" : "text-slate-300 -rotate-90"
                        )}>
                            <ChevronDown size={14} strokeWidth={2.5}
                                className={clsx("transition-transform duration-300", isExpanded ? "rotate-0" : "-rotate-90")}
                            />
                        </div>
                    </button>

                    <div className={clsx(
                        "overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        isExpanded ? "max-h-[600px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
                    )}>
                        <div className={clsx(level === 0 && "ml-3 border-l-2 border-slate-100 pl-0")}>
                            {item.submenu.map((subItem) => (
                                <SidebarItem
                                    key={subItem.title}
                                    item={subItem}
                                    isExpanded={expandedMenus[subItem.title]}
                                    onToggle={onToggle}
                                    expandedMenus={expandedMenus}
                                    isActive={isActive}
                                    level={level + 1}
                                    onLinkClick={onLinkClick}
                                />
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <Link
                    to={item.path}
                    onClick={onLinkClick}
                    target={item.path?.startsWith('/ai-workspace') ? "_blank" : undefined}
                    className={clsx(
                        "flex items-center rounded-2xl text-[13px] font-bold transition-all duration-200 group relative overflow-hidden active:scale-[0.97] shine-effect",
                        level === 0 ? "px-3 py-2.5" : "px-3 py-2",
                        isItemActive
                            ? "glossy-gradient-blue text-white"
                            : "text-slate-600 hover:bg-slate-500/5 hover:text-slate-900"
                    )}
                    style={{ paddingLeft: level > 0 ? `${level * 1 + 0.75}rem` : '0.75rem' }}
                >
                    {item.icon && (
                        <span className={clsx(
                            "mr-3 transition-transform duration-300 group-hover:scale-110 flex-shrink-0",
                            isItemActive ? "text-white" : "text-slate-400"
                        )}>
                            {item.icon}
                        </span>
                    )}
                    {!item.icon && level > 0 && (
                        <span className={clsx(
                            "w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0 transition-colors",
                            isItemActive ? "bg-white" : "bg-slate-400 group-hover:bg-blue-500"
                        )}></span>
                    )}
                    <span className="relative z-10 truncate tracking-wide">{t(item.id) || item.title}</span>
                    {isItemActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 pointer-events-none"></div>
                    )}
                </Link>
            )}
        </div>
    );
};


// Helper for dynamic permission checking matching RoleManagement
const generateMenuId = (itemOrTitle, parentId = '') => {
    if (typeof itemOrTitle === 'object' && itemOrTitle.id) return itemOrTitle.id;
    const title = typeof itemOrTitle === 'object' ? itemOrTitle.title : itemOrTitle;
    let baseId = title.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    return parentId ? `${parentId}_${baseId}` : baseId;
};

const Sidebar = ({ isOpen, onClose, onLogout }) => {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const branding = useBranding();
    const [expandedMenus, setExpandedMenus] = useState({});
    const [user, setUser] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        if (location.pathname.startsWith('/ai-workspace')) {
            setIsCollapsed(true);
        } else {
            setIsCollapsed(false);
        }
    }, [location.pathname]);

    const userRoles = (user?.roles || []).map(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName;
    });
    const isSuperAdmin = userRoles.includes('SUPER_ADMIN') || userRoles.includes('ROLE_SUPER_ADMIN') || user?.email === 'admin' || user?.email?.includes('admin@');
    const userPermissions = user?.permissions || [];

    const isAuthorized = (item, parentId = '') => {
        // SUPER_ADMIN has god-mode access to everything
        if (isSuperAdmin) return true;

        const generatedId = generateMenuId(item, parentId);
        const requiredPermission = `${generatedId}_VIEW`;

        // If the specific permission exists in user's permissions, use it!
        if (userPermissions.includes(requiredPermission)) return true;

        // Fallback: If it's a dashboard submenu, and the user has the parent DASHBOARD_VIEW permission,
        // and NONE of the dashboard submenus are explicitly present in the user's permissions array:
        // we grant default access based on the item's role array.
        // This ensures out-of-the-box functionality before the admin manually configures the submenus.
        if (generatedId.startsWith('DASHBOARD_') && userPermissions.includes('DASHBOARD_VIEW')) {
            const hasAnyDashboardSubmenuPermission = userPermissions.some(p => p.startsWith('DASHBOARD_') && p !== 'DASHBOARD_VIEW');
            if (!hasAnyDashboardSubmenuPermission) {
                // No submenu permissions have been saved for this user yet, so fallback to default roles check
                if (item.roles && item.roles.some(role => userRoles.includes(role))) {
                    return true;
                }
            }
        }

        return false;
    };

    const filterMenuItems = (items, parentId = '') => {
        return items
            .map(item => {
                const currentId = generateMenuId(item, parentId);
                const isAuth = isAuthorized(item, parentId);

                if (item.submenu) {
                    const filteredSubmenu = filterMenuItems(item.submenu, currentId);
                    // A parent menu should be visible if it is explicitly authorized OR if it has any authorized children
                    if (isAuth || filteredSubmenu.length > 0) {
                        return { ...item, submenu: filteredSubmenu };
                    }
                    return null;
                }

                // For a leaf menu (no submenu), it must be explicitly authorized
                return isAuth ? item : null;
            })
            .filter(item => item !== null);
    };

    const filteredMenuItems = filterMenuItems(MENU_ITEMS);

    // Helper to get a flat list of all leaf menu items for non-super-admin users
    const getFlatLeafMenuItems = (items) => {
        const flatList = [];
        
        const collect = (menuItem, parentIcon = null, parentTitle = '') => {
            const currentIcon = menuItem.icon || parentIcon;
            const currentTitle = menuItem.title;
            
            if (menuItem.submenu && menuItem.submenu.length > 0) {
                menuItem.submenu.forEach(sub => collect(sub, currentIcon, currentTitle));
            } else if (menuItem.path) {
                let displayTitle = menuItem.title;
                if (displayTitle === 'Overview' && parentTitle) {
                    displayTitle = `${parentTitle} Overview`;
                }
                flatList.push({
                    ...menuItem,
                    title: displayTitle,
                    icon: currentIcon,
                    submenu: undefined
                });
            }
        };
        
        items.forEach(item => collect(item));
        return flatList;
    };

    // Helper to group and order flat leaf items for non-super-admins
    const getGroupedAndOrderedMenuItems = (leafItems) => {
        // Define the exact paths we want to group and their order
        const orderMap = {
            '/ai-workspace': { index: 0, category: 'top' },
            '/questions/approved': { index: 1, category: 'top' },
            '/exams/generate/auto': { index: 2, category: 'exam_gen' },
            '/exams/generate/manual': { index: 3, category: 'exam_gen' },
            '/exams/generate/saved': { index: 4, category: 'exam_gen' },
            '/questions/create/mcq': { index: 5, category: 'create_q' },
            '/questions/add/cq': { index: 6, category: 'create_q' },
            '/questions/add/short': { index: 7, category: 'create_q' },
            '/exams/generate/nexus-editor': { index: 8, category: 'nexus' },
            '/omr/generate': { index: 9, category: 'omr_gen' },
            '/omr/scan': { index: 10, category: 'omr_gen' },
            '/omr/results': { index: 11, category: 'omr_gen' }
        };

        const topItems = [];
        const examGenItems = [];
        const createQItems = [];
        const nexusItems = [];
        const omrGenItems = [];
        const otherItems = [];

        leafItems.forEach(item => {
            const pathInfo = orderMap[item.path];
            if (pathInfo) {
                if (pathInfo.category === 'top') {
                    topItems.push(item);
                } else if (pathInfo.category === 'exam_gen') {
                    examGenItems.push(item);
                } else if (pathInfo.category === 'create_q') {
                    createQItems.push(item);
                } else if (pathInfo.category === 'nexus') {
                    nexusItems.push(item);
                } else if (pathInfo.category === 'omr_gen') {
                    omrGenItems.push(item);
                }
            } else {
                otherItems.push(item);
            }
        });

        const sortByOrder = (a, b) => {
            const orderA = orderMap[a.path]?.index ?? 999;
            const orderB = orderMap[b.path]?.index ?? 999;
            return orderA - orderB;
        };

        topItems.sort(sortByOrder);
        examGenItems.sort(sortByOrder);
        createQItems.sort(sortByOrder);
        nexusItems.sort(sortByOrder);
        omrGenItems.sort(sortByOrder);

        const result = [];

        // 1. Top items
        result.push(...topItems);

        // 2. EXAM GENERATION header
        if (examGenItems.length > 0) {
            result.push({ isHeader: true, title: 'EXAM GENERATION' });
            result.push(...examGenItems);
        }

        // 3. Create New Question header
        if (createQItems.length > 0) {
            result.push({ isHeader: true, title: 'Create New Question' });
            result.push(...createQItems);
        }

        // 4. Nexus Paper Engine (V2)
        result.push(...nexusItems);

        // 5. OMR OFFLINE EXAM header
        if (omrGenItems.length > 0) {
            result.push({ isHeader: true, title: 'OMR OFFLINE EXAM' });
            result.push(...omrGenItems);
        }

        // 6. Other items if any
        if (otherItems.length > 0) {
            result.push({ isHeader: true, title: 'More Options' });
            result.push(...otherItems);
        }

        return result;
    };

    const studentMenuItems = [
        {
            id: 'DASHBOARD',
            title: 'Dashboard',
            icon: <LayoutDashboard size={20} strokeWidth={1.8} />,
            path: '/dashboard'
        },
        {
            isHeader: true,
            title: 'Learning & Exams'
        },
        {
            id: 'PRACTICE_EXAM',
            title: 'Practice Exam',
            icon: <Zap size={20} strokeWidth={1.8} />,
            path: '/exams/generate/auto'
        },
        {
            id: 'LECTURE_SHEETS',
            title: 'Saved Lecture Sheets',
            icon: <Paperclip size={20} strokeWidth={1.8} />,
            path: '/lectures/attach'
        },
        {
            id: 'QUESTION_BANK',
            title: 'Q-Bank',
            icon: <FileQuestion size={20} strokeWidth={1.8} />,
            path: '/questions'
        },
        {
            id: 'MY_PROGRESS',
            title: 'My Progress',
            icon: <BarChart size={20} strokeWidth={1.8} />,
            path: '/reports/performance'
        },
        {
            isHeader: true,
            title: 'Support'
        },
        {
            id: 'SUPPORT_TICKETS',
            title: 'All Tickets',
            icon: <LifeBuoy size={20} strokeWidth={1.8} />,
            path: '/support/all'
        }
    ];

    const displayMenuItems = isSuperAdmin 
        ? filteredMenuItems 
        : (userRoles.includes('STUDENT')
            ? studentMenuItems
            : getGroupedAndOrderedMenuItems(getFlatLeafMenuItems(filteredMenuItems)));

    // ─── ACCORDION: One expanded at a time (per level) ───


    // ─── ACCORDION: One expanded at a time (per level) ───
    const toggleMenu = (title, level = 0) => {
        setExpandedMenus(prev => {
            const isCurrentlyExpanded = prev[title];
            
            // Helper to find the list of siblings for the clicked menu
            const findSiblings = (items, targetTitle) => {
                for (let item of items) {
                    if (item.title === targetTitle) {
                        return items;
                    }
                    if (item.submenu) {
                        const found = findSiblings(item.submenu, targetTitle);
                        if (found) return found;
                    }
                }
                return null;
            };

            const newState = { ...prev };

            // If we are expanding this menu, close all its siblings
            if (!isCurrentlyExpanded) {
                const siblings = findSiblings(MENU_ITEMS, title);
                if (siblings) {
                    siblings.forEach(sibling => {
                        if (sibling.title !== title) {
                            newState[sibling.title] = false;
                        }
                    });
                }
            }
            
            newState[title] = !isCurrentlyExpanded;
            return newState;
        });
    };

    const isActive = (path) => location.pathname === path;

    // Auto-expand the menu that contains the current active route
    useEffect(() => {
        const path = location.pathname;
        displayMenuItems.forEach(item => {
            if (item.submenu) {
                const hasActiveChild = item.submenu.some(child =>
                    child.path === path || (child.submenu && child.submenu.some(gc => gc.path === path))
                );
                if (hasActiveChild) {
                    setExpandedMenus(prev => ({ ...prev, [item.title]: true }));
                    // Also expand sub-menus
                    item.submenu.forEach(sub => {
                        if (sub.submenu && sub.submenu.some(gc => gc.path === path)) {
                            setExpandedMenus(prev => ({ ...prev, [sub.title]: true }));
                        }
                    });
                }
            }
        });
    }, [location.pathname]);

    const renderSidebarItem = (item, collapsed = false) => {
        const isExpanded = expandedMenus[item.title];
        return (
            <SidebarItem
                key={item.title}
                item={item}
                isExpanded={isExpanded}
                onToggle={collapsed ? () => {} : toggleMenu}
                expandedMenus={expandedMenus}
                isActive={isActive}
                isCollapsed={collapsed}
                onLinkClick={onClose}
            />
        );
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={clsx(
                "fixed md:static inset-y-0 left-0 z-50 glass-panel flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:translate-x-0 border-r border-white/60",
                "shadow-[4px_0_30px_rgba(0,0,0,0.03)] h-full",
                isOpen ? "translate-x-0" : "-translate-x-full",
                isCollapsed ? "w-[68px]" : "w-[270px]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between h-16 md:h-[72px] px-3 border-b border-white/60 shrink-0">
                    {/* Logo — click to go to dashboard */}
                    <button
                        onClick={() => { navigate('/dashboard'); onClose(); }}
                        className="flex items-center justify-center flex-1 py-2 transition-all hover:opacity-80 active:scale-95"
                        title="Go to Dashboard"
                    >
                        {!isCollapsed ? (
                            branding?.logo_url ? (
                                <img src={branding.logo_url} alt="Logo"
                                    className="h-12 md:h-14 w-auto max-w-[180px] object-contain drop-shadow-sm" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md text-white shrink-0">
                                        <Box strokeWidth={2.5} size={20} />
                                    </div>
                                    <span className="text-sm font-black text-slate-800 tracking-tight leading-tight">
                                        {branding?.system_name || 'Question Shaper'}
                                    </span>
                                </div>
                            )
                        ) : (
                            branding?.logo_url ? (
                                <img src={branding.logo_url} alt="Logo"
                                    className="h-9 w-9 object-contain rounded-lg" />
                            ) : (
                                <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md text-white">
                                    <Box strokeWidth={2.5} size={20} />
                                </div>
                            )
                        )}
                    </button>

                    {/* Collapse toggle (desktop only) */}
                    <button
                        onClick={() => setIsCollapsed(c => !c)}
                        className="hidden md:flex p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all active:scale-90 shrink-0"
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
                    </button>

                    {/* Close button (mobile only) */}
                    <button onClick={onClose} className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors active:scale-90 shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5 custom-scrollbar overscroll-contain">
                    {displayMenuItems.map((item, idx) => {
                        if (item.isHeader) {
                            if (isCollapsed) return null;
                            const translateHeader = (title) => {
                                switch (title) {
                                    case 'EXAM GENERATION': return t('sb_header_exam_gen');
                                    case 'Create New Question': return t('sb_header_create_q');
                                    case 'OMR OFFLINE EXAM': return t('sb_header_omr_exam');
                                    case 'More Options': return t('sb_header_more_opt');
                                    case 'Learning & Exams': return t('sb_header_learning_exams');
                                    case 'Support': return t('sb_header_support');
                                    default: return title;
                                }
                            };
                            return (
                                <div key={`header-${idx}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3.5 pt-4 pb-1.5 select-none font-sans">
                                    {translateHeader(item.title)}
                                </div>
                            );
                        }
                        return renderSidebarItem(item, isCollapsed);
                    })}
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/30 shrink-0">
                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100/80 hover:text-red-600 rounded-xl transition-all duration-200 gap-2 group active:scale-[0.97]"
                    >
                        <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                        {t('logout')}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
