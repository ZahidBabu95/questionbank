import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { 
    Book, Plus, Search, Library, UploadCloud, User, Building, 
    Calendar, CheckCircle, Edit2, Trash2, Image as ImageIcon, 
    ScanLine, Map, Clock, AlertCircle, X, ChevronRight, Share2, Globe, GraduationCap, Folder, Layers, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';

const bookTypesList = ['ALL', 'TEXTBOOK', 'GUIDE', 'QUESTION_BANK', 'LECTURE_SHEET'];

const ResourceLibrary = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilterType, setActiveFilterType] = useState('ALL');
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingBookId, setEditingBookId] = useState(null);
    
    // Pagination & Infinite Scroll State
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerTarget = useRef(null);

    const [portalTarget, setPortalTarget] = useState(null);
    const [hierarchy, setHierarchy] = useState({ streams: [], classes: [], subjects: [], classSubjects: [], levels: [] });
    
    // Main View Filters
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

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
        fetchSourceBooks();
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

    const [displayLimit, setDisplayLimit] = useState(12);

    // Auto-reset pagination limit when any filter changes
    useEffect(() => {
        setDisplayLimit(12);
    }, [searchQuery, activeFilterType, filterLevel, filterStream, filterClass, filterSubject]);

    const filteredBooks = useMemo(() => {
        return books.filter(b => {
            const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (b.authorName && b.authorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                 (b.publisher && b.publisher.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesType = activeFilterType === 'ALL' || b.bookType === activeFilterType;
            
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

            return matchesSearch && matchesType && matchesHierarchy;
        });
    }, [books, searchQuery, activeFilterType, filterLevel, filterStream, filterClass, filterSubject, hierarchy]);

    // Intersection Observer for Infinite Scrolling
    useEffect(() => {
        // observerTarget.current ডমে আসার জন্য এবং লোডিং শেষ হওয়ার জন্য অপেক্ষা করতে হবে
        if (isLoading || !observerTarget.current) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    // স্ক্রল যখন টার্গেটে পৌঁছাবে তখন ডিসপ্লে লিমিট বাড়িয়ে দেওয়া হবে
                    setDisplayLimit(prev => prev + 12);
                }
            },
            { rootMargin: '200px' } // কিছুটা আগে থেকেই লোড শুরু হবে স্মুথ এক্সপেরিয়েন্সের জন্য
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
    }, [isLoading, filteredBooks.length, displayLimit]); // এই ভেরিয়েবলগুলো চেঞ্জ হলে অবজারভার রিসেট হবে


    const fetchSourceBooks = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            const res = await axios.get('/v1/knowledge-hub/source-books');
            setBooks(res.data);
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
    const filteredClassSubjects = hierarchy.classSubjects?.filter(cs => !filterClass || cs._classId === filterClass) || [];

    return (
        <div className="w-full h-full flex flex-col bg-[#F8FAFC] relative font-satoshi min-h-screen">
            
            {/* ═══ Header Action Portal ═══ */}
            {portalTarget && createPortal(
                <div className="flex items-center gap-3">
                    <button 
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md md:shadow-lg shadow-indigo-200 transition-all active:scale-95 text-xs md:text-sm"
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span className="hidden md:inline">Register New Source</span>
                    </button>
                </div>,
                portalTarget
            )}

            {/* ═══ Hero Statistics Section ═══ */}
            <div className="px-6 pt-6 pb-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Library size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Books</p>
                            <h4 className="text-2xl font-black text-slate-800">{books.length}</h4>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Digitized</p>
                            <h4 className="text-2xl font-black text-slate-800">
                                {books.reduce((acc, curr) => acc + (curr.goldenPages || 0), 0)}
                            </h4>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                            <Layers size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">In Progress</p>
                            <h4 className="text-2xl font-black text-slate-800">
                                {books.filter(b => (b.extractedPages || 0) > (b.goldenPages || 0)).length}
                            </h4>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                            <h4 className="text-2xl font-black text-slate-800">
                                {books.filter(b => (b.totalPages || 0) === 0).length}
                            </h4>
                        </div>
                    </div>
                </div>

                {/* ═══ Professional Filters & Search ═══ */}
                <div className="sticky top-0 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 space-y-4">
                    <div className="flex flex-col xl:flex-row gap-4">
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
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
                                        const subjectName = hierarchy.subjects?.find(s => s.id === cs._subjectId)?.name || 'Unknown';
                                        return <option key={cs.id} value={cs.id}>{subjectName}</option>;
                                    })}
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
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors p-1">
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
                                className={`px-6 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-300 border ${
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
                            <Book className="text-slate-300" size={48} strokeWidth={1} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Library is Empty</h3>
                        <p className="text-slate-500 mt-2 max-w-sm font-medium mb-8">Start growing your knowledge hub by adding source books and materials.</p>
                        <button onClick={openCreateModal} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95">
                            Register Your First Book
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filteredBooks.slice(0, displayLimit).map((book, idx) => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05, duration: 0.5, type: "spring", stiffness: 100 }}
                                    key={book.id} 
                                    className="group relative flex flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.12)] hover:-translate-y-2 transition-all duration-500 overflow-hidden"
                                >
                                    {/* Action Header */}
                                    <div className="absolute top-4 right-4 flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 delay-75">
                                        <button onClick={(e) => openEditModal(book, e)} className="w-9 h-9 bg-white shadow-xl flex items-center justify-center rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all border border-slate-100">
                                            <Edit2 size={16} strokeWidth={2.5} />
                                        </button>
                                        <button onClick={(e) => handleDeleteBook(book.id, e)} className="w-9 h-9 bg-white shadow-xl flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-slate-100">
                                            <Trash2 size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    {/* Type & Sync Badges */}
                                    <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-1.5 pointer-events-none">
                                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border shadow-sm ${getBadgeStyle(book.bookType)}`}>
                                            {book.bookType.replace('_', ' ')}
                                        </span>
                                        {book.vectorizedChunks > 0 && (
                                            <motion.span 
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-indigo-500/30 border border-indigo-400/50"
                                            >
                                                <Sparkles size={10} strokeWidth={3} className="text-indigo-100" />
                                                <span>AI Synced</span>
                                            </motion.span>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        <div className="flex gap-6">
                                            {/* Book Cover 3D Effect */}
                                            <div className="w-[110px] sm:w-[130px] flex-shrink-0 relative group/cover">
                                                <div className="aspect-[3/4.2] rounded-xl overflow-hidden shadow-[10px_10px_25px_-10px_rgba(0,0,0,0.3)] group-hover/cover:shadow-[15px_15px_35px_-10px_rgba(79,70,229,0.4)] transition-all duration-500 bg-slate-100 border border-slate-200">
                                                    {book.coverImageUrl ? (
                                                        <img src={book.coverImageUrl} className="w-full h-full object-cover group-hover/cover:scale-110 transition-transform duration-700" alt={book.title} />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                                            <Book size={40} strokeWidth={1} />
                                                            <span className="text-[8px] font-black mt-2 opacity-50 uppercase tracking-tighter">No Preview</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Book Spine Shadow */}
                                                <div className="absolute top-0 left-0 w-2 h-full bg-black/10 z-10" />
                                            </div>

                                            <div className="flex-1 flex flex-col min-w-0">
                                            <div className="flex gap-2 mb-2">
                                                {book.language === 'English' && <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase border border-indigo-100 shadow-sm">EN</span>}
                                                {book.language === 'Bangla' && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase border border-emerald-100 shadow-sm">BN</span>}
                                                {(book.language === 'Bilingual' || book.language === 'Mixed') && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase border border-amber-100 shadow-sm">BI</span>}
                                            </div>
                                                
                                                <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 line-clamp-2 select-text" title={book.title}>
                                                    {book.title}
                                                </h3>
                                                
                                                <div className="space-y-1.5 mt-auto">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <User size={14} className="flex-shrink-0 text-slate-400" />
                                                        <p className="text-xs font-bold truncate tracking-tight">{book.authorName || 'No Author Info'}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Building size={14} className="flex-shrink-0 text-slate-400" />
                                                        <p className="text-xs font-bold truncate tracking-tight">{book.publisher || 'Unknown Publisher'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Digitization Progress */}
                                        <div className="mt-8 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 group/progress relative overflow-hidden">
                                            {book.isProcessing ? (
                                                <div className="absolute inset-0 bg-indigo-600 flex flex-col justify-center items-center z-10 px-4 text-center">
                                                    <div className="w-full flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                            Background Engine Active
                                                        </span>
                                                        <span className="text-xs font-black text-white">{book.processedPagesCount || 0}/{book.totalPagesToProcess || 0}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-indigo-900/50 rounded-full overflow-hidden flex">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${book.totalPagesToProcess > 0 ? ((book.processedPagesCount || 0) / book.totalPagesToProcess) * 100 : 0}%` }}
                                                            transition={{ duration: 0.5 }}
                                                            className="h-full bg-white relative overflow-hidden"
                                                        >
                                                            <div className="absolute inset-0 bg-white/50 w-full animate-[shimmer_1.5s_infinite] -translate-x-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)' }} />
                                                        </motion.div>
                                                    </div>
                                                    <p className="text-[9px] text-indigo-200 uppercase font-black tracking-widest mt-2">Uploading & Extracting Base Data...</p>
                                                </div>
                                            ) : null}

                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digitization Pulse</span>
                                                </div>
                                                <span className="text-xs font-black text-slate-800 whitespace-nowrap">
                                                    {book.goldenPages || 0} <span className="text-slate-300 mx-1">/</span> {book.totalPages || 0}
                                                </span>
                                            </div>
                                            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${book.totalPages > 0 ? ((book.goldenPages || 0) / book.totalPages) * 100 : 0}%` }}
                                                    transition={{ duration: 1, delay: idx * 0.1 }}
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 relative group-hover/progress:from-indigo-600 group-hover/progress:to-indigo-400 transition-all duration-500"
                                                />
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${book.totalPages > 0 ? (((book.extractedPages || 0) - (book.goldenPages || 0)) / book.totalPages) * 100 : 0}%` }}
                                                    transition={{ duration: 1, delay: idx * 0.1 + 0.2 }}
                                                    className="h-full bg-slate-300/50"
                                                />
                                            </div>
                                            <div className="mt-2 flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                <span>Golden Record</span>
                                                <span className="text-slate-800">{book.totalPages > 0 ? Math.round(((book.goldenPages || 0) / book.totalPages) * 100) : 0}%</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <div className="flex-1 bg-white border border-slate-200 p-2.5 rounded-xl text-center">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Academic Map</p>
                                                <p className="text-[10px] font-black text-slate-700 truncate">{book.mappedClassName || 'Global Repo'}</p>
                                            </div>
                                            <div className="flex-1 bg-white border border-slate-200 p-2.5 rounded-xl text-center">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Bookshelf</p>
                                                <p className="text-[10px] font-black text-slate-700 truncate">{book.bookType.charAt(0) + book.bookType.slice(1).toLowerCase()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footprints */}
                                    <div className="mt-auto grid grid-cols-2 p-4 pt-0 gap-3">
                                        <Link 
                                            to={`/knowledge-hub/digitization/${book.id}`} 
                                            target="_blank" rel="noopener noreferrer"
                                            className="group/scan bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300"
                                        >
                                            <ScanLine size={16} className="group-hover/scan:rotate-12 transition-transform" />
                                            <span className="text-xs font-black uppercase tracking-wider">Scans</span>
                                        </Link>
                                        <Link 
                                            to={`/knowledge-hub/proofreading/${book.id}`} 
                                            target="_blank" rel="noopener noreferrer"
                                            className="bg-indigo-600 hover:bg-slate-900 text-white px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-indigo-100 hover:shadow-none"
                                        >
                                            <Map size={16} />
                                            <span className="text-xs font-black uppercase tracking-wider">Focus</span>
                                        </Link>
                                    </div>
                                </motion.div>
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
            <AnimatePresence>
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={closeModal}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 40 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl relative z-[110] flex flex-col max-h-[95vh] border border-white/20"
                        >
                            {/* Modal Header */}
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
                                        <UploadCloud size={28} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                            {isEditMode ? 'Metadata Sync' : 'Intelligence Registration'}
                                        </h2>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Knowledge Hub Core Registry</p>
                                    </div>
                                </div>
                                <button onClick={closeModal} className="w-12 h-12 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full flex items-center justify-center transition-all active:scale-90">
                                    <X size={24} strokeWidth={3} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleCreateOrUpdateBook} onPaste={handleCoverPaste} className="flex-1 overflow-y-auto bg-white p-8 md:p-10 custom-scrollbar">
                                <div className="flex flex-col md:flex-row gap-12">
                                    
                                    {/* Left Shadow Box: Cover */}
                                    <div className="w-full md:w-[280px] shrink-0">
                                        <div className="sticky top-0 space-y-6">
                                            <div className="relative group">
                                                <div className="aspect-[3/4.2] bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 overflow-hidden shadow-inner flex flex-col items-center justify-center text-center transition-all duration-500 group-hover:border-indigo-400 p-4">
                                                    {formData.coverImageUrl ? (
                                                        <img src={formData.coverImageUrl} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                                                    ) : (
                                                        <div className="p-4 flex flex-col items-center gap-3">
                                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-200">
                                                                <ImageIcon size={32} />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                                                Drop Image Here<br/>or Paste URL
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Pro Upload Overlay */}
                                                    <label className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                                                        {isUploadingCover ? (
                                                            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <>
                                                                <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl mb-4 animate-bounce">
                                                                    <UploadCloud size={28} />
                                                                </div>
                                                                <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white">Upload New Cover</span>
                                                            </>
                                                        )}
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files[0] && uploadCoverImage(e.target.files[0])} />
                                                    </label>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Cover Link (Optional)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="https://..." 
                                                    value={formData.coverImageUrl} 
                                                    onChange={e => setFormData({...formData, coverImageUrl: e.target.value})} 
                                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-xs font-bold outline-none shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                     {/* Right Content Area */}
                                    <div className="flex-1 space-y-10 pb-10">
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                    <Map size={18} />
                                                </div>
                                                <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Curriculum Mapping</h3>
                                            </div>
                                            
                                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-5">
                                                <div className="flex items-center flex-wrap gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                    <DriveRoot size={14}/> <span>Knowledge Root</span>
                                                    {modalLevel && <><ChevronRight size={10}/> <span className="text-slate-900 bg-white px-2 py-1 rounded shadow-sm">{hierarchy.levels?.find(l=>l.id===modalLevel)?.name}</span></>}
                                                    {modalStream && <><ChevronRight size={10}/> <span className="text-slate-900 bg-white px-2 py-1 rounded shadow-sm">{hierarchy.streams?.find(s=>s.id===modalStream)?.name}</span></>}
                                                    {modalClass && <><ChevronRight size={10}/> <span className="text-slate-900 bg-white px-2 py-1 rounded shadow-sm">{hierarchy.classes?.find(c=>c.id===modalClass)?.name}</span></>}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <select value={modalLevel} onChange={e => {setModalLevel(e.target.value); setModalStream(''); setModalClass(''); setFormData({...formData, classSubjectId: ''});}} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all">
                                                        <option value="">Level</option>
                                                        {hierarchy.levels?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                    </select>
                                                    <select value={modalStream} onChange={e => {setModalStream(e.target.value); setModalClass(''); setFormData({...formData, classSubjectId: ''});}} disabled={!modalLevel} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all disabled:opacity-50">
                                                        <option value="">Stream</option>
                                                        {hierarchy.streams?.filter(s => !modalLevel || s._levelId === modalLevel).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                    <select value={modalClass} onChange={e => {setModalClass(e.target.value); setFormData({...formData, classSubjectId: ''});}} disabled={!modalLevel || (hierarchy.streams?.filter(s => s._levelId === modalLevel).length > 0 && !modalStream)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all disabled:opacity-50">
                                                        <option value="">Class</option>
                                                        {hierarchy.classes?.filter(c => !modalStream || c._streamId === modalStream).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                    <select value={formData.classSubjectId} onChange={e => setFormData({...formData, classSubjectId: e.target.value})} disabled={!modalClass} className="w-full px-4 py-3 bg-indigo-600 border border-indigo-600 rounded-2xl text-[11px] font-black text-white outline-none shadow-lg shadow-indigo-100 transition-all disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none">
                                                        <option value="">Target Subject</option>
                                                        {hierarchy.classSubjects?.filter(cs => cs._classId === modalClass).map(cs => (
                                                            <option key={cs.id} value={cs.id} className="text-slate-800 bg-white">
                                                                {hierarchy.subjects?.find(s => s.id === cs._subjectId)?.name || 'Unknown'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                                    <AlertCircle size={18} />
                                                </div>
                                                <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Base Identity</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="relative group">
                                                    <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Official Book Title</label>
                                                    <input required type="text" placeholder="e.g. পদার্থবিজ্ঞান ১ম পত্র (Class 11)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-3xl focus:border-indigo-500 text-base font-black text-slate-800 outline-none transition-all shadow-sm group-hover:border-slate-200"/>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    <div className="relative group">
                                                        <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Asset Type</label>
                                                        <select value={formData.bookType} onChange={e => setFormData({...formData, bookType: e.target.value})} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 text-sm font-black text-slate-700 outline-none transition-all appearance-none cursor-pointer">
                                                            <option value="TEXTBOOK">Standard Textbook</option>
                                                            <option value="GUIDE">Ref Guide / Solution</option>
                                                            <option value="QUESTION_BANK">Question Repository</option>
                                                            <option value="LECTURE_SHEET">Lecture Materials</option>
                                                        </select>
                                                    </div>
                                                    <div className="relative group">
                                                        <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Language Branch</label>
                                                        <select value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 text-sm font-black text-slate-700 outline-none transition-all appearance-none cursor-pointer">
                                                            <option value="Bangla">Bangla Medium</option>
                                                            <option value="English">English Medium</option>
                                                            <option value="Bilingual">Bilingual / Mixed</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                                    <Share2 size={18} />
                                                </div>
                                                <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Publication Intelligence</h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="relative group">
                                                    <User size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Primary Author</label>
                                                    <input type="text" placeholder="ড. শাহজাহান তপন" value={formData.authorName} onChange={e => setFormData({...formData, authorName: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-bold text-slate-800 outline-none shadow-sm"/>
                                                </div>
                                                <div className="relative group">
                                                    <Building size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Publisher</label>
                                                    <input type="text" placeholder="e.g. NCTB, হাসান বুকস" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-bold text-slate-800 outline-none shadow-sm"/>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="relative group">
                                                    <Calendar size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Initial Year</label>
                                                    <input type="text" placeholder="2015" value={formData.firstPublished} onChange={e => setFormData({...formData, firstPublished: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-bold text-slate-800 outline-none shadow-sm"/>
                                                </div>
                                                <div className="relative group">
                                                    <Clock size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Active Edition</label>
                                                    <input type="text" placeholder="25th Ed, 2024" value={formData.latestEdition} onChange={e => setFormData({...formData, latestEdition: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-bold text-slate-800 outline-none shadow-sm"/>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </form>

                            {/* Sticky Modal Footer */}
                            <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4 shrink-0">
                                <button type="button" onClick={closeModal} className="px-8 py-3.5 text-slate-500 hover:text-rose-500 font-black uppercase tracking-widest text-xs transition-colors">Discard Changes</button>
                                <button type="submit" onClick={handleCreateOrUpdateBook} disabled={isSaving || isUploadingCover || !formData.title.trim()} className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-slate-900 active:scale-95 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSaving ? <><span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></span> Syncing...</> : (isEditMode ? 'Commit Updates' : 'Initialize Book')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Custom Icon for Drive Root representation
const DriveRoot = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 7L12 12L4 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2"/>
    </svg>
);

export default ResourceLibrary;
