import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import {
    Book, Database, Image as ImageIcon, Layers, Trash2, Edit2, AlertCircle,
    CheckCircle, Clock, ArrowLeft, Link as LinkIcon, ZoomIn, ZoomOut, Maximize, MessageSquare,
    ChevronDown, ChevronRight, FileText, Bot, Sparkles, X, BookOpen, GraduationCap,
    Tag, XCircle, Star, RotateCcw, PanelLeftClose, PanelLeftOpen,
    PanelRightClose, PanelRightOpen, MoreVertical, Info, Bookmark, Crop, RefreshCcw, Settings, Zap, Loader2,
    Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Table as TableIcon, Code, FileWarning, Lock, FileJson, Check, Save
} from 'lucide-react';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import { knowledgeHubService } from '../../../services/knowledgeHubService';
import GoldenEditor from './components/GoldenEditor';
import LiveImageCropperModal from '../QuestionBank/components/LiveImageCropperModal';
import FilerobotImageEditor from 'react-filerobot-image-editor';

/* ═══════════════════ TOC Review Modal ═══════════════════ */
const TocReviewModal = ({ chapters, bookId, classSubjectId, onClose, onApplied }) => {
    const [items, setItems] = useState(
        chapters.map(ch => ({ ...ch, addToTreeB: true }))
    );
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState('');

    const toggle = (idx, field) => {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: !it[field] } : it));
    };
    const toggleAll = (field, val) => setItems(prev => prev.map(it => ({ ...it, [field]: val })));

    const handleApply = async () => {
        setApplying(true);
        setError('');
        try {
            const selected = items.filter(it => it.addToTreeB);
            if (selected.length === 0) {
                setError('কমপক্ষে একটি অধ্যায় নির্বাচন করুন।');
                setApplying(false);
                return;
            }
            const treeBItems = items.filter(it => it.addToTreeB);
            if (treeBItems.length > 0) {
                const existingRes = await axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices`);
                const existingNames = new Set((existingRes.data || []).map(i => i.indexName?.trim().toLowerCase()));
                for (const ch of treeBItems) {
                    if (!existingNames.has(ch.indexName?.trim().toLowerCase())) {
                        await axios.post(`/v1/knowledge-hub/source-books/${bookId}/indices`, {
                            indexName: ch.indexName,
                            startPage: ch.startPage || null,
                            categoryName: ch.categoryName || null,
                            authorName: ch.authorName || null,
                            mappedChapterId: ch.mappedChapterId || null
                        });
                    }
                }
            }
            onApplied();
        } catch (err) {
            console.error(err);
            setError('সংরক্ষণে ত্রুটি: ' + (err.response?.data?.message || err.message));
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-teal-600" /> AI TOC Preview
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">AI-এর পাওয়া অধ্যায়গুলো আপনার বইয়ে (Tree B) যোগ করুন</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2"><AlertCircle size={14} />{error}</div>}
                    <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                        <span>অধ্যায় তালিকা ({items.length}টি)</span>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span>নির্বাচন করুন:</span>
                                <button onClick={() => toggleAll('addToTreeB', true)} className="text-teal-600 hover:underline">সব</button>
                                <button onClick={() => toggleAll('addToTreeB', false)} className="text-slate-400 hover:underline">কোনোটি না</button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-teal-200 transition-colors">
                                <span className="text-xs font-bold text-slate-400 w-6 shrink-0">{idx + 1}.</span>
                                <span className="flex-1 text-sm font-medium text-slate-700 flex flex-col">
                                    <span>{item.indexName}</span>
                                    {(item.categoryName || item.authorName) && (
                                        <span className="text-[10px] text-slate-400 font-normal">
                                            {[item.categoryName, item.authorName].filter(Boolean).join(' • ')}
                                        </span>
                                    )}
                                </span>
                                {item.mappedChapterId && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 flex items-center gap-1 px-2 py-0.5 rounded-full"><LinkIcon size={12} /> Auto-Linked</span>}
                                {item.startPage && <span className="text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">p.{item.startPage}</span>}
                                <label className="flex items-center gap-1.5 cursor-pointer shrink-0 border border-teal-200 px-3 py-1.5 rounded-lg bg-white shadow-sm hover:border-teal-400 transition-colors">
                                    <input type="checkbox" checked={item.addToTreeB} onChange={() => toggle(idx, 'addToTreeB')} className="w-4 h-4 accent-teal-500 cursor-pointer" />
                                    <span className="text-xs font-bold text-teal-700 select-none">বইয়ের সূচীতে যোগ করুন</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-xl transition-colors">বাতিল</button>
                    <button onClick={handleApply} disabled={applying} className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-60">
                        {applying ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> প্রক্রিয়া হচ্ছে...</> : <><CheckCircle className="w-4 h-4" /> যোগ করুন</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════ Page Reorder Modal ═══════════════════ */
const ReorderPagesModal = ({ pages, bookId, onClose, onApplied }) => {
    // Clone pages carefully to manipulate visually before saving
    const [orderedPages, setOrderedPages] = useState([...pages].sort((a,b) => (a.sourcePageNo || a.pageNumber || 0) - (b.sourcePageNo || b.pageNumber || 0)));
    const [applying, setApplying] = useState(false);
    
    // Quick action to reverse order (extremely common when scanning backward)
    const handleReverseAll = () => {
        setOrderedPages(prev => [...prev].reverse().map((p, idx) => ({ ...p, _tempPageNum: idx + 1 })));
    };
    
    // Manual mapping
    const handleNumChange = (id, newNum) => {
        setOrderedPages(prev => prev.map(p => p.id === id ? { ...p, _tempPageNum: parseInt(newNum) || p.sourcePageNo || p.pageNumber } : p));
    };

    const handleSave = async () => {
        setApplying(true);
        // Build the Map<UUID, Integer> map payload
        const reorderMap = {};
        orderedPages.forEach((p, index) => {
            // Priority: Manual typed number -> Calculated reverse number -> natural sequential index
            reorderMap[p.id] = p._tempPageNum || (index + 1);
        });
        
        try {
            await axios.put(`/v1/knowledge-hub/source-books/${bookId}/pages/bulk-reorder`, reorderMap);
            alert('Pages reordered successfully!');
            onApplied();
        } catch (error) {
            console.error(error);
            alert('Failed to reorder: ' + (error.response?.data?.message || error.message));
        } finally {
            setApplying(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Layers className="text-indigo-600" /> Reorder / Manage Pages
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">If your physical pages were scanned backwards or out of order, you can bulk arrange them here.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                    <button onClick={handleReverseAll} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-100 hover:border-indigo-300 transition-all">
                        <RotateCcw size={16} /> Reverse All Pages
                    </button>
                    <span className="text-xs text-slate-400 font-medium">Total: {orderedPages.length} Pages</span>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {orderedPages.map((p, idx) => (
                            <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col group relative">
                                <div className="aspect-[3/4] bg-slate-100 w-full relative">
                                    <img src={p.imageUrl} className="w-full h-full object-cover" alt="Preview"/>
                                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                        Org. P{p.sourcePageNo}
                                    </div>
                                </div>
                                <div className="p-2 flex items-center gap-1.5 bg-slate-100/50">
                                    <span className="text-[10px] text-slate-400 font-bold">New:</span>
                                    <input 
                                        type="number" 
                                        value={p._tempPageNum || (idx + 1)}
                                        onChange={(e) => handleNumChange(p.id, e.target.value)}
                                        className="w-full text-center text-xs font-bold py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={applying} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-60">
                        {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Save Page Sequence</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════ Topic Extract Config Modal ═══════════════════ */
const TopicExtractConfigModal = ({ indices, pages, onClose, onStartAll, onStartSingle, onPreviewTopic }) => {
    const [mode, setMode] = useState('ALL'); // 'ALL' or 'SINGLE'
    const [selectedIndexIds, setSelectedIndexIds] = useState([]);

    const goldenPages = useMemo(() => pages.filter(p => p.extractionStatus === 'PROOFREAD'), [pages]);

    const chapterPagesMap = useMemo(() => {
        const cmap = {};
        goldenPages.forEach(p => {
            if (p.sourceBookIndexId) {
                if (!cmap[p.sourceBookIndexId]) cmap[p.sourceBookIndexId] = [];
                cmap[p.sourceBookIndexId].push(p);
            }
        });
        return cmap;
    }, [goldenPages]);

    const handleStart = () => {
        if (mode === 'ALL') {
            const targetIndexIds = Object.keys(chapterPagesMap);
            if(targetIndexIds.length === 0) return alert('কোনো প্রোসেস করার মতো গোল্ডেন ডেটা নেই!');
            onStartAll(targetIndexIds);
        } else {
            if (selectedIndexIds.length === 0) return alert('দয়া করে অন্তত একটি অধ্যায় নির্বাচন করুন।');
            onStartAll(selectedIndexIds);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="p-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                            <Bot className="w-5 h-5" /> টপিক এক্সট্রাকশন ও ভেক্টর সিংক (Golden Data)
                        </h2>
                        <p className="text-xs text-teal-600 mt-1">
                            আপনার বইয়ের পাতাগুলোকে লজিক্যালি টপিকে ভাগ করে AI Vector Database-এ যুক্ত করুন। এখানে শুধু PROOFREAD করা ডেটা দেখানো হচ্ছে।
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-teal-400 hover:bg-teal-100 rounded-lg transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="p-5 flex flex-col gap-4 overflow-hidden min-h-[300px]">
                    <div className="flex gap-4 p-1 bg-slate-100 rounded-xl shrink-0">
                        <button 
                            className={`flex-1 py-2.5 text-sm font-bold capitalize rounded-lg transition-all ${mode === 'ALL' ? 'bg-white text-teal-700 shadow border border-teal-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            onClick={() => setMode('ALL')}
                        >
                            পুরো বই (Bulk Sync)
                        </button>
                        <button 
                            className={`flex-1 py-2.5 text-sm font-bold capitalize rounded-lg transition-all ${mode === 'SINGLE' ? 'bg-white text-teal-700 shadow border border-teal-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            onClick={() => setMode('SINGLE')}
                        >
                            নির্দিষ্ট অধ্যায় সমূহ
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 relative">
                        {indices.map((idx, i) => {
                            const indexPages = chapterPagesMap[idx.id] || [];
                            if (indexPages.length === 0) return null; // Hide empty chapters for both modes
                            
                            return (
                                <div key={idx.id} className={`p-3 rounded-lg border transition-colors ${mode === 'SINGLE' ? 'cursor-pointer hover:border-teal-400' : ''} ${selectedIndexIds.includes(idx.id) ? 'bg-teal-50 border-teal-300' : 'bg-white border-slate-200'}`} onClick={() => { if(mode==='SINGLE') setSelectedIndexIds(prev => prev.includes(idx.id) ? prev.filter(x => x !== idx.id) : [...prev, idx.id]); }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {mode === 'SINGLE' && (
                                              <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all ${selectedIndexIds.includes(idx.id) ? 'border-teal-500 bg-teal-500' : 'border-slate-300 bg-white'}`}>
                                                  {selectedIndexIds.includes(idx.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                              </div>
                                            )}
                                            <span className={`font-bold text-sm ${selectedIndexIds.includes(idx.id) ? 'text-teal-800' : 'text-slate-700'}`}>{i+1}. {idx.indexName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onPreviewTopic(idx); }}
                                                className="text-[10px] flex items-center gap-1 bg-white border border-teal-200 text-teal-600 hover:bg-teal-50 px-2 py-0.5 rounded-full transition-colors"
                                                title="Preview Topics & Chunks"
                                            >
                                                <Bot size={12} /> Preview Topics
                                            </button>
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{indexPages.length} Golden Pages</span>
                                        </div>
                                    </div>
                                    
                                    {indexPages.length > 0 ? (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                                            {indexPages.map(page => (
                                                <div key={page.id} className="group relative flex flex-col items-center bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-teal-400 hover:shadow-md transition-all cursor-pointer" title={`Source Page ${page.sourcePageNo}`}>
                                                    <div className="w-full aspect-[2/3] bg-slate-100 overflow-hidden relative">
                                                        {page.imageUrl && !page.imageUrl.endsWith('.pdf') ? (
                                                            <img src={page.imageUrl} alt={`Page ${page.sourcePageNo}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <Bot size={20} className="opacity-50" />
                                                            </div>
                                                        )}
                                                        {/* Golden Badge Overlay */}
                                                        <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-500 to-amber-400 text-white text-[8px] font-black px-1.5 py-0.5 shadow-sm rounded-bl">
                                                            <Sparkles size={8} className="inline mr-0.5" /> GOLD
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-slate-50 border-t border-slate-100 text-center py-1 group-hover:bg-teal-50 transition-colors">
                                                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-teal-700">P-{page.sourcePageNo}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-slate-400 italic">No golden data available in this chapter.</p>
                                    )}
                                </div>
                            );
                        })}
                        {goldenPages.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
                                <p className="text-sm font-bold text-slate-400">এই বইতে কোনো PROOFREAD (Golden) ডেটা নেই!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors">
                         বাতিল
                    </button>
                    <button 
                        onClick={handleStart} 
                        disabled={goldenPages.length === 0}
                        className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Bot size={16} /> শুরু করুন
                    </button>
                </div>
            </div>
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
                const res = await axios.get(`/v1/knowledge-hub/indexes/${indexId}/topics-preview`);
                setTopics(res.data);
            } catch (err) {
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTopics();
    }, [indexId]);

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="p-4 bg-teal-50 border-b border-teal-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">
                            <Bot className="w-5 h-5" /> AI Extracted Topics & Chunks Preview
                        </h2>
                        <p className="text-xs text-teal-600 mt-1">
                            Chapter: <span className="font-bold">{indexName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-teal-400 hover:bg-teal-100 rounded-lg transition-colors">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="p-5 flex-1 overflow-y-auto bg-slate-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
                    ) : topics.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <Layers className="w-12 h-12 mb-3 opacity-20" />
                            <p>No topics or chunks found. Did you sync this chapter?</p>
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
                                            <div className="bg-teal-100 text-teal-700 p-2 rounded-lg">
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
                                                    <div key={chunk.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative">
                                                        <div className="absolute top-2 right-2 flex gap-2">
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">Page {chunk.pageNumber}</span>
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-mono">{chunk.tokenCount} Tokens</span>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Chunk #{idx + 1}</span>
                                                        <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-60 overflow-y-auto">
                                                            {chunk.chunkText}
                                                        </div>
                                                    </div>
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


/* ═══════════════════ Question Engine Config Modal ═══════════════════ */
const QuestionEngineConfigModal = ({ bookId, classSubjectId, subjectName, bookType, pages, indices, onClose, onStart }) => {
    const [activeTab, setActiveTab] = useState('config'); // 'config' | 'schema'
    
    // Auto-select type based on DB BookType mapping
    const getInitialSourceType = () => {
        if (bookType === 'GUIDE' || bookType === 'QUESTION_BANK') return 'GUIDEBOOK';
        return 'TEXTBOOK';
    };
    
    const [sourceType, setSourceType] = useState(getInitialSourceType());

    
    // Target Question Types
    const [dynamicTypes, setDynamicTypes] = useState([]);
    const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([]);
    const [allowedQuestionTypes, setAllowedQuestionTypes] = useState([]);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const { data } = await axios.get('/v1/question-types');
                const mapped = data.map(dt => ({
                    id: dt.code,
                    label: dt.name,
                    desc: dt.description || `Generate ${dt.name} questions`
                }));
                
                // Merge with defaults
                const defaultTypes = [
                    { id: 'MULTIPLE_CHOICE', label: 'MCQ (বহুনির্বাচনি)', desc: 'Generate 4-option multiple choice questions' },
                    { id: 'CREATIVE', label: 'CQ (সৃজনশীল প্রশ্ন)', desc: 'Generate Stimulus and 4 sub-questions (ক,খ,গ,ঘ)' },
                    { id: 'SHORT_ANSWER', label: 'Short Answer (সংক্ষিপ্ত)', desc: 'Generate 1-2 sentence direct questions' }
                ];
                
                // Only add defaults if they don't exist in the DB mapping
                defaultTypes.forEach(def => {
                    if (!mapped.find(m => m.id === def.id)) {
                        mapped.unshift(def);
                    }
                });

                setDynamicTypes(mapped);
                const allIds = mapped.map(m => m.id);
                setAllowedQuestionTypes(allIds);
                setSelectedQuestionTypes(allIds);
            } catch (err) {
                console.error("Failed to fetch dynamic question types", err);
                const fallback = [
                    { id: 'MULTIPLE_CHOICE', label: 'MCQ (বহুনির্বাচনি)', desc: 'Generate 4-option multiple choice questions' },
                    { id: 'CREATIVE', label: 'CQ (সৃজনশীল প্রশ্ন)', desc: 'Generate Stimulus and 4 sub-questions' },
                    { id: 'SHORT_ANSWER', label: 'Short Answer (সংক্ষিপ্ত)', desc: 'Generate 1-2 sentence direct questions' }
                ];
                setDynamicTypes(fallback);
                const fallbackIds = fallback.map(m => m.id);
                setAllowedQuestionTypes(fallbackIds);
                setSelectedQuestionTypes(fallbackIds);
            }
        };
        fetchTypes();
    }, []);
    
    const toggleQuestionType = (type) => {
        if (!allowedQuestionTypes.includes(type)) return;
        setSelectedQuestionTypes(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    // Schema Management
    const [selectedSchema, setSelectedSchema] = useState('');
    const [schemaContent, setSchemaContent] = useState('');
    const [isSavingSchema, setIsSavingSchema] = useState(false);
    const [loadingSchemas, setLoadingSchemas] = useState(false);
    const [schemas, setSchemas] = useState([]);

    // Automatically enforce curriculum question types when schema loads
    useEffect(() => {
        const allIds = dynamicTypes.map(d => d.id);
        if (!schemaContent) {
            setAllowedQuestionTypes(allIds);
            return;
        }
        try {
            const schemaObj = JSON.parse(schemaContent);
            let allowed = new Set();

            if (Array.isArray(schemaObj)) {
                schemaObj.forEach(r => {
                    if (r.questionType) allowed.add(r.questionType);
                });
            } else {
                if (schemaObj.editor_config && schemaObj.editor_config.allowed_blocks) {
                    schemaObj.editor_config.allowed_blocks.forEach(t => {
                        // Keep legacy mapping for old schemas
                        if (t === 'MCQ') allowed.add('MULTIPLE_CHOICE');
                        else if (t === 'CQ') allowed.add('CREATIVE');
                        else if (t === 'SHORT') allowed.add('SHORT_ANSWER');
                        else allowed.add(t);
                    });
                } 
                
                if (schemaObj.scraping_rules) {
                    schemaObj.scraping_rules.forEach(r => {
                        if (r.questionType) allowed.add(r.questionType);
                    });
                }
                
                // Fallback to generation_blueprint
                if (allowed.size === 0 && schemaObj.generation_blueprint && schemaObj.generation_blueprint.mandatory_sections) {
                     schemaObj.generation_blueprint.mandatory_sections.forEach(sec => {
                         if (sec.type === 'MCQ') allowed.add('MULTIPLE_CHOICE');
                         else if (sec.type === 'CQ') allowed.add('CREATIVE');
                         else if (sec.type === 'SHORT') allowed.add('SHORT_ANSWER');
                         else allowed.add(sec.type);
                     });
                }
            }

            if (allowed.size > 0) {
                const allowedArr = Array.from(allowed);
                setAllowedQuestionTypes(allowedArr);
                // Auto-select only the allowed ones
                setSelectedQuestionTypes(prev => prev.filter(t => allowedArr.includes(t)));
            } else {
                setAllowedQuestionTypes(allIds);
            }
        } catch (e) {
            console.error("Failed to parse schema for question types", e);
        }
    }, [schemaContent, dynamicTypes]);

    useEffect(() => {
        const fetchSchemas = async () => {
            setLoadingSchemas(true);
            try {
                const { data: kbData } = await axios.get('/v1/support/knowledge');
                // Auto-detect the rule for THIS subject if it exists, otherwise fall back to any scraping JSON
                const targetTag = subjectName ? `RULE_FOR_${subjectName.replace(/\s/g, '')}` : null;
                const scrapingSchemas = kbData.filter(kb => kb.tags && kb.tags.includes('SCRAPING_JSON'));
                
                setSchemas(scrapingSchemas);

                if (targetTag) {
                    const exactMatch = scrapingSchemas.find(kb => kb.tags && kb.tags.includes(targetTag));
                    if (exactMatch) {
                        setSelectedSchema(exactMatch.id);
                        setSchemaContent(exactMatch.content);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch schemas", err);
            } finally {
                setLoadingSchemas(false);
            }
        };
        fetchSchemas();
    }, [subjectName]);

    const handleSaveSchema = async (silent = false) => {
        if (!selectedSchema) return;
        setIsSavingSchema(true);
        try {
            const s = schemas.find(x => x.id === selectedSchema);
            if (s) {
                await axios.put(`/v1/support/knowledge/${selectedSchema}`, {
                    ...s,
                    content: schemaContent
                });
                setSchemas(prev => prev.map(x => x.id === selectedSchema ? { ...x, content: schemaContent } : x));
                if (!silent) alert("Curriculum Rule Updated Successfully! It will now apply to all future extractions for this subject.");
            }
        } catch (err) {
            if (!silent) alert("Failed to update Rule: " + (err.response?.data?.message || err.message));
        } finally {
            setIsSavingSchema(false);
        }
    };

    // Chapter (Index) Selection for RAG Chunks
    const [selectedIndexIds, setSelectedIndexIds] = useState([]);
    
    // Auto-select chapters that have chunks/pages explicitly marked as generated Vectors
    const validChapters = useMemo(() => {
        // Find indices that actually have vectorized topic chunks
        const chapterIdsWithPages = new Set(pages.filter(p => !!p.sourceBookIndexId && p.extractionStatus === 'GOLDEN_VECTORIZED').map(p => p.sourceBookIndexId));
        return indices.filter(idx => chapterIdsWithPages.has(idx.id));
    }, [indices, pages]);

    const hasInitializedSelectAll = useRef(false);

    useEffect(() => {
        if (validChapters.length > 0 && !hasInitializedSelectAll.current) {
            setSelectedIndexIds(validChapters.map(c => c.id));
            hasInitializedSelectAll.current = true;
        }
    }, [validChapters]);

    const handleSelectAll = (select) => {
        setSelectedIndexIds(select ? validChapters.map(c => c.id) : []);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-indigo-50 grow-0 shrink-0">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-pink-600" /> Automated Question Engine (RAG Pipeline)
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Generate highly accurate practice questions from AI Vector Data using mapped curriculum rules.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex bg-slate-50 border-b border-slate-200 px-6 shrink-0 pt-2 gap-4">
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`pb-3 pt-2 px-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'config' ? 'border-pink-500 text-pink-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><Settings size={16}/> Extraction Settings</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('schema')}
                        className={`pb-3 pt-2 px-2 text-sm font-bold border-b-2 transition-all ${activeTab === 'schema' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2"><FileJson size={16}/> Curriculum Rules & JSON Config</span>
                    </button>
                </div>

                <div className="p-0 overflow-hidden flex flex-col lg:flex-row flex-1 bg-white">
                    {/* LEFT COLUMN: Main Dynamic Content depending on Tab */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar border-r border-slate-100 bg-white">
                        
                        {activeTab === 'config' && (
                            <div className="space-y-6">
                                {/* Source Type Toggle */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">1. Source Content Type</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div 
                                            onClick={() => setSourceType('TEXTBOOK')}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${sourceType === 'TEXTBOOK' ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm' : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50 hover:bg-slate-100/50'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg shrink-0 ${sourceType === 'TEXTBOOK' ? 'bg-pink-100' : 'bg-white shadow-sm'}`}>
                                                    <BookOpen className={sourceType === 'TEXTBOOK' ? 'text-pink-600' : ''} size={16} />
                                                </div>
                                                <h4 className="font-bold text-sm leading-tight">Generate New<br/>(Textbook)</h4>
                                            </div>
                                            <p className="text-[10px] mt-0.5 opacity-80 leading-tight">Generate fresh questions by reading theory content.</p>
                                        </div>
                                        <div 
                                            onClick={() => setSourceType('GUIDEBOOK')}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${sourceType === 'GUIDEBOOK' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50 hover:bg-slate-100/50'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg shrink-0 ${sourceType === 'GUIDEBOOK' ? 'bg-indigo-100' : 'bg-white shadow-sm'}`}>
                                                    <ListOrdered className={sourceType === 'GUIDEBOOK' ? 'text-indigo-600' : ''} size={16} />
                                                </div>
                                                <h4 className="font-bold text-sm leading-tight">Extract Only<br/>(Guide/Bank)</h4>
                                            </div>
                                            <p className="text-[10px] mt-0.5 opacity-80 leading-tight">Extract existing board/practice questions exactly.</p>
                                        </div>
                                        <div 
                                            onClick={() => setSourceType('HYBRID')}
                                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 ${sourceType === 'HYBRID' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-slate-50 hover:bg-slate-100/50'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg shrink-0 ${sourceType === 'HYBRID' ? 'bg-emerald-100' : 'bg-white shadow-sm'}`}>
                                                    <Sparkles className={sourceType === 'HYBRID' ? 'text-emerald-600' : ''} size={16} />
                                                </div>
                                                <h4 className="font-bold text-sm leading-tight">Hybrid / Both<br/>(Mixed)</h4>
                                            </div>
                                            <p className="text-[10px] mt-0.5 opacity-80 leading-tight">Extract existing questions AND generate new ones from theories.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Target Question Types */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">2. Expected Generative Outputs</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {dynamicTypes.length === 0 ? (
                                            <div className="col-span-full flex justify-center py-4 text-slate-400">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                            </div>
                                        ) : dynamicTypes.map(type => {
                                            const isAllowed = allowedQuestionTypes.includes(type.id);
                                            return (
                                            <label key={type.id} className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${!isAllowed ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200' : selectedQuestionTypes.includes(type.id) ? 'bg-pink-50/50 border-pink-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    disabled={!isAllowed}
                                                    checked={selectedQuestionTypes.includes(type.id)}
                                                    onChange={() => toggleQuestionType(type.id)}
                                                    className="mt-0.5 w-4 h-4 text-pink-500 rounded border-slate-300 focus:ring-pink-500 disabled:opacity-50"
                                                />
                                                <div>
                                                    <p className={`text-sm font-bold flex items-center flex-wrap gap-2 ${!isAllowed ? 'text-slate-500' : selectedQuestionTypes.includes(type.id) ? 'text-pink-900' : 'text-slate-700'}`}>
                                                        {type.label}
                                                        {!isAllowed && <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Restricted by Curriculum</span>}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{type.desc}</p>
                                                </div>
                                            </label>
                                        )})}
                                    </div>
                                </div>
                                
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                                    <div>
                                        <p className="text-xs font-bold mb-1">RAG Context Alert</p>
                                        <p className="text-[11px] leading-relaxed opacity-90">
                                            This pipeline strictly operates on previously mapped AI Vector Topics. If a chapter lacks Golden Data or wasn't "Extracted to Topics" yet, it will not yield questions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'schema' && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between shrink-0">
                                    <div>
                                        <h3 className="font-bold text-indigo-900 text-sm">Subject-Specific Rules Map</h3>
                                        <p className="text-[11px] text-indigo-700 mt-0.5 font-medium">Auto-detected schema for: <span className="bg-white px-1.5 py-0.5 rounded shadow-sm border border-indigo-200 ml-1">{subjectName || 'Unknown Subject'}</span></p>
                                    </div>
                                    <div className="bg-white p-1 rounded-lg shadow-sm border border-indigo-100 flex items-center">
                                        {loadingSchemas ? <Loader2 size={24} className="animate-spin text-indigo-400 m-2"/> : (
                                            <select 
                                                value={selectedSchema} 
                                                onChange={e => {
                                                    setSelectedSchema(e.target.value);
                                                    const sc = schemas.find(s => s.id === e.target.value);
                                                    setSchemaContent(sc ? sc.content : '');
                                                }}
                                                className="w-64 text-xs bg-transparent border-none outline-none focus:ring-0 font-bold text-slate-700 cursor-pointer"
                                            >
                                                <option value="">-- Apply Default Pattern --</option>
                                                {schemas.map(s => (
                                                    <option key={s.id} value={s.id}>{s.title}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner relative group">
                                    <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700 flex justify-between items-center z-10 shrink-0">
                                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-2"><Code size={12}/> JSON Config Editor</span>
                                        {selectedSchema && (
                                            <button 
                                                onClick={handleSaveSchema}
                                                disabled={isSavingSchema}
                                                className="text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1 rounded shadow transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isSavingSchema ? <Loader2 size={12} className="animate-spin" /> : <Save size={12}/>}
                                                Update Rule Globally
                                            </button>
                                        )}
                                    </div>
                                    {selectedSchema ? (
                                        <textarea 
                                            value={schemaContent}
                                            onChange={e => setSchemaContent(e.target.value)}
                                            className="w-full flex-1 text-xs font-mono bg-transparent text-green-400 p-4 outline-none focus:ring-0 resize-none custom-scrollbar leading-relaxed"
                                            spellCheck="false"
                                            placeholder="Paste curriculum JSON rule here..."
                                        />
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6">
                                            <FileJson size={48} className="mb-4 opacity-20" />
                                            <p className="text-sm font-bold text-slate-400 text-center">No specific schema loaded.</p>
                                            <p className="text-xs mt-2 text-center opacity-70">The default pipeline mapping will be used. <br/>Select a predefined rule from the dropdown above to edit.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* RIGHT COLUMN: Target Vector Chapter Selection */}
                    <div className="w-full lg:w-80 flex flex-col bg-slate-50 border-l border-slate-200 overflow-hidden shrink-0 z-10 shadow-[-10px_0_20px_-15px_rgba(0,0,0,0.05)]">
                        <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-2 shrink-0 bg-white">
                            <h3 className="font-extrabold text-slate-800 text-sm flex items-center justify-between">
                                Target AI Vector Chapters
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">{selectedIndexIds.length} / {validChapters.length}</span>
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleSelectAll(true)} className="flex-1 text-[10px] font-bold px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded shadow-sm border border-slate-200 text-slate-600 transition-colors">Select All</button>
                                <button onClick={() => handleSelectAll(false)} className="flex-1 text-[10px] font-bold px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded shadow-sm border border-slate-200 text-slate-600 transition-colors">Clear</button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                            {validChapters.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
                                    <AlertCircle size={32} className="mb-2 opacity-50 text-indigo-300" />
                                    <p className="text-sm font-bold text-slate-600">No Vector Chapters</p>
                                    <p className="text-[10px] mt-1 leading-relaxed opacity-80">Sync chapters using Topic Extraction first. Only pre-processed chunks support question generation.</p>
                                </div>
                            ) : (
                                validChapters.map((chapter) => (
                                    <label 
                                        key={chapter.id} 
                                        className={`group flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedIndexIds.includes(chapter.id) ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-white border-transparent hover:border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md'}`}
                                    >
                                        <div className="flex flex-col gap-0.5 pr-2 truncate">
                                            <span className={`text-[11px] font-bold truncate ${selectedIndexIds.includes(chapter.id) ? 'text-indigo-900 group-hover:text-indigo-700' : 'text-slate-700 group-hover:text-slate-900'}`}>{chapter.indexName}</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all ${selectedIndexIds.includes(chapter.id) ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300'}`}>
                                            {selectedIndexIds.includes(chapter.id) && <Check size={12} strokeWidth={4} className="text-white" />}
                                        </div>
                                        <input 
                                            type="checkbox"
                                            className="sr-only"
                                            checked={selectedIndexIds.includes(chapter.id)}
                                            onChange={() => {
                                                setSelectedIndexIds(prev => prev.includes(chapter.id) ? prev.filter(x => x !== chapter.id) : [...prev, chapter.id]);
                                            }}
                                        />
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-5 border-t border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                    <p className="text-[10px] text-slate-500 font-medium">Estimated Time: ~{Math.max(1, selectedIndexIds.length * 2)} minutes via Vertex AI</p>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button 
                            onClick={async () => {
                                // Auto-save schema so custom JSON edits are preserved before generation starts
                                if (selectedSchema) {
                                    await handleSaveSchema(true);
                                }
                                // Important: Call onStart passing our targetIndexIds instead of pageIds
                                onStart({ 
                                    sourceType, 
                                    selectedSchema, 
                                    targetQuestionTypes: selectedQuestionTypes, 
                                    targetIndexIds: selectedIndexIds 
                                }); 
                                onClose();
                            }} 
                            disabled={selectedIndexIds.length === 0 || isSavingSchema}
                            className="px-8 py-2.5 bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            <Zap className="w-4 h-4" /> {isSavingSchema ? 'Saving Rule...' : 'Generate Questions'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════ Page Thumbnail (Optimized) ═══════════════════ */
const PageThumbnail = React.memo(({ page, isSelected, isCover, pageFlag, isOpenMenu, menuCoords, onToggleMenu, onFlag, onDeletePage, onClick }) => {
    return (
        <div onClick={() => onClick(page)}
            className={`shrink-0 w-[65px] h-[85px] rounded-lg cursor-pointer transition-all duration-150 border-2 overflow-hidden relative group 
            ${isSelected ? 'border-indigo-600 shadow-md' : 'border-transparent hover:border-slate-300 hover:shadow-sm'}`}>
            {page.imageUrl.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400"><Layers className="w-6 h-6" /></div>
            ) : (
                <img src={page.imageUrl} alt={`Page ${page.sourcePageNo}`} loading="lazy" className="w-full h-full object-cover bg-slate-100" />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">P {page.sourcePageNo}</div>

            {page.isGolden || page.extractionStatus === 'PROOFREAD' ? (
                <div className="absolute top-1 right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white z-10" title="Golden">
                    <Star className="w-2.5 h-2.5" fill="white" />
                </div>
            ) : page.extractionStatus === 'EXTRACTED' ? (
                <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white z-10">
                    <CheckCircle className="w-3 h-3" />
                </div>
            ) : (
                <div className="absolute top-1 right-1 w-4 h-4 bg-amber-300 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white z-10">
                    <Clock className="w-3 h-3" />
                </div>
            )}

            {page.sourceBookIndexId && (
                <div className="absolute top-1 left-1 w-4 h-4 bg-teal-600 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white z-10" title="Chapter assigned">
                    <Tag className="w-2.5 h-2.5" />
                </div>
            )}

            <button onClick={(e) => onToggleMenu(e, page.id)} title="Options"
                className={`absolute bottom-5 left-1/2 -translate-x-1/2 w-5 h-5 bg-slate-900/90 rounded border border-slate-700/50 flex items-center justify-center text-white transition-opacity hover:bg-slate-800 z-20 shadow-sm ${isOpenMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <MoreVertical size={12} />
            </button>

            {isOpenMenu && createPortal(
                <div onMouseLeave={() => onToggleMenu({currentTarget: {getBoundingClientRect: ()=>({})}, stopPropagation:()=>{}}, page.id)} className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] py-1.5 w-40 overflow-hidden" style={{ left: menuCoords.x, top: menuCoords.y, transform: 'translate(-50%, 0)' }}>
                    <button onClick={(e) => onFlag(e, page.id, 'isCover')} className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <span className="flex items-center gap-2"><ImageIcon size={12} className="text-indigo-500"/> Cover Art</span>
                        {isCover && <CheckCircle size={12} className="text-indigo-600" />}
                    </button>
                    <button onClick={(e) => onFlag(e, page.id, 'isPubInfo')} className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <span className="flex items-center gap-2"><Info size={12} className="text-amber-500"/> Publication Info</span>
                        {pageFlag?.isPubInfo && <CheckCircle size={12} className="text-amber-600" />}
                    </button>
                    <button onClick={(e) => onFlag(e, page.id, 'isTOC')} className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <span className="flex items-center gap-2"><Bookmark size={12} className="text-teal-500"/> Table of Contents</span>
                        {pageFlag?.isTOC && <CheckCircle size={12} className="text-teal-600" />}
                    </button>
                    <div className="border-t border-slate-100 my-1 w-full" />
                    <button onClick={(e) => { onToggleMenu({stopPropagation:()=>{}}, page.id); onDeletePage(e, page.id); }} className="w-full px-3 py-2 text-left text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                        <Trash2 size={12} /> Delete Page
                    </button>
                </div>,
                document.body
            )}

            <div className="absolute top-6 left-1 flex flex-col gap-0.5 z-10">
                {isCover && <div className="w-3.5 h-3.5 bg-indigo-500 rounded flex items-center justify-center text-white shadow-sm ring-1 ring-white" title="Cover Art"><ImageIcon size={8}/></div>}
                {pageFlag?.isPubInfo && <div className="w-3.5 h-3.5 bg-amber-500 rounded flex items-center justify-center text-white shadow-sm ring-1 ring-white" title="Publication Info"><Info size={8}/></div>}
                {pageFlag?.isTOC && <div className="w-3.5 h-3.5 bg-teal-500 rounded flex items-center justify-center text-white shadow-sm ring-1 ring-white" title="TOC"><Bookmark size={8}/></div>}
            </div>
        </div>
    );
});

/* ═══════════════════ Main Component ═══════════════════ */
const ProofreadingWorkspace = () => {
    const { bookId } = useParams();

    useEffect(() => {
        return () => {
            knowledgeHubService.clearCache();
        };
    }, []);

    const [pages, setPages] = useState([]);
    const [selectedPage, setSelectedPage] = useState(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [loading, setLoading] = useState(true);
    const [bookDetails, setBookDetails] = useState(null);

    const [isExtracting, setIsExtracting] = useState(false);
    const [isPreviewingTOC, setIsPreviewingTOC] = useState(false);
    const [isExtractingPubInfo, setIsExtractingPubInfo] = useState(false);
    const [tocPreviewChapters, setTocPreviewChapters] = useState(null);

    // Phase 3B: Golden Content state
    const [isMarkingGolden, setIsMarkingGolden] = useState(false);
    const [isEditingGolden, setIsEditingGolden] = useState(false);
    const [goldenDraft, setGoldenDraft] = useState('');
    const [tiptapEditor, setTiptapEditor] = useState(null);
    const editorInsertPos = useRef(null); // saves cursor position before crop modal opens
    const [activeSidebarTab, setActiveSidebarTab] = useState('toc'); // 'toc' | 'props' | 'tools'
    const [activeWorkspaceTool, setActiveWorkspaceTool] = useState('cursor');

    // Phase 3E: Background Bulk Extraction Queue
    const [aiQueueJob, setAiQueueJob] = useState(null);
    const [aiQuestionJob, setAiQuestionJob] = useState(null); // PHASE 3E Auto Question Gen Queue
    const [aiTopicJob, setAiTopicJob] = useState(null); // Topic Extraction Queue
    
    // Page Reorder Modal State
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

    // Advanced Page Image Editor State
    const [isAdvancedImageEditorOpen, setIsAdvancedImageEditorOpen] = useState(false);
    const [advancedEditorSource, setAdvancedEditorSource] = useState(null);
    const [isSavingImageEdit, setIsSavingImageEdit] = useState(false);

    // AI Question Gen Modal State
    const [isQuestionConfigModalOpen, setIsQuestionConfigModalOpen] = useState(false);
    const [isTopicSyncModalOpen, setIsTopicSyncModalOpen] = useState(false);
    const [previewTopicIndex, setPreviewTopicIndex] = useState(null);

    const handleSaveImageEdit = async (editedImageObject) => {
        setIsSavingImageEdit(true);
        try {
            // Convert base64 to Blob to send as MultipartFile
            const base64Data = editedImageObject.imageBase64;
            const res = await fetch(base64Data);
            const blob = await res.blob();
            
            // Reconstruct a File object
            const ext = editedImageObject.extension || 'jpg';
            const file = new File([blob], `edited_page_${selectedPage.id}.${ext}`, { type: editedImageObject.mimeType || 'image/jpeg' });

            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.put(`/v1/knowledge-hub/source-books/${bookId}/pages/${selectedPage.id}/image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                const newUrl = response.data.imageUrl;
                // Update local states
                setPages(prev => prev.map(p => p.id === selectedPage.id ? { ...p, imageUrl: newUrl } : p));
                setSelectedPage(prev => ({ ...prev, imageUrl: newUrl }));
                setIsAdvancedImageEditorOpen(false);
            }
        } catch (error) {
            console.error('Failed to save edited image', error);
            alert('Failed to save image: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSavingImageEdit(false);
        }
    };

    // --- Polling for Jobs Status ---
    useEffect(() => {
        let timer;
        const fetchJobStatus = async () => {
            // Bulk Extraction Status
            try {
                const res = await axios.get(`/v1/knowledge-hub/jobs/bulk-extract/source-books/${bookId}/status`);
                const jobData = res.status === 204 ? null : res.data;
                setAiQueueJob(jobData);
                
                // If it completed, refetch page statuses so they show up as EXTRACTED
                if (jobData && jobData.status === 'COMPLETED' && (!aiQueueJob || aiQueueJob.status !== 'COMPLETED')) {
                    fetchInitialData();
                }
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    setAiQueueJob(null);
                }
            }
            
            // Auto Question Generation Status
            try {
                const res = await axios.get(`/v1/knowledge-hub/jobs/generate-questions/source-books/${bookId}/status`);
                const jobData2 = res.status === 204 ? null : res.data;
                setAiQuestionJob(jobData2);
            } catch (err) {
                if (err.response && err.response.status === 404) setAiQuestionJob(null);
            }
            
            // Topic Extraction Queue Status
            try {
                const res = await axios.get(`/v1/knowledge-hub/jobs/topic-extract/source-books/${bookId}/status`);
                const jobData3 = res.status === 204 ? null : res.data;
                setAiTopicJob(jobData3);
            } catch (err) {
                if (err.response && err.response.status === 404) setAiTopicJob(null);
            }
        };

        fetchJobStatus();
        timer = setInterval(fetchJobStatus, 5000); // Poll every 5 seconds
        
        return () => clearInterval(timer);
    }, [bookId, aiQueueJob?.status, aiQuestionJob?.status, aiTopicJob?.status]);

    // Bulk Extract Actions
    const handleStartBulkExtract = async () => {
        try {
            const res = await axios.post(`/v1/knowledge-hub/jobs/bulk-extract/source-books/${bookId}`);
            setAiQueueJob(res.data);
        } catch (err) {
            alert('Bulk Extract শুরু করতে সমস্যা হয়েছে: ' + (err.response?.data?.message || err.message));
        }
    };
    
    const handlePauseJob = async () => {
        if (!aiQueueJob) return;
        try {
            const res = await axios.post(`/v1/knowledge-hub/jobs/bulk-extract/${aiQueueJob.id}/pause`);
            setAiQueueJob(res.data);
        } catch (err) {}
    };

    const handleResumeJob = async () => {
        if (!aiQueueJob) return;
        try {
            const res = await axios.post(`/v1/knowledge-hub/jobs/bulk-extract/${aiQueueJob.id}/resume`);
            setAiQueueJob(res.data);
        } catch (err) {}
    };

    // Question Gen Actions
    const handleStartQuestionGen = async (config = {}) => {
        try {
            // Include config (sourceType, selectedSchema) if the backend endpoint absorbs it later
            const res = await axios.post(`/v1/knowledge-hub/jobs/generate-questions/source-books/${bookId}/start`, config);
            setAiQuestionJob(res.data);
            alert("AI Question Engine Started Background Execution!");
        } catch (err) {
            alert('AI Question Generation শুরু করতে সমস্যা হয়েছে: ' + (err.response?.data?.message || err.message));
        }
    };
    
    const handlePauseQuestionJob = async () => {
        if (!aiQuestionJob) return;
        try {
            const res = await axios.post(`/v1/knowledge-hub/jobs/generate-questions/${aiQuestionJob.id}/pause`);
            setAiQuestionJob(res.data);
        } catch (err) {}
    };

    const handleResumeQuestionJob = async () => {
        if (!aiQuestionJob) return;
        try {
            const res = await axios.post(`/v1/knowledge-hub/jobs/generate-questions/${aiQuestionJob.id}/resume`);
            setAiQuestionJob(res.data);
        } catch (err) {}
    };

    const handlePauseTopicJob = async () => {
        if (!aiTopicJob) return;
        try {
            const res = await axios.post(`/v1/knowledge-hub/jobs/topic-extract/${aiTopicJob.id}/pause`);
            setAiTopicJob(res.data);
        } catch (err) {}
    };

    const handleResumeTopicJob = async () => {
        if (!aiTopicJob) return;
        try {
            const res = await axios.post(`/v1/knowledge-hub/jobs/topic-extract/${aiTopicJob.id}/resume`);
            setAiTopicJob(res.data);
        } catch (err) {}
    };

    // Workspace Resizing State
    const [isResizing, setIsResizing] = useState(false);
    const [leftPaneWidth, setLeftPaneWidth] = useState(45);
    const workspaceRef = useRef(null);

    const galleryRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing || !workspaceRef.current) return;
            const rect = workspaceRef.current.getBoundingClientRect();
            const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
            if (newWidth > 20 && newWidth < 80) {
                setLeftPaneWidth(newWidth);
            }
        };

        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'auto';
            document.body.style.cursor = 'auto';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'auto';
            document.body.style.cursor = 'auto';
        };
    }, [isResizing]);

    useEffect(() => {
        const el = galleryRef.current;
        if (!el) return;
        const handleWheel = (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                el.scrollLeft += e.deltaY * 1.5;
            }
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => { el.removeEventListener('wheel', handleWheel); };
    }, [loading, pages.length]);

    // Layout configuration
    const [portalTarget, setPortalTarget] = useState(null);

    // Panel collapse state
    const [treeBCollapsed, setTreeBCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

    // Page tags (Cover, TOC, Publication Info)
    const [pageFlags, setPageFlags] = useState({});
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });

    const toggleMenu = React.useCallback((e, id) => {
        e.stopPropagation();
        setOpenMenuId(prev => {
            if (prev === id) return null;
            if (e.currentTarget?.getBoundingClientRect) {
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuCoords({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
            }
            return id;
        });
    }, []);

    const latestState = useRef({ pages, bookDetails, pageFlags });
    useEffect(() => {
        latestState.current = { pages, bookDetails, pageFlags };
    }, [pages, bookDetails, pageFlags]);

    const handleFlag = React.useCallback(async (e, id, type) => {
        e.stopPropagation();
        const { pages, bookDetails, pageFlags } = latestState.current;
        
        if (type === 'isCover') {
            const page = pages.find(p => p.id === id);
            if (page && bookDetails) {
                const isTurningOn = bookDetails.coverImageUrl !== page.imageUrl;
                try {
                    const payload = { ...bookDetails, coverImageUrl: isTurningOn ? page.imageUrl : null };
                    await axios.put(`/v1/knowledge-hub/source-books/${bookId}`, payload);
                    setBookDetails(payload);
                } catch (err) {
                    alert('কভার আর্ট সেভ হয়নি: ' + err.message);
                }
            }
        } else {
            const currentFlags = pageFlags[id] || {};
            const nextValue = !currentFlags[type];
            setPageFlags(prev => ({ ...prev, [id]: { ...prev[id], [type]: nextValue } }));
            
            try {
                const payload = {};
                if (type === 'isPubInfo') {
                    payload.isPubInfo = nextValue;
                    payload.isTocPage = currentFlags.isTOC || false; 
                } else if (type === 'isTOC') {
                    payload.isTocPage = nextValue;
                    payload.isPubInfo = currentFlags.isPubInfo || false;
                }
                await axios.patch(`/v1/knowledge-hub/source-books/${bookId}/pages/${id}/flags`, payload);
            } catch (err) {
                console.error("Failed to save flag to backend", err);
                setPageFlags(prev => ({ ...prev, [id]: { ...prev[id], [type]: !nextValue } }));
            }
        }
        setOpenMenuId(null);
    }, [bookId]);

    const handleDeletePage = React.useCallback(async (e, pageId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this page?')) return;
        try {
            await axios.delete(`/v1/knowledge-hub/source-books/${bookId}/pages/${pageId}`);
            setPages(prev => prev.filter(p => p.id !== pageId));
            setSelectedPage(prev => prev?.id === pageId ? null : prev);
        } catch (err) {
            alert('Failed to delete page: ' + (err.response?.data?.error || err.message));
        }
    }, [bookId]);

    const handlePageClick = React.useCallback((p) => {
        setSelectedPage(p);
        
        let draft = p.goldenMarkdown || p.extractedMarkdown || '';
        
        // TRUNCATE if it's absurdly large to prevent browser freeze!
        if (draft && draft.length > 50000) {
            console.warn('Draft is too large, truncating to prevent freeze!');
            draft = draft.substring(0, 50000) + '\n\n...[TRUNCATED due to excessive length]';
        }
        
        setGoldenDraft(draft);
        setIsEditingGolden(true);
        setImageZoom(1);
    }, []);

    const vectorizedIndexIds = useMemo(() => {
        const ids = new Set();
        pages.forEach(p => {
            if (p.extractionStatus === 'GOLDEN_VECTORIZED' && p.sourceBookIndexId) {
                ids.add(p.sourceBookIndexId);
            }
        });
        return ids;
    }, [pages]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const bookRes = await axios.get(`/v1/knowledge-hub/source-books/${bookId}`);
            setBookDetails(bookRes.data);
            const pagesRes = await axios.get(`/v1/knowledge-hub/source-books/${bookId}/pages`);
            setPages(pagesRes.data);
            
            // Initialize page flags from backend data
            const initialFlags = {};
            pagesRes.data.forEach(p => {
                initialFlags[p.id] = {
                    isPubInfo: p.isPubInfo || false,
                    isTOC: p.isTocPage || false
                };
            });
            setPageFlags(initialFlags);

            if (!selectedPage && pagesRes.data.length > 0) {
                setSelectedPage(pagesRes.data[0]);
            } else if (selectedPage) {
                // If a page is selected, refresh its data reference
                const refPage = pagesRes.data.find(p => p.id === selectedPage.id);
                if (refPage) setSelectedPage(refPage);
            }
        } catch (err) {
            console.error('Failed to fetch initial workspace data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [bookId]);

    // Setup Portal for dynamic topbar insertion
    useEffect(() => {
        setPortalTarget(document.getElementById('topbar-actions'));
    }, []);

    // Preview TOC → opens modal
    const handlePreviewTOC = async () => {
        if (!selectedPage) return;
        setIsPreviewingTOC(true);
        try {
            const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/pages/${selectedPage.id}/preview-toc`);
            if (Array.isArray(res.data) && res.data.length > 0) {
                setTocPreviewChapters(res.data);
            } else {
                alert('AI কোনো অধ্যায় খুঁজে পায়নি।');
            }
        } catch (err) {
            alert('TOC Preview ব্যর্থ: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsPreviewingTOC(false);
        }
    };

    const handleExtractPubInfo = async () => {
        if (!selectedPage) return;
        setIsExtractingPubInfo(true);
        try {
            const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/pages/${selectedPage.id}/extract-pub-info`);
            setBookDetails(res.data);
            alert('পাবলিকেশন ইনফরমেশন অটোমেটিকভাবে বইয়ের তথ্যে যুক্ত করে সেভ করা হয়েছে!');
        } catch (err) {
            alert('পাবলিকেশন ডাটা এক্সট্রাক্ট করতে ব্যর্থ: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsExtractingPubInfo(false);
        }
    };

    const handleExtract = async () => {
        if (!selectedPage || selectedPage.extractionStatus === 'EXTRACTED') return;
        setIsExtracting(true);
        try {
            const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/pages/${selectedPage.id}/extract`);
            const { markdown } = res.data;
            const updatedPage = { ...selectedPage, extractedMarkdown: markdown, extractionStatus: 'EXTRACTED' };
            setSelectedPage(updatedPage);
            setPages(prev => prev.map(p => p.id === selectedPage.id ? updatedPage : p));
            
            let safeMarkdown = markdown || '';
            if (safeMarkdown.length > 50000) {
                console.warn('Extracted draft is too large, truncating to prevent freeze!');
                safeMarkdown = safeMarkdown.substring(0, 50000) + '\n\n...[TRUNCATED due to excessive length]';
            }
            
            // Instantly sync the new data to the GoldenEditor draft pipeline
            setGoldenDraft(safeMarkdown);
            setIsEditingGolden(true);
        } catch (err) {
            alert('AI Extraction Failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsExtracting(false);
        }
    };

    const handleOpenGoldenEditor = () => {
        // Prefer already-proofed HTML, fall back to raw markdown from extraction
        const content = selectedPage?.goldenMarkdown || selectedPage?.extractedMarkdown || '';
        setGoldenDraft(content);
        setIsEditingGolden(true);
    };

    // Auto-save logic references
    const autoSaveTimer = useRef(null);
    const lastSavedDraft = useRef('');

    // Update tracking reference when page changes
    useEffect(() => {
        if (selectedPage) {
            lastSavedDraft.current = selectedPage.goldenMarkdown || selectedPage.extractedMarkdown || '';
        }
    }, [selectedPage?.id]);

    // Optimistic UI Background Auto-Save (3 seconds)
    useEffect(() => {
        if (!selectedPage || !goldenDraft || goldenDraft === lastSavedDraft.current) return;
        
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        
        autoSaveTimer.current = setTimeout(async () => {
            try {
                // Silent server update
                const res = await axios.put(
                    `/v1/knowledge-hub/source-books/${bookId}/pages/${selectedPage.id}/golden`,
                    { goldenMarkdown: goldenDraft }
                );
                lastSavedDraft.current = goldenDraft;
                
                // Update silently without prompting loader
                setPages(prev => prev.map(p => 
                    p.id === selectedPage.id ? { 
                        ...p, 
                        goldenMarkdown: res.data.goldenMarkdown,
                        isGolden: true,
                        extractionStatus: res.data.extractionStatus
                    } : p
                ));
            } catch (err) {
                console.warn('Silent auto-save failed', err);
            }
        }, 3000);
        
        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    }, [goldenDraft, selectedPage, bookId]);

    const handleMarkAsGolden = async () => {
        if (!selectedPage) return;
        setIsMarkingGolden(true);
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); // Prevent double save
        
        try {
            // Force save explicitly (Ctrl+S or Save Button)
            const res = await axios.put(
                `/v1/knowledge-hub/source-books/${bookId}/pages/${selectedPage.id}/golden`,
                { goldenMarkdown: goldenDraft }
            );
            const updatedPage = {
                ...selectedPage,
                goldenMarkdown: res.data.goldenMarkdown,
                isGolden: true,
                extractionStatus: res.data.extractionStatus,
            };
            lastSavedDraft.current = goldenDraft;
            setSelectedPage(updatedPage);
            setPages(prev => prev.map(p => p.id === selectedPage.id ? updatedPage : p));
        } catch (err) {
            alert('সংরক্ষণে ব্যর্থ: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsMarkingGolden(false);
        }
    };

    // handleDeletePage moved to stable useCallback above

    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [isCroppingImageUpload, setIsCroppingImageUpload] = useState(false);

    const handleCropSave = async (base64Data) => {
        setIsCroppingImageUpload(true);
        try {
            const blob = await fetch(base64Data).then(r => r.blob());
            const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', file);
            const res = await axios.post('/v1/knowledge-hub/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = res.data.url;
            
            // Inject image at the saved cursor position using insertContentAt
            // Block nodes CANNOT be inserted via setTextSelection+setImage (chain breaks for blocks)
            // Instead: insertContentAt the saved `from` position directly
            if (tiptapEditor) {
                const insertPos = editorInsertPos.current?.from ?? null;
                editorInsertPos.current = null;
                tiptapEditor.chain()
                    .focus()
                    .insertContentAt(
                        insertPos ?? tiptapEditor.state.selection.from,
                        { type: 'image', attrs: { src: url, alt: 'চিত্র', width: '50%', align: 'left' } }
                    )
                    .run();
            } else {
                // Fallback: append to the HTML draft
                setGoldenDraft(prev => prev + `\n<img src="${url}" alt="চিত্র" />\n`);
            }
        } catch (err) {
            alert('Image upload failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsCroppingImageUpload(false);
            setIsCropperOpen(false);
            setActiveWorkspaceTool('cursor');
        }
    };

    // --- Tree B State ---
    const [indices, setIndices] = useState([]);
    const [newIndexName, setNewIndexName] = useState('');
    const [isCreatingIndex, setIsCreatingIndex] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [activeTreeBChapter, setActiveTreeBChapter] = useState(null);
    const explicitlyUnassignedPageIds = useRef(new Set());

    const fetchIndices = async () => {
        try {
            const res = await axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices`);
            setIndices(res.data);
        } catch (err) { console.error(err); }
    };
    useEffect(() => { fetchIndices(); }, [bookId]);

    const handleCreateIndex = async () => {
        if (!newIndexName.trim()) return;
        setIsCreatingIndex(true);
        try {
            const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/indices`, { indexName: newIndexName.trim() });
            setIndices(prev => [...prev, res.data]);
            setNewIndexName('');
        } catch (err) { console.error(err); } finally { setIsCreatingIndex(false); }
    };

    const handleDeleteIndex = async (indexId) => {
        if (!window.confirm('Delete this chapter index?')) return;
        try {
            await axios.delete(`/v1/knowledge-hub/source-books/${bookId}/indices/${indexId}`);
            setIndices(prev => prev.filter(i => i.id !== indexId));
        } catch (err) { console.error(err); }
    };

    const [editingIndexId, setEditingIndexId] = useState(null);
    const [editingIndexName, setEditingIndexName] = useState('');

    const handleRenameIndex = async (indexId, newName) => {
        const trimmed = newName.trim();
        const currentIndex = indices.find(i => i.id === indexId);
        if (!currentIndex) return;
        if (!trimmed) {
            setEditingIndexId(null);
            return;
        }
        if (currentIndex.indexName === trimmed) {
            setEditingIndexId(null);
            return;
        }
        try {
            const payload = { ...currentIndex, indexName: trimmed };
            const res = await axios.put(`/v1/knowledge-hub/source-books/${bookId}/indices/${indexId}`, payload);
            setIndices(prev => prev.map(i => i.id === indexId ? res.data : i));
            setEditingIndexId(null);
        } catch (err) {
            console.error("Failed to rename index:", err);
            alert("Failed to rename chapter index!");
        }
    };

    const handleRenameKeyDown = (e, indexId) => {
        if (e.key === 'Enter') {
            handleRenameIndex(indexId, editingIndexName);
        } else if (e.key === 'Escape') {
            setEditingIndexId(null);
        }
    };

    const handleExtractTopics = async (indexId) => {
        try {
            setIsTopicSyncModalOpen(false);
            const res = await axios.post(`/v1/knowledge-hub/indexes/${indexId}/extract-topics`);
            alert(res.data.message || 'Topic extraction started in background.');
        } catch (err) { 
            console.error('Extract Topics Error:', err);
            alert('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleExtractAllTopics = async (targetIndexIds) => {
        try {
            setIsTopicSyncModalOpen(false);
            const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/extract-all-topics`, targetIndexIds);
            
            // Re-fetch job status to show UI immediately
            try {
                const statusRes = await axios.get(`/v1/knowledge-hub/jobs/topic-extract/source-books/${bookId}/status`);
                if (statusRes.status !== 204) setAiTopicJob(statusRes.data);
            } catch(e) {}
            
            alert(res.data.message || 'Bulk Topic extraction started in background.');
        } catch (err) { 
            console.error('Bulk Extract Topics Error:', err);
            alert('Failed: ' + (err.response?.data?.error || err.message));
        }
    };

    // Phase 3A: Assign page to chapter index
    const handleAssignPage = async (indexId, pageObj = selectedPage) => {
        if (!pageObj) return;
        setIsAssigning(true);
        try {
            const res = await axios.put(
                `/v1/knowledge-hub/source-books/${bookId}/pages/${pageObj.id}/assign-index`,
                { sourceBookIndexId: indexId || null }
            );
            const updatedPage = { ...pageObj, sourceBookIndexId: res.data.sourceBookIndexId };
            
            // Track explicit unlink vs auto-assign
            if (!indexId) {
                explicitlyUnassignedPageIds.current.add(pageObj.id);
            } else {
                explicitlyUnassignedPageIds.current.delete(pageObj.id);
            }

            if (selectedPage && pageObj.id === selectedPage.id) {
                setSelectedPage(updatedPage);
            }
            setPages(prev => prev.map(p => p.id === pageObj.id ? updatedPage : p));
            if (indexId) setActiveTreeBChapter(indexId);
            await fetchIndices();
        } catch (err) {
            alert('অধ্যায় assign করতে ব্যর্থ: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsAssigning(false);
        }
    };

    useEffect(() => {
        if (selectedPage && !selectedPage.sourceBookIndexId && activeTreeBChapter && activeTreeBChapter !== selectedPage.sourceBookIndexId) {
             if (explicitlyUnassignedPageIds.current.has(selectedPage.id)) {
                 return;
             }
             handleAssignPage(activeTreeBChapter, selectedPage);
        }
    }, [selectedPage, activeTreeBChapter]);



    const handleTocApplied = async () => {
        setTocPreviewChapters(null);
        await fetchIndices();
        alert('✅ অধ্যায়গুলো সফলভাবে যোগ করা হয়েছে!');
    };



    return (
        <div className="h-full flex flex-col bg-slate-50 relative font-satoshi">

            {/* TOC Review Modal */}
            {tocPreviewChapters && (
                <TocReviewModal
                    chapters={tocPreviewChapters}
                    bookId={bookId}
                    classSubjectId={bookDetails?.classSubjectId || null}
                    onClose={() => setTocPreviewChapters(null)}
                    onApplied={handleTocApplied}
                />
            )}
            
            {/* Reorder Pages Modal */}
            {isReorderModalOpen && (
                <ReorderPagesModal 
                    pages={pages}
                    bookId={bookId}
                    onClose={() => setIsReorderModalOpen(false)}
                    onApplied={() => {
                        setIsReorderModalOpen(false);
                        fetchInitialData(); // Re-fetch all pages
                    }}
                />
            )}

            {/* Dynamic Actions for MainLayout Topbar */}
            {portalTarget && createPortal(
                <>
                    {/* Panel toggle shortcuts */}

                    <button
                        onClick={() => setTreeBCollapsed(v => !v)}
                        title={treeBCollapsed ? 'Tree B খুলুন' : 'Tree B বন্ধ করুন'}
                        className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${treeBCollapsed ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                        {treeBCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                        <span className="hidden sm:inline">B</span>
                    </button>
                    <Link to={`/knowledge-hub/sync-command-center/${bookId}`}>
                        <button className="px-2 lg:px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm text-xs mr-2">
                            <Layers className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Sync Center</span>
                        </button>
                    </Link>
                    <Link to={`/knowledge-hub/digitization/${bookId}`}>
                        <button className="px-2 lg:px-3 py-1.5 bg-indigo-600 border border-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-sm text-xs">
                            <ImageIcon className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Add Pages</span>
                        </button>
                    </Link>

                    {/* Bulk Extraction Tools */}
                    {aiQueueJob && (aiQueueJob.status === 'QUEUED' || aiQueueJob.status === 'IN_PROGRESS' || aiQueueJob.status === 'PAUSED') ? (
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1.5 rounded-lg shadow-sm w-max ml-1 h-9">
                            {aiQueueJob.status === 'PAUSED' ? (
                                <Zap size={14} className="text-amber-500" />
                            ) : (
                                <Loader2 size={14} className="animate-spin text-indigo-500 shrink-0" />
                            )}
                            <div className="flex flex-col justify-center">
                                <span className="text-[10px] font-bold leading-tight hidden lg:flex items-center gap-1.5">
                                    Background Extractor
                                    {aiQueueJob.status === 'PAUSED' && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded uppercase">Paused</span>}
                                </span>
                                <div className="hidden lg:block w-24 bg-white border border-indigo-100 h-1.5 rounded-full overflow-hidden shrink-0 mt-0.5">
                                  <div 
                                      className={`h-full ${aiQueueJob.status === 'PAUSED' ? 'bg-amber-400' : 'bg-indigo-500'} transition-all`} 
                                      style={{ width: `${aiQueueJob.totalPagesToProcess > 0 ? (aiQueueJob.processedPagesCount / aiQueueJob.totalPagesToProcess) * 100 : 0}%` }} 
                                  />
                                </div>
                            </div>
                            <span className="text-[10px] font-bold ml-1 text-indigo-900 min-w-[24px]">
                                {aiQueueJob.processedPagesCount}/{aiQueueJob.totalPagesToProcess}
                            </span>
                            
                            {aiQueueJob.status === 'PAUSED' ? (
                                <button onClick={handleResumeJob} className="ml-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm transition-colors" title="Resume Job">
                                    <span className="hidden xl:inline">RESUME</span><span className="xl:hidden">▶</span>
                                </button>
                            ) : (
                                <button onClick={handlePauseJob} className="ml-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm transition-colors" title="Pause Background Job">
                                    <span className="hidden xl:inline">PAUSE</span><span className="xl:hidden">⏸</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        pages.some(p => !p.isGolden && p.extractionStatus !== 'EXTRACTED' && p.extractionStatus !== 'PROOFREAD') && (
                            <button onClick={handleStartBulkExtract} className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-all shadow-sm text-[11px] xl:text-xs ml-1 h-9">
                                <Zap size={14} className="text-amber-500 shrink-0" /> <span className="hidden xl:inline">Server Bulk Extract</span>
                            </button>
                        )
                    )}

                    <Link to={`/knowledge-hub/mapping/${bookId}`}>
                        <button className="px-2 lg:px-3 py-1.5 bg-white border border-teal-600 text-teal-700 hover:bg-teal-50 font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm text-xs ml-1">
                            <Layers className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Map Curriculum</span>
                        </button>
                    </Link>

                    {/* Removed AI Topic Extraction Job Viewer and Extract Topics & Sync button as it is moved to SyncCommandCenter */}

                    {/* AI Question Generation Job Viewer */}
                    {aiQuestionJob && (aiQuestionJob.status === 'QUEUED' || aiQuestionJob.status === 'IN_PROGRESS' || aiQuestionJob.status === 'PAUSED') ? (
                        <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 text-pink-800 px-3 py-1.5 rounded-lg shadow-sm w-max ml-1 h-9">
                            {aiQuestionJob.status === 'PAUSED' ? (
                                <Zap size={14} className="text-amber-500" />
                            ) : (
                                <Loader2 size={14} className="animate-spin text-pink-500 shrink-0" />
                            )}
                            <div className="flex flex-col justify-center">
                                <span className="text-[10px] font-bold leading-tight hidden lg:flex items-center gap-1.5">
                                    AI Question Generation
                                    {aiQuestionJob.status === 'PAUSED' && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded uppercase">Paused</span>}
                                </span>
                                <div className="hidden lg:block w-24 bg-white border border-pink-100 h-1.5 rounded-full overflow-hidden shrink-0 mt-0.5">
                                  <div 
                                      className={`h-full ${aiQuestionJob.status === 'PAUSED' ? 'bg-amber-400' : 'bg-pink-500'} transition-all`} 
                                      style={{ width: `${aiQuestionJob.totalPagesToProcess > 0 ? (aiQuestionJob.processedPagesCount / aiQuestionJob.totalPagesToProcess) * 100 : 0}%` }} 
                                  />
                                </div>
                            </div>
                            <span className="text-[10px] font-bold ml-1 text-pink-900 min-w-[24px]">
                                {aiQuestionJob.processedPagesCount}/{aiQuestionJob.totalPagesToProcess}
                            </span>
                            
                            {aiQuestionJob.status === 'PAUSED' ? (
                                <button onClick={handleResumeQuestionJob} className="ml-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm transition-colors" title="Resume Question Generation">
                                    <span className="hidden xl:inline">RESUME</span><span className="xl:hidden">▶</span>
                                </button>
                            ) : (
                                <button onClick={handlePauseQuestionJob} className="ml-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm transition-colors" title="Pause Question Generation">
                                    <span className="hidden xl:inline">PAUSE</span><span className="xl:hidden">⏸</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        pages.some(p => p.extractionStatus === 'PROOFREAD' || p.extractionStatus === 'GOLDEN_VECTORIZED') && (
                            bookDetails?.questionExtractionStatus === 'COMPLETED' ? (
                                <button className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg shadow-sm text-[11px] xl:text-xs ml-1 h-9 cursor-not-allowed" title="Questions have already been generated for this book.">
                                    <Lock size={14} className="shrink-0" /> <span className="hidden xl:inline">Completed</span>
                                </button>
                            ) : (
                                <button onClick={() => setIsQuestionConfigModalOpen(true)} className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-600 border border-transparent text-white font-semibold rounded-lg hover:from-pink-600 hover:to-rose-700 transition-all shadow-sm text-[11px] xl:text-xs ml-1 h-9">
                                    <Sparkles size={14} className="shrink-0" /> <span className="hidden xl:inline">Automate Questions</span>
                                </button>
                            )
                        )
                    )}

                    <Link to={`/questions/drafts`}>
                        <button className="px-2 lg:px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 font-semibold rounded-lg flex items-center gap-1.5 hover:bg-rose-100 transition-all shadow-sm text-xs ml-1">
                            <FileText className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Review Drafts</span>
                        </button>
                    </Link>
                </>,
                document.getElementById('topbar-actions')
            )}

            {/* Main Layout */}
            <div className="flex-1 overflow-hidden h-full">
                {loading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-slate-500 font-medium">Loading Workspace Elements...</p>
                    </div>
                ) : pages.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-white m-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-6">
                            <Layers className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Workspace is Empty</h2>
                        <p className="text-slate-500 max-w-md text-center mb-8">You haven't uploaded any pages yet.</p>
                        <Link to={`/knowledge-hub/digitization/${bookId}`}>
                            <button className="px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg">
                                <ImageIcon className="w-5 h-5" /> Add Pages Now
                            </button>
                        </Link>
                    </div>
                ) : (
                    <div className="flex h-full w-full">



                        {/* ═══ MIDDLE PANEL ═══ */}
                        <div className="flex-1 h-full flex flex-col min-w-0">

                            {/* Page Gallery */}
                            <div ref={galleryRef} className="pt-8 pb-3 bg-slate-50 border-b border-slate-200 flex items-end px-6 overflow-x-auto shrink-0 gap-2.5">
                                {/* Bulk Reorder Button */}
                                <button
                                    onClick={() => setIsReorderModalOpen(true)} 
                                    className="shrink-0 w-[65px] h-[85px] rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100 flex flex-col items-center justify-center gap-1.5 text-indigo-600 transition-all cursor-pointer group"
                                    title="Rearrange Page Order"
                                >
                                    <RotateCcw size={18} className="group-hover:-rotate-90 transition-transform duration-300" />
                                    <span className="text-[9px] font-bold uppercase text-center leading-tight">Reorder<br/>Pages</span>
                                </button>
                                
                                {pages.map((p) => (
                                    <PageThumbnail
                                        key={p.id}
                                        page={p}
                                        isSelected={selectedPage?.id === p.id}
                                        isCover={bookDetails?.coverImageUrl === p.imageUrl}
                                        pageFlag={pageFlags[p.id]}
                                        isOpenMenu={openMenuId === p.id}
                                        menuCoords={menuCoords}
                                        onToggleMenu={toggleMenu}
                                        onFlag={handleFlag}
                                        onDeletePage={handleDeletePage}
                                        onClick={handlePageClick}
                                    />
                                ))}
                            </div>

                            {/* Split Viewer — normal mode */}
                            {/* Split Viewer Unified Mode */}
                            {selectedPage && (
                                <div ref={workspaceRef} className="flex-1 flex overflow-hidden relative">
                                    
                                    {/* --- LEFT PANE (Source Image) --- */}
                                    <div style={{ width: `${leftPaneWidth}%` }} className="h-full bg-slate-200/50 relative flex overflow-auto shadow-inner">
                                        <div className="min-w-full min-h-full flex items-center justify-center p-4">
                                            {selectedPage.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                                <iframe src={selectedPage.imageUrl} title="Source" className="w-full h-[800px] rounded shadow-sm border border-slate-300" style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }} />
                                            ) : (
                                                <img src={selectedPage.imageUrl} alt="Source" className="rounded shadow-2xl border border-slate-300 transition-transform origin-center" style={{ transform: `scale(${imageZoom})`, maxWidth: imageZoom === 1 ? '100%' : 'none' }} />
                                            )}
                                        </div>
                                    </div>

                                    {/* --- DYNAMIC RESIZER HANDLE --- */}
                                    <div 
                                        onMouseDown={() => setIsResizing(true)}
                                        title="Drag to resize workspace"
                                        className="w-1.5 h-full bg-slate-200 hover:bg-indigo-400 cursor-col-resize shrink-0 transition-colors z-40 relative"
                                    >
                                        {/* Grip icon */}
                                        <div className="absolute top-1/2 -mt-4 left-0.5 right-0.5 h-8 flex flex-col justify-between">
                                            <div className="h-1 bg-slate-400 rounded-full opacity-50"></div>
                                            <div className="h-1 bg-slate-400 rounded-full opacity-50"></div>
                                            <div className="h-1 bg-slate-400 rounded-full opacity-50"></div>
                                        </div>
                                    </div>

                                    {/* --- CENTER SINGLE-COLUMN ADOBE TOOLBAR --- */}
                                    <div className="w-14 shrink-0 h-full bg-[#f8fafc]/95 backdrop-blur-md border-x border-[#cbd5e1] flex flex-col items-center py-4 z-30 shadow-[0_0_20px_rgba(0,0,0,0.08)] overflow-y-auto custom-scrollbar">
                                        
                                        {/* Selection & Base Tools */}
                                        <div className="flex flex-col gap-2 w-full px-2">
                                            <button 
                                                onClick={() => { setActiveWorkspaceTool('cursor'); setActiveSidebarTab('tools'); }}
                                                title="Select Tool (V)"
                                                className={`w-10 h-10 rounded shrink-0 flex items-center justify-center transition-all ${activeWorkspaceTool === 'cursor' ? 'bg-[#e2e8f0] text-slate-900 shadow-inner' : 'text-slate-500 hover:bg-[#e2e8f0]/60 hover:text-slate-800'}`}
                                            >
                                                <ArrowLeft size={18} className="rotate-[135deg]" />
                                            </button>
                                            <button 
                                                onMouseDown={(e) => {
                                                    // Prevent DOM focus loss so Tiptap selection isn't lost before we save it
                                                    e.preventDefault();
                                                    // Save editor cursor position before opening crop modal
                                                    if (tiptapEditor) {
                                                        editorInsertPos.current = {
                                                            from: tiptapEditor.state.selection.from,
                                                            to: tiptapEditor.state.selection.to,
                                                        };
                                                    }
                                                    setActiveWorkspaceTool('crop');
                                                    setIsCropperOpen(true);
                                                    setActiveSidebarTab('tools');
                                                }}
                                                title="Image Snipping Tool (C)"
                                                className={`w-10 h-10 rounded shrink-0 flex items-center justify-center transition-all ${activeWorkspaceTool === 'crop' ? 'bg-[#e2e8f0] text-slate-900 shadow-inner' : 'text-slate-500 hover:bg-[#e2e8f0]/60 hover:text-slate-800'}`}
                                            >
                                                <Crop size={18} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setActiveWorkspaceTool('editor');
                                                    setIsAdvancedImageEditorOpen(true);
                                                }}
                                                title="Advanced Image Editor (Photoshop)"
                                                className={`w-10 h-10 rounded shrink-0 flex items-center justify-center transition-all ${activeWorkspaceTool === 'editor' ? 'bg-[#e2e8f0] text-slate-900 shadow-inner' : 'text-slate-500 hover:bg-[#e2e8f0]/60 hover:text-slate-800'}`}
                                            >
                                                <Settings size={18} />
                                            </button>
                                        </div>

                                        <div className="w-8 h-px bg-[#cbd5e1] my-4 opacity-70 shrink-0"></div>

                                        {/* Zoom / View Tools */}
                                        <div className="flex flex-col gap-2 w-full px-2 mt-4">
                                            <button 
                                                onClick={() => setImageZoom(Math.min(imageZoom + 0.25, 4))}
                                                title="Zoom In (Z)"
                                                className="w-10 h-10 rounded shrink-0 flex items-center justify-center text-slate-500 hover:bg-[#e2e8f0]/60 hover:text-slate-800 transition-all"
                                            >
                                                <ZoomIn size={18} />
                                            </button>
                                            <button 
                                                onClick={() => setImageZoom(Math.max(imageZoom - 0.25, 0.5))}
                                                title="Zoom Out (Alt+Z)"
                                                className="w-10 h-10 rounded shrink-0 flex items-center justify-center text-slate-500 hover:bg-[#e2e8f0]/60 hover:text-slate-800 transition-all"
                                            >
                                                <ZoomOut size={18} />
                                            </button>
                                            <button 
                                                onClick={() => setImageZoom(1)}
                                                title="Fit to Screen (Ctrl+0)"
                                                className="w-10 h-10 rounded shrink-0 flex items-center justify-center text-slate-500 hover:bg-[#e2e8f0]/60 hover:text-slate-800 transition-all"
                                            >
                                                <Maximize size={16} />
                                            </button>
                                        </div>

                                        <div className="w-8 h-px bg-[#cbd5e1] my-4 opacity-70 shrink-0"></div>

                                        {/* AI & Extraction Tools (Data) */}
                                        <div className="flex flex-col gap-2 w-full px-2">
                                            <button 
                                                onClick={() => { setActiveWorkspaceTool('extract'); handleExtract(); }}
                                                title={selectedPage.extractionStatus === 'PENDING' ? "Extract Document" : "Re-Extract Document"}
                                                disabled={isExtracting}
                                                className={`w-10 h-10 rounded shrink-0 flex items-center justify-center transition-all ${isExtracting ? 'opacity-50' : ''} ${selectedPage.extractionStatus === 'PENDING' ? 'text-violet-600 hover:bg-violet-100' : 'text-slate-500 hover:bg-[#e2e8f0]/60 hover:text-slate-800'} ${activeWorkspaceTool === 'extract' ? 'bg-[#e2e8f0] shadow-inner' : ''}`}
                                            >
                                                {isExtracting ? <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> : (selectedPage.extractionStatus === 'PENDING' ? <Bot size={18} /> : <RotateCcw size={18} />)}
                                            </button>

                                            {pageFlags[selectedPage.id]?.isTOC && (
                                                <button 
                                                    onClick={() => { setActiveWorkspaceTool('toc_gen'); handlePreviewTOC(); }}
                                                    title="Generate Table of Contents"
                                                    disabled={isPreviewingTOC}
                                                    className={`w-10 h-10 rounded shrink-0 flex items-center justify-center transition-all ${isPreviewingTOC ? 'opacity-50' : ''} text-teal-600 hover:bg-teal-100 ${activeWorkspaceTool === 'toc_gen' ? 'bg-[#e2e8f0] shadow-inner' : ''}`}
                                                >
                                                    {isPreviewingTOC ? <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /> : <Sparkles size={18} />}
                                                </button>
                                            )}

                                            {pageFlags[selectedPage.id]?.isPubInfo && (
                                                <button 
                                                    onClick={() => { setActiveWorkspaceTool('pub_gen'); handleExtractPubInfo(); }}
                                                    title="Extract Publication Info"
                                                    disabled={isExtractingPubInfo}
                                                    className={`w-10 h-10 rounded shrink-0 flex items-center justify-center transition-all ${isExtractingPubInfo ? 'opacity-50' : ''} text-indigo-600 hover:bg-indigo-100 ${activeWorkspaceTool === 'pub_gen' ? 'bg-[#e2e8f0] shadow-inner' : ''}`}
                                                >
                                                    {isExtractingPubInfo ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <Info size={18} />}
                                                </button>
                                            )}
                                        </div>

                                        {/* Chapter Assignment Popover Tool */}
                                        <div className="mt-auto mb-2 flex flex-col gap-1.5 w-full px-2 group relative">
                                            <button
                                                title="Assign to Chapter"
                                                className={`w-8 h-8 rounded shrink-0 flex items-center justify-center transition-all relative ${selectedPage?.sourceBookIndexId ? 'bg-teal-100 text-teal-700' : 'bg-white border border-[#cbd5e1] text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                {isAssigning ? <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <Tag size={14} />}
                                            </button>
                                            {/* Adobe style flyout menu for assignment */}
                                            <div className="absolute bottom-0 left-full ml-2 w-56 bg-[#f8fafc] border border-slate-300 shadow-[2px_5px_15px_rgba(0,0,0,0.15)] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all origin-left z-50 p-2 flex flex-col gap-1 before:content-[''] before:absolute before:top-[calc(100%-20px)] before:-left-1.5 before:w-3 before:h-3 before:bg-[#f8fafc] before:border-l before:border-b before:border-slate-300 before:rotate-45">
                                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1 pb-1 border-b border-slate-200 mb-1 ml-2">Assign Tool</div>
                                                <select
                                                    value={selectedPage?.sourceBookIndexId || ''}
                                                    onChange={e => handleAssignPage(e.target.value || null)}
                                                    disabled={isAssigning}
                                                    className="w-full text-xs border border-slate-300 rounded p-1.5 bg-white text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-50 cursor-pointer"
                                                >
                                                    <option value="">-- Unassigned (None) --</option>
                                                    {indices.map(idx => (
                                                        <option key={idx.id} value={idx.id}>{idx.indexName}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                    </div>

                                    {/* --- RIGHT PANE (Rich Editor) --- */}
                                    <div className="flex-1 h-full bg-white flex flex-col relative z-10">
                                        {(!selectedPage.extractionStatus || selectedPage.extractionStatus === 'PENDING' || selectedPage.extractionStatus === 'FAILED') ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 bg-slate-50/50">
                                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-dashed border-slate-200 shadow-sm">
                                                    <Bot size={40} className="text-slate-300" />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="text-lg font-bold text-slate-600 mb-1">AI Extraction Required</h3>
                                                    <p className="font-medium max-w-sm text-sm text-slate-400 leading-relaxed">
                                                        Click the <b>Extract Text</b> button in the middle toolbar to convert this image into rich Markdown content.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <GoldenEditor
                                                key={selectedPage?.id || selectedPage?.sourcePageNo || selectedPage?.pageNumber || 'golden'}
                                                value={goldenDraft}
                                                onChange={setGoldenDraft}
                                                onSave={handleMarkAsGolden}
                                                onClose={() => {}}
                                                isSaving={isMarkingGolden}
                                                setTiptapEditor={setTiptapEditor}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══ RIGHT PANEL — Sidebar (Tabbed) ═══ */}
                        <div className={`h-full bg-white border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out absolute right-0 z-[100] lg:relative lg:z-auto ${treeBCollapsed ? 'w-[44px] translate-x-0' : 'w-[270px] translate-x-0 shadow-2xl lg:shadow-none'}`}>

                            {/* Header Tabs */}
                            <div className={`border-b border-slate-200 bg-slate-50 shrink-0 flex items-center ${treeBCollapsed ? 'p-2 flex-col py-3 gap-2' : ''}`}>
                                <button
                                    onClick={() => setTreeBCollapsed(v => !v)}
                                    title={treeBCollapsed ? 'প্রসারিত করুন' : 'সংকুচিত করুন'}
                                    className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors shrink-0 ${treeBCollapsed ? 'text-slate-400 hover:bg-slate-200' : 'bg-white border border-slate-200 ml-2 shadow-sm text-slate-500 hover:text-slate-800'}`}
                                >
                                    {treeBCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                {!treeBCollapsed && (
                                    <div className="flex flex-1 ml-1">
                                        <button onClick={() => setActiveSidebarTab('toc')} 
                                                className={`flex-1 py-3 text-[11px] font-bold transition-colors border-b-2 flex justify-center items-center gap-1 ${activeSidebarTab === 'toc' ? 'border-teal-500 text-teal-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>
                                            <LinkIcon size={12}/> Tree
                                        </button>
                                        <button onClick={() => setActiveSidebarTab('props')} 
                                                className={`flex-1 py-3 text-[11px] font-bold transition-colors border-b-2 flex justify-center items-center gap-1 ${activeSidebarTab === 'props' ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>
                                            <Settings size={12}/> Props
                                        </button>
                                        <button onClick={() => setActiveSidebarTab('tools')} 
                                                className={`flex-1 py-3 text-[11px] font-bold transition-colors border-b-2 flex justify-center items-center gap-1 ${activeSidebarTab === 'tools' ? 'border-amber-500 text-amber-700 bg-white' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}>
                                            <Layers size={12}/> Tools
                                        </button>
                                    </div>
                                )}
                            </div>

                            {treeBCollapsed ? (
                                /* Collapsed icon strip */
                                <div className="flex flex-col items-center gap-3 pt-4">
                                    <button onClick={() => { setActiveSidebarTab('toc'); setTreeBCollapsed(false); }} title="Tree B"
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${activeSidebarTab === 'toc' ? 'bg-teal-100 text-teal-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        <LinkIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { setActiveSidebarTab('props'); setTreeBCollapsed(false); }} title="Page Properties"
                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${activeSidebarTab === 'props' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                   {/* Content: Tree B TOC */}
                                   {activeSidebarTab === 'toc' && (
                                      <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-slate-50/50">
                                          <div className="p-2.5 border-b border-slate-100 bg-white shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <input type="text" value={newIndexName} onChange={e => setNewIndexName(e.target.value)}
                                                        placeholder="Add New Chapter..." className="flex-1 p-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400"
                                                        onKeyDown={e => { if (e.key === 'Enter') handleCreateIndex(); }} />
                                                    <button onClick={handleCreateIndex} disabled={isCreatingIndex || !newIndexName.trim()} className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm">
                                                        <Layers size={14} />
                                                    </button>
                                                </div>
                                          </div>
                                          <div className="flex-1 p-2.5 overflow-y-auto">
                                            {indices.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-center opacity-70 p-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 mb-3 border border-slate-200 shadow-sm"><Layers className="w-5 h-5" /></div>
                                                    <p className="text-[10px] text-slate-500 font-medium">Generate TOC থেকে auto-populate করুন।</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {indices.map((idx, indexNumber) => {
                                                        const isVectorized = vectorizedIndexIds.has(idx.id);
                                                        return (
                                                        <div key={idx.id} className={`bg-white border text-sm rounded-lg shadow-sm group transition-all ${selectedPage?.sourceBookIndexId === idx.id ? 'border-teal-500 ring-2 ring-teal-400' : activeTreeBChapter === idx.id ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                                            <div className="flex items-center justify-between p-2 cursor-pointer transition-colors"
                                                                onClick={() => {
                                                                    if (editingIndexId !== idx.id) {
                                                                        handleAssignPage(selectedPage?.sourceBookIndexId === idx.id ? null : idx.id);
                                                                    }
                                                                }}>
                                                                <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs min-w-0 flex-1">
                                                                    <span className="text-teal-600 shrink-0">{(indexNumber + 1).toString().padStart(2, '0')}.</span>
                                                                    {editingIndexId === idx.id ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editingIndexName}
                                                                            onChange={e => setEditingIndexName(e.target.value)}
                                                                            onKeyDown={e => handleRenameKeyDown(e, idx.id)}
                                                                            onBlur={() => handleRenameIndex(idx.id, editingIndexName)}
                                                                            onClick={e => e.stopPropagation()}
                                                                            className="flex-1 p-1 py-0.5 text-xs border border-teal-500 rounded outline-none focus:ring-2 focus:ring-teal-100 bg-white font-normal min-w-0"
                                                                            autoFocus
                                                                        />
                                                                    ) : (
                                                                        <span className="truncate" onDoubleClick={(e) => { e.stopPropagation(); setEditingIndexId(idx.id); setEditingIndexName(idx.indexName); }}>{idx.indexName}</span>
                                                                    )}
                                                                    {editingIndexId !== idx.id && (
                                                                        <>
                                                                            {(idx.mappedChapterId || idx.mappedTopicId) && (
                                                                                <LinkIcon className="w-3 h-3 text-teal-600 ml-1 shrink-0" title="Mapped to Curriculum" />
                                                                            )}
                                                                            {isVectorized && (
                                                                                <span className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-gradient-to-r from-pink-500 to-indigo-600 text-white shadow-sm shrink-0" title="Vectorized (AI Synced)">
                                                                                    <Sparkles size={8} /> AI
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                    {editingIndexId === idx.id ? (
                                                                        <>
                                                                            <button title="Save Name" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRenameIndex(idx.id, editingIndexName); }} className="text-teal-600 hover:text-teal-800 p-0.5">
                                                                                <Check size={14} />
                                                                            </button>
                                                                            <button title="Cancel" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setEditingIndexId(null); }} className="text-slate-400 hover:text-slate-600 p-0.5">
                                                                                <X size={14} />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {idx.pageCount > 0 && (
                                                                                <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[9px] font-bold rounded border border-teal-100">{idx.pageCount}p</span>
                                                                            )}
                                                                            <button title="Edit Chapter Name" onClick={(e) => { e.stopPropagation(); setEditingIndexId(idx.id); setEditingIndexName(idx.indexName); }} className="text-slate-300 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                                                                                <Edit2 size={13} />
                                                                            </button>
                                                                            <button title="Delete Chapter Index" onClick={(e) => { e.stopPropagation(); handleDeleteIndex(idx.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {selectedPage?.sourceBookIndexId === idx.id && (
                                                                <div className="px-2.5 pb-1.5 flex items-center gap-1 text-teal-700">
                                                                    <Tag size={9} />
                                                                    <span className="text-[9px] font-bold">বর্তমান পেজ এখানে</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                          </div>
                                      </div>
                                   )}

                                   {/* Content: Properties Tab */}
                                   {activeSidebarTab === 'props' && (
                                       <div className="flex flex-col flex-1 overflow-y-auto bg-slate-50 p-3 pt-4 gap-4">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Page Status Flags</div>
                                            
                                            <div className="flex flex-col gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                                <label className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors group">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded flex items-center justify-center ${bookDetails?.coverImageUrl === selectedPage?.imageUrl ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            <ImageIcon size={14} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">Cover Art</span>
                                                            <span className="text-[10px] text-slate-400">Set as book cover</span>
                                                        </div>
                                                    </div>
                                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${bookDetails?.coverImageUrl === selectedPage?.imageUrl ? 'bg-indigo-500' : 'bg-slate-200'}`} onClick={(e) => handleFlag({stopPropagation:()=>{}}, selectedPage.id, 'isCover')}>
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${bookDetails?.coverImageUrl === selectedPage?.imageUrl ? 'left-[22px]' : 'left-0.5'}`} />
                                                    </div>
                                                </label>

                                                <div className="h-px w-full bg-slate-100"></div>

                                                <label className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors group">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded flex items-center justify-center ${pageFlags[selectedPage?.id]?.isPubInfo ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            <Info size={14} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">Publication Info</span>
                                                            <span className="text-[10px] text-slate-400">Contains book metadata</span>
                                                        </div>
                                                    </div>
                                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${pageFlags[selectedPage?.id]?.isPubInfo ? 'bg-amber-500' : 'bg-slate-200'}`} onClick={(e) => handleFlag({stopPropagation:()=>{}}, selectedPage.id, 'isPubInfo')}>
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${pageFlags[selectedPage?.id]?.isPubInfo ? 'left-[22px]' : 'left-0.5'}`} />
                                                    </div>
                                                </label>

                                                <div className="h-px w-full bg-slate-100"></div>

                                                <label className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors group">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded flex items-center justify-center ${pageFlags[selectedPage?.id]?.isTOC ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            <Bookmark size={14} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">TOC Page</span>
                                                            <span className="text-[10px] text-slate-400">Table of Contents source</span>
                                                        </div>
                                                    </div>
                                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${pageFlags[selectedPage?.id]?.isTOC ? 'bg-teal-500' : 'bg-slate-200'}`} onClick={(e) => handleFlag({stopPropagation:()=>{}}, selectedPage.id, 'isTOC')}>
                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${pageFlags[selectedPage?.id]?.isTOC ? 'left-[22px]' : 'left-0.5'}`} />
                                                    </div>
                                                </label>
                                            </div>

                                            {/* Chapter Assignment / Unlink section */}
                                             {selectedPage && (
                                                 <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm mt-1">
                                                     <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">অধ্যায় সংযোগ (Chapter Link)</div>
                                                     {indices.find(idx => idx.id === selectedPage?.sourceBookIndexId) ? (
                                                         <div className="flex flex-col gap-2">
                                                             <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800">
                                                                 <Tag size={14} className="text-emerald-600 shrink-0" />
                                                                 <span className="text-xs font-bold truncate">
                                                                     {indices.find(idx => idx.id === selectedPage?.sourceBookIndexId)?.indexName}
                                                                 </span>
                                                             </div>
                                                             <button
                                                                 onClick={() => handleAssignPage(null)}
                                                                 disabled={isAssigning}
                                                                 className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm hover:text-rose-800 disabled:opacity-50"
                                                             >
                                                                 <XCircle size={14} />
                                                                 <span>অধ্যায় থেকে আনলিংক করুন</span>
                                                             </button>
                                                         </div>
                                                     ) : (
                                                         <div className="flex flex-col gap-2">
                                                             <div className="text-[11px] text-slate-400 italic p-2 bg-slate-50 border border-slate-100 rounded-lg text-center">
                                                                 কোনো অধ্যায়ের সাথে লিংক করা নেই
                                                             </div>
                                                             <select
                                                                 value={selectedPage?.sourceBookIndexId || ''}
                                                                 onChange={e => handleAssignPage(e.target.value || null)}
                                                                 disabled={isAssigning}
                                                                 className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 cursor-pointer font-semibold shadow-sm"
                                                             >
                                                                 <option value="">-- অধ্যায় নির্বাচন করুন --</option>
                                                                 {indices.map(idx => (
                                                                     <option key={idx.id} value={idx.id}>{idx.indexName}</option>
                                                                 ))}
                                                             </select>
                                                         </div>
                                                     )}
                                                 </div>
                                             )}
                                       </div>
                                   )}

                                   {activeSidebarTab === 'tools' && (
                                        <div className="flex flex-col gap-4 p-4 overflow-y-auto w-full custom-scrollbar flex-1">
                                            <div className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                                                <Layers size={14} className="text-amber-500" /> Active Tool
                                            </div>
                                            
                                            {/* Dynamic Tool Properties based on activeWorkspaceTool */}
                                            {activeWorkspaceTool === 'cursor' && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                                                    <p className="font-bold text-slate-800 mb-1">Selection Tool</p>
                                                    <p className="text-xs">Use this tool to interact normally with the interface. Drag the resizer to adjust screen layout.</p>
                                                </div>
                                            )}

                                            {activeWorkspaceTool === 'crop' && (
                                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800">
                                                    <p className="font-bold mb-1 flex items-center gap-1.5"><Crop size={14}/> Image Snipping Tool</p>
                                                    <p className="text-xs opacity-80 mb-3">Draw a rectangle on the source image to extract specific diagrams, tables, or formulas.</p>
                                                    <button 
                                                        onClick={() => {
                                                            // Save editor cursor position before opening crop modal
                                                            if (tiptapEditor) {
                                                                editorInsertPos.current = {
                                                                    from: tiptapEditor.state.selection.from,
                                                                    to: tiptapEditor.state.selection.to,
                                                                };
                                                            }
                                                            setIsCropperOpen(true);
                                                        }} 
                                                        className="w-full py-1.5 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 transition"
                                                    >
                                                        Open Snipping Canvas
                                                    </button>
                                                </div>
                                            )}

                                            {activeWorkspaceTool === 'extract' && (
                                                <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
                                                    <p className="font-bold mb-1 flex items-center gap-1.5"><Bot size={14}/> Full Page Extraction</p>
                                                    <p className="text-xs opacity-80 mb-3">Use this tool to extract all text content from the current page using Gemini Flash 2.0.</p>
                                                    <button onClick={handleExtract} disabled={isExtracting} className="w-full py-1.5 bg-violet-600 text-white text-xs font-bold rounded shadow-sm hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                                        {isExtracting ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/> : <Bot size={12}/>}
                                                        {selectedPage?.extractionStatus === 'PENDING' ? 'Run Extraction' : 'Force Re-extract'}
                                                    </button>
                                                </div>
                                            )}

                                            {activeWorkspaceTool === 'editor' && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800">
                                                    <p className="font-bold mb-1 flex items-center gap-1.5"><Settings size={14} className="text-slate-600"/> Adv. Image Editor</p>
                                                    <p className="text-xs opacity-80 mb-3 text-slate-600">Fix page orientation, tune contrast, draw over unwanted marks, and replace the source page image permanently.</p>
                                                    <button 
                                                        onClick={() => setIsAdvancedImageEditorOpen(true)}
                                                        className="w-full py-1.5 bg-slate-800 text-white text-xs font-bold rounded shadow-sm hover:bg-slate-900 transition flex items-center justify-center gap-2"
                                                    >
                                                        Open Photoshop Mode
                                                    </button>
                                                </div>
                                            )}

                                        </div>
                                   )}
                                </>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* Live Cropper Modal */}
            <LiveImageCropperModal
                isOpen={isCropperOpen}
                onClose={() => setIsCropperOpen(false)}
                sourceImage={selectedPage?.imageUrl && !selectedPage?.imageUrl.toLowerCase().endsWith('.pdf') ? selectedPage.imageUrl : null}
                pdfUrl={selectedPage?.imageUrl?.toLowerCase().endsWith('.pdf') ? selectedPage?.imageUrl : null}
                isPdf={selectedPage?.imageUrl?.toLowerCase().endsWith('.pdf')}
                pageNumber={selectedPage?.sourcePageNo}
                onSave={handleCropSave}
                onAdvancedEdit={(base64Img) => {
                    setIsCropperOpen(false);
                    setAdvancedEditorSource(base64Img);
                    setIsAdvancedImageEditorOpen(true);
                }}
            />

            {/* Advanced Image Editor Modal */}
            {isAdvancedImageEditorOpen && (advancedEditorSource || (selectedPage?.imageUrl && !selectedPage?.imageUrl.toLowerCase().endsWith('.pdf'))) && (
                <div className="fixed inset-0 z-[1000] bg-black">
                    <FilerobotImageEditor
                        source={advancedEditorSource || ((selectedPage.imageUrl?.startsWith('http') && selectedPage.imageUrl?.includes('r2.dev')) ? `/api/v1/public/proxy-image?url=${encodeURIComponent(selectedPage.imageUrl)}` : selectedPage.imageUrl)}
                        onSave={(editedImageObject, designState) => {
                            if (advancedEditorSource) {
                                handleCropSave(editedImageObject.imageBase64);
                                setAdvancedEditorSource(null);
                                setIsAdvancedImageEditorOpen(false);
                            } else {
                                handleSaveImageEdit(editedImageObject);
                            }
                        }}
                        onClose={() => {
                            setAdvancedEditorSource(null);
                            setIsAdvancedImageEditorOpen(false);
                        }}
                        defaultTabId="Adjust"
                        defaultToolId="Crop"
                    />
                    
                    {isSavingImageEdit && (
                        <div className="absolute inset-0 bg-black/60 z-[1100] flex flex-col items-center justify-center backdrop-blur-sm">
                            <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
                            <p className="text-white font-bold tracking-widest uppercase">Overwriting Source Image...</p>
                        </div>
                    )}
                </div>
            )}

            {isQuestionConfigModalOpen && (
                <QuestionEngineConfigModal
                    bookId={bookId}
                    classSubjectId={bookDetails?.classSubjectId}
                    subjectName={bookDetails?.mappedSubjectName}
                    bookType={bookDetails?.bookType}
                    pages={pages}
                    indices={indices}
                    onClose={() => setIsQuestionConfigModalOpen(false)}
                    onStart={handleStartQuestionGen}
                />
            )}

            {isTopicSyncModalOpen && (
                <TopicExtractConfigModal
                    indices={indices}
                    pages={pages}
                    onClose={() => setIsTopicSyncModalOpen(false)}
                    onStartAll={handleExtractAllTopics}
                    onStartSingle={(idx) => handleExtractAllTopics([idx])}
                    onPreviewTopic={(idx) => {
                        setIsTopicSyncModalOpen(false);
                        setPreviewTopicIndex(idx);
                    }}
                />
            )}

            {previewTopicIndex && (
                <PreviewTopicsModal
                    indexId={previewTopicIndex.id}
                    indexName={previewTopicIndex.indexName}
                    onClose={() => setPreviewTopicIndex(null)}
                />
            )}
        </div>
    );
};

export default ProofreadingWorkspace;
