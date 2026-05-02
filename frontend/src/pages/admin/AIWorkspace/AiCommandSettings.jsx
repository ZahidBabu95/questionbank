import React, { useState, useEffect, useCallback } from 'react';
import { Save, Sparkles, BrainCircuit, RotateCcw, ShieldCheck, Database, SlidersHorizontal, Loader2, CheckCircle, Plus, Trash2, Edit2, X } from 'lucide-react';
import settingsService from '../../../services/settingsService';

const DEFAULT_TONES = [
    { id: 'professional', name: 'Professional', instruction: 'You are a professional academic assistant. Provide formal, direct, and highly accurate answers suitable for high-school or university students. Avoid emojis or casual language.', roles: ['Teacher'] },
    { id: 'friendly', name: 'Friendly', instruction: 'You are a warm, encouraging, and friendly tutor. Use simple words, short sentences, and appropriate emojis to keep younger students engaged.', roles: ['Teacher', 'Student'] },
    { id: 'socratic', name: 'Socratic', instruction: 'You are a Socratic tutor. Instead of giving direct answers, ask guiding questions to help the student discover the answer themselves.', roles: ['Teacher', 'Student'] }
];

const AiCommandSettings = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({});
    const [originalSettings, setOriginalSettings] = useState({});
    const [message, setMessage] = useState(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    // Dynamic Tones State
    const [customTones, setCustomTones] = useState([]);
    const [editingTone, setEditingTone] = useState(null);

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

            // Parse custom tones if they exist, otherwise use defaults
            let tones = DEFAULT_TONES;
            if (data.workspace_custom_tones) {
                try {
                    tones = JSON.parse(data.workspace_custom_tones);
                    if (!Array.isArray(tones) || tones.length === 0) tones = DEFAULT_TONES;
                } catch (e) {
                    console.error("Failed to parse custom tones", e);
                }
            }
            setCustomTones(tones);

            const defaults = {
                workspace_default_mode: data.workspace_default_mode || 'strict',
                workspace_default_tone: data.workspace_default_tone || tones[0].id,
                workspace_pinecone_limit: data.workspace_pinecone_limit || '4',
                workspace_use_vector: data.workspace_use_vector !== 'false',
                workspace_use_qbank: data.workspace_use_qbank !== 'false',
            };

            setSettings(defaults);
            setOriginalSettings({ ...defaults, workspace_custom_tones: JSON.stringify(tones) });
        } catch (error) {
            console.error("Error fetching AI settings:", error);
            setMessage({ type: 'error', text: 'Failed to load settings.' });
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

    const handleSave = async (overrideTones = null) => {
        setSaving(true);
        setMessage(null);
        try {
            const tonesToSave = overrideTones !== null ? overrideTones : customTones;
            const tonesJson = JSON.stringify(tonesToSave);
            const payload = {
                ...settings,
                workspace_use_vector: String(settings.workspace_use_vector),
                workspace_use_qbank: String(settings.workspace_use_qbank),
                workspace_custom_tones: tonesJson
            };

            if (isSuperAdmin) {
                await settingsService.updateGlobalSettings('AI', payload);
            } else {
                await settingsService.updateInstituteSettings('AI', payload);
            }
            setOriginalSettings({ ...settings, workspace_custom_tones: tonesJson });
            if (overrideTones === null) {
                setMessage({ type: 'success', text: 'AI Workspace settings saved successfully.' });
            }
        } catch (error) {
            console.error("Error saving AI settings:", error);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    // Tone Management Functions
    const saveEditingTone = () => {
        if (!editingTone.name || !editingTone.instruction) {
            alert('Name and Instruction are required.');
            return;
        }
        if (!editingTone.roles || editingTone.roles.length === 0) {
            alert('At least one role (Teacher or Student) must be selected.');
            return;
        }
        
        let updatedTones;
        if (editingTone.isNew) {
            const newId = editingTone.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            if (customTones.some(t => t.id === newId)) {
                alert('A tone with a similar name already exists.');
                return;
            }
            updatedTones = [...customTones, { id: newId, name: editingTone.name, instruction: editingTone.instruction, roles: editingTone.roles }];
        } else {
            updatedTones = customTones.map(t => t.id === editingTone.id ? { ...t, name: editingTone.name, instruction: editingTone.instruction, roles: editingTone.roles } : t);
        }
        
        setCustomTones(updatedTones);
        setEditingTone(null);
        handleSave(updatedTones); // Save immediately
    };

    const deleteTone = (id) => {
        if(customTones.length <= 1) {
            alert('You must have at least one tone.');
            return;
        }
        if(!confirm('Delete this personality tone?')) return;
        const updated = customTones.filter(t => t.id !== id);
        setCustomTones(updated);
        
        // Ensure we don't leave an invalid default tone
        if (settings.workspace_default_tone === id) {
            setSettings(prev => ({ ...prev, workspace_default_tone: updated[0].id }));
            // Need a slight workaround since setSettings is async, but handleSave reads from 'settings'
            // However, handleSave isn't strictly necessary here because we can just trigger a save manually with the override
        }
        
        handleSave(updated); // Save immediately
    };

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings) || JSON.stringify(customTones) !== originalSettings.workspace_custom_tones;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-500 font-medium">Loading Command Center Settings...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <SlidersHorizontal className="text-indigo-600" />
                        Command Center & Modes
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Configure global defaults, strict mode behavior, and knowledge retrieval settings for the AI Workspace.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            setSettings({ ...originalSettings });
                            setCustomTones(JSON.parse(originalSettings.workspace_custom_tones || '[]'));
                        }}
                        disabled={!hasChanges || saving}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
                    >
                        <RotateCcw size={16} /> Discard
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transition-all"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Notification */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 font-semibold text-sm animate-fade-in ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message.type === 'error' ? <ShieldCheck size={20} /> : <CheckCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Defaults & Tones */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <BrainCircuit className="text-indigo-500" size={18} />
                            <h2 className="font-bold text-slate-800">Workspace Defaults & Personas</h2>
                        </div>
                        <div className="p-5 space-y-6">
                            
                            {/* Mode Selection */}
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Core Operational Mode (Token Management)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleChange('workspace_default_mode', 'strict')}
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all overflow-hidden ${settings.workspace_default_mode === 'strict' ? 'border-emerald-500 bg-emerald-50/30 shadow-[0_8px_30px_rgb(16,185,129,0.12)]' : 'border-slate-200 hover:border-emerald-300'}`}
                                    >
                                        {settings.workspace_default_mode === 'strict' && (
                                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Active</div>
                                        )}
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-xl ${settings.workspace_default_mode === 'strict' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <ShieldCheck size={24} />
                                            </div>
                                            <div>
                                                <h3 className={`font-black text-lg ${settings.workspace_default_mode === 'strict' ? 'text-emerald-900' : 'text-slate-700'}`}>Strict Mode</h3>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${settings.workspace_default_mode === 'strict' ? 'text-emerald-600' : 'text-slate-400'}`}>0 Token / Rule-Based</p>
                                            </div>
                                        </div>
                                        <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                                            Operates using internal algorithms and direct database queries. <strong className="text-emerald-700">Zero LLM tokens consumed.</strong> Prevents AI hallucination entirely. High-frequency tools like Auto-Exam are rendered as interactive widgets.
                                        </p>
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleChange('workspace_default_mode', 'creative')}
                                        className={`relative p-5 rounded-2xl border-2 text-left transition-all overflow-hidden opacity-60 cursor-not-allowed ${settings.workspace_default_mode === 'creative' ? 'border-amber-500 bg-amber-50/30' : 'border-slate-200'}`}
                                        disabled
                                        title="Creative Mode is under development"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-xl ${settings.workspace_default_mode === 'creative' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Sparkles size={24} />
                                            </div>
                                            <div>
                                                <h3 className={`font-black text-lg ${settings.workspace_default_mode === 'creative' ? 'text-amber-900' : 'text-slate-700'}`}>Creative Mode</h3>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${settings.workspace_default_mode === 'creative' ? 'text-amber-600' : 'text-slate-400'}`}>Generative AI</p>
                                            </div>
                                        </div>
                                        <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                                            Uses external LLMs (e.g. Gemini) for open-ended knowledge synthesis and creative answering. <strong className="text-amber-700">Consumes API tokens.</strong> <br/>
                                            <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded uppercase">Coming Soon</span>
                                        </p>
                                    </button>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Dynamic Tone Editor */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Dynamic Personality Tones</label>
                                    <button 
                                        onClick={() => setEditingTone({ isNew: true, name: '', instruction: '', roles: ['Teacher', 'Student'] })}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                                    >
                                        <Plus size={14} /> Add Tone
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mb-3">Define how the AI behaves by injecting strict JSON/prompt instructions based on the selected tone.</p>

                                {/* Inline Editor */}
                                {editingTone && (
                                    <div className="mb-4 p-4 border-2 border-indigo-200 bg-indigo-50/30 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-indigo-900 text-sm">{editingTone.isNew ? 'Create New Tone' : 'Edit Tone'}</h4>
                                            <button onClick={() => setEditingTone(null)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                                        </div>
                                        <div>
                                            <input 
                                                type="text" 
                                                placeholder="Tone Name (e.g. Socratic)" 
                                                value={editingTone.name} 
                                                onChange={e => setEditingTone({...editingTone, name: e.target.value})}
                                                className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                                            />
                                        </div>
                                        <div>
                                            <textarea 
                                                placeholder="System Instruction or JSON rules for the LLM..." 
                                                value={editingTone.instruction} 
                                                onChange={e => setEditingTone({...editingTone, instruction: e.target.value})}
                                                className="w-full px-3 py-2 border border-indigo-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-100 min-h-[80px]"
                                            />
                                        </div>
                                        
                                        {/* Role Mapping Options */}
                                        <div className="pt-1">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Available for Roles:</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editingTone.roles?.includes('Teacher') || false}
                                                        onChange={(e) => {
                                                            const newRoles = e.target.checked 
                                                                ? [...(editingTone.roles || []), 'Teacher'] 
                                                                : (editingTone.roles || []).filter(r => r !== 'Teacher');
                                                            setEditingTone({...editingTone, roles: newRoles});
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    /> Teacher
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editingTone.roles?.includes('Student') || false}
                                                        onChange={(e) => {
                                                            const newRoles = e.target.checked 
                                                                ? [...(editingTone.roles || []), 'Student'] 
                                                                : (editingTone.roles || []).filter(r => r !== 'Student');
                                                            setEditingTone({...editingTone, roles: newRoles});
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    /> Student
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2 border-t border-indigo-200/50">
                                            <button onClick={() => setEditingTone(null)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                                            <button onClick={saveEditingTone} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700">Save Tone</button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {customTones.map(tone => (
                                        <div key={tone.id} className={`flex items-start justify-between p-3 border rounded-xl transition-colors ${settings.workspace_default_tone === tone.id ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                            <div 
                                                className="flex-1 cursor-pointer"
                                                onClick={() => handleChange('workspace_default_tone', tone.id)}
                                            >
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full border-2 ${settings.workspace_default_tone === tone.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}></div>
                                                    <h4 className={`font-bold text-sm ${settings.workspace_default_tone === tone.id ? 'text-indigo-900' : 'text-slate-800'}`}>{tone.name}</h4>
                                                    {settings.workspace_default_tone === tone.id && <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">DEFAULT</span>}
                                                    <div className="flex gap-1 ml-1">
                                                        {tone.roles?.includes('Teacher') && <span className="text-[9px] bg-blue-50 text-blue-600 border border-blue-100 px-1 rounded-sm">Teacher</span>}
                                                        {tone.roles?.includes('Student') && <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 rounded-sm">Student</span>}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1 pl-5 line-clamp-2">{tone.instruction}</p>
                                            </div>
                                            <div className="flex items-center gap-1 ml-4 mt-1">
                                                <button onClick={() => setEditingTone(tone)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Edit JSON/Prompt">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => deleteTone(tone.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded" title="Delete">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Right Column: Knowledge Hub & Vector Settings */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <Database className="text-indigo-500" size={18} />
                            <h2 className="font-bold text-slate-800">Knowledge Routing</h2>
                        </div>
                        <div className="p-5 space-y-5">
                            
                            {/* Checkboxes for Sources */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Allowed Strict Sources</label>
                                <div className="space-y-3">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.workspace_use_vector} 
                                            onChange={e => handleChange('workspace_use_vector', e.target.checked)}
                                            className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" 
                                        />
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Vector DB (Golden Data)</span>
                                            <span className="block text-[11px] text-slate-400">Search textbooks and curriculum PDFs via Pinecone.</span>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.workspace_use_qbank} 
                                            onChange={e => handleChange('workspace_use_qbank', e.target.checked)}
                                            className="mt-1 rounded text-indigo-600 focus:ring-indigo-500" 
                                        />
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Proprietary Question Bank</span>
                                            <span className="block text-[11px] text-slate-400">Fetch approved MCQ and CQ from the MySQL database.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Pinecone Chunk Limit */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vector Retrieval Limit (Top-K)</label>
                                <p className="text-[11px] text-slate-400 mb-2">Controls how many chunks of text are pulled from the database per query. Higher values increase accuracy but consume more API tokens.</p>
                                <input 
                                    type="number" 
                                    min="1" max="10"
                                    value={settings.workspace_pinecone_limit}
                                    onChange={e => handleChange('workspace_pinecone_limit', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                                />
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AiCommandSettings;
