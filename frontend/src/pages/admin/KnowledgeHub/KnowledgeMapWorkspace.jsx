import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Layers, CheckCircle, Database, Search, Target, Filter } from 'lucide-react';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';

const KnowledgeMapWorkspace = () => {
    const { id: bookId } = useParams();
    const [loading, setLoading] = useState(true);
    const [bookDetails, setBookDetails] = useState(null);
    const [indices, setIndices] = useState([]); // Tree B
    
    // Tree A data
    const [chapters, setChapters] = useState([]);
    const [topicsByChapter, setTopicsByChapter] = useState({});

    // UI state
    const [savingId, setSavingId] = useState(null);
    const [portalTarget, setPortalTarget] = useState(null);

    // Filters and Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, MAPPED, UNMAPPED
    const [selectedIndices, setSelectedIndices] = useState(new Set());
    const [isBulkCreating, setIsBulkCreating] = useState(false);
    const [isAutoAssigning, setIsAutoAssigning] = useState(false);

    const fetchIndicesData = async () => {
        const indicesRes = await axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices`);
        setIndices(indicesRes.data);
    };

    useEffect(() => {
        setPortalTarget(document.getElementById('topbar-actions'));
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch book details
                const bookRes = await axios.get(`/v1/knowledge-hub/source-books/${bookId}`);
                const bookInfo = bookRes.data;
                setBookDetails(bookInfo);

                // Fetch Tree B (Book indices)
                await fetchIndicesData();

                // If book has a classSubjectId mapped, fetch Tree A
                if (bookInfo.classSubjectId) {
                    const chapterRes = await academicService.getChaptersByClassSubject(bookInfo.classSubjectId);
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
            const chapterRes = await academicService.getChaptersByClassSubject(classSubjectId);
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
            const newChData = { name: chapterName, chapterNumber: suggestedNum };
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
                const newChData = { name: idx.indexName, chapterNumber: baseChapterNum };
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
        if (!window.confirm("Are you sure you want to auto-assign all matching PDF pages to these indices? This will calculate ending pages first.")) return;
        try {
            setIsAutoAssigning(true);
            await axios.post(`/v1/knowledge-hub/source-books/${bookId}/auto-assign-indices`);
            alert("Pages assigned successfully! They will now show up in Proofreading Workspace organized by Chapter.");
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
                                    {bookDetails.pdfPageOffset !== null && bookDetails.pdfPageOffset !== 0 && (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 uppercase tracking-wider border border-amber-200">
                                            Page Offset: +{bookDetails.pdfPageOffset}
                                        </span>
                                    )}
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

                    {/* Mapping List */}
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
                                                    />
                                                </div>
                                                {(idx.startPage || idx.endPage) && (
                                                    <div className="flex items-center gap-1 pt-1 border-t border-slate-100/60 text-[9px] font-bold font-mono">
                                                        <span className="uppercase w-7 text-indigo-500">PDF</span>
                                                        <input 
                                                            type="number" 
                                                            className="w-12 h-6 text-[11px] font-mono text-center bg-indigo-50/50 border border-indigo-200 text-indigo-700 rounded hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-colors"
                                                            value={idx.startPage ? (idx.startPage + (bookDetails.pdfPageOffset || 0)) : ''} 
                                                            placeholder="?"
                                                            title="Change PDF Page to Auto-Calculate Offset"
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
                                                        />
                                                        <span className="text-indigo-200 text-xs">-</span>
                                                        <span className="w-12 h-6 flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-500 rounded">
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
                                                            <optgroup key={ch.id} label={`Chapter ${ch.chapterNumber}: ${ch.name}`}>
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
            </div>
        </>
    );
};

export default KnowledgeMapWorkspace;
