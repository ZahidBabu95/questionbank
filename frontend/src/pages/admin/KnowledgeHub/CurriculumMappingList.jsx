import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { BookOpen, Search, Layers, ChevronRight, BookText } from 'lucide-react';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import { knowledgeHubService } from '../../../services/knowledgeHubService';

const bookTypesList = ['ALL', 'TEXTBOOK', 'GUIDE', 'QUESTION_BANK', 'LECTURE_SHEET'];

const CurriculumMappingList = () => {
    const [books, setBooks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilterType, setActiveFilterType] = useState('ALL');
    const [portalTarget, setPortalTarget] = useState(null);
    const [hierarchy, setHierarchy] = useState({ streams: [], classes: [], subjects: [], classSubjects: [], levels: [] });

    // Main View Filters
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');

    useEffect(() => {
        setPortalTarget(document.getElementById('topbar-actions'));
        const cached = knowledgeHubService.getCachedBooks();
        if (cached) {
            setBooks(cached || []);
            setIsLoading(false);
        }
        fetchBooks(!!cached);
        academicService.getHierarchy().then(setHierarchy).catch(console.error);
    }, []);

    const fetchBooks = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            const data = await knowledgeHubService.getSourceBooks(isSilent);
            setBooks(data || []);
        } catch (error) {
            console.error("Failed to fetch books", error);
        } finally {
            if (!isSilent) setIsLoading(false);
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

    const filteredBooks = books.filter(b => {
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

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 relative font-satoshi px-4 pb-4 pt-2 md:px-5 md:pb-5 md:pt-3 lg:px-6 lg:pb-6 lg:pt-4 max-w-[1700px] mx-auto space-y-4 md:space-y-5">
            {portalTarget && createPortal(
                <div className="flex gap-2">
                    {bookTypesList.map(type => (
                        <button 
                            key={type}
                            onClick={() => setActiveFilterType(type)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeFilterType === type 
                                ? 'bg-slate-800 text-white shadow-md' 
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {type.replace('_', ' ')}
                        </button>
                    ))}
                </div>,
                portalTarget
            )}

            {/* Smart Toolbar & Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-3 w-full bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-1 flex-wrap lg:flex-nowrap gap-3">
                        <select 
                            value={filterLevel} 
                            onChange={e => { setFilterLevel(e.target.value); setFilterStream(''); setFilterClass(''); setFilterSubject(''); }} 
                            className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">All Levels (স্তর)</option>
                            {hierarchy.levels?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <select 
                            value={filterStream} 
                            onChange={e => { setFilterStream(e.target.value); setFilterClass(''); setFilterSubject(''); }} 
                            disabled={!filterLevel || filteredStreams.length === 0}
                            className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                        >
                            <option value="">All Streams (শাখা)</option>
                            {filteredStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select 
                            value={filterClass} 
                            onChange={e => { setFilterClass(e.target.value); setFilterSubject(''); }} 
                            disabled={!filterLevel || (filteredStreams.length > 0 && !filterStream)}
                            className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                        >
                            <option value="">All Classes (শ্রেণি)</option>
                            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select 
                            value={filterSubject} 
                            onChange={e => setFilterSubject(e.target.value)} 
                            disabled={!filterClass}
                            className="flex-1 min-w-[120px] bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                        >
                            <option value="">All Subjects (বিষয়)</option>
                            {filteredClassSubjects.map(cs => {
                                const subjectName = hierarchy.subjects?.find(s => s.id === cs._subjectId)?.name || 'Unknown';
                                return <option key={cs.id} value={cs.id}>{subjectName}</option>;
                            })}
                        </select>
                    </div>

                    <div className="relative w-full lg:w-80 xl:w-96 flex-shrink-0 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search books..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-sm font-medium outline-none placeholder:text-slate-400"
                        />
                    </div>
                </div>
            </div>

            {/* Content List */}
            {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium mt-4">Loading Library...</p>
                </div>
            ) : filteredBooks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[400px]">
                    <BookText size={48} className="text-slate-300 mb-4" strokeWidth={1} />
                    <h3 className="text-lg font-bold text-slate-700">No Books Found</h3>
                    <p className="text-slate-500 mb-6 text-sm text-center max-w-sm">
                        You need to create a source book in the Resource Library before mapping.
                    </p>
                    <Link to="/knowledge-hub/library">
                        <button className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow hover:bg-indigo-700 transition">
                            Go to Resource Library
                        </button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                    {filteredBooks.map(book => (
                        <div key={book.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-[280px] group relative">
                            <div className="flex-1 p-5 flex flex-col items-center justify-center text-center gap-4 cursor-pointer" onClick={() => window.location.href = `/knowledge-hub/mapping/${book.id}`}>
                                {/* Cover Art */}
                                <div className="w-20 h-28 rounded-lg border-2 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300 relative">
                                    {book.coverImageUrl ? (
                                        <img src={book.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <BookOpen className="w-8 h-8 text-slate-300" />
                                    )}
                                </div>
                                <div className="w-full min-w-0">
                                    <h3 className="text-[15px] font-bold text-slate-800 leading-snug line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                                        {book.title}
                                    </h3>
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 truncate px-2">
                                        {book.mappedClassName || 'Unmapped'} &bull; {book.mappedSubjectName || ''}
                                    </p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getBadgeStyle(book.bookType)}`}>
                                        {book.bookType}
                                    </span>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 flex justify-center">
                                <Link to={`/knowledge-hub/mapping/${book.id}`} className="w-full">
                                    <button className="w-full py-1.5 bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 rounded-lg text-[13px] font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5">
                                        Start Mapping
                                        <ChevronRight size={14} className="opacity-70" />
                                    </button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CurriculumMappingList;
