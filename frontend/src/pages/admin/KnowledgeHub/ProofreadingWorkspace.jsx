import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import {
    Book, Database, Image as ImageIcon, Layers, Trash2, AlertCircle,
    CheckCircle, Clock, ArrowLeft, Link as LinkIcon, ZoomIn, ZoomOut, Maximize, MessageSquare,
    ChevronDown, ChevronRight, FileText, Bot, Sparkles, X, BookOpen, GraduationCap,
    Tag, XCircle, Star, RotateCcw, PanelLeftClose, PanelLeftOpen,
    PanelRightClose, PanelRightOpen, MoreVertical, Info, Bookmark, Crop, RefreshCcw, Settings, Zap, Loader2,
    Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Table as TableIcon, Code
} from 'lucide-react';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
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
    const [orderedPages, setOrderedPages] = useState([...pages].sort((a,b) => a.pageNumber - b.pageNumber));
    const [applying, setApplying] = useState(false);
    
    // Quick action to reverse order (extremely common when scanning backward)
    const handleReverseAll = () => {
        setOrderedPages(prev => [...prev].reverse().map((p, idx) => ({ ...p, _tempPageNum: idx + 1 })));
    };
    
    // Manual mapping
    const handleNumChange = (id, newNum) => {
        setOrderedPages(prev => prev.map(p => p.id === id ? { ...p, _tempPageNum: parseInt(newNum) || p.pageNumber } : p));
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
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
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

/* ═══════════════════ Main Component ═══════════════════ */
const ProofreadingWorkspace = () => {
    const { bookId } = useParams();
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
    const [bulkExtractQueue, setBulkExtractQueue] = useState([]);
    const [isBulkExtracting, setIsBulkExtracting] = useState(false);
    
    // Page Reorder Modal State
    const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

    // Advanced Page Image Editor State
    const [isAdvancedImageEditorOpen, setIsAdvancedImageEditorOpen] = useState(false);
    const [advancedEditorSource, setAdvancedEditorSource] = useState(null);
    const [isSavingImageEdit, setIsSavingImageEdit] = useState(false);

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

    useEffect(() => {
        let isCancelled = false;
        const processQueue = async () => {
            if (bulkExtractQueue.length === 0 || !isBulkExtracting) {
                if (isBulkExtracting && !isCancelled) setIsBulkExtracting(false);
                return;
            }
            const nextId = bulkExtractQueue[0];
            const targetPage = pages.find(p => p.id === nextId);

            // Skip if already completed to prevent redundant calls
            if (targetPage && !targetPage.isGolden && targetPage.extractionStatus !== 'EXTRACTED' && targetPage.extractionStatus !== 'PROOFREAD') {
                try {
                    const res = await axios.post(`/v1/knowledge-hub/source-books/${bookId}/pages/${nextId}/extract`);
                    const { markdown } = res.data;
                    
                    if (!isCancelled) {
                        setPages(prev => prev.map(p => p.id === nextId ? { ...p, extractedMarkdown: markdown, extractionStatus: 'EXTRACTED' } : p));
                        
                        // Live Update if the user happens to be staring at this specific blank page
                        if (selectedPage?.id === nextId) {
                            setSelectedPage(prev => ({ ...prev, extractedMarkdown: markdown, extractionStatus: 'EXTRACTED' }));
                            // Only inject into GoldenDraft if they hadn't already manually started editing something else
                            setGoldenDraft(prev => prev || markdown || '');
                        }
                    }
                } catch (err) {
                    console.error(`Failed background extraction for page ${nextId}:`, err);
                }
            }

            // Remove processed page from queue, moving to next automatically
            if (!isCancelled) {
                setBulkExtractQueue(prev => prev.slice(1));
            }
        };

        if (isBulkExtracting && bulkExtractQueue.length > 0) processQueue();
        
        return () => { isCancelled = true; };
    }, [bulkExtractQueue, isBulkExtracting]);

    // Safety: Prevent accidental tab closing during bulk extraction
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isBulkExtracting && bulkExtractQueue.length > 0) {
                e.preventDefault();
                e.returnValue = ''; // Triggers browser default warning prompt
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isBulkExtracting, bulkExtractQueue.length]);

    const handleStartBulkExtract = () => {
        const pendingIds = pages
            .filter(p => !p.isGolden && p.extractionStatus !== 'EXTRACTED' && p.extractionStatus !== 'PROOFREAD')
            .map(p => p.id);
        if (pendingIds.length === 0) {
            alert('সব পেজের এক্সট্রাকশন সম্পন্ন হয়েছে!');
            return;
        }
        setBulkExtractQueue(pendingIds);
        setIsBulkExtracting(true);
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
    const [treeBCollapsed, setTreeBCollapsed] = useState(false);

    // Page tags (Cover, TOC, Publication Info)
    const [pageFlags, setPageFlags] = useState({});
    const [openMenuId, setOpenMenuId] = useState(null);
    const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });

    const toggleMenu = (e, id) => {
        e.stopPropagation();
        if (openMenuId === id) {
            setOpenMenuId(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuCoords({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
            setOpenMenuId(id);
        }
    };

    const handleFlag = async (e, id, type) => {
        e.stopPropagation();
        
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
                // Determine the payload to patch based on toggle type
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
                // Revert state on failure
                setPageFlags(prev => ({ ...prev, [id]: { ...prev[id], [type]: !nextValue } }));
            }
        }
        setOpenMenuId(null);
    };

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
            
            // Instantly sync the new data to the GoldenEditor draft pipeline
            setGoldenDraft(markdown || '');
            setIsEditingGolden(true);
        } catch (err) {
            alert('AI Extraction Failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsExtracting(false);
        }
    };

    // Phase 3B handlers
    const handleOpenGoldenEditor = () => {
        // Prefer already-proofed HTML, fall back to raw markdown from extraction
        const content = selectedPage?.goldenMarkdown || selectedPage?.extractedMarkdown || '';
        setGoldenDraft(content);
        setIsEditingGolden(true);
    };

    const handleMarkAsGolden = async () => {
        if (!selectedPage) return;
        setIsMarkingGolden(true);
        try {
            // goldenDraft is now updated by GoldenEditor's onChange with the HTML from Tiptap
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
            setSelectedPage(updatedPage);
            setPages(prev => prev.map(p => p.id === selectedPage.id ? updatedPage : p));
            setIsEditingGolden(false);
        } catch (err) {
            alert('সংরক্ষণে ব্যর্থ: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsMarkingGolden(false);
        }
    };

    const handleDeletePage = async (e, pageId) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this page?')) return;
        try {
            await axios.delete(`/v1/knowledge-hub/source-books/${bookId}/pages/${pageId}`);
            setPages(prev => prev.filter(p => p.id !== pageId));
            if (selectedPage?.id === pageId) setSelectedPage(null);
        } catch (err) {
            alert('Failed to delete page: ' + (err.response?.data?.error || err.message));
        }
    };

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
                    <Link to={`/knowledge-hub/mapping/${bookId}`}>
                        <button className="px-3 py-1.5 bg-white border border-teal-600 text-teal-700 hover:bg-teal-50 font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm text-xs">
                            <Layers className="w-3.5 h-3.5" /> Map Curriculum
                        </button>
                    </Link>
                    <Link to={`/knowledge-hub/digitization/${bookId}`}>
                        <button className="px-3 py-1.5 bg-indigo-600 border border-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1.5 hover:bg-indigo-700 transition-all shadow-sm text-xs">
                            <ImageIcon className="w-3.5 h-3.5" /> Add Pages
                        </button>
                    </Link>

                    {/* Bulk Extraction Tools */}
                    {isBulkExtracting && bulkExtractQueue.length > 0 ? (
                        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg shadow-sm w-max ml-1">
                            <Loader2 size={14} className="animate-spin text-indigo-500" />
                            <span className="text-xs font-bold whitespace-nowrap">Extracting {bulkExtractQueue.length} pages...</span>
                            <button onClick={() => { setIsBulkExtracting(false); setBulkExtractQueue([]); }} className="ml-1 bg-indigo-100 hover:bg-indigo-200 hover:text-red-600 p-0.5 rounded transition-colors" title="Cancel All">
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        pages.some(p => !p.isGolden && p.extractionStatus !== 'EXTRACTED' && p.extractionStatus !== 'PROOFREAD') && (
                            <button onClick={handleStartBulkExtract} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-all shadow-sm text-[11px] xl:text-xs ml-1">
                                <Zap size={14} className="text-amber-500" /> Bulk Extract PDF Data
                            </button>
                        )
                    )}
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
                                    <div key={p.id} onClick={() => { 
                                            setSelectedPage(p); 
                                            setGoldenDraft(p.goldenMarkdown || p.extractedMarkdown || '');
                                            setIsEditingGolden(true); // Default to editing mode right away
                                            setImageZoom(1); 
                                        }}
                                        className={`shrink-0 w-[65px] h-[85px] rounded-lg cursor-pointer transition-all duration-200 ease-out origin-bottom border-2 overflow-hidden relative group 
                                        ${selectedPage?.id === p.id ? 'border-indigo-600 shadow-xl scale-[1.3] z-50 -translate-y-2' : 'border-transparent hover:border-slate-300 hover:scale-[1.3] hover:z-50 hover:-translate-y-2'}`}>
                                        {p.imageUrl.toLowerCase().endsWith('.pdf') ? (
                                            <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400"><Layers className="w-6 h-6" /></div>
                                        ) : (
                                            <img src={p.imageUrl} alt={`Page ${p.sourcePageNo}`} className="w-full h-full object-cover" />
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">P {p.sourcePageNo}</div>

                                        {/* Status badge — priority: golden > extracted > pending */}
                                        {p.isGolden ? (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white z-10" title="Golden">
                                                <Star className="w-2.5 h-2.5" fill="white" />
                                            </div>
                                        ) : p.extractionStatus === 'EXTRACTED' || p.extractionStatus === 'PROOFREAD' ? (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white z-10">
                                                <CheckCircle className="w-3 h-3" />
                                            </div>
                                        ) : (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-amber-300 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white z-10">
                                                <Clock className="w-3 h-3" />
                                            </div>
                                        )}

                                        {/* Chapter assigned badge */}
                                        {p.sourceBookIndexId && (
                                            <div className="absolute top-1 left-1 w-4 h-4 bg-teal-600 rounded-full flex items-center justify-center text-white shadow-sm ring-1 ring-white z-10" title="Chapter assigned">
                                                <Tag className="w-2.5 h-2.5" />
                                            </div>
                                        )}

                                        {/* Dropdown Menu Trigger */}
                                        <button onClick={(e) => toggleMenu(e, p.id)} title="Options"
                                            className={`absolute bottom-5 left-1/2 -translate-x-1/2 w-5 h-5 bg-slate-900/90 rounded border border-slate-700/50 flex items-center justify-center text-white transition-opacity hover:bg-slate-800 z-20 shadow-sm ${openMenuId === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            <MoreVertical size={12} />
                                        </button>

                                        {/* Dropdown Menu Portal */}
                                        {openMenuId === p.id && createPortal(
                                            <div onMouseLeave={() => setOpenMenuId(null)} className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] py-1.5 w-40 overflow-hidden" style={{ left: menuCoords.x, top: menuCoords.y, transform: 'translate(-50%, 0)' }}>
                                                <button onClick={(e) => handleFlag(e, p.id, 'isCover')} className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                                    <span className="flex items-center gap-2"><ImageIcon size={12} className="text-indigo-500"/> Cover Art</span>
                                                    {bookDetails?.coverImageUrl === p.imageUrl && <CheckCircle size={12} className="text-indigo-600" />}
                                                </button>
                                                <button onClick={(e) => handleFlag(e, p.id, 'isPubInfo')} className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                                    <span className="flex items-center gap-2"><Info size={12} className="text-amber-500"/> Publication Info</span>
                                                    {pageFlags[p.id]?.isPubInfo && <CheckCircle size={12} className="text-amber-600" />}
                                                </button>
                                                <button onClick={(e) => handleFlag(e, p.id, 'isTOC')} className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                                    <span className="flex items-center gap-2"><Bookmark size={12} className="text-teal-500"/> Table of Contents</span>
                                                    {pageFlags[p.id]?.isTOC && <CheckCircle size={12} className="text-teal-600" />}
                                                </button>
                                                <div className="border-t border-slate-100 my-1 w-full" />
                                                <button onClick={(e) => { setOpenMenuId(null); handleDeletePage(e, p.id); }} className="w-full px-3 py-2 text-left text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                                                    <Trash2 size={12} /> Delete Page
                                                </button>
                                            </div>,
                                            document.body
                                        )}

                                        {/* Status Flags */}
                                        <div className="absolute top-6 left-1 flex flex-col gap-0.5 z-10">
                                           {bookDetails?.coverImageUrl === p.imageUrl && <div className="w-3.5 h-3.5 bg-indigo-500 rounded flex items-center justify-center text-white shadow-sm ring-1 ring-white" title="Cover Art"><ImageIcon size={8}/></div>}
                                           {pageFlags[p.id]?.isPubInfo && <div className="w-3.5 h-3.5 bg-amber-500 rounded flex items-center justify-center text-white shadow-sm ring-1 ring-white" title="Publication Info"><Info size={8}/></div>}
                                           {pageFlags[p.id]?.isTOC && <div className="w-3.5 h-3.5 bg-teal-500 rounded flex items-center justify-center text-white shadow-sm ring-1 ring-white" title="TOC"><Bookmark size={8}/></div>}
                                        </div>
                                    </div>
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
                                                key={selectedPage?.id || selectedPage?.pageNumber || 'golden'}
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
                        <div className={`h-full bg-white border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${treeBCollapsed ? 'w-[44px]' : 'w-[270px]'}`}>

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
                                                    {indices.map((idx, indexNumber) => (
                                                        <div key={idx.id} className={`bg-white border text-sm rounded-lg shadow-sm group transition-all ${selectedPage?.sourceBookIndexId === idx.id ? 'border-teal-500 ring-2 ring-teal-400' : activeTreeBChapter === idx.id ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                                            <div className="flex items-center justify-between p-2 cursor-pointer transition-colors"
                                                                onClick={() => handleAssignPage(selectedPage?.sourceBookIndexId === idx.id ? null : idx.id)}>
                                                                <div className="flex items-center gap-1.5 font-bold text-slate-700 text-xs min-w-0">
                                                                    <span className="text-teal-600 shrink-0">{(indexNumber + 1).toString().padStart(2, '0')}.</span>
                                                                    <span className="truncate">{idx.indexName}</span>
                                                                    {(idx.mappedChapterId || idx.mappedTopicId) && (
                                                                        <LinkIcon className="w-3 h-3 text-teal-600 ml-1 shrink-0" title="Mapped to Curriculum" />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {idx.pageCount > 0 && (
                                                                        <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-[9px] font-bold rounded border border-teal-100">{idx.pageCount}p</span>
                                                                    )}
                                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteIndex(idx.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Trash2 size={11} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {selectedPage?.sourceBookIndexId === idx.id && (
                                                                <div className="px-2.5 pb-1.5 flex items-center gap-1 text-teal-700">
                                                                    <Tag size={9} />
                                                                    <span className="text-[9px] font-bold">বর্তমান পেজ এখানে</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
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
        </div>
    );
};

export default ProofreadingWorkspace;
