import React, { useState, useEffect, useMemo } from 'react';
import { 
    Book, RefreshCw, AlertCircle, CheckCircle, Database, Layers, 
    Search, Eye, Server, Activity, ArrowRight, ShieldCheck, 
    Zap, ListFilter, PlayCircle, BookOpen, Clock, FileText, ChevronRight, X, Sparkles, Map, User, Building
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import { knowledgeHubService } from '../../../services/knowledgeHubService';

const bookTypesList = ['ALL', 'TEXTBOOK', 'GUIDE', 'QUESTION_BANK', 'LECTURE_SHEET'];

const SyncLibrary = () => {
    const navigate = useNavigate();
    // Books & Hierarchy State
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hierarchy, setHierarchy] = useState({ streams: [], classes: [], subjects: [], classSubjects: [], levels: [] });
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilterType, setActiveFilterType] = useState('ALL');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterSyncPercent, setFilterSyncPercent] = useState('ALL');
    
    // Command Center Modal State
    const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [syncIntegrity, setSyncIntegrity] = useState(null);
    const [indices, setIndices] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [previewMarkdown, setPreviewMarkdown] = useState('');
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        const cached = knowledgeHubService.getCachedBooks();
        if (cached) {
            setBooks(cached);
            setIsLoading(false);
        }
        fetchSourceBooks(!!cached);
        academicService.getHierarchy().then(setHierarchy).catch(console.error);
    }, []);

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

    const filteredBooks = useMemo(() => {
        return books.filter(b => {
            const syncPercent = b.totalPages > 0 ? Math.round(((b.goldenPages || 0) / b.totalPages) * 100) : 0;
            
            let matchesSyncPercent = true;
            if (filterSyncPercent !== 'ALL') {
                if (filterSyncPercent === '0-25') matchesSyncPercent = syncPercent >= 0 && syncPercent <= 25;
                else if (filterSyncPercent === '26-50') matchesSyncPercent = syncPercent > 25 && syncPercent <= 50;
                else if (filterSyncPercent === '51-75') matchesSyncPercent = syncPercent > 50 && syncPercent <= 75;
                else if (filterSyncPercent === '76-99') matchesSyncPercent = syncPercent > 75 && syncPercent < 100;
                else if (filterSyncPercent === '100') matchesSyncPercent = syncPercent === 100;
            }

            // If ALL is selected, preserve the original behavior of hiding books with 0 pages synced
            if (filterSyncPercent === 'ALL' && (!b.goldenPages || b.goldenPages === 0)) return false;

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

            return matchesSearch && matchesType && matchesHierarchy && matchesSyncPercent;
        });
    }, [books, searchQuery, activeFilterType, filterLevel, filterStream, filterClass, filterSubject, filterSyncPercent, hierarchy]);

    const openCommandCenter = async (book) => {
        setSelectedBook(book);
        setIsCommandCenterOpen(true);
        setSelectedChapter(null);
        setPreviewMarkdown('');
        setSyncIntegrity(null);
        setIndices([]);
        
        try {
            setLoadingDetails(true);
            const [integrityRes, indicesRes] = await Promise.all([
                axios.get(`/v1/knowledge-hub/source-books/${book.id}/sync-integrity?t=${Date.now()}`),
                axios.get(`/v1/knowledge-hub/source-books/${book.id}/indices?t=${Date.now()}`)
            ]);
            setSyncIntegrity(integrityRes.data);
            setIndices(indicesRes.data);
            
            if (indicesRes.data.length > 0) {
                handleSelectChapter(book.id, indicesRes.data[0]);
            }
        } catch (error) {
            console.error("Failed to load book sync details", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleSelectChapter = async (bookId, chapter) => {
        setSelectedChapter(chapter);
        setPreviewMarkdown('');
        try {
            setLoadingPreview(true);
            const res = await axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices/${chapter.id}/vector-preview?t=${Date.now()}`);
            setPreviewMarkdown(res.data.markdown || '# No Content');
        } catch (error) {
            console.error("Failed to fetch preview", error);
            setPreviewMarkdown('# Error Loading Data');
        } finally {
            setLoadingPreview(false);
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
            {/* ═══ Header Statistics Section ═══ */}
            <div className="px-6 pt-6 pb-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Server size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available Sources</p>
                            <h4 className="text-2xl font-black text-slate-800">{books.length}</h4>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <Database size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fully Vectorized</p>
                            <h4 className="text-2xl font-black text-slate-800">
                                {books.filter(b => b.totalPages > 0 && b.goldenPages === b.totalPages).length}
                            </h4>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Partial Sync</p>
                            <h4 className="text-2xl font-black text-slate-800">
                                {books.filter(b => b.totalPages > 0 && b.goldenPages < b.totalPages && b.goldenPages > 0).length}
                            </h4>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unsynchronized</p>
                            <h4 className="text-2xl font-black text-slate-800">
                                {books.filter(b => b.totalPages === 0 || b.goldenPages === 0).length}
                            </h4>
                        </div>
                    </div>
                </div>

                {/* ═══ Professional Filters & Search ═══ */}
                <div className="sticky top-0 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 space-y-4">
                    <div className="flex flex-col xl:flex-row gap-4">
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-3">
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
                            <div className="relative">
                                <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Sync Progress</span>
                                <select 
                                    value={filterSyncPercent} 
                                    onChange={e => setFilterSyncPercent(e.target.value)} 
                                    className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="ALL">All Progress</option>
                                    <option value="0-25">0% - 25%</option>
                                    <option value="26-50">26% - 50%</option>
                                    <option value="51-75">51% - 75%</option>
                                    <option value="76-99">76% - 99%</option>
                                    <option value="100">100% Completed</option>
                                </select>
                            </div>
                        </div>

                        <div className="relative w-full xl:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search books..." 
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

            {/* ═══ Main Books Grid ═══ */}
            <div className="px-6 pb-20">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Fetching Sync Data...</p>
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] py-32 text-center flex flex-col items-center justify-center shadow-inner mt-4">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
                            <Server className="text-slate-300" size={48} strokeWidth={1} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">No Results Found</h3>
                        <p className="text-slate-500 mt-2 max-w-sm font-medium">Adjust your filters or try a different search query.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                        <AnimatePresence mode="popLayout">
                            {filteredBooks.map((book, idx) => (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05, duration: 0.5, type: "spring", stiffness: 100 }}
                                    key={book.id} 
                                    onClick={() => navigate(`/knowledge-hub/sync-command-center/${book.id}`)}
                                    className="group relative flex flex-col bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_-15px_rgba(79,70,229,0.12)] hover:-translate-y-2 transition-all duration-500 overflow-hidden cursor-pointer"
                                >
                                    {/* Type & Sync Badges */}
                                    <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-1.5 pointer-events-none">
                                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border shadow-sm ${getBadgeStyle(book.bookType)}`}>
                                            {book.bookType.replace('_', ' ')}
                                        </span>
                                        {book.vectorizedChunks > 0 && (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-indigo-500/30 border border-indigo-400/50">
                                                <Sparkles size={10} strokeWidth={3} className="text-indigo-100" />
                                                <span>AI Synced</span>
                                            </span>
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
                                                <div className="absolute top-0 left-0 w-2 h-full bg-black/10 z-10" />
                                            </div>

                                            <div className="flex-1 flex flex-col min-w-0">
                                                <div className="flex gap-2 mb-2">
                                                    {book.language === 'English' && <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase border border-indigo-100 shadow-sm">EN</span>}
                                                    {book.language === 'Bangla' && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase border border-emerald-100 shadow-sm">BN</span>}
                                                    {(book.language === 'Bilingual' || book.language === 'Mixed') && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase border border-amber-100 shadow-sm">BI</span>}
                                                </div>
                                                
                                                <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 line-clamp-2" title={book.title}>
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

                                        {/* Vector Sync Progress */}
                                        <div className="mt-8 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 group/progress relative overflow-hidden">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vector Synced</span>
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
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                                                />
                                            </div>
                                            <div className="mt-2 flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                <span>Integrity Match</span>
                                                <span className="text-slate-800">{book.totalPages > 0 ? Math.round(((book.goldenPages || 0) / book.totalPages) * 100) : 0}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto bg-slate-900 text-white px-4 py-3.5 flex items-center justify-center gap-2 transition-all duration-300 group-hover:bg-indigo-600">
                                        <Server size={16} />
                                        <span className="text-xs font-black uppercase tracking-wider">Open Command Center</span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SyncLibrary;
