import React, { useState, useEffect } from 'react';
import { Save, Users, User, ShieldCheck, CheckCircle, Loader2, Plus, Edit2, Trash2, X, Sparkles } from 'lucide-react';
import settingsService from '../../../services/settingsService';

const AiPersonaMapping = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({});
    const [customTones, setCustomTones] = useState([]);
    const [message, setMessage] = useState(null);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [editingTone, setEditingTone] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setIsSuperAdmin(user.roles?.includes('SUPER_ADMIN') || user.roles?.includes('ROLE_SUPER_ADMIN'));
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            let data = isSuperAdmin 
                ? await settingsService.getGlobalSettings('AI') 
                : await settingsService.getInstituteSettings('AI');
            
            if (data && typeof data === 'object') {
                data = Object.keys(data).reduce((acc, key) => { acc[key.toLowerCase()] = data[key]; return acc; }, {});
            }

            setSettings(data || {});
            
            if (data?.workspace_custom_tones) {
                setCustomTones(JSON.parse(data.workspace_custom_tones));
            } else {
                setCustomTones([
                    { id: 'professional', name: 'Professional', instruction: 'You are a professional academic assistant. Provide formal, direct, and highly accurate answers.', roles: ['Teacher'] },
                    { id: 'friendly', name: 'Friendly', instruction: 'You are a warm, encouraging, and friendly tutor. Use simple words.', roles: ['Teacher', 'Student'] },
                    { id: 'socratic', name: 'Socratic', instruction: 'Use the Socratic method: instead of giving direct answers, ask guiding questions.', roles: ['Teacher', 'Student'] }
                ]);
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSettings(); }, [isSuperAdmin]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleSaveBackend = async (newTones) => {
        setSaving(true);
        setMessage(null);
        try {
            const payload = { ...settings, workspace_custom_tones: JSON.stringify(newTones) };
            if (isSuperAdmin) {
                await settingsService.updateGlobalSettings('AI', payload);
            } else {
                await settingsService.updateInstituteSettings('AI', payload);
            }
            setCustomTones(newTones);
            setMessage({ type: 'success', text: 'Persona rules saved successfully.' });
        } catch (error) {
            console.error("Error saving persona mapping:", error);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

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
        
        handleSaveBackend(updatedTones);
        setEditingTone(null);
    };

    const deleteTone = (id) => {
        if(customTones.length <= 1) {
            alert('You must have at least one tone.');
            return;
        }
        if(!confirm('Delete this persona?')) return;
        handleSaveBackend(customTones.filter(t => t.id !== id));
    };

    const teacherTones = customTones.filter(t => t.roles?.includes('Teacher'));
    const studentTones = customTones.filter(t => t.roles?.includes('Student'));

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-500 font-medium">Loading Personas...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Users className="text-indigo-600" />
                        Persona & Role Mapping
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Map AI personalities to specific roles. Define how the Copilot interacts with Teachers vs Students.
                    </p>
                </div>
                <button 
                    onClick={() => setEditingTone({ isNew: true, name: '', instruction: '', roles: ['Teacher', 'Student'] })}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg flex items-center gap-2 transition-all"
                >
                    <Plus size={16} /> Create New Persona
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 font-semibold text-sm animate-fade-in ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message.type === 'error' ? <ShieldCheck size={20} /> : <CheckCircle size={20} />}
                    {message.text}
                </div>
            )}

            {/* Inline Editor */}
            {editingTone && (
                <div className="mb-6 p-5 border-2 border-indigo-200 bg-indigo-50/50 rounded-2xl space-y-4 shadow-sm animate-fade-in">
                    <div className="flex justify-between items-center border-b border-indigo-100 pb-3">
                        <h4 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
                            <Sparkles className="text-indigo-500" size={18} />
                            {editingTone.isNew ? 'Create AI Persona' : 'Edit AI Persona'}
                        </h4>
                        <button onClick={() => setEditingTone(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Persona Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Friendly Tutor" 
                                    value={editingTone.name} 
                                    onChange={e => setEditingTone({...editingTone, name: e.target.value})}
                                    className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Available for Roles:</label>
                                <div className="flex flex-col gap-3 p-3 bg-white border border-indigo-100 rounded-xl shadow-sm">
                                    <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={editingTone.roles?.includes('Teacher') || false}
                                            onChange={(e) => {
                                                const newRoles = e.target.checked 
                                                    ? [...(editingTone.roles || []), 'Teacher'] 
                                                    : (editingTone.roles || []).filter(r => r !== 'Teacher');
                                                setEditingTone({...editingTone, roles: newRoles});
                                            }}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                        /> 
                                        <span className="font-semibold text-blue-700">Teacher Role</span>
                                    </label>
                                    <label className="flex items-center gap-3 text-sm text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={editingTone.roles?.includes('Student') || false}
                                            onChange={(e) => {
                                                const newRoles = e.target.checked 
                                                    ? [...(editingTone.roles || []), 'Student'] 
                                                    : (editingTone.roles || []).filter(r => r !== 'Student');
                                                setEditingTone({...editingTone, roles: newRoles});
                                            }}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                        /> 
                                        <span className="font-semibold text-emerald-700">Student Role</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1">System Instructions (LLM Rules)</label>
                            <textarea 
                                placeholder="Define exactly how the LLM should behave, what tone to use, and how to format responses..." 
                                value={editingTone.instruction} 
                                onChange={e => setEditingTone({...editingTone, instruction: e.target.value})}
                                className="w-full px-4 py-3 border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono h-[180px] resize-none shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-indigo-100">
                        <button onClick={() => setEditingTone(null)} className="px-5 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button onClick={saveEditingTone} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Persona
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Teacher Personas */}
                <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-blue-100 bg-blue-50/50 flex items-center gap-2">
                        <User className="text-blue-600" size={18} />
                        <h2 className="font-bold text-slate-800">Teacher Personas</h2>
                        <span className="ml-auto text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{teacherTones.length}</span>
                    </div>
                    <div className="p-5 flex-1 bg-slate-50/30">
                        {teacherTones.length === 0 ? (
                            <p className="text-slate-400 italic text-sm text-center py-8">No personas assigned to Teacher role.</p>
                        ) : (
                            <div className="space-y-3">
                                {teacherTones.map(tone => (
                                    <div key={tone.id} className="p-4 border border-blue-100 bg-white rounded-xl shadow-sm hover:border-blue-300 transition-all group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-blue-900 text-sm">{tone.name}</h3>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingTone(tone)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={14}/></button>
                                                <button onClick={() => deleteTone(tone.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 font-mono line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">{tone.instruction}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Student Personas */}
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50/50 flex items-center gap-2">
                        <User className="text-emerald-600" size={18} />
                        <h2 className="font-bold text-slate-800">Student Personas</h2>
                        <span className="ml-auto text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{studentTones.length}</span>
                    </div>
                    <div className="p-5 flex-1 bg-slate-50/30">
                        {studentTones.length === 0 ? (
                            <p className="text-slate-400 italic text-sm text-center py-8">No personas assigned to Student role.</p>
                        ) : (
                            <div className="space-y-3">
                                {studentTones.map(tone => (
                                    <div key={tone.id} className="p-4 border border-emerald-100 bg-white rounded-xl shadow-sm hover:border-emerald-300 transition-all group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-emerald-900 text-sm">{tone.name}</h3>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingTone(tone)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 size={14}/></button>
                                                <button onClick={() => deleteTone(tone.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 font-mono line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100">{tone.instruction}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AiPersonaMapping;
