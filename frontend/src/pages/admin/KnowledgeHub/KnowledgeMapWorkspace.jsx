import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, CheckCircle, Database, Search, Target, Filter, Settings, Plus, X, Trash2, Edit2, Check, Calculator, HelpCircle, Info, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import settingsService from '../../../services/settingsService';
import { knowledgeHubService } from '../../../services/knowledgeHubService';

const KnowledgeMapWorkspace = () => {
    const { id: bookId } = useParams();

    useEffect(() => {
        return () => {
            knowledgeHubService.clearCache();
        };
    }, []);

    const [loading, setLoading] = useState(true);
    const [bookDetails, setBookDetails] = useState(null);
    const [indices, setIndices] = useState([]); // Tree B
    
    // Tree A data
    const [chapters, setChapters] = useState([]);
    const [topicsByChapter, setTopicsByChapter] = useState({});

    // UI state
    const [savingId, setSavingId] = useState(null);
    const [portalTarget, setPortalTarget] = useState(null);

    // Offset Calibration States
    const [isOffsetWizardOpen, setIsOffsetWizardOpen] = useState(false);
    const [calibBookPage, setCalibBookPage] = useState('');
    const [calibPdfPage, setCalibPdfPage] = useState('');

    // Filters and Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, MAPPED, UNMAPPED
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [isBulkCreating, setIsBulkCreating] = useState(false);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);

    const [categories, setCategories] = useState(['গদ্য', 'পদ্য', 'উপন্যাস', 'নাটক', 'আনন্দপাঠ']);
    const [showCatModal, setShowCatModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null); // { oldName: '...', newName: '...' }
    const [changedCategories, setChangedCategories] = useState({}); // { chId: categoryName }

    const fetchIndicesData = async () => {
        const indicesRes = await axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices`);
        setIndices(indicesRes.data);
    };

    useEffect(() => {
        setPortalTarget(document.getElementById('topbar-actions'));
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch categories first
                try {
                    const data = await settingsService.getInstituteSettings('GENERAL');
                    if (data && data.chapter_categories) {
                        const cats = data.chapter_categories.split(',').map(c => c.trim()).filter(Boolean);
                        if (cats.length > 0) setCategories(cats);
                    }
                } catch (err) {
                    console.error("Failed to load categories", err);
                }

                // Fetch book details
                const bookRes = await axios.get(`/v1/knowledge-hub/source-books/${bookId}`);
                const bookInfo = bookRes.data;
                setBookDetails(bookInfo);

                // Fetch Tree B (Book indices)
                await fetchIndicesData();

                // If book has a classSubjectId mapped, fetch Tree A
                if (bookInfo.classSubjectId) {
                    const chapterRes = await academicService.getChaptersByClassSubject(bookInfo.classSubjectId, false);
                    setChapters(chapterRes);

                    // Fetch all topics for these chapters independently
                    const topicMap = {};
                    await Promise.all(chapterRes.map(async (ch) => {
                        try {
                            const tRes = await academicService.getTopicsByChapter(ch.id);
                            topicMap[ch.id] = tRes;
                        } catch (err) {
                            topicMap[ch.id] = [];
                        }
                    }));
                    setTopicsByChapter(topicMap);
                }

            } catch (err) {
                console.error("Failed to load map data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [bookId]);

    const fetchChapters = async (classSubjectId) => {
        try {
            const chapterRes = await academicService.getChaptersByClassSubject(classSubjectId, false);
            setChapters(chapterRes);
            const topicMap = {};
            await Promise.all(chapterRes.map(async (ch) => {
                try {
                    const tRes = await academicService.getTopicsByChapter(ch.id);
                    topicMap[ch.id] = tRes;
                } catch (err) {
                    topicMap[ch.id] = [];
                }
            }));
            setTopicsByChapter(topicMap);
            return chapterRes;
        } catch (error) {
            console.error("Failed to re-fetch chapters", error);
            return [];
        }
    };

    const handleCreateCanonicalChapter = async (idx) => {
        if (!bookDetails?.classSubjectId) return;
        
        // Suggest the chapter number (e.g. from chapters length, or extract from indexName if "Chapter 1: ...")
        const suggestedNum = chapters.length + 1;
        const chapterName = window.prompt(`Create new canonical chapter for "${idx.indexName}"\n\nEnter Chapter Name:`, idx.indexName);
        if (!chapterName) return;
        
        try {
            setSavingId(idx.id);
            const newChData = { name: chapterName, chapterNumber: suggestedNum, isActive: true };
            const newChapter = await academicService.createChapter(bookDetails.classSubjectId, newChData);
            
            // Re-fetch chapters to update the list
            await fetchChapters(bookDetails.classSubjectId);

            // Auto-map the new chapter
            await handleSelectChange(idx.id, `${newChapter.id}___`);
        } catch (error) {
            console.error("Failed to create chapter", error);
            alert("Error creating canonical chapter.");
        } finally {
            setSavingId(null);
        }
    };

    const handleBulkCreateCanonicalChapters = async () => {
        if (!bookDetails?.classSubjectId || selectedIndices.size === 0) return;
        
        if (!window.confirm(`Are you sure you want to create ${selectedIndices.size} new Canonical Chapters?`)) return;

        setIsBulkCreating(true);
        let baseChapterNum = chapters.length;
        
        // Filter out indices that are already mapped, just in case
        const indicesToCreate = indices.filter(idx => selectedIndices.has(idx.id) && !idx.mappedChapterId);
        
        for (const idx of indicesToCreate) {
            try {
                setSavingId(idx.id);
                baseChapterNum += 1;
                const newChData = { name: idx.indexName, chapterNumber: baseChapterNum, isActive: true };
                const newChapter = await academicService.createChapter(bookDetails.classSubjectId, newChData);
                
                const payload = { ...idx, mappedChapterId: newChapter.id, mappedTopicId: null };
                const res = await axios.put(`/v1/knowledge-hub/source-books/${bookId}/indices/${idx.id}`, payload);
                
                setIndices(prev => prev.map(i => i.id === idx.id ? res.data : i));
            } catch (err) {
                console.error("Failed to create/map chapter for index", idx.id, err);
            }
        }
        
        await fetchChapters(bookDetails.classSubjectId);
        setSavingId(null);
        setSelectedIndices(new Set());
        setIsBulkCreating(false);
    };

    const handleSelectChange = async (indexId, selectValue) => {
        setSavingId(indexId);
        try {
            let mappedChapterId = null;
            let mappedTopicId = null;
            
            if (selectValue) {
                const parts = selectValue.split('___');
                mappedChapterId = parts[0] || null;
                mappedTopicId = parts[1] || null;
            }

            const currentIndex = indices.find(i => i.id === indexId);
            if (!currentIndex) return;

            const payload = { ...currentIndex, mappedChapterId, mappedTopicId };
            
            const res = await axios.put(`/v1/knowledge-hub/source-books/${bookId}/indices/${indexId}`, payload);
            
            // Update local state
            setIndices(prev => prev.map(idx => idx.id === indexId ? res.data : idx));
        } catch (err) {
            console.error("Failed to update mapping", err);
            alert("Failed to save mapping!");
        } finally {
            setSavingId(null);
        }
    };

    const handlePageUpdateBlur = async (idx, field, value) => {
        const val = value === '' ? null : parseInt(value, 10);
        if (idx[field] === val) return; // Unchanged
        
        const updatedIdx = { ...idx, [field]: val };
        try {
            await axios.put(`/v1/knowledge-hub/source-books/${bookId}/indices/${idx.id}`, updatedIdx);
        } catch (err) {
            console.error("Failed to update page", err);
        }
    };

    const handleChapterCategoryChange = async (chId, categoryName) => {
        try {
            await academicService.updateChapter(chId, { categoryName: categoryName || '' });
            setChapters(prev => prev.map(c => c.id === chId ? { ...c, categoryName } : c));
        } catch (error) {
            console.error("Failed to update chapter category", error);
            alert("Failed to update chapter category");
        }
    };

    const handleChapterStatusToggle = async (chId, isActive) => {
        try {
            await academicService.updateChapter(chId, { isActive });
            setChapters(prev => prev.map(c => c.id === chId ? { ...c, isActive } : c));
        } catch (error) {
            console.error("Failed to update chapter status", error);
            alert("Failed to update chapter status");
        }
    };

    const handleSaveCategories = async (updatedCats) => {
        try {
            const catString = updatedCats.join(',');
            await settingsService.updateInstituteSettings('GENERAL', { chapter_categories: catString });
            setCategories(updatedCats);
        } catch (error) {
            console.error("Failed to save categories", error);
            alert("ক্যাটাগরি সংরক্ষণ করতে ব্যর্থ হয়েছে।");
        }
    };

    const handleAddCategory = async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;
        if (categories.includes(trimmed)) {
            alert("এই ক্যাটাগরি ইতিমধ্যে রয়েছে।");
            return;
        }
        const updated = [...categories, trimmed];
        await handleSaveCategories(updated);
        setNewCategoryName('');
    };

    const handleDeleteCategory = async (catToDelete) => {
        if (!window.confirm(`আপনি কি "${catToDelete}" ক্যাটাগরিটি ডিলিট করতে চান?`)) return;
        const updated = categories.filter(c => c !== catToDelete);
        await handleSaveCategories(updated);
    };

    const handleStartEditCategory = (cat) => {
        setEditingCategory({ oldName: cat, newName: cat });
    };

    const handleSaveEditCategory = async () => {
        if (!editingCategory) return;
        const oldName = editingCategory.oldName;
        const newName = editingCategory.newName.trim();
        if (!newName) return;
        if (oldName === newName) {
            setEditingCategory(null);
            return;
        }
        if (categories.includes(newName)) {
            alert("এই ক্যাটাগরি ইতিমধ্যে রয়েছে।");
            return;
        }

        const updated = categories.map(c => c === oldName ? newName : c);
        await handleSaveCategories(updated);

        // Also update any loaded chapters in this class-subject that use the old name
        const chaptersToUpdate = chapters.filter(ch => ch.categoryName === oldName);
        if (chaptersToUpdate.length > 0) {
            try {
                await Promise.all(chaptersToUpdate.map(ch => 
                    academicService.updateChapter(ch.id, { categoryName: newName })
                ));
                // Update local state
                setChapters(prev => prev.map(ch => ch.categoryName === oldName ? { ...ch, categoryName: newName } : ch));
            } catch (err) {
                console.error("Failed to update renamed category for chapters", err);
            }
        }

        setEditingCategory(null);
    };

    const handleOffsetUpdate = async (newOffset) => {
        try {
            // Always send API request on blur to ensure backend is synced,
            // because optimistic UI updates in onChange might make newOffset == bookDetails.pdfPageOffset
            const updatedBook = { ...bookDetails, pdfPageOffset: newOffset };
            const res = await axios.put(`/v1/knowledge-hub/source-books/${bookId}`, updatedBook);
            setBookDetails(res.data);
        } catch (err) {
            console.error("Failed to save pdf offset", err);
            alert("Failed to update PDF Offset");
        }
    };

    const handleAutoAssignPages = async () => {
        if (!window.confirm("Are you sure you want to auto-assign all matching PDF pages to these indices? This will also auto-create any missing Target Chapters and calculate ending pages.")) return;
        try {
            setIsAutoAssigning(true);

            // Auto-create and map Tree A chapters for unmapped indices
            const unmappedIndices = indices.filter(idx => !idx.mappedChapterId);
            if (unmappedIndices.length > 0 && bookDetails?.classSubjectId) {
                let baseChapterNum = chapters.length;
                for (const idx of unmappedIndices) {
                    try {
                        setSavingId(idx.id);
                        baseChapterNum += 1;
                        const newChData = { name: idx.indexName, chapterNumber: baseChapterNum, isActive: true };
                        const newChapter = await academicService.createChapter(bookDetails.classSubjectId, newChData);
                        
                        const payload = { ...idx, mappedChapterId: newChapter.id, mappedTopicId: null };
                        await axios.put(`/v1/knowledge-hub/source-books/${bookId}/indices/${idx.id}`, payload);
                    } catch (err) {
                        console.error("Failed to create/map chapter for index", idx.id, err);
                    }
                }
                // Refresh chapters list
                await fetchChapters(bookDetails.classSubjectId);
                setSavingId(null);
            }

            await axios.post(`/v1/knowledge-hub/source-books/${bookId}/auto-assign-indices`);
            alert("Chapters generated and pages assigned successfully! They will now show up in Proofreading Workspace organized by Chapter.");
            await fetchIndicesData(); // refresh to show auto-calculated end pages
        } catch (err) {
            console.error("Auto-assign error:", err);
            alert("Failed to auto-assign pages.");
        } finally {
            setIsAutoAssigning(false);
        }
    };

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center text-slate-500 font-satoshi"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
    }

    if (!bookDetails?.classSubjectId) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50 font-satoshi">
                <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">No Target Subject Mapped</h2>
                <p className="text-slate-500 max-w-md text-center mt-2">
                    To map this book's index to the global syllabus, you must first map the book to a Class Subject (Tree A) from the Proofreading Workspace.
                </p>
                <Link to={`/knowledge-hub/proofreading/${bookId}`} className="mt-6 px-6 py-2 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 transition">
                    Go to Workspace
                </Link>
            </div>
        );
    }

    // Derived Data
    const totalIndices = indices.length;
    const mappedIndices = indices.filter(i => i.mappedChapterId).length;
    const progressPercent = totalIndices > 0 ? Math.round((mappedIndices / totalIndices) * 100) : 0;

    // Filtered Indices
    const filteredIndices = indices.filter(idx => {
        const matchesSearch = idx.indexName?.toLowerCase().includes(searchQuery.toLowerCase());
        const isMapped = !!idx.mappedChapterId;
        const matchesFilter = filterStatus === 'ALL' 
            ? true 
            : filterStatus === 'MAPPED' ? isMapped : !isMapped;
        
        return matchesSearch && matchesFilter;
    });

    const toggleSelectAll = () => {
        if (selectedIndices.size === filteredIndices.length && filteredIndices.length > 0) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(filteredIndices.map(i => i.id)));
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIndices);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIndices(newSet);
    };

    return (
        <>
            {portalTarget && createPortal(
                <div className="flex items-center gap-3">
                    <Link to={`/knowledge-hub/proofreading/${bookId}`}>
                        <button className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg flex items-center gap-1.5 transition-all shadow-sm text-xs font-semibold">
                            <ArrowLeft className="w-4 h-4" /> Back to Workspace
                        </button>
                    </Link>
                </div>,
                portalTarget
            )}
            
            <div className="flex-1 w-full relative overflow-y-auto bg-slate-50">
                <div className="max-w-none 2xl:max-w-[1800px] mx-auto py-4 px-4 lg:px-6">
                    {/* Header Banner */}
                    <div className="bg-white rounded-xl p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none"></div>
                        <div className="flex items-center gap-4 z-10">
                            {bookDetails.coverImageUrl ? (
                                <img src={bookDetails.coverImageUrl} alt="Cover" className="h-[72px] w-[52px] object-cover rounded-md shadow-sm border border-slate-100" />
                            ) : (
                                <div className="h-[72px] w-[52px] bg-slate-100 rounded-md shadow-sm border border-slate-200 flex items-center justify-center text-slate-300">
                                    <BookOpen size={20} />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wider border border-indigo-100">
                                        Workspace
                                    </span>
                                </div>
                                <h2 className="text-[18px] font-bold text-slate-800 leading-tight mb-0.5">{bookDetails.title}</h2>
                                <div className="flex items-center gap-2">
                                    <p className="text-[12px] font-semibold text-slate-500">{bookDetails.publisher} &bull; {bookDetails.authorName}</p>
                                    <button 
                                        onClick={() => setIsOffsetWizardOpen(!isOffsetWizardOpen)}
                                        title="Click to calibrate PDF Page Offset"
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1 outline-none
                                            ${bookDetails.pdfPageOffset !== null && bookDetails.pdfPageOffset !== 0 
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300' 
                                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:border-slate-300'
                                            } ${isOffsetWizardOpen ? 'ring-2 ring-indigo-400' : ''}`}
                                    >
                                        <Settings size={10} className={isOffsetWizardOpen ? 'animate-spin-slow' : ''} /> Page Offset: {bookDetails.pdfPageOffset !== null ? (bookDetails.pdfPageOffset >= 0 ? `+${bookDetails.pdfPageOffset}` : bookDetails.pdfPageOffset) : '0'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 md:pl-5 md:border-l md:text-right flex flex-col md:items-end justify-center min-w-[220px] z-10">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center md:justify-end gap-1.5">
                                <Target size={14} className="text-teal-500" /> Target Syllabus
                            </p>
                            <p className="text-sm font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 mb-4 inline-block">
                                {bookDetails.mappedClassName} &bull; {bookDetails.mappedSubjectName}
                            </p>
                            <div className="w-full">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                                    <span>Mapping Progress</span>
                                    <span className={progressPercent === 100 ? "text-emerald-600" : "text-indigo-600"}>{mappedIndices} / {totalIndices}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Collapsible PDF Page Offset Calibration & Assistance Panel */}
                    {isOffsetWizardOpen && (
                        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-xl p-5 mb-4 shadow-lg border border-indigo-500/20 relative overflow-hidden transition-all duration-300 animate-in slide-in-from-top-4 duration-300 font-satoshi">
                            {/* Decorative background elements */}
                            <div className="absolute top-[-20%] right-[-10%] w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-[-10%] left-[-5%] w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="flex items-start justify-between gap-4 pb-3 border-b border-indigo-400/20 relative z-10">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-indigo-600/30 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/30 shadow-inner">
                                        <Calculator className="w-4.5 h-4.5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold tracking-wide flex items-center gap-1.5">
                                            PDF Page Offset Calibration
                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-900 shadow-sm uppercase">
                                                Enterprise
                                            </span>
                                        </h3>
                                        <p className="text-[10px] text-indigo-300/80 mt-0.5">বইয়ের প্রিন্ট করা পৃষ্ঠা নম্বরের সাথে PDF ভিউয়ারের পৃষ্ঠা নম্বরের অমিল সংশোধন করার প্যানেল</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsOffsetWizardOpen(false)}
                                    className="p-1 hover:bg-white/10 rounded-lg text-indigo-300 hover:text-white transition"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-12 gap-6 mt-4 relative z-10">
                                {/* Controller 1: Direct offset control */}
                                <div className="col-span-12 md:col-span-4 flex flex-col justify-center bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-2.5 flex items-center gap-1">
                                        <Settings size={12} className="text-teal-400" /> Direct Offset Control
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                const current = bookDetails.pdfPageOffset || 0;
                                                handleOffsetUpdate(current - 1);
                                            }}
                                            onMouseDown={(e) => e.preventDefault()}
                                            className="w-8 h-8 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold rounded-lg border border-white/10 flex items-center justify-center transition-all shadow-sm text-sm"
                                            title="Decrease Offset"
                                        >
                                            -
                                        </button>
                                        <div className="flex-1 relative">
                                            <input 
                                                type="number"
                                                className="w-full bg-slate-950/70 border border-indigo-500/30 text-white rounded-lg px-2 py-1.5 text-center font-mono text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                                value={bookDetails.pdfPageOffset || 0}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                    setBookDetails(prev => ({ ...prev, pdfPageOffset: val }));
                                                }}
                                                onBlur={(e) => {
                                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                    handleOffsetUpdate(val);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                        handleOffsetUpdate(val);
                                                        e.target.blur();
                                                    }
                                                }}
                                            />
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-indigo-400/60 uppercase">Val</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const current = bookDetails.pdfPageOffset || 0;
                                                handleOffsetUpdate(current + 1);
                                            }}
                                            onMouseDown={(e) => e.preventDefault()}
                                            className="w-8 h-8 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold rounded-lg border border-white/10 flex items-center justify-center transition-all shadow-sm text-sm"
                                            title="Increase Offset"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-indigo-300/60 mt-2 text-center">সরাসরি প্লাস বা মাইনাস ক্লিক করে অথবা অফসেট মান টাইপ করে পরিবর্তন করুন।</p>
                                </div>

                                {/* Controller 2: Calibration Assistant */}
                                <div className="col-span-12 md:col-span-5 flex flex-col justify-center bg-white/5 p-3 rounded-lg border border-white/5 relative">
                                    <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none"></div>
                                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-2.5 flex items-center gap-1">
                                        <HelpCircle size={12} className="text-emerald-400" /> Calibration Assistant (হিসাবকারী)
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="block text-[8px] font-bold text-indigo-400 uppercase tracking-wider mb-1">বইয়ের পৃষ্ঠা নম্বর</label>
                                            <input 
                                                type="number"
                                                placeholder="উদা: 1"
                                                className="w-full bg-slate-950/70 border border-indigo-500/30 text-white rounded-lg px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                                value={calibBookPage}
                                                onChange={e => setCalibBookPage(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        const bookP = parseInt(calibBookPage, 10);
                                                        const pdfP = parseInt(calibPdfPage, 10);
                                                        if (!isNaN(bookP) && !isNaN(pdfP)) {
                                                            const calculatedOffset = pdfP - bookP;
                                                            handleOffsetUpdate(calculatedOffset);
                                                            setCalibBookPage('');
                                                            setCalibPdfPage('');
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="text-indigo-400 text-[10px] font-bold mt-4 flex justify-center shrink-0">
                                            =
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[8px] font-bold text-indigo-400 uppercase tracking-wider mb-1">PDF এর পৃষ্ঠা নম্বর</label>
                                            <input 
                                                type="number"
                                                placeholder="উদা: 15"
                                                className="w-full bg-slate-950/70 border border-indigo-500/30 text-white rounded-lg px-2.5 py-1.5 font-mono text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                                value={calibPdfPage}
                                                onChange={e => setCalibPdfPage(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        const bookP = parseInt(calibBookPage, 10);
                                                        const pdfP = parseInt(calibPdfPage, 10);
                                                        if (!isNaN(bookP) && !isNaN(pdfP)) {
                                                            const calculatedOffset = pdfP - bookP;
                                                            handleOffsetUpdate(calculatedOffset);
                                                            setCalibBookPage('');
                                                            setCalibPdfPage('');
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const bookP = parseInt(calibBookPage, 10);
                                                const pdfP = parseInt(calibPdfPage, 10);
                                                if (!isNaN(bookP) && !isNaN(pdfP)) {
                                                    const calculatedOffset = pdfP - bookP;
                                                    handleOffsetUpdate(calculatedOffset);
                                                    setCalibBookPage('');
                                                    setCalibPdfPage('');
                                                } else {
                                                    alert("দয়া করে সঠিক পৃষ্ঠা সংখ্যা ইনপুট দিন!");
                                                }
                                            }}
                                            disabled={!calibBookPage || !calibPdfPage}
                                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-lg transition-all shadow-md text-[11px] self-end h-[32px] shrink-0"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-indigo-300/60 mt-2">বইয়ের যেকোনো পৃষ্ঠার নম্বর এবং সেটির PDF রিডারের প্রকৃত পৃষ্ঠা সংখ্যা দিন, অফসেট অটো হিসাব হবে।</p>
                                </div>

                                {/* Controller 3: Live Preview */}
                                <div className="col-span-12 md:col-span-3 flex flex-col justify-center bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Sparkles size={12} className="text-amber-400" /> Live Preview
                                    </span>
                                    
                                    <div className="space-y-1.5 mt-1 font-mono text-[10px] text-slate-300 bg-slate-950/40 p-2 rounded border border-indigo-500/10">
                                        <div className="flex justify-between">
                                            <span>বইয়ের পৃষ্ঠা ১</span>
                                            <span className="text-teal-400">→ PDF পৃষ্ঠা {1 + (bookDetails.pdfPageOffset || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>বইয়ের পৃষ্ঠা ৫০</span>
                                            <span className="text-teal-400">→ PDF পৃষ্ঠা {50 + (bookDetails.pdfPageOffset || 0)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>বইয়ের পৃষ্ঠা ১০০</span>
                                            <span className="text-teal-400">→ PDF পৃষ্ঠা {100 + (bookDetails.pdfPageOffset || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 text-[8px] text-indigo-300/60">
                                        <Info size={10} className="text-indigo-400 shrink-0" />
                                        <span>এই অফসেট অনুযায়ী সমস্ত পৃষ্ঠা ম্যাপ হবে।</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Toolbar functionality */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-4 bg-white p-2.5 rounded-xl shadow-sm border border-slate-200">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                                type="text"
                                placeholder="Search extracted indices..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-[12px] font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleAutoAssignPages}
                                className="px-3 py-1 bg-emerald-600 text-white rounded-md text-[11px] font-bold transition-colors hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 h-[28px]"
                                disabled={isAutoAssigning}
                            >
                                {isAutoAssigning ? (
                                   <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : <Layers size={14} />}
                                Auto-Assign Pages
                            </button>
                            {selectedIndices.size > 0 && (
                                <button 
                                    onClick={handleBulkCreateCanonicalChapters}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded-md text-[11px] font-bold transition-colors hover:bg-indigo-700 shadow-sm flex items-center gap-1.5 h-[28px]"
                                    disabled={isBulkCreating}
                                >
                                    {isBulkCreating ? (
                                       <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : '+'}
                                    Bulk Create ({selectedIndices.size})
                                </button>
                            )}
                            <div className="flex bg-slate-100 rounded-lg p-0.5">
                                {['ALL', 'MAPPED', 'UNMAPPED'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${filterStatus === status ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Grid Layout for Mapping List and Target Chapters control panel */}
                    <div className="grid grid-cols-12 gap-6 mt-4">
                        {/* Column: Mapping List */}
                        <div className="col-span-12 xl:col-span-8">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-200 bg-slate-50/80 items-center">
                                    <div className="col-span-4 lg:col-span-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            checked={filteredIndices.length > 0 && selectedIndices.size === filteredIndices.length}
                                            onChange={toggleSelectAll}
                                        />
                                        <span className="flex items-center gap-1.5">
                                            <BookOpen size={12} className="text-indigo-600" /> Publisher's Index (Tree B)
                                        </span>
                                    </div>
                                    <div className="col-span-3 lg:col-span-3 flex text-[10px] font-bold uppercase tracking-widest text-slate-500 items-center">
                                        <span className="flex items-center gap-1.5"><Layers size={12} className="text-amber-500" /> Page Coverage</span>
                                    </div>
                                    <div className="col-span-5 lg:col-span-6 flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 items-center">
                                        <span className="flex items-center gap-1.5"><Database size={12} className="text-teal-600" /> Target Chapter/Topic (Tree A)</span>
                                    </div>
                                </div>

                                {filteredIndices.length === 0 ? (
                                    <div className="p-16 text-center">
                                        <Layers className="size-16 text-slate-200 mx-auto mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-1">No indices found</h3>
                                        <p className="text-slate-500 text-sm">Try adjusting your filters or search query.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {filteredIndices.map((idx) => {
                                            // Construct the current value string
                                            let currentValue = "";
                                            if (idx.mappedChapterId) {
                                                currentValue = `${idx.mappedChapterId}___${idx.mappedTopicId || ''}`;
                                            }

                                            const isMapped = !!idx.mappedChapterId;

                                            return (
                                                <div key={idx.id} className={`grid grid-cols-12 gap-4 px-4 py-3 items-center transition-colors ${isMapped ? 'bg-indigo-50/10' : 'hover:bg-slate-50'}`}>
                                                    
                                                    {/* Column 1: Tree B */}
                                                    <div className="col-span-4 lg:col-span-3 flex items-start gap-3 pr-4 border-r border-slate-100">
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-1"
                                                            checked={selectedIndices.has(idx.id)}
                                                            onChange={() => toggleSelect(idx.id)}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-bold text-slate-800 leading-tight">{idx.indexName}</span>
                                                            {(idx.categoryName || idx.authorName) && (
                                                                <span className="text-[10px] text-slate-500 font-medium my-0.5">
                                                                    {[idx.categoryName, idx.authorName].filter(Boolean).join(' • ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Column 2: Page Coverage */}
                                                    <div className="col-span-3 lg:col-span-3 flex flex-col justify-center pr-4 border-r border-slate-100 gap-1.5">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase w-7">TOC</span>
                                                            <input 
                                                                type="number" 
                                                                className="w-12 h-6 text-[11px] font-mono text-center bg-white border border-slate-200 rounded hover:border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-colors"
                                                                value={idx.startPage || ''} 
                                                                placeholder="Start"
                                                                title="Start Page"
                                                                onChange={(e) => setIndices(prev => prev.map(i => i.id === idx.id ? { ...i, startPage: e.target.value === '' ? null : parseInt(e.target.value, 10) } : i))}
                                                                onBlur={(e) => handlePageUpdateBlur(idx, 'startPage', e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handlePageUpdateBlur(idx, 'startPage', e.target.value);
                                                                        e.target.blur();
                                                                    }
                                                                }}
                                                            />
                                                            <span className="text-slate-300 text-xs">-</span>
                                                            <input 
                                                                type="number" 
                                                                className="w-12 h-6 text-[11px] font-mono text-center bg-white border border-slate-200 rounded hover:border-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-colors"
                                                                value={idx.endPage || ''} 
                                                                placeholder="End"
                                                                title="End Page"
                                                                onChange={(e) => setIndices(prev => prev.map(i => i.id === idx.id ? { ...i, endPage: e.target.value === '' ? null : parseInt(e.target.value, 10) } : i))}
                                                                onBlur={(e) => handlePageUpdateBlur(idx, 'endPage', e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handlePageUpdateBlur(idx, 'endPage', e.target.value);
                                                                        e.target.blur();
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        {(idx.startPage || idx.endPage) && (
                                                            <div className="flex items-center gap-1 pt-1 border-t border-slate-100/60 text-[9px] font-bold font-mono">
                                                                <span 
                                                                    className="uppercase w-7 text-indigo-600 flex items-center gap-0.5 hover:text-indigo-800 transition cursor-help shrink-0" 
                                                                    title="এটি পরিবর্তন করলে পুরো বইয়ের অফসেট আপডেট হবে"
                                                                >
                                                                    PDF
                                                                    <Info size={9} className="text-indigo-400" />
                                                                </span>
                                                                <input 
                                                                    type="number" 
                                                                    className="w-12 h-6 text-[11px] font-mono text-center bg-indigo-50/50 border border-indigo-200 text-indigo-700 rounded hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                                                                    value={idx.startPage ? (idx.startPage + (bookDetails.pdfPageOffset || 0)) : ''} 
                                                                    placeholder={idx.startPage ? "?" : "-"}
                                                                    title={idx.startPage ? "এটি পরিবর্তন করলে পুরো বইয়ের অফসেট আপডেট হবে" : "TOC Start Page ফাঁকা থাকায় PDF Start Page নির্ধারণ করা যাবে না"}
                                                                    disabled={!idx.startPage}
                                                                    onChange={(e) => {
                                                                        const pdfP = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                                        if (pdfP !== null && idx.startPage) {
                                                                            const offset = pdfP - idx.startPage;
                                                                            setBookDetails(prev => ({...prev, pdfPageOffset: offset}));
                                                                        }
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        const pdfP = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                                        if (pdfP !== null && idx.startPage) {
                                                                            handleOffsetUpdate(pdfP - idx.startPage);
                                                                        }
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            const pdfP = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                                                            if (pdfP !== null && idx.startPage) {
                                                                                handleOffsetUpdate(pdfP - idx.startPage);
                                                                                e.target.blur();
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="text-indigo-200 text-xs">-</span>
                                                                <span 
                                                                    className="w-12 h-6 flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-500 rounded"
                                                                    title="অফসেট হিসাব অনুযায়ী PDF End Page"
                                                                >
                                                                    {idx.endPage ? idx.endPage + (bookDetails.pdfPageOffset || 0) : '?'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Column 3: Mapped Select & Create Action */}
                                                    <div className="col-span-5 lg:col-span-6 flex justify-between items-center gap-3 relative">
                                                        <div className="relative flex-1 flex items-center gap-2">
                                                            <select 
                                                                className={`flex-1 min-w-0 appearance-none border rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all outline-none 
                                                                    ${isMapped 
                                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100' 
                                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 focus:ring-2 focus:ring-slate-100'
                                                                    } 
                                                                    ${savingId === idx.id ? 'opacity-50 pointer-events-none' : ''}`}
                                                                value={currentValue}
                                                                onChange={(e) => handleSelectChange(idx.id, e.target.value)}
                                                            >
                                                                <option value="">-- No mapping (Unlinked) --</option>
                                                                {chapters.map(ch => (
                                                                    <optgroup key={ch.id} label={`Chapter ${ch.chapterNumber}: ${ch.name} ${ch.isActive === false ? '(Inactive)' : ''}`}>
                                                                        <option value={`${ch.id}___`}>[Entire Chapter] {ch.name}</option>
                                                                        {(topicsByChapter[ch.id] || []).map(t => (
                                                                            <option key={t.id} value={`${ch.id}___${t.id}`}>
                                                                                ↳ Topic: {t.name}
                                                                            </option>
                                                                        ))}
                                                                    </optgroup>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        
                                                        {/* Action Buttons & Status Indicator */}
                                                        <div className="shrink-0 flex items-center gap-2">
                                                            {!isMapped && (
                                                                <button 
                                                                    onClick={() => handleCreateCanonicalChapter(idx)}
                                                                    className="px-2 py-1 bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 rounded text-[10px] font-bold uppercase transition flex items-center gap-1 shadow-sm"
                                                                    title="Create as New Chapter in Target Syllabus"
                                                                    disabled={savingId === idx.id}
                                                                >
                                                                    + New Chapter
                                                                </button>
                                                            )}
                                                            
                                                            <div className="w-6 h-6 flex items-center justify-center">
                                                                {savingId === idx.id ? (
                                                                    <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                                                                ) : isMapped ? (
                                                                    <CheckCircle className="w-4 h-4 text-emerald-500 drop-shadow-sm" />
                                                                ) : (
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 shadow-inner" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Column: Target Chapters Control Panel Sidebar */}
                        <div className="col-span-12 xl:col-span-4">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <Database size={16} className="text-indigo-600" /> Syllabus Chapters & Rules
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowCatModal(true)}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition"
                                            title="Manage Categories"
                                        >
                                            <Settings size={15} />
                                        </button>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                            Total: {chapters.length}
                                        </span>
                                    </div>
                                </div>

                                {chapters.length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-8">
                                        No target chapters found. Use "+ New Chapter" or "Auto-Assign Pages" on index items to populate the target syllabus.
                                    </p>
                                ) : (
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                        {chapters.map(ch => (
                                            <div key={ch.id} className={`p-3 rounded-lg border transition-all flex flex-col gap-2 ${ch.isActive === false ? 'bg-slate-50/60 border-slate-200 opacity-75' : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 font-mono">CH {ch.chapterNumber}</span>
                                                        <h4 className="text-xs font-bold text-slate-700 leading-tight mt-0.5">{ch.name}</h4>
                                                    </div>
                                                    
                                                    {/* Toggle Switch */}
                                                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={ch.isActive !== false}
                                                            onChange={(e) => handleChapterStatusToggle(ch.id, e.target.checked)}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                        <span className="ml-1.5 text-[10px] font-bold text-slate-500">
                                                            {ch.isActive !== false ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </label>
                                                </div>

                                                <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-slate-200/50">
                                                    <span className="text-[10px] font-semibold text-slate-500">Category:</span>
                                                    <select
                                                        value={changedCategories[ch.id] !== undefined ? changedCategories[ch.id] : (ch.categoryName || '')}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setChangedCategories(prev => ({ ...prev, [ch.id]: val }));
                                                        }}
                                                        className="flex-1 text-[11px] font-medium bg-white border border-slate-200 text-slate-700 rounded px-1.5 py-0.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none"
                                                    >
                                                        <option value="">-- General --</option>
                                                        {Array.from(new Set([...categories, changedCategories[ch.id] !== undefined ? changedCategories[ch.id] : ch.categoryName].filter(Boolean))).map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    {changedCategories[ch.id] !== undefined && changedCategories[ch.id] !== (ch.categoryName || '') && (
                                                        <button
                                                            onClick={async () => {
                                                                const newCat = changedCategories[ch.id];
                                                                await handleChapterCategoryChange(ch.id, newCat);
                                                                setChangedCategories(prev => {
                                                                    const updated = { ...prev };
                                                                    delete updated[ch.id];
                                                                    return updated;
                                                                });
                                                            }}
                                                            className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                                                            title="Save Category"
                                                        >
                                                            <Check size={10} /> Save
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Management Modal */}
            {showCatModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150 font-satoshi">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={18} className="text-indigo-600" /> ক্যাটাগরি ম্যানেজ করুন
                            </h2>
                            <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Add New Category */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="নতুন ক্যাটাগরির নাম লিখুন (যেমন: গদ্য)"
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-xs"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                                />
                                <button
                                    onClick={handleAddCategory}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                >
                                    <Plus size={14} /> যোগ করুন
                                </button>
                            </div>
                            
                            {/* Category List */}
                            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100 bg-slate-50">
                                {categories.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-xs">কোনো ক্যাটাগরি নেই। একটি যোগ করুন।</div>
                                ) : (
                                    categories.map(cat => {
                                        const isEditing = editingCategory && editingCategory.oldName === cat;
                                        return (
                                            <div key={cat} className="flex justify-between items-center p-2.5 bg-white transition hover:bg-slate-50/50">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <input
                                                            type="text"
                                                            className="flex-1 px-2 py-1 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-xs font-medium"
                                                            value={editingCategory.newName}
                                                            onChange={e => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEditCategory(); }}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleSaveEditCategory}
                                                            className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition"
                                                            title="সংরক্ষণ করুন"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingCategory(null)}
                                                            className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition"
                                                            title="বাতিল করুন"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-slate-700 text-xs font-semibold">{cat}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleStartEditCategory(cat)}
                                                                className="text-slate-400 hover:text-indigo-600 p-1.5 rounded hover:bg-slate-100 transition"
                                                                title="সম্পাদনা করুন"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(cat)}
                                                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition"
                                                                title="ডিলিট করুন"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default KnowledgeMapWorkspace;
