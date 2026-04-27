import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { 
    Server, AlertCircle, ShieldCheck, Database, Zap, FileText, 
    ChevronRight, Eye, BookOpen, ArrowLeft, CheckCircle, Bot, Sparkles, X,
    Layers, Search, Check, FileJson, Loader2, Tag, ChevronDown, Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import axios from '../../../utils/axios';

/* ═══════════════════ Topic Extract Config Modal ═══════════════════ */
const TopicExtractConfigModal = ({ indices, pages, onClose, onStartAll, onPreviewTopic }) => {
    const [mode, setMode] = useState('ALL');
    const [selectedIndexIds, setSelectedIndexIds] = useState([]);

    const chapterStats = useMemo(() => {
        const stats = {};
        indices.forEach(idx => {
            stats[idx.id] = { total: 0, proofread: 0, synced: 0 };
        });
        pages.forEach(p => {
            if (p.sourceBookIndexId && stats[p.sourceBookIndexId]) {
                stats[p.sourceBookIndexId].total += 1;
                if (p.extractionStatus === 'PROOFREAD') stats[p.sourceBookIndexId].proofread += 1;
                if (p.extractionStatus === 'GOLDEN_VECTORIZED') stats[p.sourceBookIndexId].synced += 1;
            }
        });
        return stats;
    }, [pages, indices]);

    const handleStart = () => {
        let targetIds = [];
        if (mode === 'ALL') {
            targetIds = indices.map(idx => idx.id);
            if(targetIds.length === 0) return alert('বইটিতে কোনো চ্যাপ্টার নেই!');
        } else {
            targetIds = selectedIndexIds;
            if (targetIds.length === 0) return alert('দয়া করে অন্তত একটি অধ্যায় নির্বাচন করুন।');
        }

        const hasAnyGoldenData = targetIds.some(id => (chapterStats[id]?.proofread + chapterStats[id]?.synced) > 0);
        if (!hasAnyGoldenData) {
            const proceed = window.confirm('আপনি এমন অধ্যায় নির্বাচন করেছেন যেখানে কোনো গোল্ডেন ডেটা (PROOFREAD) নেই। ভেক্টর সিঙ্ক শুধু গোল্ডেন ডেটা নিয়ে কাজ করে। আপনি কি নিশ্চিত যে আপনি চালিয়ে যেতে চান?');
            if (!proceed) return;
        }

        // Check if any selected chapter is already fully synced
        const alreadySyncedSelected = targetIds.filter(id => {
            const st = chapterStats[id];
            return st && st.synced > 0 && st.proofread === 0 && (st.proofread + st.synced) > 0; // Means all golden data is already synced
        });

        if (alreadySyncedSelected.length > 0) {
            const proceed = window.confirm('সতর্কতা: আপনি এমন কিছু চ্যাপ্টার নির্বাচন করেছেন যা আগে থেকেই সম্পূর্ণ সিঙ্ক করা আছে। এগুলো আবার সিঙ্ক করলে ডুপ্লিকেট ভেক্টর তৈরি হতে পারে এবং অতিরিক্ত টোকেন খরচ হবে। আপনি কি নিশ্চিত যে আপনি আবার সিঙ্ক করতে চান?');
            if (!proceed) return;
        }

        onStartAll(targetIds);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                            <Bot className="w-5 h-5" /> Topic Extraction & Vector Sync
                        </h2>
                        <p className="text-xs text-indigo-600 mt-1">
                            Select chapters to synchronize. Only PROOFREAD data will be processed.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-indigo-400 hover:bg-indigo-100 rounded-lg transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="p-5 flex flex-col gap-4 overflow-hidden min-h-[300px]">
                    <div className="flex gap-4 p-1 bg-slate-100 rounded-xl shrink-0">
                        <button 
                            className={`flex-1 py-2.5 text-sm font-bold capitalize rounded-lg transition-all ${mode === 'ALL' ? 'bg-white text-indigo-700 shadow border border-indigo-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            onClick={() => setMode('ALL')}
                        >
                            Full Book Sync
                        </button>
                        <button 
                            className={`flex-1 py-2.5 text-sm font-bold capitalize rounded-lg transition-all ${mode === 'SINGLE' ? 'bg-white text-indigo-700 shadow border border-indigo-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            onClick={() => setMode('SINGLE')}
                        >
                            Specific Chapters
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 relative">
                        {indices.map((idx, i) => {
                            const stats = chapterStats[idx.id];
                            if (!stats) return null;
                            const hasGoldenData = (stats.proofread + stats.synced) > 0;
                            const isSynced = stats.synced > 0 && stats.proofread === 0 && hasGoldenData;
                            const isEmpty = stats.total === 0;
                            
                            return (
                                <div key={idx.id} className={`p-3 rounded-lg border transition-colors ${mode === 'SINGLE' ? 'cursor-pointer hover:border-indigo-400' : ''} ${selectedIndexIds.includes(idx.id) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'}`} 
                                     onClick={() => { 
                                         if(mode==='SINGLE') setSelectedIndexIds(prev => prev.includes(idx.id) ? prev.filter(x => x !== idx.id) : [...prev, idx.id]); 
                                     }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {mode === 'SINGLE' && (
                                              <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${selectedIndexIds.includes(idx.id) ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 bg-white'}`}>
                                                  {selectedIndexIds.includes(idx.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                              </div>
                                            )}
                                            <span className={`font-bold text-sm ${selectedIndexIds.includes(idx.id) ? 'text-indigo-800' : 'text-slate-700'}`}>{i+1}. {idx.indexName}</span>
                                            {isSynced && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase font-bold">Already Synced</span>}
                                            {!hasGoldenData && stats.total > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase font-bold">No Golden Data</span>}
                                            {isEmpty && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase font-bold">Empty</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onPreviewTopic(idx); }}
                                                disabled={stats.synced === 0}
                                                className={`text-[10px] flex items-center gap-1 border px-2 py-0.5 rounded-full transition-colors ${stats.synced === 0 ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                                                title="Preview Topics & Chunks"
                                            >
                                                <Bot size={12} /> Preview Existing
                                            </button>
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{stats.total} Pages</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 z-20">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors">
                         Cancel
                    </button>
                    <button 
                        onClick={handleStart} 
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Bot size={16} /> Start Sync
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════ Delete Sync Config Modal ═══════════════════ */
const DeleteSyncConfigModal = ({ indices, pages, onClose, onStartAll }) => {
    const [mode, setMode] = useState('ALL');
    const [selectedIndexIds, setSelectedIndexIds] = useState([]);

    const chapterStats = useMemo(() => {
        const stats = {};
        indices.forEach(idx => {
            stats[idx.id] = { total: 0, proofread: 0, synced: 0 };
        });
        pages.forEach(p => {
            if (p.sourceBookIndexId && stats[p.sourceBookIndexId]) {
                stats[p.sourceBookIndexId].total += 1;
                if (p.extractionStatus === 'PROOFREAD') stats[p.sourceBookIndexId].proofread += 1;
                if (p.extractionStatus === 'GOLDEN_VECTORIZED') stats[p.sourceBookIndexId].synced += 1;
            }
        });
        return stats;
    }, [pages, indices]);

    const handleStart = () => {
        let targetIds = [];
        if (mode === 'ALL') {
            targetIds = indices.filter(idx => chapterStats[idx.id]?.synced > 0).map(idx => idx.id);
            if(targetIds.length === 0) return alert('বইটিতে কোনো সিঙ্ক করা চ্যাপ্টার নেই!');
        } else {
            targetIds = selectedIndexIds;
            if (targetIds.length === 0) return alert('দয়া করে অন্তত একটি অধ্যায় নির্বাচন করুন।');
            const hasAnySyncedData = targetIds.some(id => chapterStats[id]?.synced > 0);
            if (!hasAnySyncedData) {
                 return alert('আপনি যেসব চ্যাপ্টার সিলেক্ট করেছেন, সেগুলোর কোনোটিতেই সিঙ্ক করা ডেটা নেই।');
            }
        }

        const proceed = window.confirm('সতর্কতা: আপনি এই চ্যাপ্টারগুলোর সমস্ত ভেক্টর ডেটা মুছে ফেলতে যাচ্ছেন। মুছে ফেলার পর এগুলো আবার সিঙ্ক না করা পর্যন্ত ভেক্টর সার্চে কাজ করবে না। আপনি কি নিশ্চিত?');
        if (!proceed) return;

        onStartAll(targetIds);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-start justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-rose-800 flex items-center gap-2">
                            <Trash2 className="w-5 h-5" /> Delete Vector Sync Data
                        </h2>
                        <p className="text-xs text-rose-600 mt-1">Select chapters to reset. Only SYNCED data will be removed and reverted to GOLDEN status.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-rose-400 hover:bg-rose-100 rounded-lg transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                {/* Mode Toggles */}
                <div className="p-4 bg-white border-b border-slate-100 shrink-0">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setMode('ALL')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${mode === 'ALL' ? 'bg-white text-rose-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Full Book Reset</button>
                        <button onClick={() => setMode('SINGLE')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${mode === 'SINGLE' ? 'bg-white text-rose-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Specific Chapters</button>
                    </div>
                </div>

                {/* Chapter List */}
                <div className="p-4 flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl m-4 space-y-3 relative">
                    {indices.map((idx, i) => {
                        const stats = chapterStats[idx.id];
                        if (!stats) return null;
                        const isSynced = stats.synced > 0;
                        const isDisabled = !isSynced;
                        
                        return (
                            <div key={idx.id} className={`p-3 rounded-lg border transition-colors ${mode === 'SINGLE' && !isDisabled ? 'cursor-pointer hover:border-rose-400' : ''} ${selectedIndexIds.includes(idx.id) ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'} ${isDisabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`} 
                                 onClick={() => { 
                                     if(mode==='SINGLE' && !isDisabled) setSelectedIndexIds(prev => prev.includes(idx.id) ? prev.filter(x => x !== idx.id) : [...prev, idx.id]); 
                                 }}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {mode === 'SINGLE' && (
                                          <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${isDisabled ? 'bg-slate-200 border-slate-300' : selectedIndexIds.includes(idx.id) ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white'}`}>
                                              {selectedIndexIds.includes(idx.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                          </div>
                                        )}
                                        <span className={`font-bold text-sm ${selectedIndexIds.includes(idx.id) ? 'text-rose-800' : 'text-slate-700'}`}>{i+1}. {idx.indexName}</span>
                                        {isSynced && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase font-bold">Has Sync Data</span>}
                                        {isDisabled && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase font-bold">No Sync Data</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{stats.synced} Synced Pages</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 z-20">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors">
                         Cancel
                    </button>
                    <button 
                        onClick={handleStart} 
                        className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={16} /> Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════ Chunk Editor Component ═══════════════════ */
const ChunkEditor = ({ chunk, idx, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(chunk.chunkText);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            await axios.put(`/v1/knowledge-hub/chunks/${chunk.id}`, { chunkText: text });
            onSave(chunk.id, text);
            setIsEditing(false);
        } catch (err) {
            alert('Failed to save chunk: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`bg-white p-4 rounded-lg border shadow-sm relative transition-colors ${isEditing ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200'}`}>
            <div className="absolute top-2 right-2 flex gap-2 z-10">
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">Page {chunk.pageNumber}</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-mono">{Math.round(text.length / 4)} Tokens</span>
                {!isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="text-[10px] bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 font-bold shadow-sm">
                        Fix Data
                    </button>
                ) : (
                    <div className="flex gap-1">
                        <button onClick={() => { setIsEditing(false); setText(chunk.chunkText); }} disabled={saving} className="text-[10px] bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 px-2 py-0.5 rounded-full transition-colors font-bold disabled:opacity-50">
                            Cancel
                        </button>
                        <button onClick={handleSave} disabled={saving} className="text-[10px] bg-indigo-600 text-white hover:bg-indigo-700 px-2 py-0.5 rounded-full transition-colors font-bold flex items-center gap-1 shadow-sm disabled:opacity-50">
                            {saving ? <Loader2 size={10} className="animate-spin"/> : <Check size={10}/>} Save
                        </button>
                    </div>
                )}
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Chunk #{idx + 1}</span>
            
            {isEditing ? (
                <div className="mt-2">
                    <textarea 
                        value={text} 
                        onChange={(e) => setText(e.target.value)} 
                        className="w-full h-64 text-sm text-slate-700 font-mono leading-relaxed bg-white p-3 rounded-lg border border-indigo-200 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-y"
                    />
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-amber-600 bg-amber-50 px-2 py-1.5 rounded border border-amber-100">
                        <AlertCircle size={12}/>
                        <span>Editing this will directly update the Vector Database. This action cannot be undone.</span>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-60 overflow-y-auto mt-2 relative group">
                    {chunk.chunkText}
                </div>
            )}
        </div>
    );
};

/* ═══════════════════ Preview Topics Modal ═══════════════════ */
const PreviewTopicsModal = ({ indexId, indexName, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [topics, setTopics] = useState([]);
    const [error, setError] = useState(null);
    const [expandedTopicId, setExpandedTopicId] = useState(null);

    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const res = await axios.get(`/v1/knowledge-hub/indexes/${indexId}/topics-preview?t=${Date.now()}`);
                setTopics(res.data);
            } catch (err) {
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTopics();
    }, [indexId]);

    const handleChunkSaved = (chunkId, newText) => {
        setTopics(prev => prev.map(t => ({
            ...t,
            chunks: t.chunks.map(c => c.id === chunkId ? { ...c, chunkText: newText, tokenCount: Math.round(newText.length / 4) } : c)
        })));
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                            <Bot className="w-5 h-5" /> Synced Topics & Chunks
                        </h2>
                        <p className="text-xs text-indigo-600 mt-1">
                            Chapter: <span className="font-bold">{indexName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-indigo-400 hover:bg-indigo-100 rounded-lg transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="p-5 flex-1 overflow-y-auto bg-slate-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
                    ) : topics.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <Layers className="w-12 h-12 mb-3 opacity-20" />
                            <p>No chunks found. Vectorize the chapter first.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {topics.map(topic => (
                                <div key={topic.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div 
                                        className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => setExpandedTopicId(expandedTopicId === topic.id ? null : topic.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg">
                                                <Tag size={16} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{topic.name}</h3>
                                                <p className="text-xs text-slate-500">{topic.chunkCount} Vector Chunks</p>
                                            </div>
                                        </div>
                                        {expandedTopicId === topic.id ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
                                    </div>
                                    
                                    {expandedTopicId === topic.id && (
                                        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
                                            {topic.chunks.length === 0 ? (
                                                <p className="text-sm text-slate-400 italic">No chunks mapped to this topic.</p>
                                            ) : (
                                                topic.chunks.map((chunk, idx) => (
                                                    <ChunkEditor key={chunk.id} chunk={chunk} idx={idx} onSave={handleChunkSaved} />
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
const SyncCommandCenter = () => {
    const { bookId } = useParams();
    
    const [book, setBook] = useState(null);
    const [syncIntegrity, setSyncIntegrity] = useState(null);
    const [indices, setIndices] = useState([]);
    const [pages, setPages] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(true);
    
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [previewMarkdown, setPreviewMarkdown] = useState('');
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [portalTarget, setPortalTarget] = useState(null);

    // Sync Controls State
    const [aiQueueJob, setAiQueueJob] = useState(null);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [isDeleteSyncModalOpen, setIsDeleteSyncModalOpen] = useState(false);
    const [previewTopicIndex, setPreviewTopicIndex] = useState(null);
    const [displayLimit, setDisplayLimit] = useState(48);

    // Resizer State
    const [rightPanelWidth, setRightPanelWidth] = useState(500);
    const [isDragging, setIsDragging] = useState(false);

    const chapterPages = useMemo(() => {
        if (!selectedChapter) return pages; 
        return pages.filter(p => p.sourceBookIndexId === selectedChapter.id);
    }, [pages, selectedChapter]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 300 && newWidth < window.innerWidth * 0.7) {
                setRightPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = 'default';
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isDragging]);

    useEffect(() => {
        const target = document.getElementById('topbar-actions');
        if (target) setPortalTarget(target);
        fetchDetails();
    }, [bookId]);

    const [dismissedJobId, setDismissedJobId] = useState(null);

    // Job Poller
    useEffect(() => {
        if (!bookId) return;
        const fetchStatus = async () => {
            try {
                const res = await axios.get(`/v1/knowledge-hub/jobs/topic-extract/source-books/${bookId}/status?t=${Date.now()}`);
                if (res.status === 204) {
                    setAiQueueJob(null);
                } else {
                    if (res.data.id === dismissedJobId) {
                        setAiQueueJob(null);
                    } else {
                        setAiQueueJob(res.data);
                    }
                }
            } catch(e) {}
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [bookId, dismissedJobId]);

    // Live Page Poller during active sync
    const prevJobStatus = useRef(null);
    useEffect(() => {
        let interval;
        if (aiQueueJob && aiQueueJob.status === 'IN_PROGRESS') {
            interval = setInterval(() => {
                fetchPagesSilent();
            }, 3000);
        } else if ((prevJobStatus.current === 'IN_PROGRESS' || prevJobStatus.current === 'QUEUED') && aiQueueJob && (aiQueueJob.status === 'COMPLETED' || aiQueueJob.status === 'FAILED')) {
            fetchPagesSilent();
            if (selectedChapter) {
                handleSelectChapter(selectedChapter, true);
            }
        }
        if (aiQueueJob) prevJobStatus.current = aiQueueJob.status;
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [aiQueueJob?.status, bookId, selectedChapter]);

    const fetchPagesSilent = async () => {
        try {
            const [integrityRes, indicesRes, pagesRes] = await Promise.all([
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/sync-integrity?t=${Date.now()}`),
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices?t=${Date.now()}`),
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/pages?t=${Date.now()}`)
            ]);
            setSyncIntegrity(integrityRes.data);
            setIndices(indicesRes.data);
            const sortedPages = pagesRes.data.sort((a,b) => a.pageNumber - b.pageNumber);
            setPages(sortedPages);
        } catch (error) {
            console.error('Silent fetch failed', error);
        }
    };

    const fetchDetails = async () => {
        try {
            setLoadingDetails(true);
            const [bookRes, integrityRes, indicesRes, pagesRes] = await Promise.all([
                axios.get(`/v1/knowledge-hub/source-books/${bookId}?t=${Date.now()}`),
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/sync-integrity?t=${Date.now()}`),
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices?t=${Date.now()}`),
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/pages?t=${Date.now()}`)
            ]);
            
            setBook(bookRes.data);
            setSyncIntegrity(integrityRes.data);
            setIndices(indicesRes.data);
            const sortedPages = pagesRes.data.sort((a,b) => a.pageNumber - b.pageNumber);
            setPages(sortedPages);
        } catch (error) {
            console.error('Failed to load command center details', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSelectChapter = async (chapter, forceRefetch = false) => {
        setDisplayLimit(48);
        if (selectedChapter?.id === chapter?.id && !forceRefetch) {
            setSelectedChapter(null);
            setPreviewMarkdown('');
            return;
        }
        
        setSelectedChapter(chapter);
        setLoadingPreview(true);
        if (!forceRefetch) setPreviewMarkdown('');
        try {
            const res = await axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices/${chapter.id}/vector-preview?t=${Date.now()}`);
            const markdownStr = typeof res.data === 'string' ? res.data : (res.data?.markdown || '');
            setPreviewMarkdown(markdownStr);
        } catch (error) {
            console.error('Failed to load vector preview', error);
            setPreviewMarkdown('# No Synced Data\nVector data is not available for this chapter yet. Please sync it using the extraction tool.');
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleExtractAllTopics = async (targetIndexIds) => {
        try {
            setIsTopicModalOpen(false);
            setDismissedJobId(null);
            const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/extract-all-topics`, targetIndexIds);
            try {
                const statusRes = await axios.get(`/v1/knowledge-hub/jobs/topic-extract/source-books/${bookId}/status`);
                if (statusRes.status !== 204) setAiQueueJob(statusRes.data);
            } catch(e) {}
        } catch (err) { 
            console.error('Bulk Extract Error:', err);
            alert('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handlePauseJob = async () => {
        if(!aiQueueJob) return;
        await axios.post(`/v1/knowledge-hub/jobs/topic-extract/${aiQueueJob.id}/pause`);
        setAiQueueJob(prev => ({...prev, status: 'PAUSED'}));
    };

    const handleResumeJob = async () => {
        if(!aiQueueJob) return;
        await axios.post(`/v1/knowledge-hub/jobs/topic-extract/${aiQueueJob.id}/resume`);
        setAiQueueJob(prev => ({...prev, status: 'QUEUED'}));
    };

    const handleDeleteSyncData = () => {
        setIsDeleteSyncModalOpen(true);
    };

    const handleExecuteDeleteSync = async (targetIndexIds) => {
        try {
            setIsDeleteSyncModalOpen(false);
            const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/delete-sync`, targetIndexIds);
            fetchPagesSilent();
            alert(res.data.message || 'Sync data deleted successfully.');
        } catch (err) {
            console.error('Delete Sync Error:', err);
            alert('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'GOLDEN_VECTORIZED':
                return <span className="absolute top-1 right-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[8px] font-black px-1.5 py-0.5 shadow-sm rounded-sm z-10 flex items-center gap-0.5"><Sparkles size={8}/> SYNCED</span>;
            case 'PROOFREAD':
                return <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 shadow-sm rounded-sm z-10">GOLDEN</span>;
            case 'EXTRACTED':
            case 'REVIEWED':
                return <span className="absolute top-1 right-1 bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 shadow-sm rounded-sm z-10">DRAFT</span>;
            case 'FAILED':
                return <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 shadow-sm rounded-sm z-10">FAILED</span>;
            default:
                return <span className="absolute top-1 right-1 bg-slate-500 text-white text-[8px] font-black px-1.5 py-0.5 shadow-sm rounded-sm z-10">RAW</span>;
        }
    };

    if (loadingDetails) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50 min-h-[calc(100vh-64px)]">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm font-black uppercase tracking-widest text-indigo-400 animate-pulse">Loading Command Center...</p>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 relative font-satoshi overflow-hidden">
            
            {isTopicModalOpen && (
                <TopicExtractConfigModal 
                    indices={indices} 
                    pages={pages} 
                    onClose={() => setIsTopicModalOpen(false)}
                    onStartAll={handleExtractAllTopics}
                    onPreviewTopic={(idx) => setPreviewTopicIndex(idx)}
                />
            )}

            {isDeleteSyncModalOpen && (
                <DeleteSyncConfigModal 
                    indices={indices} 
                    pages={pages} 
                    onClose={() => setIsDeleteSyncModalOpen(false)}
                    onStartAll={handleExecuteDeleteSync}
                />
            )}

            {previewTopicIndex && (
                <PreviewTopicsModal
                    indexId={previewTopicIndex.id}
                    indexName={previewTopicIndex.indexName}
                    onClose={() => setPreviewTopicIndex(null)}
                />
            )}

            {/* Topbar Portal Actions */}
            {portalTarget && createPortal(
                <>
                    <Link to="/knowledge-hub/sync-library">
                        <button className="px-2 lg:px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm text-xs mr-2">
                            <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Library</span>
                        </button>
                    </Link>
                    <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
                    
                    {/* Sync Job Status Indicator */}
                    {aiQueueJob && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm w-max ml-1 h-9 border ${aiQueueJob.status === 'FAILED' || aiQueueJob.failedChaptersCount > 0 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}>
                            {aiQueueJob.status === 'PAUSED' ? (
                                <Zap size={14} className="text-amber-500" />
                            ) : aiQueueJob.status === 'COMPLETED' || aiQueueJob.status === 'FAILED' ? (
                                <CheckCircle size={14} className={aiQueueJob.status === 'FAILED' || aiQueueJob.failedChaptersCount > 0 ? "text-red-500" : "text-emerald-500"} />
                            ) : (
                                <Loader2 size={14} className="animate-spin text-indigo-500 shrink-0" />
                            )}
                            <div className="flex flex-col justify-center">
                                <span className="text-[10px] font-bold leading-tight hidden lg:flex items-center gap-1.5">
                                    Vector Sync Job
                                    {aiQueueJob.status === 'PAUSED' && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded uppercase">Paused</span>}
                                    {aiQueueJob.status === 'COMPLETED' && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded uppercase">Done</span>}
                                    {aiQueueJob.status === 'FAILED' && <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.5 rounded uppercase">Failed</span>}
                                </span>
                                <div className="hidden lg:flex w-24 bg-white border border-indigo-100 h-1.5 rounded-full overflow-hidden shrink-0 mt-0.5">
                                  <div 
                                      className={`h-full ${aiQueueJob.status === 'PAUSED' ? 'bg-amber-400' : 'bg-indigo-500'} transition-all`} 
                                      style={{ width: `${aiQueueJob.totalChaptersToProcess > 0 ? (aiQueueJob.processedChaptersCount / aiQueueJob.totalChaptersToProcess) * 100 : 0}%` }} 
                                  />
                                  <div 
                                      className="h-full bg-red-500 transition-all" 
                                      style={{ width: `${aiQueueJob.totalChaptersToProcess > 0 ? ((aiQueueJob.failedChaptersCount || 0) / aiQueueJob.totalChaptersToProcess) * 100 : 0}%` }} 
                                  />
                                </div>
                            </div>
                            <span className="text-[10px] font-bold ml-1 text-indigo-900 min-w-[24px]">
                                {aiQueueJob.processedChaptersCount || 0}/{aiQueueJob.totalChaptersToProcess || 0}
                                {aiQueueJob.failedChaptersCount > 0 && <span className="text-red-600 ml-1">({aiQueueJob.failedChaptersCount} failed)</span>}
                            </span>
                            
                            {aiQueueJob.status === 'COMPLETED' || aiQueueJob.status === 'FAILED' ? (
                                <button onClick={() => { setDismissedJobId(aiQueueJob.id); setAiQueueJob(null); }} className="ml-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm transition-colors" title="Dismiss">
                                    <span className="hidden xl:inline">DISMISS</span><span className="xl:hidden">✖</span>
                                </button>
                            ) : aiQueueJob.status === 'PAUSED' ? (
                                <button onClick={handleResumeJob} className="ml-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm transition-colors" title="Resume Job">
                                    <span className="hidden xl:inline">RESUME</span><span className="xl:hidden">▶</span>
                                </button>
                            ) : (
                                <button onClick={handlePauseJob} className="ml-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm transition-colors" title="Pause Background Job">
                                    <span className="hidden xl:inline">PAUSE</span><span className="xl:hidden">⏸</span>
                                </button>
                            )}
                        </div>
                    )}
                    
                    {(!aiQueueJob || aiQueueJob.status === 'COMPLETED' || aiQueueJob.status === 'FAILED') && (
                        <div className="flex gap-2">
                            <button onClick={() => setIsTopicModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 border border-indigo-700 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-sm text-xs ml-1 h-9">
                                <Bot size={14} className="shrink-0" /> <span className="hidden xl:inline">Vector Sync Tool</span>
                            </button>
                            <button onClick={handleDeleteSyncData} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold rounded-lg transition-all shadow-sm text-xs ml-1 h-9">
                                <Trash2 size={14} className="shrink-0" /> <span className="hidden xl:inline">Delete Sync</span>
                            </button>
                        </div>
                    )}
                    
                    <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

                    {syncIntegrity?.isFullySynced ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg shadow-sm">
                            <ShieldCheck size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Fully Synced</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg shadow-sm">
                            <AlertCircle size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Partial Sync ({syncIntegrity?.vectorizedPages || 0}/{syncIntegrity?.totalPages || 0})</span>
                        </div>
                    )}
                </>,
                portalTarget
            )}

            {/* Main Content Split */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                
                {/* LEFT SIDEBAR: Chapters */}
                <div className="w-[280px] xl:w-[320px] border-r border-slate-200 bg-white flex flex-col shrink-0 z-10 shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                            Book Chapters
                            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{indices.length}</span>
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        <button
                            onClick={() => handleSelectChapter(null)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group border ${
                                selectedChapter === null 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' 
                                : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                            }`}
                        >
                            <Layers size={16} className={selectedChapter === null ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className="text-sm font-bold truncate flex-1">All Pages View</span>
                        </button>

                        <div className="my-2 h-[1px] bg-slate-100" />

                        {indices.map((idx, i) => {
                            const chPages = pages.filter(p => p.sourceBookIndexId === idx.id);
                            const syncedPages = chPages.filter(p => p.extractionStatus === 'GOLDEN_VECTORIZED');
                            
                            return (
                                <button
                                    key={idx.id}
                                    onClick={() => handleSelectChapter(idx)}
                                    className={`w-full flex flex-col gap-1.5 p-3 rounded-lg transition-all text-left group border ${
                                        selectedChapter?.id === idx.id 
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' 
                                        : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                                            selectedChapter?.id === idx.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {i + 1}
                                        </div>
                                        <span className="text-sm font-bold truncate flex-1">{idx.indexName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 pl-8">
                                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-indigo-500 transition-all" 
                                                style={{ width: `${chPages.length > 0 ? (syncedPages.length / chPages.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                            {syncedPages.length}/{chPages.length} Sync
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* MIDDLE & RIGHT PANELS */}
                <div className="flex-1 flex flex-col lg:flex-row min-w-0 bg-slate-50/50">
                    
                    {/* MIDDLE: Page Grid */}
                    <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0 bg-white">
                        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between shadow-sm z-10">
                            <div>
                                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                                    <Database className="text-indigo-500" size={18}/> 
                                    {selectedChapter ? 'Chapter Page Status' : 'Overall Page Status'}
                                </h2>
                                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
                                    {chapterPages.length} Pages Found
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50">
                            {chapterPages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                    <FileText size={48} className="opacity-20" />
                                    <p className="font-bold">No pages assigned to this view.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {chapterPages.slice(0, displayLimit).map((page) => (
                                        <div key={page.id} className="group relative flex flex-col items-center bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all shadow-sm">
                                            {getStatusBadge(page.extractionStatus)}
                                            
                                            <div className="w-full aspect-[2/3] bg-slate-100 overflow-hidden relative">
                                                {page.imageUrl && !page.imageUrl.endsWith('.pdf') ? (
                                                    <img src={page.imageUrl} alt={`Page ${page.sourcePageNo}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-white">
                                                        <FileText size={24} className="opacity-20" />
                                                    </div>
                                                )}
                                                
                                                {/* Page Overlay Gradient */}
                                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                                                    <span className="text-[10px] font-black text-white bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/20">
                                                        View Data
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="w-full bg-slate-50 border-t border-slate-100 text-center py-2 group-hover:bg-indigo-50 transition-colors flex justify-between items-center px-3">
                                                <span className="text-[10px] font-black text-slate-600 group-hover:text-indigo-700">Page {page.sourcePageNo}</span>
                                                {page.extractionStatus === 'GOLDEN_VECTORIZED' && <CheckCircle size={12} className="text-indigo-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {chapterPages.length > displayLimit && (
                                <div className="flex justify-center mt-8 pb-4">
                                    <button 
                                        onClick={() => setDisplayLimit(prev => prev + 48)} 
                                        className="px-6 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-black hover:bg-indigo-100 hover:shadow-sm transition-all flex items-center gap-2"
                                    >
                                        Load More Pages <span className="bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full text-[10px]">{chapterPages.length - displayLimit} left</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Vector Preview (Only shows if chapter is selected) */}
                    {selectedChapter && (
                        <>
                            {/* Resizer Handle */}
                            <div 
                                className={`hidden lg:block w-1.5 hover:w-2 shrink-0 cursor-col-resize z-50 transition-colors ${isDragging ? 'bg-indigo-500' : 'bg-slate-200 hover:bg-indigo-400'}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                            />

                            <div 
                                style={{ width: `${rightPanelWidth}px`, maxWidth: '100%' }}
                                className="bg-slate-900 flex flex-col shrink-0 shadow-[-10px_0_20px_rgba(0,0,0,0.1)] z-10"
                            >
                            <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/30">
                                        <Bot size={16} />
                                    </div>
                                    <span className="text-sm font-black text-white uppercase tracking-widest">Vector Knowledge</span>
                                </div>
                                <button onClick={() => setPreviewTopicIndex(selectedChapter)} className="bg-white/10 hover:bg-white/20 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                                    View Chunks
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-900 text-slate-300 custom-scrollbar relative">
                                {loadingPreview ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                                        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Querying Pinecone...</span>
                                    </div>
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none prose-headings:font-black prose-h1:text-2xl prose-h3:text-indigo-300 prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 prose-table:w-full prose-table:border-collapse prose-table:my-4 prose-td:border prose-td:border-slate-700 prose-td:p-2 prose-th:border prose-th:border-slate-600 prose-th:bg-slate-800 prose-th:p-2 prose-th:text-left prose-strong:text-indigo-200">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                            {previewMarkdown}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default SyncCommandCenter;
