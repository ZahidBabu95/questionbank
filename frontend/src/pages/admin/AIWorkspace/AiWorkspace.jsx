import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquare, Send, Sparkles, BookOpen, Layers, 
    ChevronDown, Plus, ExternalLink, Search,
    User, GraduationCap, Zap, Sun, Moon, 
    PanelLeftClose, PanelLeftOpen, Trash2, MoreHorizontal,
    FileText, Image, Mic, Paperclip, Copy, ThumbsUp, ThumbsDown, RotateCcw,
    LogOut, Settings, Box, Bell, Wand2, Archive, Brain, Upload, ChevronRight, ArrowUp
} from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useBranding } from '../../../context/BrandingContext';
import axios from '../../../utils/axios';
import instituteService from '../../../services/instituteService';
import { MENU_ITEMS } from '../../../components/layout/Sidebar';
import settingsService from '../../../services/settingsService';
import { WidgetRegistry, DEFAULT_WORKSPACE_TOOLS } from './components/WidgetRegistry';
import DynamicToolWidget from './components/DynamicToolWidget';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
import * as LucideIcons from 'lucide-react';

const AiWorkspace = () => {
    const navigate = useNavigate();
    const branding = useBranding();
    const chatEndRef = useRef(null);
    const textareaRef = useRef(null);



    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState('Teacher');
    const [isDark, setIsDark] = useState(false);
    const [botMode, setBotMode] = useState('strict');
    const [botTone, setBotTone] = useState('professional');
    const [customTones, setCustomTones] = useState([]);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Derive activeTool from URL
    const activeToolTarget = searchParams.get('tool_url');
    const [activeTool, setActiveTool] = useState(null);

    const [userSubjects, setUserSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
    const [toolsExpanded, setToolsExpanded] = useState(true);
    const [plusMenuOpen, setPlusMenuOpen] = useState(false);

    // Sidebar Resizer state (default to 1/3 of screen)
    const [toolsHeight, setToolsHeight] = useState(() => Math.max(150, window.innerHeight / 3));
    const isResizing = useRef(false);

    const startResizing = React.useCallback(() => {
        isResizing.current = true;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (e) => {
            if (!isResizing.current) return;
            // The sidebar has a logo header (~60px). The tools section starts around Y=70.
            setToolsHeight(Math.max(120, Math.min(e.clientY - 70, window.innerHeight * 0.7)));
        };

        const stopResizing = () => {
            isResizing.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
    }, []);

    // Dynamic scope for AI generated widgets so they can access global context!
    const scope = {
        React,
        useState: React.useState,
        useEffect: React.useEffect,
        axios,
        ...LucideIcons,
        Map: window.Map,
        Image: window.Image,
        Text: window.Text,
        Link: window.Link,
        Option: window.Option,
        // Global context injected into the widgets:
        globalUser: user,
        globalSelectedSubject: selectedSubject
    };
    
    // Tools that can appear in the + menu
    const [workspaceTools, setWorkspaceTools] = useState(DEFAULT_WORKSPACE_TOOLS);
    
    const isSuperAdmin = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    });

    const hasPermission = (permId) => {
        if (isSuperAdmin) return true;
        // User permissions are usually in user.permissions array or similar
        return user?.permissions?.some(p => typeof p === 'string' ? p === permId : p.name === permId) || false;
    };

    // Auto-refresh user object from backend to ensure permissions are up to date
    useEffect(() => {
        const fetchUpdatedUser = async () => {
            if (user?.id) {
                try {
                    const { data: res } = await axios.get(`/v1/users/${user.id}`);
                    if (res?.success && res?.data) {
                        setUser(res.data);
                        // Also sync to localStorage so other tabs/components stay fresh
                        localStorage.setItem('user', JSON.stringify(res.data));
                    }
                } catch(e) {
                    console.error("Failed to refresh user permissions:", e);
                }
            }
        };
        fetchUpdatedUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const fetchActiveTools = async () => {
            try {
                const { data } = await axios.get('/v1/ai/tools/active');
                if (data?.success && data?.data?.length > 0) {
                    const dynamicTools = data.data.map(tool => ({
                        id: tool.name,
                        title: tool.displayName,
                        icon: <Wand2 size={16} />,
                        description: tool.description || 'Dynamic AI tool widget.',
                        permId: tool.permissionKey,
                        path: tool.frontendPath,
                        schemaJson: tool.schemaJson
                    }));
                    setWorkspaceTools(dynamicTools);
                }
            } catch (error) {
                console.error("Failed to fetch active tools", error);
            }
        };
        fetchActiveTools();
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data: response } = await axios.get('/v1/ai/workspace/config');
                const data = response.data || {};
                
                let tones = [];
                if (data.workspace_custom_tones) {
                    try { tones = JSON.parse(data.workspace_custom_tones); } catch(e) {}
                }
                if (!tones.length) {
                    tones = [
                        { id: 'professional', name: 'Professional', roles: ['Teacher'] },
                        { id: 'friendly', name: 'Friendly', roles: ['Teacher', 'Student'] },
                        { id: 'socratic', name: 'Socratic', roles: ['Teacher', 'Student'] }
                    ];
                }
                setCustomTones(tones);

                if (data.workspace_default_mode) setBotMode(data.workspace_default_mode);
                if (data.workspace_default_tone) setBotTone(data.workspace_default_tone);
            } catch (e) {
                console.error("Failed to load workspace config", e);
                // Set fallbacks in case of complete failure
                setCustomTones([
                    { id: 'professional', name: 'Professional', roles: ['Teacher'] },
                    { id: 'friendly', name: 'Friendly', roles: ['Teacher', 'Student'] },
                    { id: 'socratic', name: 'Socratic', roles: ['Teacher', 'Student'] }
                ]);
            }
        };
        loadSettings();
    }, []);

    // ─── Tools Config (Dynamic from Sidebar MENU_ITEMS & Permissions) ───
    const userPermissions = user?.permissions || [];


    const generateMenuId = (title, parentId = '') => {
        let baseId = title.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/(^_|_$)/g, '');
        return parentId ? `${parentId}_${baseId}` : baseId;
    };

    const getDynamicTools = (items, parentId = '', parentTitle = '', parentIcon = null) => {
        let tools = [];
        items.forEach(item => {
            const currentId = generateMenuId(item.title, parentId);
            const permName = `${currentId}_AI_TOOL`;
            const currentIcon = item.icon || parentIcon;
            
            if (item.submenu) {
                tools = [...tools, ...getDynamicTools(item.submenu, currentId, item.title, currentIcon)];
            } else {
                // If SuperAdmin, or explicitly permitted via the AI_TOOL column
                if (isSuperAdmin || userPermissions.includes(permName)) {
                    tools.push({
                        id: currentId,
                        name: item.title,
                        group: parentTitle || 'General',
                        icon: currentIcon || <Box size={14} />,
                        actionType: 'navigate',
                        target: item.path,
                        permissionKey: permName,
                    });
                }
            }
        });
        return tools;
    };

    const filteredTools = getDynamicTools(MENU_ITEMS);

    const groupedTools = filteredTools.reduce((acc, tool) => {
        if (!acc[tool.group]) acc[tool.group] = [];
        acc[tool.group].push(tool);
        return acc;
    }, {});

    const handleToolClick = (tool) => {
        if (WidgetRegistry[tool.id]) {
            setSearchParams({});
            setActiveTool(null);
            const newMsg = {
                id: Date.now(),
                role: 'ai',
                isWidget: true,
                widgetType: tool.id,
                content: `Welcome to ${tool.name}! Select your preferences below:`
            };
            setMessages(prev => [...prev, newMsg]);
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            }
        } else if (tool.actionType === 'navigate') {
            setSearchParams({ tool_url: tool.target });
            // On mobile, close sidebar after clicking
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            }
        } else if (tool.actionType === 'prompt') {
            setPrompt(tool.target);
            textareaRef.current?.focus();
        }
    };

    useEffect(() => {
        if (activeToolTarget) {
            const tool = filteredTools.find(t => t.target === activeToolTarget);
            if (tool) {
                setActiveTool(tool);
            } else {
                setActiveTool({ name: 'External Tool', target: activeToolTarget });
            }
        } else {
            setActiveTool(null);
        }
    }, [activeToolTarget]);

    const toolColorMap = {
        indigo:  isDark ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
        emerald: isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
        amber:   isDark ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
        rose:    isDark ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 hover:bg-rose-100',
        violet:  isDark ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' : 'bg-violet-50 text-violet-600 hover:bg-violet-100',
        cyan:    isDark ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
    };
    
    const [messages, setMessages] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);

    const fetchSessions = async () => {
        try {
            const { data } = await axios.get('/v1/ai/workspace/sessions');
            if (data.success) {
                setChatHistory(data.data);
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        if (activeSessionId) {
            const loadMessages = async () => {
                try {
                    const { data } = await axios.get(`/v1/ai/workspace/sessions/${activeSessionId}/messages`);
                    if (data.success) {
                        setMessages(data.data);
                    }
                } catch (error) {
                    console.error("Failed to load messages:", error);
                }
            };
            loadMessages();
        } else {
            setMessages([]);
        }
    }, [activeSessionId]);

    const suggestedPrompts = [
        { icon: <FileText size={16} />, text: 'Generate 10 MCQs on Newtonian Mechanics', color: 'indigo' },
        { icon: <Layers size={16} />, text: 'Create a lecture sheet on Cell Division', color: 'emerald' },
        { icon: <Sparkles size={16} />, text: 'Explain Integration by Parts', color: 'amber' },
        { icon: <BookOpen size={16} />, text: 'Summarize Chapter 5: Thermodynamics', color: 'rose' },
    ];

    const [aiUsage, setAiUsage] = useState({ used: 0, limit: 10000 });

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    useEffect(() => {
        const loadUserSubjects = async () => {
            if (!user?.instituteId && !isSuperAdmin) return;
            setIsLoadingSubjects(true);
            try {
                const [hierarchyRes, assignedIds, instituteRes] = await Promise.all([
                    axios.get('/v1/academic/hierarchy'),
                    user?.instituteId ? instituteService.getAssignedSubjects(user.instituteId).catch(() => null) : Promise.resolve(null),
                    user?.instituteId ? instituteService.getInstitute(user.instituteId).catch(() => null) : Promise.resolve(null)
                ]);
                
                if (instituteRes) {
                    setAiUsage({ used: 0, limit: instituteRes.aiLimitPerMonth || 1000 });
                }

                const hierarchy = hierarchyRes.data;
                const subjectsList = [];
                
                let validClassSubjects = hierarchy.classSubjects || [];
                // If not super admin and assignedIds is an array, strictly filter them
                if (!isSuperAdmin && Array.isArray(assignedIds)) {
                    validClassSubjects = validClassSubjects.filter(cs => assignedIds.includes(cs.id));
                }

                validClassSubjects.forEach(cs => {
                    const subject = hierarchy.subjects?.find(s => s.id === cs._subjectId);
                    const cls = hierarchy.classes?.find(c => c.id === cs._classId);
                    if (subject && cls) {
                        subjectsList.push({
                            id: cs.id,
                            name: `${cls.name} - ${subject.name} ${subject.paper ? `(${subject.paper})` : ''}`
                        });
                    }
                });
                
                setUserSubjects(subjectsList);
            } catch (error) {
                console.error("Failed to load user subjects:", error);
            } finally {
                setIsLoadingSubjects(false);
            }
        };

        loadUserSubjects();
    }, [user?.instituteId, isSuperAdmin]);

    // Handle Role (Mode) change to update botTone if it's not valid for the new role
    useEffect(() => {
        if (customTones.length > 0) {
            const visibleTones = customTones.filter(t => !t.roles || t.roles.includes(mode));
            // If the currently selected botTone is not in the visible tones for this role, auto-switch to the first available one
            if (!visibleTones.some(t => t.id === botTone)) {
                if (visibleTones.length > 0) {
                    setBotTone(visibleTones[0].id);
                }
            }
        }
    }, [mode, customTones]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
        }
    }, [prompt]);

    const handleSend = async (e, overrideMessage = null) => {
        e?.preventDefault();
        const question = overrideMessage || prompt.trim();
        if (!question) return;
        
        const newMsg = { id: Date.now(), role: 'user', content: question };
        setMessages(prev => [...prev, newMsg]);
        if (!overrideMessage) setPrompt('');

        if (!selectedSubject) {
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1, role: 'ai',
                    content: 'অনুগ্রহ করে আগে আপনার বিষয় সিলেক্ট করুন'
                }]);
            }, 300);
            return;
        }

        setIsTyping(true);

        try {
            let currentSessionId = activeSessionId;
            // Create session if it doesn't exist
            if (!currentSessionId) {
                const { data: sessionData } = await axios.post('/v1/ai/workspace/sessions', { title: "New Chat" });
                if (sessionData.success) {
                    currentSessionId = sessionData.data.id;
                    setActiveSessionId(currentSessionId);
                    fetchSessions(); // Refresh sidebar to show the new chat
                }
            }

            // Extract the subject name or paper to use as filter context
            const contextStr = selectedSubject ? selectedSubject.name : '';
            const contextId = selectedSubject ? selectedSubject.id : undefined;
            const selectedToneObj = customTones.find(t => t.id === botTone);
            
            const { data } = await axios.post(`/v1/ai/workspace/sessions/${currentSessionId}/ask`, { 
                query: question,
                filter: contextStr,
                filterId: contextId,
                mode: botMode,
                tone: botTone,
                toneInstruction: selectedToneObj ? selectedToneObj.instruction : null
            });
            
            if (data.success) {
                setMessages(prev => [...prev, data.data.aiMessage]);
            } else {
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', content: "উত্তর পাওয়া যায়নি।" }]);
            }
            fetchSessions(); // Update titles/sorting in sidebar
        } catch (err) {
            console.error('Chat Error:', err);
            setMessages(prev => [...prev, {
                id: Date.now() + 1, role: 'ai',
                content: 'দুঃখিত, কোনো টেকনিক্যাল সমস্যার কারণে এআই ইঞ্জিন কানেক্ট করতে পারেনি। দয়া করে আবার চেষ্টা করুন।'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSuggestedPrompt = (text) => {
        setPrompt(text);
        setTimeout(() => {
            handleSend({ preventDefault: () => {} });
        }, 100);
    };

    // Group chat history
    const groupedHistory = {
        "Recent Chats": chatHistory
    };

    // Theme classes
    const t = {
        bg: isDark ? 'bg-[#0a0a0f]' : 'bg-[#f8f9fb]',
        sidebar: isDark ? 'bg-[#111118] border-[#1e1e2e]' : 'bg-white border-slate-200/70',
        card: isDark ? 'bg-[#16161f] border-[#252535]' : 'bg-white border-slate-200',
        text: isDark ? 'text-slate-200' : 'text-slate-800',
        textMuted: isDark ? 'text-slate-500' : 'text-slate-400',
        textSecondary: isDark ? 'text-slate-400' : 'text-slate-600',
        hover: isDark ? 'hover:bg-[#1a1a28]' : 'hover:bg-slate-50',
        input: isDark ? 'bg-[#16161f] border-[#2a2a3d] text-white placeholder:text-slate-600 focus:border-indigo-500/60' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
        accent: isDark ? 'text-indigo-400' : 'text-primary',
        accentBg: isDark ? 'bg-indigo-500/10' : 'bg-primary/5',
    };

    return (
        <div className={`flex h-full overflow-hidden transition-colors duration-300 ${t.bg} ${t.text}`}>
            
            {/* ─── Sidebar ─── */}
            <AnimatePresence>
            {sidebarOpen && (
                <motion.aside 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 280, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className={`shrink-0 flex flex-col border-r overflow-hidden ${t.sidebar}`}
                >
                    <div className="flex flex-col h-full p-3">
                        {/* Logo Header */}
                        <div 
                            onClick={() => { setSearchParams({}); setMessages([]); }}
                            className={`flex items-center justify-center py-3 mb-2 border-b cursor-pointer transition-opacity hover:opacity-80 ${isDark ? 'border-[#1e1e2e]' : 'border-slate-100'}`}
                        >
                            {branding?.logo_url ? (
                                <img src={branding.logo_url} alt="Logo" className="h-9 max-w-[200px] w-auto object-contain" />
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center shadow-md text-white shrink-0">
                                        <Box strokeWidth={2.5} size={14} />
                                    </div>
                                    <span className={`text-[14px] font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                        {branding?.system_name || 'Question Shaper'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ─── Tools Section (Dynamic Menu Access) ─── */}
                        {filteredTools.length > 0 && (
                            <div className="flex flex-col relative mb-3 transition-all duration-200 ease-out" style={{ height: toolsExpanded ? toolsHeight : 'auto' }}>
                                <div 
                                    onClick={() => setToolsExpanded(!toolsExpanded)}
                                    className={`flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1.5 mb-1 cursor-pointer rounded-lg transition-colors ${t.hover} ${t.textMuted}`}
                                >
                                    <span>Tools</span>
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${toolsExpanded ? '' : '-rotate-90'}`} />
                                </div>
                                
                                <div 
                                    className={`overflow-y-auto custom-scrollbar flex flex-col gap-0.5 flex-1`} 
                                    style={{ display: toolsExpanded ? 'flex' : 'none' }}
                                >
                                    {filteredTools.map(tool => (
                                        <button
                                            key={tool.id}
                                            onClick={() => handleToolClick(tool)}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all active:scale-[0.98] shrink-0 ${
                                                activeTool?.id === tool.id
                                                    ? isDark 
                                                        ? 'bg-primary/20 text-primary border border-primary/20 shadow-sm' 
                                                        : 'bg-primary/10 text-primary font-bold border border-primary/10'
                                                    : isDark 
                                                        ? 'text-slate-300 hover:bg-[#1a1a28] hover:text-white border border-transparent' 
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                                            }`}
                                            title={tool.name}
                                        >
                                            <div className={`scale-[0.85] origin-left transition-transform ${activeTool?.id === tool.id ? 'text-primary scale-[0.95]' : 'opacity-70 text-slate-500'}`}>{tool.icon}</div>
                                            <span className="truncate leading-none">{tool.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Drag Handle */}
                                {toolsExpanded && (
                                    <div 
                                        onMouseDown={startResizing}
                                        className="absolute -bottom-3 left-0 right-0 h-4 cursor-row-resize flex items-center justify-center group z-10"
                                    >
                                        <div className={`w-full h-px transition-all duration-200 ${isDark ? 'bg-[#2a2a3d] group-hover:bg-indigo-500 group-hover:h-[2px] group-hover:shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-200 group-hover:bg-primary/50 group-hover:h-[2px]'}`}></div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New Chat Button */}
                        <button 
                            onClick={() => { 
                                setSearchParams({});
                                setActiveSessionId(null);
                                setMessages([]); 
                            }}
                            className={`flex items-center gap-2.5 w-full px-4 py-3 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.98] border ${
                                isDark 
                                    ? 'border-[#2a2a3d] text-slate-300 hover:bg-[#1a1a28] hover:border-indigo-500/30' 
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-primary/30'
                            }`}
                        >
                            <Plus size={16} className={t.accent} />
                            New Chat
                        </button>

                        {/* Search */}
                        <div className="mt-3 relative">
                            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
                            <input 
                                type="text" 
                                placeholder="Search conversations..."
                                className={`w-full pl-9 pr-3 py-2 rounded-lg text-[12px] border transition-colors outline-none ${
                                    isDark 
                                        ? 'bg-[#0a0a0f] border-[#1e1e2e] text-slate-300 placeholder:text-slate-600 focus:border-[#2a2a3d]' 
                                        : 'bg-slate-50 border-slate-100 text-slate-700 placeholder:text-slate-400 focus:border-slate-200'
                                }`}
                            />
                        </div>

                        {/* Chat History */}
                        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar space-y-4 min-h-0">
                            {Object.entries(groupedHistory).map(([group, chats]) => (
                                <div key={group}>
                                    <p className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 mb-1.5 ${t.textMuted}`}>{group}</p>
                                    <div className="space-y-0.5">
                                        {chats.map(chat => (
                                            <div key={chat.id} className="group relative flex items-center">
                                                <button 
                                                    onClick={() => setActiveSessionId(chat.id)}
                                                    className={`flex items-center gap-2.5 w-full pl-3 pr-8 py-2 text-left rounded-lg text-[13px] transition-all ${
                                                        activeSessionId === chat.id 
                                                            ? (isDark ? 'bg-[#1a1a28] text-white' : 'bg-primary/5 text-primary') 
                                                            : `${t.textSecondary} ${t.hover}`
                                                    }`}
                                                >
                                                    <MessageSquare size={14} className={`shrink-0 ${activeSessionId === chat.id ? t.accent : t.textMuted}`} />
                                                    <span className="truncate flex-1 font-medium">{chat.title || 'New Chat'}</span>
                                                </button>
                                                <button 
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if(window.confirm('Are you sure you want to delete this chat?')) {
                                                            try {
                                                                await axios.delete(`/v1/ai/workspace/sessions/${chat.id}`);
                                                                fetchSessions();
                                                                if(activeSessionId === chat.id) { setActiveSessionId(null); setMessages([]); }
                                                            } catch(err) { console.error(err); }
                                                        }
                                                    }}
                                                    className={`absolute right-1.5 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                                                    title="Delete Chat"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Token Usage */}
                        <div className={`mt-3 p-3 rounded-xl border ${t.card}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted}`}>AI Credits</span>
                                <Zap size={12} className="text-amber-500" />
                            </div>
                            <div className={`w-full rounded-full h-1 overflow-hidden ${isDark ? 'bg-[#0a0a0f]' : 'bg-slate-100'}`}>
                                <div className="bg-primary h-1 rounded-full" style={{ width: `${Math.min(100, (aiUsage.used / aiUsage.limit) * 100)}%` }}></div>
                            </div>
                            <p className={`text-[10px] mt-1.5 font-medium ${t.textMuted}`}>{aiUsage.used.toLocaleString()} / {aiUsage.limit.toLocaleString()} tokens used</p>
                        </div>

                        {/* User Profile */}
                        <div className={`mt-2 p-2 rounded-xl border ${t.card}`}>
                            <Link to="/profile" className={`flex items-center gap-2.5 p-1.5 rounded-lg transition-colors ${t.hover}`}>
                                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-bold shadow-md shrink-0">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[12px] font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{user?.name || 'User'}</p>
                                    <p className={`text-[10px] truncate ${t.textMuted}`}>{user?.roles?.[0] || user?.email || 'Member'}</p>
                                </div>
                                <MoreHorizontal size={14} className={t.textMuted} />
                            </Link>
                        </div>
                    </div>
                </motion.aside>
            )}
            </AnimatePresence>

            {/* ─── Main Chat Area ─── */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                
                {/* Subtle gradient mesh — dark mode only */}
                {isDark && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-900/20 blur-[120px] rounded-full" />
                        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-violet-900/15 blur-[120px] rounded-full" />
                    </div>
                )}

                {/* ─── Topbar ─── */}
                <header className={`h-14 border-b flex items-center justify-between px-4 z-20 shrink-0 transition-colors ${
                    isDark ? 'bg-[#0a0a0f]/80 backdrop-blur-xl border-[#1e1e2e]' : 'bg-white/80 backdrop-blur-xl border-slate-100'
                }`}>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-[#1a1a28]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                        >
                            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                        </button>

                        <div className={`h-5 w-px ${isDark ? 'bg-[#1e1e2e]' : 'bg-slate-200'}`} />

                        {/* Subject selector */}
                        <div className="relative">
                            <button 
                                onClick={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors max-w-[250px] ${
                                    isDark ? 'text-slate-300 hover:bg-[#1a1a28]' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <BookOpen size={14} className={t.accent} />
                                <span className="truncate">{isLoadingSubjects ? 'Loading...' : (selectedSubject ? selectedSubject.name : 'All Subjects')}</span>
                                <ChevronDown size={12} className={t.textMuted} />
                            </button>

                            <AnimatePresence>
                                {subjectDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setSubjectDropdownOpen(false)}></div>
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className={`absolute top-full left-0 mt-2 w-64 rounded-xl shadow-xl border z-50 overflow-hidden ${
                                                isDark ? 'bg-[#111118] border-[#2a2a3d]' : 'bg-white border-slate-200'
                                            }`}
                                        >
                                            <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
                                                <button
                                                    onClick={() => { setSelectedSubject(null); setSubjectDropdownOpen(false); }}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                                                        !selectedSubject 
                                                            ? (isDark ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'bg-primary/10 text-primary font-bold') 
                                                            : (isDark ? 'text-slate-300 hover:bg-[#1a1a28]' : 'text-slate-600 hover:bg-slate-50')
                                                    }`}
                                                >
                                                    All Subjects
                                                </button>
                                                {userSubjects.map(sub => (
                                                    <button
                                                        key={sub.id}
                                                        onClick={() => { setSelectedSubject(sub); setSubjectDropdownOpen(false); }}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-colors truncate ${
                                                            selectedSubject?.id === sub.id 
                                                                ? (isDark ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'bg-primary/10 text-primary font-bold') 
                                                                : (isDark ? 'text-slate-300 hover:bg-[#1a1a28]' : 'text-slate-600 hover:bg-slate-50')
                                                        }`}
                                                    >
                                                        {sub.name}
                                                    </button>
                                                ))}
                                                {userSubjects.length === 0 && !isLoadingSubjects && (
                                                    <div className={`px-3 py-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                        No specific subjects assigned.
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Mode Toggle */}
                        <div className={`flex items-center p-0.5 rounded-lg border ${isDark ? 'bg-[#111118] border-[#1e1e2e]' : 'bg-slate-100 border-slate-200/50'}`}>
                            <button 
                                onClick={() => setMode('Teacher')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                                    mode === 'Teacher' 
                                        ? (isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-white shadow-sm text-primary') 
                                        : `${t.textMuted} hover:${isDark ? 'text-slate-300' : 'text-slate-600'}`
                                }`}
                            >
                                <User size={13} /> Teacher
                            </button>
                            <button 
                                onClick={() => setMode('Student')}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all ${
                                    mode === 'Student' 
                                        ? (isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white shadow-sm text-emerald-600') 
                                        : `${t.textMuted} hover:${isDark ? 'text-slate-300' : 'text-slate-600'}`
                                }`}
                            >
                                <GraduationCap size={13} /> Student
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => setIsDark(!isDark)}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-amber-400 hover:bg-[#1a1a28]' : 'text-slate-500 hover:bg-slate-100'}`}
                            title="Toggle Theme"
                        >
                            {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>

                        <div className={`h-5 w-px ${isDark ? 'bg-[#1e1e2e]' : 'bg-slate-200'}`} />

                        {/* Notifications */}
                        <button className={`p-2 rounded-lg relative transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-[#1a1a28]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                            <Bell size={16} />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full"></span>
                        </button>

                        {/* Chatbot Settings */}
                        <div className="relative">
                            <button 
                                onClick={() => setSettingsOpen(!settingsOpen)}
                                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-[#1a1a28]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                                title="Chatbot Settings"
                            >
                                <Settings size={16} />
                            </button>
                            
                            <AnimatePresence>
                                {settingsOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)}></div>
                                        <motion.div 
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className={`absolute top-full right-0 mt-2 w-64 rounded-xl shadow-xl border z-50 overflow-hidden p-3 space-y-4 ${
                                                isDark ? 'bg-[#111118] border-[#2a2a3d]' : 'bg-white border-slate-200'
                                            }`}
                                        >
                                            <div>
                                                <p className={`text-[11px] font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Response Mode</p>
                                                <div className="flex bg-slate-100 dark:bg-[#1a1a28] rounded-lg p-1">
                                                    <button onClick={() => setBotMode('strict')} className={`flex-1 text-[12px] py-1.5 rounded-md font-medium transition-colors ${botMode === 'strict' ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white shadow-sm text-primary') : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>Strict</button>
                                                    <button onClick={() => alert('Creative Mode is currently under development for advanced generative capabilities.')} className={`flex-1 text-[12px] py-1.5 rounded-md font-medium transition-colors ${botMode === 'creative' ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white shadow-sm text-primary') : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>Creative</button>
                                                </div>
                                            </div>
                                            <div>
                                                <p className={`text-[11px] font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Personality Tone</p>
                                                <div className="space-y-1">
                                                    {customTones.filter(t => !t.roles || t.roles.includes(mode)).map(t => (
                                                        <button key={t.id} onClick={() => setBotTone(t.id)} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] capitalize transition-colors ${botTone === t.id ? (isDark ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'bg-primary/10 text-primary font-bold') : (isDark ? 'text-slate-300 hover:bg-[#1a1a28]' : 'text-slate-600 hover:bg-slate-50')}`}>
                                                            {t.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* User Avatar */}
                        <Link to="/profile" className="flex items-center gap-2 cursor-pointer ml-0.5">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-bold shadow-md">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        </Link>
                    </div>
                </header>

                {activeTool ? (
                    <div className={`flex-1 w-full h-full relative z-10 ${isDark ? 'bg-[#0a0a0f]' : 'bg-slate-50'}`}>
                        <iframe 
                            src={`${activeTool.target}?embedded=true`} 
                            className="w-full h-full border-none"
                            title={activeTool.name}
                        />
                    </div>
                ) : (
                <>
                {/* ─── Chat Content Area ─── */}
                <div className={`flex-1 overflow-y-auto z-10 custom-scrollbar flex flex-col ${messages.length === 0 ? 'justify-center items-center px-4' : ''}`}>
                    {messages.length === 0 ? (
                        <>
                            <h2 className={`text-3xl font-medium mb-8 text-center ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {(() => {
                                    const hour = new Date().getHours();
                                    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
                                    const firstName = user?.name?.split(' ')[0] || '';
                                    return `${greeting}${firstName ? `, ${firstName}` : ''}! How can I help you today?`;
                                })()}
                            </h2>
                            
                            <div className="w-full max-w-[1024px]">
                                {(() => {
                                    return (
                                        <form onSubmit={handleSend} className="relative w-full">
                                            <div className={`relative rounded-[24px] border transition-all shadow-sm ${
                                                isDark 
                                                    ? 'bg-[#16161f] border-[#2a2a3d] focus-within:border-indigo-500/40 focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.15)]' 
                                                    : 'bg-white border-slate-200 focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_rgba(var(--primary-rgb,99,102,241),0.06)]'
                                            }`}>
                                                <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                                                        className={`p-2 rounded-full transition-all ${isDark ? 'text-slate-400 hover:bg-[#2a2a3d] hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-primary'} ${plusMenuOpen ? (isDark ? 'bg-[#2a2a3d] text-white' : 'bg-slate-100 text-primary') : ''}`}
                                                    >
                                                        <Plus size={18} className={`transition-transform duration-200 ${plusMenuOpen ? 'rotate-45' : ''}`} />
                                                    </button>
                                                </div>

                                                {/* Dropdown Menu for AI Tools */}
                                                <AnimatePresence>
                                                    {plusMenuOpen && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)}></div>
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                transition={{ duration: 0.15 }}
                                                                className={`absolute bottom-full left-0 mb-3 w-56 rounded-xl border shadow-xl z-50 overflow-hidden ${
                                                                    isDark ? 'bg-[#1e1e2d] border-[#2a2a3d]' : 'bg-white border-slate-200'
                                                                }`}
                                                            >
                                                                <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-slate-500 border-[#2a2a3d]' : 'text-slate-400 border-slate-100'}`}>
                                                                    Connected AI Tools
                                                                </div>
                                                                <div className="p-1">
                                                                    {workspaceTools.filter(t => !t.permId || hasPermission(t.permId)).length > 0 ? (
                                                                        workspaceTools.filter(t => !t.permId || hasPermission(t.permId)).map((tool, idx) => (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={() => {
                                                                                    setPlusMenuOpen(false);
                                                                                    if (WidgetRegistry[tool.id] || tool.schemaJson) {
                                                                                        const newMsg = {
                                                                                            id: Date.now(),
                                                                                            role: 'ai',
                                                                                            isWidget: true,
                                                                                            widgetType: tool.id,
                                                                                            content: `Welcome to ${tool.title}! Select your preferences below:`
                                                                                        };
                                                                                        setMessages(prev => [...prev, newMsg]);
                                                                                    } else if (tool.path) {
                                                                                        navigate(tool.path);
                                                                                    } else {
                                                                                        console.warn("Tool has no widget, schema, or path:", tool.title);
                                                                                    }
                                                                                }}
                                                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                                                                                    isDark ? 'text-slate-300 hover:bg-[#2a2a3d]' : 'text-slate-700 hover:bg-slate-50 hover:text-primary'
                                                                                }`}
                                                                            >
                                                                                <span className={`${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{tool.icon}</span>
                                                                                <span className="font-medium">{tool.title}</span>
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-3 py-3 text-xs text-center text-slate-500">
                                                                            No extra tools authorized.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>

                                                <textarea
                                                    ref={textareaRef}
                                                    value={prompt}
                                                    onChange={(e) => setPrompt(e.target.value)}
                                                    placeholder="Ask anything"
                                                    className={`w-full bg-transparent pl-12 pr-24 py-[14px] text-[15px] outline-none resize-none min-h-[52px] max-h-[160px] ${
                                                        isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
                                                    }`}
                                                    rows={1}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleSend(e);
                                                        }
                                                    }}
                                                />
                                                
                                                <div className="absolute right-3 top-2 bottom-2 flex items-center justify-end gap-1.5 bg-transparent">
                                                    <button type="button" className={`p-1.5 rounded-full ${isDark ? 'text-slate-400 hover:bg-[#2a2a3d]' : 'text-slate-400 hover:bg-slate-100'}`}>
                                                        <Mic size={18} />
                                                    </button>
                                                    <button 
                                                        type="submit"
                                                        disabled={!prompt.trim()}
                                                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                                                            prompt.trim()
                                                                ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                                                                : (isDark ? 'bg-[#2a2a3d] text-slate-500' : 'bg-slate-200 text-slate-400')
                                                        }`}
                                                    >
                                                        <ArrowUp size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    );
                                })()}
                            </div>

                            <div className="flex flex-wrap justify-center gap-3 mt-6 max-w-[1024px]">
                                {suggestedPrompts.map((sp, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSuggestedPrompt(sp.text)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-medium transition-all ${
                                            isDark 
                                                ? 'bg-transparent border-[#2a2a3d] text-slate-300 hover:bg-[#1a1a28]' 
                                                : 'bg-transparent border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className={t.textMuted}>{sp.icon}</span>
                                        {sp.text}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="max-w-[1024px] w-full mx-auto py-8 px-4 space-y-1">
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className={`py-5`}
                                    >
                                        <div className="flex gap-3.5 items-start">
                                            {/* Avatar */}
                                            {msg.role === 'ai' ? (
                                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-primary/20">
                                                    <Sparkles size={15} className="text-white" />
                                                </div>
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold ${
                                                    isDark ? 'bg-[#2a2a3d] text-slate-300' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                    {user?.name?.charAt(0) || 'U'}
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[12px] font-semibold mb-1.5 ${msg.role === 'ai' ? t.accent : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>
                                                    {msg.role === 'ai' ? 'AI Assistant' : (user?.name || 'You')}
                                                </p>
                                                <div className={`text-[14.5px] leading-[1.75] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                    {msg.role === 'ai' ? (
                                                        <div className={`prose prose-sm max-w-none prose-p:leading-relaxed prose-li:my-1 prose-ul:list-disc prose-ol:list-decimal ${isDark ? 'prose-invert prose-strong:text-indigo-300 prose-headings:text-white' : 'prose-slate prose-strong:text-indigo-900 prose-headings:text-slate-800'}`}>
                                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                        </div>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                                    )}
                                                </div>

                                                {msg.isWidget && (() => {
                                                    const tool = workspaceTools.find(t => t.id === msg.widgetType);
                                                    
                                                    // Handle Raw JSX Tool (from the new React Tool Studio)
                                                    if (tool && tool.schemaJson) {
                                                        return (
                                                            <div className="w-full">
                                                                <LiveProvider code={tool.schemaJson} scope={scope} noInline={true}>
                                                                    <LivePreview />
                                                                    <LiveError className="text-red-500 text-[11px] mt-2 bg-red-50 p-2 rounded-lg font-mono whitespace-pre-wrap" />
                                                                </LiveProvider>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    // Handle Legacy DynamicToolWidget or Native WidgetRegistry Tool
                                                    let ActiveWidget = null;
                                                    if (WidgetRegistry[msg.widgetType]) {
                                                        ActiveWidget = WidgetRegistry[msg.widgetType];
                                                    }

                                                    if (!ActiveWidget) return null;

                                                    return (
                                                        <ActiveWidget 
                                                            userSubjects={userSubjects} 
                                                            isDark={isDark} 
                                                            onComplete={(msgContent, data) => {
                                                                const newMsg = {
                                                                    id: Date.now(),
                                                                    role: 'ai',
                                                                    content: msgContent,
                                                                    actionableData: data ? JSON.stringify(data) : null
                                                                };
                                                                setMessages(prev => [...prev, newMsg]);
                                                            }}
                                                        />
                                                    );
                                                })()}

                                                {msg.actionableData && (() => {
                                                    try {
                                                        const parsed = JSON.parse(msg.actionableData);
                                                        
                                                        // Render interactive parameters request
                                                        if (parsed.actionable_type === 'parameter_request') {
                                                            return (
                                                                <div className="mt-3">
                                                                    <p className={`text-[14px] mb-3 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                                        {parsed.data?.message}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {parsed.data?.options?.map((opt, i) => (
                                                                            <button 
                                                                                key={i}
                                                                                disabled={isTyping}
                                                                                onClick={() => {
                                                                                    handleSend(null, opt);
                                                                                }}
                                                                                className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-all ${
                                                                                    isTyping ? 'opacity-50 cursor-not-allowed' : ''
                                                                                } ${
                                                                                    isDark 
                                                                                        ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/50 shadow-sm' 
                                                                                        : 'border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 shadow-sm'
                                                                                }`}
                                                                            >
                                                                                {opt}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        // Render Dynamic Widget based on Actionable Type
                                                        if (WidgetRegistry[parsed.actionable_type]) {
                                                            const ActiveWidget = WidgetRegistry[parsed.actionable_type];
                                                            return (
                                                                <ActiveWidget 
                                                                    userSubjects={userSubjects} 
                                                                    isDark={isDark} 
                                                                    extractedConfig={parsed.data}
                                                                />
                                                            );
                                                        }

                                                        // Default actionable UI (e.g., questions generation)
                                                        return (
                                                            <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                                isDark ? 'bg-[#111118] border-[#252535]' : 'bg-slate-50 border-slate-200'
                                                            }`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-primary/10 text-primary'}`}>
                                                                        <Layers size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <p className={`text-[13px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Questions_Generated.json</p>
                                                                        <p className={`text-[11px] ${t.textMuted}`}>Click Open to view in Editor</p>
                                                                    </div>
                                                                </div>
                                                                <button 
                                                                    onClick={() => {
                                                                        try {
                                                                            const parsedData = JSON.parse(msg.actionableData);
                                                                            parsedData.classSubjectId = selectedSubject?.id || null;
                                                                            localStorage.setItem('nexus_editor_import', JSON.stringify(parsedData));
                                                                            navigate('/exams/generate/nexus-editor');
                                                                        } catch (err) {
                                                                            console.error("Failed to parse actionable data", err);
                                                                        }
                                                                    }}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all active:scale-[0.97] ${
                                                                        isDark ? 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/20' : 'bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10'
                                                                    }`}
                                                                >
                                                                    Open <ExternalLink size={12} />
                                                                </button>
                                                            </div>
                                                        );
                                                    } catch (err) {
                                                        console.error("Actionable JSON parse error", err);
                                                        return null;
                                                    }
                                                })()}

                                                {msg.role === 'ai' && (
                                                    <div className="flex items-center gap-1 mt-3">
                                                        {[
                                                            { icon: <Copy size={13} />, label: 'Copy' },
                                                            { icon: <ThumbsUp size={13} />, label: 'Good' },
                                                            { icon: <ThumbsDown size={13} />, label: 'Bad' },
                                                            { icon: <RotateCcw size={13} />, label: 'Retry' },
                                                        ].map(action => (
                                                            <button 
                                                                key={action.label}
                                                                className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-600 hover:text-slate-300 hover:bg-[#1a1a28]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                                                                title={action.label}
                                                            >
                                                                {action.icon}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {isTyping && (
                                    <motion.div 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1 }}
                                        className="py-5"
                                    >
                                        <div className="flex gap-3.5 items-start">
                                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                                                <Sparkles size={15} className="text-white" />
                                            </div>
                                            <div className="pt-2">
                                                <div className="flex items-center gap-1.5">
                                                    {[0, 1, 2].map(i => (
                                                        <motion.div 
                                                            key={i}
                                                            className={`w-2 h-2 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-primary'}`}
                                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={chatEndRef} />
                            </div>
                        </>
                    )}
                </div>

                {/* ─── Input Area (Pinned to bottom) ─── */}
                {messages.length > 0 && (
                    <div className={`px-4 pb-5 pt-2 z-20 shrink-0 ${isDark ? 'bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent' : 'bg-gradient-to-t from-[#f8f9fb] via-[#f8f9fb] to-transparent'}`}>
                        <div className="max-w-[1024px] mx-auto">
                            {(() => {
                                return (
                                    <form onSubmit={handleSend} className="relative w-full">
                                        <div className={`relative rounded-[24px] border transition-all shadow-sm ${
                                            isDark 
                                                ? 'bg-[#16161f] border-[#2a2a3d] focus-within:border-indigo-500/40 focus-within:shadow-[0_0_0_1px_rgba(99,102,241,0.15)]' 
                                                : 'bg-white border-slate-200 focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_rgba(var(--primary-rgb,99,102,241),0.06)]'
                                        }`}>
                                            <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                                <button 
                                                    type="button" 
                                                    onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                                                    className={`p-2 rounded-full transition-all ${isDark ? 'text-slate-400 hover:bg-[#2a2a3d] hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-primary'} ${plusMenuOpen ? (isDark ? 'bg-[#2a2a3d] text-white' : 'bg-slate-100 text-primary') : ''}`}
                                                >
                                                    <Plus size={18} className={`transition-transform duration-200 ${plusMenuOpen ? 'rotate-45' : ''}`} />
                                                </button>

                                                {/* Dropdown Menu for AI Tools */}
                                                <AnimatePresence>
                                                    {plusMenuOpen && (
                                                        <>
                                                            {/* Invisible backdrop to close menu */}
                                                            <div className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)}></div>
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                transition={{ duration: 0.15 }}
                                                                className={`absolute bottom-full left-0 mb-3 w-56 rounded-xl border shadow-xl z-50 overflow-hidden ${
                                                                    isDark ? 'bg-[#1e1e2d] border-[#2a2a3d]' : 'bg-white border-slate-200'
                                                                }`}
                                                            >
                                                                <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b ${isDark ? 'text-slate-500 border-[#2a2a3d]' : 'text-slate-400 border-slate-100'}`}>
                                                                    Connected AI Tools
                                                                </div>
                                                                <div className="p-1">
                                                                    {workspaceTools.filter(t => !t.permId || hasPermission(t.permId)).length > 0 ? (
                                                                        workspaceTools.filter(t => !t.permId || hasPermission(t.permId)).map((tool, idx) => (
                                                                            <button
                                                                                key={idx}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setPlusMenuOpen(false);
                                                                                    if (WidgetRegistry[tool.id] || tool.schemaJson) {
                                                                                        const newMsg = {
                                                                                            id: Date.now(),
                                                                                            role: 'ai',
                                                                                            isWidget: true,
                                                                                            widgetType: tool.id,
                                                                                            content: `Welcome to ${tool.title}! Select your preferences below:`
                                                                                        };
                                                                                        setMessages(prev => [...prev, newMsg]);
                                                                                    } else if (tool.path) {
                                                                                        navigate(tool.path);
                                                                                    } else {
                                                                                        console.warn("Tool has no widget, schema, or path:", tool.title);
                                                                                    }
                                                                                }}
                                                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors text-left ${
                                                                                    isDark ? 'text-slate-300 hover:bg-[#2a2a3d] hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-primary'
                                                                                }`}
                                                                            >
                                                                                <div className={`p-1.5 rounded-md ${isDark ? 'bg-[#16161f] text-indigo-400' : 'bg-white shadow-sm border border-slate-200/60 text-primary'}`}>
                                                                                    {tool.icon}
                                                                                </div>
                                                                                {tool.title}
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className={`px-3 py-3 text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                                            No connected tools available.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <textarea
                                                ref={textareaRef}
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder="Ask anything"
                                                className={`w-full bg-transparent pl-12 pr-24 py-[14px] text-[15px] outline-none resize-none min-h-[52px] max-h-[160px] ${
                                                    isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
                                                }`}
                                                rows={1}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSend(e);
                                                    }
                                                }}
                                            />
                                            
                                            <div className="absolute right-3 top-2 bottom-2 flex items-center justify-end gap-1.5 bg-transparent">
                                                <button type="button" className={`p-1.5 rounded-full ${isDark ? 'text-slate-400 hover:bg-[#2a2a3d]' : 'text-slate-400 hover:bg-slate-100'}`}>
                                                    <Mic size={18} />
                                                </button>
                                                <button 
                                                    type="submit"
                                                    disabled={!prompt.trim()}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                                                        prompt.trim()
                                                            ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                                                            : (isDark ? 'bg-[#2a2a3d] text-slate-500' : 'bg-slate-200 text-slate-400')
                                                    }`}
                                                >
                                                    <ArrowUp size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className={`text-center text-[10px] mt-2.5 ${t.textMuted}`}>
                                            AI may produce inaccurate information. Powered by Knowledge Hub.
                                        </p>
                                    </form>
                                );
                            })()}
                        </div>
                    </div>
                )}
                </>
                )}

            </div>
        </div>
    );
};

export default AiWorkspace;
