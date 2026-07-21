import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    Plus, Search, Library, X
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import { knowledgeHubService } from '../../../services/knowledgeHubService';
import useDebounce from '../../../hooks/useDebounce';
import LibraryStats from './components/LibraryStats';
import BookCard from './components/BookCard';
import BookRegistryModal from './components/BookRegistryModal';

const bookTypesList = ['ALL', 'TEXTBOOK', 'GUIDE', 'QUESTION_BANK', 'LECTURE_SHEET'];

const ResourceLibrary = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [activeFilterType, setActiveFilterType] = useState('ALL');
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingBookId, setEditingBookId] = useState(null);
    
    // Pagination & Infinite Scroll State
    const [displayLimit, setDisplayLimit] = useState(12);
    const observerTarget = useRef(null);

    const [portalTarget, setPortalTarget] = useState(null);
    const [hierarchy, setHierarchy] = useState({ streams: [], classes: [], subjects: [], classSubjects: [], levels: [] });
    
    // Main View Filters
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterSyncPercent, setFilterSyncPercent] = useState('ALL');
    const [filterExtractPercent, setFilterExtractPercent] = useState('ALL');
    const [filterMedium, setFilterMedium] = useState('ALL'); // ALL, Bangla, English, Bilingual, MISMATCHED

    const subjectLanguageMap = useMemo(() => {
        const map = {};
        if (!hierarchy.classSubjects || !hierarchy.subjects) return map;
        hierarchy.classSubjects.forEach(cs => {
            const subject = hierarchy.subjects.find(s => s.id === cs._subjectId);
            if (subject) {
                map[cs.id] = {
                    name: subject.name || '',
                    isEnglish: subject.isEnglishVersion || subject.englishVersion || false
                };
            }
        });
        return map;
    }, [hierarchy.classSubjects, hierarchy.subjects]);

    const hasLanguageMismatch = (book) => {
        if (!book.classSubjectId || !subjectLanguageMap) return false;
        const subData = subjectLanguageMap[book.classSubjectId];
        if (!subData) return false;
        const isSubjectEnglish = subData.isEnglish;
        if (book.language === 'English' && !isSubjectEnglish) return true;
        if (book.language === 'Bangla' && isSubjectEnglish) return true;
        return false;
    };

    // Modal Mapping Filters
    const [modalLevel, setModalLevel] = useState('');
    const [modalStream, setModalStream] = useState('');
    const [modalClass, setModalClass] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        authorName: '',
        publisher: '',
        coverImageUrl: '',
        firstPublished: '',
        latestEdition: '',
        bookType: 'TEXTBOOK',
        language: 'Bangla',
        classSubjectId: ''
    });

    useEffect(() => {
        setPortalTarget(document.getElementById('topbar-actions'));
        
        // Stale-While-Revalidate pattern
        const cached = knowledgeHubService.getCachedBooks();
        if (cached) {
            setBooks(cached);
            setIsLoading(false);
        }
        
        fetchSourceBooks(!!cached);
        academicService.getHierarchy().then(setHierarchy).catch(console.error);
    }, []);

    // Polling background processor status
    useEffect(() => {
        const hasProcessingBooks = books.some(b => b.isProcessing);
        if (hasProcessingBooks) {
            const interval = setInterval(() => {
                fetchSourceBooks(true); // pass true to indicate silent background fetch
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [books]);

    // Auto-reset pagination limit when any filter changes
    useEffect(() => {
        setDisplayLimit(12);
    }, [debouncedSearchQuery, activeFilterType, filterLevel, filterStream, filterClass, filterSubject, filterSyncPercent, filterExtractPercent, filterMedium]);

    const filteredBooks = useMemo(() => {
        return books.filter(b => {
            const matchesSearch = b.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
                                 (b.authorName && b.authorName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) ||
                                 (b.publisher && b.publisher.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));
            const matchesType = activeFilterType === 'ALL' || b.bookType === activeFilterType;
            
            const syncPercent = b.totalPages > 0 ? Math.round(((b.goldenPages || 0) / b.totalPages) * 100) : 0;
            let matchesSyncPercent = true;
            if (filterSyncPercent !== 'ALL') {
                if (filterSyncPercent === '0-25') matchesSyncPercent = syncPercent >= 0 && syncPercent <= 25;
                else if (filterSyncPercent === '26-50') matchesSyncPercent = syncPercent > 25 && syncPercent <= 50;
                else if (filterSyncPercent === '51-75') matchesSyncPercent = syncPercent > 50 && syncPercent <= 75;
                else if (filterSyncPercent === '76-99') matchesSyncPercent = syncPercent > 75 && syncPercent < 100;
                else if (filterSyncPercent === '100') matchesSyncPercent = syncPercent === 100;
            }

            const extractPercent = b.totalPages > 0 ? Math.round(((b.extractedPages || 0) / b.totalPages) * 100) : 0;
            let matchesExtractPercent = true;
            if (filterExtractPercent !== 'ALL') {
                if (filterExtractPercent === '0-25') matchesExtractPercent = extractPercent >= 0 && extractPercent <= 25;
                else if (filterExtractPercent === '26-50') matchesExtractPercent = extractPercent > 25 && extractPercent <= 50;
                else if (filterExtractPercent === '51-75') matchesExtractPercent = extractPercent > 50 && extractPercent <= 75;
                else if (filterExtractPercent === '76-99') matchesExtractPercent = extractPercent > 75 && extractPercent < 100;
                else if (filterExtractPercent === '100') matchesExtractPercent = extractPercent === 100;
            }
            
            let matchesHierarchy = true;
            if (filterSubject) {
                matchesHierarchy = b.classSubjectId === filterSubject;
            } else if (filterClass) {
                const validSubjectsForClass = hierarchy.classSubjects?.filter(cs => cs._classId === filterClass).map(cs => cs.id) || [];
                matchesHierarchy = validSubjectsForClass.includes(b.classSubjectId);
            } else if (filterStream) {
                const validClasses = hierarchy.classes?.filter(c => c._streamId === filterStream).map(c => c.id) || [];
                const validSubjects = hierarchy.classSubjects?.filter(cs => validClasses.includes(cs._classId)).map(cs => cs.id) || [];
                matchesHierarchy = validSubjects.includes(b.classSubjectId);
            } else if (filterLevel) {
                const validStreams = hierarchy.streams?.filter(s => s._levelId === filterLevel).map(s => s.id) || [];
                const validClasses = hierarchy.classes?.filter(c => validStreams.includes(c._streamId)).map(c => c.id) || [];
                const validSubjects = hierarchy.classSubjects?.filter(cs => validClasses.includes(cs._classId)).map(cs => cs.id) || [];
                matchesHierarchy = validSubjects.includes(b.classSubjectId);
            }

            // Medium Filter
            let matchesMedium = true;
            if (filterMedium !== 'ALL') {
                if (filterMedium === 'MISMATCHED') {
                    matchesMedium = hasLanguageMismatch(b);
                } else {
                    matchesMedium = b.language === filterMedium;
                }
            }

            return matchesSearch && matchesType && matchesHierarchy && matchesSyncPercent && matchesExtractPercent && matchesMedium;
        });
    }, [books, debouncedSearchQuery, activeFilterType, filterLevel, filterStream, filterClass, filterSubject, filterSyncPercent, filterExtractPercent, filterMedium, hierarchy]);

    const filteredClassSubjectsForModal = useMemo(() => {
        if (!modalClass || !hierarchy.classSubjects) return [];
        
        return hierarchy.classSubjects.filter(cs => {
            if (cs._classId !== modalClass) return false;
            
            const subData = subjectLanguageMap[cs.id];
            if (!subData) return true; // Safety fallback
            
            const isSubjectEnglish = subData.isEnglish;
            
            if (formData.language === 'English') {
                return isSubjectEnglish === true;
            } else if (formData.language === 'Bangla') {
                return isSubjectEnglish === false;
            }
            return true; // Bilingual/Mixed shows both
        });
    }, [modalClass, hierarchy.classSubjects, formData.language, subjectLanguageMap]);

    // Intersection Observer for Infinite Scrolling
    useEffect(() => {
        if (isLoading || !observerTarget.current) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    setDisplayLimit(prev => prev + 12);
                }
            },
            { rootMargin: '200px' }
        );
        
        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }
        
        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
            observer.disconnect();
        };
    }, [isLoading, filteredBooks.length, displayLimit]);

    const fetchSourceBooks = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            const data = await knowledgeHubService.getSourceBooks(isSilent);
            setBooks(data);
        } catch (error) {
            console.error('Failed to fetch source books:', error);
        } finally {
            if (!isSilent) setIsLoading(false);
        }
    };

    const handleCreateOrUpdateBook = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            if(isEditMode && editingBookId) {
                await axios.put(`/v1/knowledge-hub/source-books/${editingBookId}`, formData);
            } else {
                await axios.post('/v1/knowledge-hub/source-books', formData);
            }
            knowledgeHubService.clearCache(); // Evict cache
            closeModal();
            fetchSourceBooks();
        } catch (error) {
            alert('Failed to save source book: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBook = async (id, e) => {
        if(e) { e.preventDefault(); e.stopPropagation(); }
        if(!window.confirm("আপনি কি নিশ্চিত যে এই বইটি মুছে ফেলতে চান? এর সকল ডেটা হারিয়ে যাবে।")) return;
        try {
            await axios.delete(`/v1/knowledge-hub/source-books/${id}`);
            knowledgeHubService.clearCache(); // Evict cache
            setBooks(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            alert('Failed to delete book: ' + (error.response?.data?.message || error.message));
        }
    };

    const openCreateModal = () => {
        setFormData({ title: '', authorName: '', publisher: '', coverImageUrl: '', firstPublished: '', latestEdition: '', bookType: 'TEXTBOOK', language: 'Bangla', classSubjectId: '' });
        setIsEditMode(false);
        setEditingBookId(null);
        setModalLevel('');
        setModalStream('');
        setModalClass('');
        setIsAddModalOpen(true);
    };

    const openEditModal = (book, e) => {
        if(e) e.preventDefault();
        setFormData({
            title: book.title || '',
            authorName: book.authorName || '',
            publisher: book.publisher || '',
            coverImageUrl: book.coverImageUrl || '',
            firstPublished: book.firstPublished || '',
            latestEdition: book.latestEdition || '',
            bookType: book.bookType || 'TEXTBOOK',
            language: book.language || 'Bangla',
            classSubjectId: book.classSubjectId || ''
        });

        // Smart Backtrace for Modal
        if (book.classSubjectId) {
            const cs = hierarchy.classSubjects?.find(c => c.id === book.classSubjectId);
            if (cs) {
                setModalClass(cs._classId || '');
                const cl = hierarchy.classes?.find(x => x.id === cs._classId);
                if (cl) {
                    setModalStream(cl._streamId || '');
                    const st = hierarchy.streams?.find(x => x.id === cl._streamId);
                    if (st) {
                        setModalLevel(st._levelId || '');
                    } else if (cl._levelId) {
                        setModalLevel(cl._levelId || '');
                    } else { setModalLevel(''); }
                } else { setModalStream(''); setModalLevel(''); }
            } else { setModalClass(''); setModalStream(''); setModalLevel(''); }
        } else {
            setModalLevel('');
            setModalStream('');
            setModalClass('');
        }

        setIsEditMode(true);
        setEditingBookId(book.id);
        setIsAddModalOpen(true);
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setIsEditMode(false);
        setEditingBookId(null);
        setModalLevel('');
        setModalStream('');
        setModalClass('');
        setFormData({ title: '', authorName: '', publisher: '', coverImageUrl: '', firstPublished: '', latestEdition: '', bookType: 'TEXTBOOK', language: 'Bangla', classSubjectId: '' });
    };

    const handleCoverPaste = async (e) => {
        const items = e.clipboardData?.items;
        if(!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if(file) uploadCoverImage(file);
                return;
            }
        }
    };

    const uploadCoverImage = async (file) => {
        setIsUploadingCover(true);
        const uploadData = new FormData();
        uploadData.append('file', file);
        try {
            const response = await axios.post('/v1/knowledge-hub/upload-image', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.url) {
                setFormData(prev => ({...prev, coverImageUrl: response.data.url}));
            }
        } catch (error) {
            alert("Cover Upload Failed: " + error.message);
        } finally {
            setIsUploadingCover(false);
        }
    };

    const getBadgeStyle = (type) => {
        switch (type) {
            case 'TEXTBOOK': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'GUIDE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'QUESTION_BANK': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'LECTURE_SHEET': return 'bg-amber-100 text-amber-800 border-amber-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const filteredStreams = hierarchy.streams?.filter(s => !filterLevel || s._levelId === filterLevel) || [];
    const filteredClasses = hierarchy.classes?.filter(c => !filterStream || c._streamId === filterStream) || [];
    const filteredClassSubjects = useMemo(() => {
        if (!hierarchy.classSubjects) return [];
        return hierarchy.classSubjects.filter(cs => {
            if (filterClass && cs._classId !== filterClass) return false;
            
            const subData = subjectLanguageMap[cs.id];
            if (!subData) return true;
            
            const isSubjectEnglish = subData.isEnglish;
            if (filterMedium === 'English') {
                return isSubjectEnglish === true;
            } else if (filterMedium === 'Bangla') {
                return isSubjectEnglish === false;
            }
            return true;
        });
    }, [hierarchy.classSubjects, filterClass, filterMedium, subjectLanguageMap]);

    return (
        <div className="w-full h-full flex flex-col bg-[#F8FAFC] relative font-satoshi min-h-screen">
            
            {/* ═══ Header Action Portal ═══ */}
            {portalTarget && createPortal(
                <div className="flex items-center gap-3">
                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md md:shadow-lg shadow-indigo-200 transition-all active:scale-95 text-xs md:text-sm cursor-pointer"
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span className="hidden md:inline">Register New Source</span>
                    </button>
                </div>,
                portalTarget
            )}

            {/* ═══ Hero Statistics Section ═══ */}
            <div className="px-6 pt-6 pb-2">
                <LibraryStats books={books} />

                {/* ═══ Professional Filters & Search ═══ */}
                <div className="sticky top-0 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 space-y-4">
                    <div className="flex flex-col xl:flex-row gap-4">
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                            <div className="relative">
                                <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Version</span>
                                <select 
                                    value={filterMedium} 
                                    onChange={e => setFilterMedium(e.target.value)} 
                                    className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All Versions</option>
                                    <option value="Bangla">Bangla Version</option>
                                    <option value="English">English Version</option>
                                    <option value="Bilingual">Bilingual / Mixed</option>
                                </select>
                            </div>
                            <div className="relative">
                                <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Level</span>
                                <select 
                                    value={filterLevel} 
                                    onChange={e => { setFilterLevel(e.target.value); setFilterStream(''); setFilterClass(''); setFilterSubject(''); }} 
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">All Levels</option>
                                    {hierarchy.levels?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Stream</span>
                                <select 
                                    value={filterStream} 
                                    onChange={e => { setFilterStream(e.target.value); setFilterClass(''); setFilterSubject(''); }} 
                                    disabled={!filterLevel || filteredStreams.length === 0}
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none disabled:opacity-50 cursor-pointer"
                                >
                                    <option value="">All Streams</option>
                                    {filteredStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Class</span>
                                <select 
                                    value={filterClass} 
                                    onChange={e => { setFilterClass(e.target.value); setFilterSubject(''); }} 
                                    disabled={!filterLevel || (filteredStreams.length > 0 && !filterStream)}
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none disabled:opacity-50 cursor-pointer"
                                >
                                    <option value="">All Classes</option>
                                    {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="relative">
                                <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Subject</span>
                                <select 
                                    value={filterSubject} 
                                    onChange={e => setFilterSubject(e.target.value)} 
                                    disabled={!filterClass}
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none disabled:opacity-50 cursor-pointer"
                                >
                                    <option value="">All Subjects</option>
                                     {filteredClassSubjects.map(cs => {
                                         const subData = subjectLanguageMap[cs.id];
                                         return <option key={cs.id} value={cs.id}>{subData?.name || 'Unknown'} {subData?.isEnglish ? '[EN]' : '[BN]'}</option>;
                                     })}
                                </select>
                            </div>
                            <div className="relative">
                                <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Extraction</span>
                                <select 
                                    value={filterExtractPercent} 
                                    onChange={e => setFilterExtractPercent(e.target.value)} 
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All Extracted</option>
                                    <option value="0-25">0% - 25%</option>
                                    <option value="26-50">26% - 50%</option>
                                    <option value="51-75">51% - 75%</option>
                                    <option value="76-99">76% - 99%</option>
                                    <option value="100">100% Extracted</option>
                                </select>
                            </div>
                            <div className="relative">
                                <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Golden Sync</span>
                                <select 
                                    value={filterSyncPercent} 
                                    onChange={e => setFilterSyncPercent(e.target.value)} 
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All Synced</option>
                                    <option value="0-25">0% - 25%</option>
                                    <option value="26-50">26% - 50%</option>
                                    <option value="51-75">51% - 75%</option>
                                    <option value="76-99">76% - 99%</option>
                                    <option value="100">100% Synced</option>
                                </select>
                            </div>
                        </div>

                        <div className="relative w-full xl:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search books, authors, publishers..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-bold shadow-sm placeholder:text-slate-400"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer">
                                    <X size={18} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 pb-2 overflow-x-auto hide-scrollbar">
                        {bookTypesList.map(type => (
                            <button
                                key={type}
                                onClick={() => setActiveFilterType(type)}
                                className={`px-6 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-300 border cursor-pointer ${
                                    activeFilterType === type 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200 scale-105' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                            >
                                {type.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ Main Books Repository Grid ═══ */}
            <div className="px-6 pb-20">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Intelligence...</p>
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] py-32 text-center flex flex-col items-center justify-center shadow-inner mt-4">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
                            <Library className="text-slate-300" size={48} strokeWidth={1} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Library is Empty</h3>
                        <p className="text-slate-500 mt-2 max-w-sm font-medium mb-8">Start growing your knowledge hub by adding source books and materials.</p>
                        <button onClick={openCreateModal} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95 cursor-pointer">
                            Register Your First Book
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filteredBooks.slice(0, displayLimit).map((book, idx) => (
                                <BookCard
                                    key={book.id}
                                    book={book}
                                    idx={idx}
                                    openEditModal={openEditModal}
                                    handleDeleteBook={handleDeleteBook}
                                    getBadgeStyle={getBadgeStyle}
                                    hasLanguageMismatch={hasLanguageMismatch}
                                />
                            ))}
                        </AnimatePresence>
                        
                        {/* Infinite Scroll Signal Area */}
                        {displayLimit < filteredBooks.length && (
                            <div ref={observerTarget} className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Decoding More Intelligence</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ Premium Modal Logic Layer ═══ */}
            <BookRegistryModal
                isOpen={isAddModalOpen}
                isEditMode={isEditMode}
                closeModal={closeModal}
                formData={formData}
                setFormData={setFormData}
                isSaving={isSaving}
                isUploadingCover={isUploadingCover}
                uploadCoverImage={uploadCoverImage}
                handleCreateOrUpdateBook={handleCreateOrUpdateBook}
                handleCoverPaste={handleCoverPaste}
                hierarchy={hierarchy}
                modalLevel={modalLevel}
                setModalLevel={setModalLevel}
                modalStream={modalStream}
                setModalStream={setModalStream}
                modalClass={modalClass}
                setModalClass={setModalClass}
                filteredClassSubjectsForModal={filteredClassSubjectsForModal}
                subjectLanguageMap={subjectLanguageMap}
            />
        </div>
    );
};

export default ResourceLibrary;
