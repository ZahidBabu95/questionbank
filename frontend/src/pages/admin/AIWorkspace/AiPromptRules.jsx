import React, { useState, useEffect, useCallback } from 'react';
import { Save, Terminal, FileJson, AlertTriangle, RotateCcw, ShieldAlert, Loader2, CheckCircle, Code } from 'lucide-react';
import settingsService from '../../../services/settingsService';

const AiPromptRules = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        workspace_base_prompt: '',
        workspace_json_schemas: ''
    });
    const [originalSettings, setOriginalSettings] = useState({});
    const [message, setMessage] = useState(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const hasSuperRole = user.roles && (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ROLE_SUPER_ADMIN'));
                setIsSuperAdmin(hasSuperRole);
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            let data = {};
            if (isSuperAdmin) {
                data = await settingsService.getGlobalSettings('AI');
            } else {
                data = await settingsService.getInstituteSettings('AI');
            }
            
            if (data && typeof data === 'object') {
                data = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});
            }

            const defaultBasePrompt = "You are a highly intelligent and helpful 'Learning Copilot' and 'Doubt Solver' assistant for an EdTech platform. Use Bengali (বাংলা) for the response since most users are from Bangladesh, unless requested otherwise. Format everything beautifully using Markdown. Use LaTeX ($$ math $$) if there are physics or math equations to write.";

            const defaultSchemas = JSON.stringify([
                {
                    subject: 'physics',
                    schema: 'Always include step-by-step mathematical derivations and use LaTeX for all formulas.'
                },
                {
                    subject: 'literature',
                    schema: 'Analyze characters in depth and use clear headings. Do not use math equations.'
                }
            ], null, 2);

            const defaults = {
                workspace_base_prompt: data.workspace_base_prompt || defaultBasePrompt,
                workspace_json_schemas: data.workspace_json_schemas || defaultSchemas,
            };

            setSettings(defaults);
            setOriginalSettings(defaults);
        } catch (error) {
            console.error("Error fetching AI settings:", error);
            setMessage({ type: 'error', text: 'Failed to load prompt rules.' });
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // Validate JSON schema
            try {
                JSON.parse(settings.workspace_json_schemas);
            } catch (e) {
                setMessage({ type: 'error', text: 'Invalid JSON format in Subject Schemas.' });
                setSaving(false);
                return;
            }

            if (isSuperAdmin) {
                await settingsService.updateGlobalSettings('AI', settings);
            } else {
                await settingsService.updateInstituteSettings('AI', settings);
            }
            setOriginalSettings({ ...settings });
            setMessage({ type: 'success', text: 'Prompt rules and schemas saved successfully.' });
        } catch (error) {
            console.error("Error saving AI prompts:", error);
            setMessage({ type: 'error', text: 'Failed to save prompt rules.' });
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-500 font-medium">Loading Prompt Rules...</p>
            </div>
        );
    }

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShieldAlert size={48} className="text-rose-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
                <p className="text-slate-500 mt-2">Only Super Admins can configure Core Prompt Hardening and JSON Schemas.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Terminal className="text-rose-600" />
                        Prompt Hardening & Rules
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Configure the core System Prompt ("The Brain") and define Subject-Specific JSON Schemas.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setSettings({ ...originalSettings })}
                        disabled={!hasChanges || saving}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
                    >
                        <RotateCcw size={16} /> Discard
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="px-6 py-2 bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transition-all"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Rules
                    </button>
                </div>
            </div>

            {/* Notification */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 font-semibold text-sm animate-fade-in ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Base System Prompt */}
                <div className="space-y-6 flex flex-col">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Code className="text-rose-500" size={18} />
                                <h2 className="font-bold text-slate-800">Base System Prompt</h2>
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <p className="text-xs text-slate-500 mb-4">
                                This is the foundational instruction injected into EVERY interaction. It overrides user prompts and establishes baseline constraints (e.g. language, format, security).
                            </p>
                            <textarea 
                                value={settings.workspace_base_prompt}
                                onChange={(e) => setSettings({...settings, workspace_base_prompt: e.target.value})}
                                className="w-full flex-1 p-4 bg-[#1e1e2e] text-emerald-400 font-mono text-sm rounded-xl outline-none focus:ring-2 focus:ring-rose-500/50 border border-[#2a2a3d]"
                                spellCheck={false}
                                placeholder="Enter base system instructions here..."
                                style={{ minHeight: '300px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Subject-Specific JSON Schemas */}
                <div className="space-y-6 flex flex-col">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileJson className="text-orange-500" size={18} />
                                <h2 className="font-bold text-slate-800">Subject-Specific Schemas</h2>
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <p className="text-xs text-slate-500 mb-4">
                                Define a JSON array of specific instructions based on subjects. When a user asks a question in a specific subject context, this additional rule will be appended.
                            </p>
                            <textarea 
                                value={settings.workspace_json_schemas}
                                onChange={(e) => setSettings({...settings, workspace_json_schemas: e.target.value})}
                                className="w-full flex-1 p-4 bg-[#1e1e2e] text-amber-400 font-mono text-sm rounded-xl outline-none focus:ring-2 focus:ring-orange-500/50 border border-[#2a2a3d]"
                                spellCheck={false}
                                placeholder={"[\\n  { \\n    \"subject\": \"physics\", \\n    \"schema\": \"...\" \\n  }\\n]"}
                                style={{ minHeight: '300px' }}
                            />
                        </div>
                    </div>
                </div>

            </div>
            
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-800">
                <AlertTriangle className="shrink-0" />
                <div className="text-sm font-medium">
                    <p className="font-bold mb-1">Warning: Core Configuration Area</p>
                    <p>Changes made here immediately affect the behavior of the entire AI Workspace. Incorrect JSON formatting or overly restrictive prompts may break the chat capabilities for all users.</p>
                </div>
            </div>
        </div>
    );
};

export default AiPromptRules;
