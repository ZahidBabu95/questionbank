import React from 'react';
import { FileSearch, Edit3, Save, X, ChevronUp, ChevronDown } from 'lucide-react';

export default function MetadataPanel({ 
    extractedQuestions, 
    showMetaPanel, 
    metadata, 
    META_FIELDS, 
    editingMeta, 
    setEditingMeta, 
    metaForm, 
    setMetaForm, 
    handleSaveMeta, 
    metaPanelOpen, 
    setMetaPanelOpen, 
    activeSuggestionField, 
    setActiveSuggestionField, 
    getSuggestionsForField 
}) {
    if (extractedQuestions.length === 0 || !showMetaPanel) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 rounded-2xl border border-indigo-200/60 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-white/60 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <FileSearch size={14} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-700">ডকুমেন্ট মেটাডেটা</h3>
                        <p className="text-[10px] text-slate-400">AI দ্বারা শনাক্তকৃত তথ্য</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {!editingMeta ? (
                        <button onClick={() => { setMetaForm({ ...metadata }); setEditingMeta(true); }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-600 text-[10px] font-bold hover:bg-indigo-50 transition-all shadow-sm">
                            <Edit3 size={11} /> সম্পাদনা
                        </button>
                    ) : (
                        <div className="flex gap-1">
                            <button onClick={handleSaveMeta}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-all shadow-sm">
                                <Save size={11} /> সংরক্ষণ
                            </button>
                            <button onClick={() => setEditingMeta(false)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 text-[10px] font-bold hover:bg-slate-50 transition-all">
                                <X size={11} /> বাতিল
                            </button>
                        </div>
                    )}
                    <button onClick={() => setMetaPanelOpen(!metaPanelOpen)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        {metaPanelOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                </div>
            </div>
            {metaPanelOpen && (
                <div className="p-4">
                    {editingMeta ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {META_FIELDS.map(f => (
                                <div key={f.key}>
                                    <label className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                                        {f.icon} {f.label}
                                    </label>
                                    <div className="relative">
                                        <input type="text" value={metaForm[f.key] || ''}
                                            onChange={e => { setMetaForm(prev => ({ ...prev, [f.key]: e.target.value })); setActiveSuggestionField(f.key); }}
                                            onFocus={() => setActiveSuggestionField(f.key)}
                                            onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                                            className="w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            placeholder={f.label} autoComplete="off" />
                                        {activeSuggestionField === f.key && getSuggestionsForField(f.key, metaForm[f.key]).length > 0 && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-indigo-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                                {getSuggestionsForField(f.key, metaForm[f.key]).map((s, i) => (
                                                    <button key={i} type="button"
                                                        onMouseDown={e => { e.preventDefault(); setMetaForm(prev => ({ ...prev, [f.key]: s })); setActiveSuggestionField(null); }}
                                                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 text-slate-700 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {META_FIELDS.map(f => metadata[f.key] ? (
                                <div key={f.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-100 shadow-sm">
                                    <span className="text-indigo-500">{f.icon}</span>
                                    <span className="text-[10px] font-medium text-slate-400">{f.label}:</span>
                                    <span className="text-xs font-bold text-slate-700">{metadata[f.key]}</span>
                                </div>
                            ) : null)}
                            {metadata.sourceUrl && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-100 shadow-sm">
                                    <span className="text-indigo-500">🔗</span>
                                    <span className="text-[10px] font-medium text-slate-400">সোর্স:</span>
                                    <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer"
                                        className="text-[11px] font-medium text-blue-600 hover:underline truncate max-w-[200px]">
                                        {metadata.sourceUrl}
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
