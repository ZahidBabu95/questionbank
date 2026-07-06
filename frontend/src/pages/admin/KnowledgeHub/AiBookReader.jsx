import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    Book, Search, X, Sparkles, Brain, Clock, Send, Bot, User, 
    ChevronDown, ChevronRight, Tag, Loader2, HelpCircle, 
    Lightbulb, FileText, Check, Settings, Play, Sliders, ArrowLeft, ArrowRight,
    MessageSquare, AlertCircle, Info, BookOpen, CheckCircle2, XCircle
} from 'lucide-react';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import CQCombinedRenderer from '../QuestionBank/components/CQCombinedRenderer';
import DynamicQuestionViewer from '../QuestionBank/components/DynamicQuestionViewer';

const TopicQuestionCard = ({ question, index }) => {
    const [selectedOptionId, setSelectedOptionId] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);

    // Reset state when question changes
    useEffect(() => {
        setSelectedOptionId(null);
        setShowAnswer(false);
    }, [question]);

    const options = question.options || [];
    const isMcq = question.type === 'MCQ';
    const correctOption = options.find(o => o.isCorrect || o.correct);

    const handleOptionClick = (optionId) => {
        if (selectedOptionId !== null) return;
        setSelectedOptionId(optionId);
        setShowAnswer(true);
    };

    const renderSources = () => {
        if (!question.sources || question.sources.length === 0) {
            if (question.sourceReference) {
                return (
                    <span className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase whitespace-nowrap flex items-center gap-1 shadow-sm">
                        📖 {question.sourceReference}
                    </span>
                );
            }
            return null;
        }

        return question.sources.map((src, sIdx) => {
            const type = src.sourceType || 'OTHER';
            const org = src.organizationName || '';
            const year = src.examYear ? ` ${src.examYear}` : '';
            const exam = src.examName ? ` - ${src.examName}` : '';
            const displayName = `${org}${exam}${year}`;

            if (type === 'BOARD_EXAM') {
                return (
                    <span key={sIdx} className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-150 rounded-xl text-[10px] font-black border uppercase whitespace-nowrap flex items-center gap-1 shadow-sm">
                        🏛️ {displayName}
                    </span>
                );
            }
            if (type === 'UNIVERSITY_ADMISSION') {
                return (
                    <span key={sIdx} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-xl text-[10px] font-black border uppercase whitespace-nowrap flex items-center gap-1 shadow-sm">
                        🎓 {displayName}
                    </span>
                );
            }
            if (type === 'INSTITUTION_TEST') {
                return (
                    <span key={sIdx} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-xl text-[10px] font-black border uppercase whitespace-nowrap flex items-center gap-1 shadow-sm">
                        🏫 {displayName}
                    </span>
                );
            }
            if (type === 'JOB_EXAM') {
                return (
                    <span key={sIdx} className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-150 rounded-xl text-[10px] font-black border uppercase whitespace-nowrap flex items-center gap-1 shadow-sm">
                        💼 {displayName}
                    </span>
                );
            }
            return (
                <span key={sIdx} className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black border uppercase whitespace-nowrap flex items-center gap-1 shadow-sm">
                    🏛️ {displayName}
                </span>
            );
        });
    };

    const enLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const bnLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
    const isEnglish = question.language === 'English';

    return (
        <div className="py-5 border-b border-slate-100 last:border-b-0 space-y-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg tracking-wider">
                        প্রশ্ন {index}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase ${
                        question.difficulty === 'EASY' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : question.difficulty === 'MEDIUM' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                        {question.difficulty || 'MEDIUM'}
                    </span>
                </div>
                {question.marks && (
                    <span className="text-[10px] font-bold text-slate-400">
                        পূর্ণমান: {question.marks}
                    </span>
                )}
            </div>

            {question.stimulus && (
                <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl text-xs text-slate-700 leading-relaxed font-medium">
                    <div className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5">উদ্দীপক (Stimulus)</div>
                    <MarkdownRenderer content={question.stimulus} />
                </div>
            )}

            <div className="text-xs font-bold text-slate-800 leading-relaxed">
                {question.type === 'CQ' ? (
                    <CQCombinedRenderer q={question} showAnswer={false} showExplanation={false} />
                ) : question.dynamicData ? (
                    <DynamicQuestionViewer q={question} mode="preview" showAnswer={false} />
                ) : (
                    <MarkdownRenderer content={question.questionText} />
                )}
            </div>

            {question.mcqType === 'MULTIPLE_COMPLETION' && question.statements && question.statements.length > 0 && (
                <div className="mt-2 pl-4 border-l-2 border-indigo-200 space-y-1.5">
                    {question.statements.map((stmt, sIdx) => (
                        <div key={sIdx} className="text-xs text-slate-700 font-medium leading-relaxed">
                            <MarkdownRenderer content={stmt} />
                        </div>
                    ))}
                </div>
            )}

            {isMcq && options.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {options.map((opt, optIdx) => {
                        const isOptCorrect = opt.isCorrect || opt.correct;
                        const isSelected = selectedOptionId === opt.id;
                        const displayLabel = isEnglish ? enLabels[optIdx] : bnLabels[optIdx];
                        
                        let optionStyle = 'border-slate-100 bg-slate-50/50 hover:bg-indigo-50/20 hover:border-indigo-200 cursor-pointer text-slate-700';
                        let labelStyle = 'bg-slate-200 text-slate-600';
                        let checkIcon = null;

                        if (selectedOptionId !== null) {
                            if (isOptCorrect) {
                                optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                                labelStyle = 'bg-emerald-500 text-white';
                                checkIcon = <CheckCircle2 size={16} className="text-emerald-500 ml-auto shrink-0 animate-in zoom-in-50 duration-200" />;
                            } else if (isSelected) {
                                optionStyle = 'border-rose-400 bg-rose-50 text-rose-900 font-bold';
                                labelStyle = 'bg-rose-500 text-white';
                                checkIcon = <XCircle size={16} className="text-rose-500 ml-auto shrink-0 animate-in zoom-in-50 duration-200" />;
                            } else {
                                optionStyle = 'border-slate-100 bg-white opacity-60 text-slate-500 cursor-not-allowed';
                                labelStyle = 'bg-slate-100 text-slate-400';
                            }
                        } else if (showAnswer) {
                            if (isOptCorrect) {
                                optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                                labelStyle = 'bg-emerald-500 text-white';
                            }
                        }

                        return (
                            <button
                                key={opt.id}
                                disabled={selectedOptionId !== null}
                                onClick={() => handleOptionClick(opt.id)}
                                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${optionStyle}`}
                            >
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black shrink-0 ${labelStyle}`}>
                                    {displayLabel}
                                </span>
                                <span className="text-xs leading-relaxed flex-1">
                                    <MarkdownRenderer content={opt.optionText} />
                                </span>
                                {checkIcon}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="pt-2 flex flex-col gap-3">
                <button
                    onClick={() => setShowAnswer(prev => !prev)}
                    className={`w-max text-xs font-black px-4 py-2 rounded-xl border flex items-center gap-1.5 transition-all select-none ${
                        showAnswer 
                        ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' 
                        : 'bg-white border-slate-200 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/20'
                    }`}
                >
                    <Info size={14} />
                    <span>{showAnswer ? 'উত্তর ও ব্যাখ্যা লুকান' : 'উত্তর ও ব্যাখ্যা দেখুন'}</span>
                </button>

                {showAnswer && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {isMcq && correctOption && (
                            <div className="flex items-start gap-2">
                                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
                                    সঠিক উত্তর
                                </span>
                                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                    {options.indexOf(correctOption) !== -1 ? (isEnglish ? enLabels[options.indexOf(correctOption)] : bnLabels[options.indexOf(correctOption)]) : correctOption.optionLabel}. <MarkdownRenderer content={correctOption.optionText} />
                                </span>
                            </div>
                        )}
                        {!isMcq && question.correctAnswer && (
                            <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md w-max">
                                    সঠিক উত্তর
                                </div>
                                <div className="text-xs text-slate-800 leading-relaxed font-bold pl-1 pt-1">
                                    <MarkdownRenderer content={question.correctAnswer} />
                                </div>
                            </div>
                        )}

                        {question.explanation && (
                            <div className="space-y-1 border-t border-slate-200/80 pt-3">
                                <div className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md w-max">
                                    ব্যাখ্যা (Explanation)
                                </div>
                                <div className="text-xs text-slate-700 leading-relaxed font-medium pl-1 pt-1">
                                    <MarkdownRenderer content={question.explanation} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const PAGE_SIZES = {
    A4: { width: '210mm', minHeight: '297mm' },
    LETTER: { width: '216mm', minHeight: '279mm' },
    A5: { width: '148mm', minHeight: '210mm' }
};

const MARGIN_SIZES = {
    NARROW: { padding: '0.5in' },
    NORMAL: { padding: '0.75in' },
    WIDE: { padding: '1.0in' }
};

const bookTypesList = ['ALL', 'TEXTBOOK', 'GUIDE', 'QUESTION_BANK', 'LECTURE_SHEET'];

const AiBookReader = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const urlLectureId = queryParams.get('lectureId');
    const urlChapterId = queryParams.get('chapterId');
    const urlClassSubjectId = queryParams.get('classSubjectId');

    // ═══ Bookshelf States ═══
    const [books, setBooks] = useState([]);
    const [isLoadingBooks, setIsLoadingBooks] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilterType, setActiveFilterType] = useState('TEXTBOOK');
    const [filterMedium, setFilterMedium] = useState('ALL'); // ALL, Bangla, English, Bilingual
    const [hierarchy, setHierarchy] = useState({ streams: [], classes: [], subjects: [], classSubjects: [], levels: [] });
    const [isTocOpen, setIsTocOpen] = useState(true);
    
    // Main Bookshelf Filters
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [showAllBooksOverride, setShowAllBooksOverride] = useState(false);
    const [onlyShowAvailable, setOnlyShowAvailable] = useState(true);
    const [allBooksSummary, setAllBooksSummary] = useState([]);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);

    // ═══ AI Reader Workspace States ═══
    const [bookDetails, setBookDetails] = useState(null);
    const [indices, setIndices] = useState([]);
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
    const [activeChapter, setActiveChapter] = useState(null);
    const [topics, setTopics] = useState([]);
    const [isLoadingTopics, setIsLoadingTopics] = useState(false);
    const [activeTopic, setActiveTopic] = useState(null);
    const [expandedChapterId, setExpandedChapterId] = useState(null);
    const [topicQuestions, setTopicQuestions] = useState([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [chapterQuestions, setChapterQuestions] = useState({});
    const [pageSize, setPageSize] = useState('A4');
    const [marginSize, setMarginSize] = useState('NARROW');
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [selectedTopicIds, setSelectedTopicIds] = useState([]);

    // ═══ AI Chat States ═══
    const [chatSession, setChatSession] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [responseTone, setResponseTone] = useState('professional'); // professional, friendly, socratic
    const [aiModel, setAiModel] = useState('gemini-1.5-flash'); // gemini-1.5-flash, gemini-1.5-pro
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(true);
    const messagesEndRef = useRef(null);

    // ═══ 1. Bookshelf Logic ═══
    useEffect(() => {
        if (!bookId) {
            academicService.getHierarchy().then(setHierarchy).catch(console.error);
            
            // If classSubjectId is provided, try to find the exact book and auto-open it
            if (urlClassSubjectId) {
                setIsLoadingBooks(true);
                axios.get('/v1/knowledge-hub/source-books/paginated', {
                    params: { classSubjectIds: urlClassSubjectId, page: 0, size: 100 }
                }).then(async (res) => {
                    const booksList = res.data?.content || [];
                    if (booksList.length > 0) {
                        let targetBookId = booksList[0].id;

                        // Try to find the exact book that has this chapter mapped
                        if (urlChapterId) {
                            try {
                                const indexPromises = booksList.map(b => 
                                    axios.get(`/v1/knowledge-hub/source-books/${b.id}/indices`)
                                        .then(resIdx => ({ bookId: b.id, indices: resIdx.data || [] }))
                                        .catch(() => ({ bookId: b.id, indices: [] }))
                                );
                                const results = await Promise.all(indexPromises);
                                const matchingBook = results.find(r => 
                                    r.indices.some(idx => idx.mappedChapterId === urlChapterId || idx.id === urlChapterId)
                                );
                                if (matchingBook) {
                                    targetBookId = matchingBook.bookId;
                                }
                            } catch (err) {
                                console.error('Failed to resolve matching book for chapter:', err);
                            }
                        }

                        const lecParam = urlLectureId ? `&lectureId=${urlLectureId}` : '';
                        const chapParam = urlChapterId ? `&chapterId=${urlChapterId}` : '';
                        navigate(`/knowledge-hub/ai-reader/${targetBookId}?classSubjectId=${urlClassSubjectId}${lecParam}${chapParam}`, { replace: true });
                    }
                }).catch(err => {
                    console.error('Failed to auto-load book for classSubjectId:', err);
                }).finally(() => {
                    setIsLoadingBooks(false);
                });
            }

            setIsLoadingSummary(true);
            axios.get('/v1/knowledge-hub/source-books')
                .then(res => {
                    setAllBooksSummary(res.data || []);
                })
                .catch(console.error)
                .finally(() => {
                    setIsLoadingSummary(false);
                });
        } else {
            loadWorkspaceData();
        }
    }, [bookId, urlClassSubjectId, urlLectureId, urlChapterId]);

    // Pre-set filters and bypass Subject Selection Modal when classSubjectId is provided
    useEffect(() => {
        if (hierarchy.classSubjects?.length > 0 && urlClassSubjectId) {
            const targetClassSubject = hierarchy.classSubjects.find(cs => cs.id === urlClassSubjectId);
            if (targetClassSubject) {
                setFilterSubject(urlClassSubjectId);
                
                const classId = targetClassSubject._classId || targetClassSubject.classId;
                if (classId) {
                    setFilterClass(classId);
                    const targetClass = hierarchy.classes?.find(c => c.id === classId);
                    if (targetClass) {
                        const streamId = targetClass._streamId || targetClass.streamId;
                        if (streamId) setFilterStream(streamId);
                        
                        const levelId = targetClass._levelId || targetClass.levelId;
                        if (levelId) setFilterLevel(levelId);
                    }
                }
            }
        }
    }, [hierarchy, urlClassSubjectId]);

    const fetchBooks = async () => {
        setIsLoadingBooks(true);
        try {
            const params = {
                page: 0,
                size: 100, // Fetch up to 100 books for the selected filters
                searchTerm: searchQuery || '',
                bookType: activeFilterType === 'ALL' ? '' : activeFilterType
            };

            // Calculate classSubjectIds based on current selection
            if (filterSubject) {
                params.classSubjectIds = filterSubject;
            } else if (filterClass) {
                const classSubjects = hierarchy.classSubjects?.filter(cs => cs._classId === filterClass).map(cs => cs.id) || [];
                if (classSubjects.length > 0) {
                    params.classSubjectIds = classSubjects.join(',');
                } else {
                    params.classSubjectIds = '00000000-0000-0000-0000-000000000000';
                }
            } else if (filterStream) {
                const validClasses = hierarchy.classes?.filter(c => c._streamId === filterStream).map(c => c.id) || [];
                const classSubjects = hierarchy.classSubjects?.filter(cs => validClasses.includes(cs._classId)).map(cs => cs.id) || [];
                if (classSubjects.length > 0) {
                    params.classSubjectIds = classSubjects.join(',');
                } else {
                    params.classSubjectIds = '00000000-0000-0000-0000-000000000000';
                }
            } else if (filterLevel) {
                const validStreams = hierarchy.streams?.filter(s => s._levelId === filterLevel).map(s => s.id) || [];
                const validClasses = hierarchy.classes?.filter(c => validStreams.includes(c._streamId)).map(c => c.id) || [];
                const classSubjects = hierarchy.classSubjects?.filter(cs => validClasses.includes(cs._classId)).map(cs => cs.id) || [];
                if (classSubjects.length > 0) {
                    params.classSubjectIds = classSubjects.join(',');
                } else {
                    params.classSubjectIds = '00000000-0000-0000-0000-000000000000';
                }
            }

            const res = await axios.get('/v1/knowledge-hub/source-books/paginated', { params });
            const rawBooks = res.data?.content || [];
            
            // Extract unique classSubjectId values
            const uniqueClassSubjectIds = [
                ...new Set(
                    rawBooks
                        .map(b => b.classSubjectId)
                        .filter(id => id !== null && id !== undefined && id !== '')
                )
            ];

            // Fetch availability map in bulk
            const availabilityMap = {};
            if (uniqueClassSubjectIds.length > 0) {
                try {
                    const availRes = await axios.post('/v1/questions/availability/bulk', {
                        classSubjectIds: uniqueClassSubjectIds
                    });
                    Object.assign(availabilityMap, availRes.data || {});
                } catch (err) {
                    console.error('Failed to fetch bulk availability:', err);
                }
            }

            // Set hasQuestions flag on books
            const processedBooks = rawBooks.map(b => ({
                ...b,
                hasQuestions: b.classSubjectId ? !!availabilityMap[b.classSubjectId] : false
            }));

            // Filter by language locally since language is a attribute of the book DTO
            const filteredByMedium = filterMedium === 'ALL'
                ? processedBooks
                : processedBooks.filter(b => b.language === filterMedium);

            setBooks(filteredByMedium);
        } catch (err) {
            console.error('Failed to load books for bookshelf:', err);
        } finally {
            setIsLoadingBooks(false);
        }
    };

    // Load books whenever filters change
    useEffect(() => {
        if (!bookId && hierarchy.classSubjects?.length > 0 && (filterSubject || showAllBooksOverride)) {
            fetchBooks();
        }
    }, [bookId, filterLevel, filterStream, filterClass, filterSubject, activeFilterType, filterMedium, searchQuery, hierarchy.classSubjects, showAllBooksOverride]);

    const getBadgeStyle = (type) => {
        switch (type) {
            case 'TEXTBOOK': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'GUIDE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'QUESTION_BANK': return 'bg-purple-50 text-purple-700 border-purple-100';
            case 'LECTURE_SHEET': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

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

    const bookClassSubjectIds = useMemo(() => {
        return new Set(
            allBooksSummary
                .map(b => b.classSubjectId)
                .filter(id => id !== null && id !== undefined && id !== '')
        );
    }, [allBooksSummary]);

    const availableClassSubjects = useMemo(() => {
        if (!hierarchy.classSubjects) return [];
        return hierarchy.classSubjects.filter(cs => bookClassSubjectIds.has(cs.id));
    }, [hierarchy.classSubjects, bookClassSubjectIds]);

    const availableClassIds = useMemo(() => {
        return new Set(availableClassSubjects.map(cs => cs._classId || cs.classId).filter(Boolean));
    }, [availableClassSubjects]);

    const availableStreamIds = useMemo(() => {
        if (!hierarchy.classes) return new Set();
        const validStreams = hierarchy.classes
            .filter(c => availableClassIds.has(c.id))
            .map(c => c._streamId || c.streamId)
            .filter(Boolean);
        return new Set(validStreams);
    }, [hierarchy.classes, availableClassIds]);

    const availableLevelIds = useMemo(() => {
        const levelIds = new Set();
        if (hierarchy.streams) {
            hierarchy.streams.forEach(s => {
                if (availableStreamIds.has(s.id) && s._levelId) {
                    levelIds.add(s._levelId);
                }
            });
        }
        if (hierarchy.classes) {
            hierarchy.classes.forEach(c => {
                if (availableClassIds.has(c.id) && c._levelId) {
                    levelIds.add(c._levelId);
                }
            });
        }
        return levelIds;
    }, [hierarchy.streams, hierarchy.classes, availableStreamIds, availableClassIds]);

    const filteredLevels = useMemo(() => {
        const levels = hierarchy.levels || [];
        if (isLoadingSummary) return levels;
        return levels.filter(l => availableLevelIds.has(l.id));
    }, [hierarchy.levels, availableLevelIds, isLoadingSummary]);

    const filteredStreams = useMemo(() => {
        const streams = !filterLevel 
            ? (hierarchy.streams || []) 
            : (hierarchy.streams?.filter(s => s._levelId === filterLevel) || []);
        if (isLoadingSummary) return streams;
        return streams.filter(s => availableStreamIds.has(s.id));
    }, [hierarchy.streams, filterLevel, availableStreamIds, isLoadingSummary]);

    const filteredClasses = useMemo(() => {
        if (!hierarchy.classes) return [];
        const classes = hierarchy.classes.filter(c => {
            if (filterStream) return c._streamId === filterStream;
            if (filterLevel) {
                const streamsUnderLevel = hierarchy.streams?.filter(s => s._levelId === filterLevel).map(s => s.id) || [];
                return c._levelId === filterLevel || streamsUnderLevel.includes(c._streamId);
            }
            return true;
        });
        const sorted = classes.sort((a, b) => (a.order || 0) - (b.order || 0));
        if (isLoadingSummary) return sorted;
        return sorted.filter(c => availableClassIds.has(c.id));
    }, [hierarchy.classes, hierarchy.streams, filterLevel, filterStream, availableClassIds, isLoadingSummary]);

    const filteredClassSubjects = useMemo(() => {
        const classSubjects = !filterClass 
            ? (hierarchy.classSubjects || []) 
            : (hierarchy.classSubjects?.filter(cs => cs._classId === filterClass) || []);
        if (isLoadingSummary) return classSubjects;
        return classSubjects.filter(cs => bookClassSubjectIds.has(cs.id));
    }, [hierarchy.classSubjects, filterClass, bookClassSubjectIds, isLoadingSummary]);

    const filteredBooks = useMemo(() => {
        return onlyShowAvailable 
            ? books.filter(b => b.hasQuestions) 
            : books;
    }, [books, onlyShowAvailable]);


    // ═══ 2. Workspace Logic ═══
    const loadWorkspaceData = async () => {
        setIsLoadingWorkspace(true);
        try {
            const [bookRes, indicesRes] = await Promise.all([
                axios.get(`/v1/knowledge-hub/source-books/${bookId}`),
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices`)
            ]);

            setBookDetails(bookRes.data);
            const sortedIndices = (indicesRes.data || []).sort((a, b) => (a.startPage || 0) - (b.startPage || 0));
            setIndices(sortedIndices);
            
            // Try to initialize/load AI Chat Session for this book
            await initializeChatSession(bookRes.data);

            if (sortedIndices.length > 0) {
                const targetIndex = urlChapterId 
                    ? sortedIndices.find(idx => idx.id === urlChapterId || idx.mappedChapterId === urlChapterId)
                    : null;
                handleChapterClick(targetIndex || sortedIndices[0]);
            }
        } catch (err) {
            console.error('Failed to load AI Book Reader workspace data:', err);
            alert('বইয়ের ডাটা লোড করতে সমস্যা হয়েছে।');
            navigate('/knowledge-hub/ai-reader');
        } finally {
            setIsLoadingWorkspace(false);
        }
    };

    const handleChapterClick = async (chapter) => {
        if (expandedChapterId === chapter.id) {
            setExpandedChapterId(null);
            return;
        }
        setExpandedChapterId(chapter.id);
        setActiveChapter(chapter);
        setIsLoadingTopics(true);
        setTopics([]);
        setActiveTopic(null);
        setSelectedTopicIds([]);
        setChapterQuestions({}); // Clear old questions immediately

        try {
            const res = await axios.get(`/v1/knowledge-hub/indexes/${chapter.id}/topics-preview?t=${Date.now()}`);
            const topicsData = res.data || [];
            setTopics(topicsData);
            if (topicsData.length > 0) {
                setActiveTopic(topicsData[0]);
            }
            fetchAllChapterQuestions(topicsData);

            if (urlLectureId) {
                try {
                    const lectureRes = await axios.get(`/v1/lectures/${urlLectureId}`);
                    const activeSectionTitles = (lectureRes.data?.data?.sections || []).map(s => s.sectionTitle.trim().toLowerCase());
                    const matchedTopicIds = topicsData
                        .filter(t => activeSectionTitles.includes(t.name.trim().toLowerCase()))
                        .map(t => t.id);
                    setSelectedTopicIds(matchedTopicIds);
                } catch (e) {
                    console.error('Failed to pre-select lecture topics:', e);
                }
            }
        } catch (err) {
            console.error('Failed to load topics for chapter:', err);
        } finally {
            setIsLoadingTopics(false);
        }
    };

    const handleToggleTopic = (topicId, e) => {
        e.stopPropagation();
        setSelectedTopicIds(prev => {
            if (prev.includes(topicId)) {
                return prev.filter(id => id !== topicId);
            } else {
                return [...prev, topicId];
            }
        });
    };

    const handleCreateLectureSheet = () => {
        if (selectedTopicIds.length === 0) return;
        navigate(`/lectures/editor?classSubjectId=${bookDetails.classSubjectId}&chapterId=${activeChapter.mappedChapterId || activeChapter.id}&topicIds=${selectedTopicIds.join(',')}`);
    };

    const handleUpdateLectureSheet = () => {
        if (selectedTopicIds.length === 0) return;
        navigate(`/lectures/editor/${urlLectureId}?topicIds=${selectedTopicIds.join(',')}&classSubjectId=${bookDetails.classSubjectId}&chapterId=${activeChapter.mappedChapterId || activeChapter.id}`);
    };

    const fetchAllChapterQuestions = async (topicsList) => {
        setIsLoadingQuestions(true);
        try {
            const questionsMap = {};
            await Promise.all(
                topicsList.map(async (topic) => {
                    try {
                        const res = await axios.get('/v1/questions/list-paginated', {
                            params: {
                                filterStatus: 'APPROVED',
                                topicId: topic.mappedTopicId || topic.id,
                                size: 50
                            }
                        });
                        questionsMap[topic.id] = res.data?.content || [];
                    } catch (e) {
                        console.error(`Failed to fetch questions for topic ${topic.id}:`, e);
                        questionsMap[topic.id] = [];
                    }
                })
            );
            setChapterQuestions(questionsMap);
        } catch (err) {
            console.error('Failed to fetch chapter questions:', err);
        } finally {
            setIsLoadingQuestions(false);
        }
    };

    const handleTopicSelect = (topic) => {
        setActiveTopic(topic);
        setTimeout(() => {
            const el = document.getElementById(`topic-section-${topic.id}`);
            const container = el?.closest('.overflow-y-auto');
            if (el && container) {
                const containerRect = container.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const scrollTop = container.scrollTop + (elRect.top - containerRect.top) - 16;
                container.scrollTo({
                    top: scrollTop,
                    behavior: 'smooth'
                });
            }
        }, 50);
    };

    // ═══ 3. Chat Assistant Logic ═══
    const initializeChatSession = async (book) => {
        const localKey = `ai_reader_session_${book.id}`;
        let sessionId = localStorage.getItem(localKey);

        try {
            if (sessionId) {
                // Verify the session still exists
                try {
                    const res = await axios.get(`/v1/ai/workspace/sessions/${sessionId}/messages`);
                    setChatSession({ id: sessionId, title: `AI Reader - ${book.title}` });
                    setMessages(res.data?.data || []);
                    return;
                } catch (e) {
                    console.log('Saved session invalid or expired, creating new one...');
                }
            }

            // Create new chat session
            const res = await axios.post('/v1/ai/workspace/sessions', {
                title: `AI Reader - ${book.title}`
            });
            const newSession = res.data?.data;
            if (newSession) {
                localStorage.setItem(localKey, newSession.id);
                setChatSession(newSession);
                setMessages([]);
            }
        } catch (err) {
            console.error('Failed to initialize AI session:', err);
        }
    };

    const scrollToBottom = () => {
        const el = messagesEndRef.current;
        const container = el?.closest('.overflow-y-auto');
        if (el && container) {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (textToSend) => {
        const text = (textToSend || chatInput).trim();
        if (!text || !chatSession) return;

        if (!textToSend) setChatInput('');
        setIsSendingMessage(true);

        // Add user message locally
        const userMsg = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            let filterString = bookDetails?.title || '';
            if (activeChapter) filterString += ` - ${activeChapter.indexName}`;
            if (activeTopic) filterString += ` - ${activeTopic.name}`;

            const res = await axios.post(`/v1/ai/workspace/sessions/${chatSession.id}/ask`, {
                query: text,
                docId: bookId,
                filter: filterString,
                mode: 'creative',
                tone: responseTone
            });

            if (res.data?.data) {
                const aiMsg = res.data.data.aiMessage;
                setMessages(prev => [...prev.filter(m => m.id !== userMsg.id), res.data.data.userMessage, aiMsg]);
            }
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: 'দুঃখিত, এআই সার্ভারের সাথে যোগাযোগ করতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।',
                createdAt: new Date().toISOString()
            }]);
        } finally {
            setIsSendingMessage(false);
        }
    };

    // Quick Action Triggers
    const triggerQuickAction = (actionType) => {
        if (!activeTopic) return;
        let promptText = '';
        switch (actionType) {
            case 'explain':
                promptText = `Explain the topic "${activeTopic.name}" from Chapter "${activeChapter?.indexName}" in detail.`;
                break;
            case 'summarize':
                promptText = `Summarize the main points and key takeaways of the topic "${activeTopic.name}" from Chapter "${activeChapter?.indexName}".`;
                break;
            case 'questions':
                promptText = `Generate 5 multiple-choice questions (MCQs) with correct answers based on the topic "${activeTopic.name}".`;
                break;
            default:
                return;
        }
        handleSendMessage(promptText);
    };

    // Combine topic chunks into single Markdown text
    const getTopicContent = (topic) => {
        if (!topic || !topic.chunks || topic.chunks.length === 0) return '';
        return topic.chunks
            .sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0))
            .map(c => c.chunkText)
            .join('\n\n');
    };

    // Handle interactive widget actions
    const handleWidgetAction = (config) => {
        // Redirect or trigger exam builder with parameters
        navigate(`/ai-workspace?mode=exam_gen&subject=${encodeURIComponent(config.subject || '')}&chapter=${encodeURIComponent(config.chapter || '')}&count=${config.questionCount || 10}&type=${config.questionType || 'MCQ'}&diff=${config.difficulty || 'Medium'}`);
    };

    // Render Bookshelf matching Resource Library style
    if (!bookId) {
        const showMediumFilter = true;
        const showLevelFilter = hierarchy.levels?.length > 0;
        const showStreamFilter = filterLevel && filteredStreams.length > 0;
        const showClassFilter = filterLevel || filteredClasses.length > 0;
        const showSubjectFilter = filterClass || filteredClassSubjects.length > 0;

        const visibleFiltersCount = [
            showMediumFilter,
            showLevelFilter,
            showStreamFilter,
            showClassFilter,
            showSubjectFilter
        ].filter(Boolean).length;

        const getGridColsClass = (count) => {
            switch (count) {
                case 1: return 'grid-cols-1';
                case 2: return 'grid-cols-2';
                case 3: return 'grid-cols-2 md:grid-cols-3';
                case 4: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
                case 5: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
                default: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
            }
        };

        const hasSelectedOnce = !!(filterSubject || showAllBooksOverride);

        const handleResetFilters = () => {
            setFilterLevel('');
            setFilterStream('');
            setFilterClass('');
            setFilterSubject('');
            setFilterMedium('ALL');
            setSearchQuery('');
            setActiveFilterType('ALL');
            setShowAllBooksOverride(false);
            setOnlyShowAvailable(true);
        };

        return (
            <div className="w-full h-full flex flex-col bg-[#F8FAFC] relative font-satoshi min-h-screen">
                {/* Gorgeous Full-Screen Glassmorphic Subject Selector Modal */}
                {!hasSelectedOnce && (
                    <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500">
                        {/* Stunning Gradient Ambient Glow Blobs */}
                        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-pink-500/20 to-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-indigo-600/20 to-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

                        <div className="bg-white/95 border border-white/60 rounded-[36px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] p-7 sm:p-9 max-w-[490px] w-full flex flex-col items-center text-center gap-6 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative overflow-hidden">
                            
                            {/* Glowing Top Border Gradient Decorator */}
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600"></div>

                            {/* Elegant floating Close/Back Button */}
                            <button 
                                onClick={() => navigate(-1)}
                                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-full transition-all duration-300 hover:rotate-90 shadow-sm"
                                title="ফিরে যান"
                            >
                                <X size={16} className="stroke-[2.5]" />
                            </button>

                            {/* Luxurious Glowing Icon Block */}
                            <div className="relative group mt-2">
                                <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 rounded-3xl blur-md opacity-45 group-hover:opacity-75 transition-opacity duration-300 animate-pulse" />
                                <div className="relative w-16 h-16 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center text-white shadow-lg border border-white/20 transform hover:scale-105 transition-transform duration-300">
                                    <BookOpen size={30} className="stroke-[1.8]" />
                                </div>
                            </div>

                            {/* Title and description with dynamic colors */}
                            <div className="space-y-1 text-center">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight sm:text-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 bg-clip-text text-transparent">বইয়ের বিষয় নির্বাচন করুন</h3>
                                <p className="text-[11px] font-bold text-slate-500 mt-1">পড়ার জন্য আপনার ক্লাস ও বিষয় সিলেক্ট করুন</p>
                            </div>

                            {/* Grid of beautifully styled inputs */}
                            <div className="w-full bg-slate-50/70 border border-slate-150 p-5 rounded-3xl flex flex-col gap-4 shadow-sm backdrop-blur-md">
                                {/* Level Dropdown */}
                                {filteredLevels.length > 0 && (
                                    <div className="flex flex-col gap-1.5 text-left">
                                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1.5 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Level / স্তর
                                        </label>
                                        <div className="relative group">
                                            <select 
                                                value={filterLevel} 
                                                onChange={(e) => { 
                                                    setFilterLevel(e.target.value); 
                                                    setFilterStream(''); 
                                                    setFilterClass(''); 
                                                    setFilterSubject(''); 
                                                }} 
                                                className="appearance-none w-full h-11 px-4 pr-10 bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-[12px] font-bold text-slate-700 transition-all cursor-pointer shadow-sm focus:outline-none"
                                            >
                                                <option value="">সব স্তর</option>
                                                {filteredLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <ChevronDown size={14} className="stroke-[2.5]" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stream Dropdown */}
                                {filteredStreams.length > 0 && (
                                    <div className="flex flex-col gap-1.5 text-left">
                                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1.5 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Stream / বিভাগ
                                        </label>
                                        <div className="relative group">
                                            <select 
                                                value={filterStream} 
                                                onChange={(e) => { 
                                                    setFilterStream(e.target.value); 
                                                    setFilterClass(''); 
                                                    setFilterSubject(''); 
                                                }} 
                                                className="appearance-none w-full h-11 px-4 pr-10 bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-[12px] font-bold text-slate-700 transition-all cursor-pointer shadow-sm focus:outline-none"
                                            >
                                                <option value="">সব বিভাগ</option>
                                                {filteredStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <ChevronDown size={14} className="stroke-[2.5]" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Class Dropdown */}
                                {filteredClasses.length > 0 && (
                                    <div className="flex flex-col gap-1.5 text-left">
                                        <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1.5 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Class / শ্রেণি
                                        </label>
                                        <div className="relative group">
                                            <select 
                                                value={filterClass} 
                                                onChange={(e) => { 
                                                    setFilterClass(e.target.value); 
                                                    setFilterSubject(''); 
                                                }} 
                                                className="appearance-none w-full h-11 px-4 pr-10 bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-[12px] font-bold text-slate-700 transition-all cursor-pointer shadow-sm focus:outline-none"
                                            >
                                                <option value="">সব শ্রেণি</option>
                                                {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                <ChevronDown size={14} className="stroke-[2.5]" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Subject Dropdown */}
                                <div className="flex flex-col gap-1.5 text-left">
                                    <label className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest pl-1.5 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Subject / বিষয়
                                    </label>
                                    <div className="relative group">
                                        <select 
                                            value={filterSubject} 
                                            onChange={(e) => setFilterSubject(e.target.value)} 
                                            className="appearance-none w-full h-11 px-4 pr-10 bg-white border border-slate-250 hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-[12px] font-black text-slate-700 transition-all cursor-pointer shadow-sm focus:outline-none"
                                        >
                                            <option value="">সব বিষয়</option>
                                            {filteredClassSubjects.map(cs => {
                                                const subData = subjectLanguageMap[cs.id];
                                                return <option key={cs.id} value={cs.id}>{subData?.name || cs.name} {subData?.isEnglish ? '[EN]' : '[BN]'}</option>;
                                            })}
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                            <ChevronDown size={14} className="stroke-[2.5]" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Exit/Back Button at bottom of Selector Modal */}
                            <div className="w-full flex items-center justify-center gap-3">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="text-[11px] font-extrabold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50/80 px-4 py-2.5 rounded-2xl transition-all duration-300 flex items-center gap-1.5 shadow-sm active:scale-95 border border-slate-200/50"
                                >
                                    <X size={13} className="stroke-[2.5]" />
                                    <span>ফিরে যান</span>
                                </button>
                                <button
                                    onClick={() => setShowAllBooksOverride(true)}
                                    className="text-[11px] font-extrabold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-4 py-2.5 rounded-2xl transition-all duration-300 flex items-center gap-1.5 shadow-sm active:scale-95 border border-indigo-200/50"
                                >
                                    <Book size={13} />
                                    <span>সব বই দেখুন</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-6 my-4">
                    {/* Cascading Filters & Search Row */}
                    <div className="sticky top-0 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 space-y-4">
                        <div className="flex flex-col xl:flex-row gap-4">
                            <div className={`flex-1 grid gap-3 ${getGridColsClass(visibleFiltersCount)}`}>
                                {showMediumFilter && (
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
                                )}
                                {showLevelFilter && (
                                    <div className="relative">
                                        <span className="absolute -top-2 left-3 bg-[#F8FAFC] px-1 text-[10px] font-black text-indigo-500 uppercase z-10">Level</span>
                                        <select 
                                            value={filterLevel} 
                                            onChange={e => { setFilterLevel(e.target.value); setFilterStream(''); setFilterClass(''); setFilterSubject(''); }} 
                                            className="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="">All Levels</option>
                                            {filteredLevels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                {showStreamFilter && (
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
                                )}
                                {showClassFilter && (
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
                                )}
                                {showSubjectFilter && (
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
                                )}
                            </div>

                            <div className="flex gap-2 w-full xl:w-auto xl:flex-1 justify-end">
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
                                <button
                                    onClick={handleResetFilters}
                                    className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap active:scale-95"
                                >
                                    <Sliders size={14} />
                                    <span>বিষয় পরিবর্তন</span>
                                </button>
                            </div>
                        </div>

                        {/* Availability Toggle */}
                        <div className="flex justify-end pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2 shrink-0">
                                <label className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl text-[11px] font-black text-slate-700 cursor-pointer transition-all shadow-sm select-none active:scale-[0.98]">
                                    <input 
                                        type="checkbox" 
                                        checked={onlyShowAvailable} 
                                        onChange={(e) => setOnlyShowAvailable(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 border-slate-350 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span>শুধু উপলব্ধ বই ({books.filter(b => b.hasQuestions).length})</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Books Grid */}
                <div className="px-6 pb-20">
                    {isLoadingBooks ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">লোড হচ্ছে...</p>
                        </div>
                    ) : filteredBooks.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] py-32 text-center flex flex-col items-center justify-center">
                            <Book className="text-slate-300 mb-4" size={48} strokeWidth={1} />
                            <h3 className="text-2xl font-black text-slate-800">কোনো বই পাওয়া যায়নি</h3>
                            <p className="text-slate-500 mt-2 max-w-sm font-medium">নলেজ হাবে বই আপলোড করার পর এখানে রিড করতে পারবেন।</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                            {filteredBooks.map((book) => (
                                <div key={book.id} className="group relative flex flex-col cursor-pointer bg-white rounded-2xl border border-slate-200/80 p-3 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div 
                                        className="relative w-full aspect-[2/3] mb-3 rounded-xl overflow-hidden border border-slate-100"
                                        onClick={() => navigate(`/knowledge-hub/ai-reader/${book.id}`)}
                                    >
                                        {book.coverImageUrl ? (
                                            <img 
                                                src={book.coverImageUrl} 
                                                className="w-full h-full object-cover" 
                                                alt={book.title} 
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 flex flex-col items-center justify-center gap-2">
                                                <Book size={36} strokeWidth={1} className="text-slate-300" />
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No Cover</span>
                                            </div>
                                        )}
                                        {/* Hover actions */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 z-20">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/knowledge-hub/ai-reader/${book.id}`); }}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 text-xs font-black uppercase tracking-wider shadow-lg"
                                            >
                                                <Brain size={14} />
                                                এআই রিডার
                                            </button>
                                        </div>
                                        {book.totalPages > 0 && (
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md z-10">
                                                {book.totalPages} পৃষ্ঠা
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-1 flex-1 flex flex-col" onClick={() => navigate(`/knowledge-hub/ai-reader/${book.id}`)}>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {book.language === 'English' && <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase border border-indigo-100">EN</span>}
                                            {book.language === 'Bangla' && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase border border-emerald-100">BN</span>}
                                            <span className={`ml-auto px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded border ${getBadgeStyle(book.bookType)}`}>
                                                {book.bookType.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <h3 className="text-xs font-black text-slate-800 leading-snug line-clamp-2 mb-1 group-hover:text-indigo-700 transition-colors duration-300">
                                            {book.title}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-medium truncate mt-auto">
                                            {book.authorName || 'Unknown Author'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Render Split-Pane AI Book Reader Workspace
    return (
        <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-72px)] flex overflow-hidden bg-slate-50 font-outfit select-none relative">
            {isLoadingWorkspace ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">এআই রিডার কনফিগার হচ্ছে...</p>
                </div>
            ) : (
                <>
                    {/* Left Pane (Chapter TOC & Content Reader) */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-slate-200">
                        {/* Book Title & Header Controls */}
                        <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => navigate('/knowledge-hub/ai-reader')}
                                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                                    title="বুকশেলফে ফিরে যান"
                                >
                                    <X size={18} />
                                </button>
                                <button 
                                    onClick={() => setIsTocOpen(t => !t)}
                                    className={`p-1.5 rounded-lg transition-colors ${isTocOpen ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'text-slate-500 hover:bg-slate-200'}`}
                                    title="সূচিপত্র টগল করুন"
                                >
                                    <BookOpen size={18} />
                                </button>
                                <div>
                                    <h2 className="text-sm font-black truncate max-w-sm">{bookDetails?.title}</h2>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">AI Interactive Curriculum Reader</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsChatPanelOpen(c => !c)}
                                    className={`px-3 py-1.5 text-xs font-bold border rounded-xl flex items-center gap-1.5 transition-all ${
                                        isChatPanelOpen 
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                        : 'hover:bg-slate-100 border-slate-200 text-slate-500 bg-white'
                                    }`}
                                >
                                    <MessageSquare size={14} />
                                    <span>এআই অ্যাসিস্ট্যান্ট {isChatPanelOpen ? 'বন্ধ করুন' : 'চালু করুন'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Split Sub-pane (TOC on left, Topic Content Reader on right) */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* TOC Sidebar */}
                            <div className={`w-64 border-r border-slate-200 flex flex-col overflow-hidden shrink-0 bg-slate-50/30 transition-all duration-300 ${isTocOpen ? 'ml-0' : '-ml-64'}`}>
                                <div className="p-3 border-b border-slate-200 bg-slate-50/50">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">সূচিপত্র (ToC)</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                                    {indices.length === 0 ? (
                                        <div className="text-center py-10 text-xs font-bold text-slate-400">সূচিপত্র ম্যাপিং করা নেই।</div>
                                    ) : (
                                        indices.map(chapter => {
                                            const isExpanded = expandedChapterId === chapter.id;
                                            return (
                                                <div key={chapter.id} className="space-y-1">
                                                    <button
                                                        onClick={() => handleChapterClick(chapter)}
                                                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex justify-between items-center ${
                                                            isExpanded 
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-50' 
                                                            : 'border-slate-100 hover:bg-slate-100 text-slate-700 bg-white'
                                                        }`}
                                                    >
                                                        <div className="truncate pr-2">
                                                            <p className="truncate font-black">{chapter.indexName}</p>
                                                            <p className={`text-[9px] mt-0.5 ${isExpanded ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                                P.{chapter.startPage} - P.{chapter.endPage}
                                                            </p>
                                                        </div>
                                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>

                                                    {/* Topics list under expanded chapter */}
                                                    {isExpanded && (
                                                        <div className="pl-3 pr-1 py-1 space-y-1 bg-slate-50/50 rounded-xl border border-slate-100">
                                                            {isLoadingTopics ? (
                                                                <div className="py-4 text-center">
                                                                    <Loader2 size={14} className="animate-spin text-indigo-500 mx-auto" />
                                                                </div>
                                                            ) : topics.length === 0 ? (
                                                                <p className="text-[10px] text-slate-400 italic py-2 text-center">কোনো টপিক ম্যাপিং করা নেই।</p>
                                                            ) : (
                                                                topics.map(topic => (
                                                                    <div key={topic.id} className="flex items-center gap-1 w-full hover:bg-slate-100/50 rounded-lg p-0.5 transition-all">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={selectedTopicIds.includes(topic.id)} 
                                                                            onChange={(e) => handleToggleTopic(topic.id, e)} 
                                                                            className="w-3.5 h-3.5 text-indigo-600 bg-white border-slate-350 rounded focus:ring-indigo-500 cursor-pointer shrink-0 transition-all ml-1"
                                                                        />
                                                                        <button
                                                                            onClick={() => handleTopicSelect(topic)}
                                                                            className={`flex-1 text-left px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 overflow-hidden ${
                                                                                activeTopic && activeTopic.id === topic.id
                                                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                                                                : 'text-slate-500 hover:text-slate-800'
                                                                            }`}
                                                                        >
                                                                            <Tag size={10} className={activeTopic && activeTopic.id === topic.id ? 'text-indigo-600' : 'text-slate-400'} />
                                                                            <span className="truncate">{topic.name}</span>
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                {selectedTopicIds.length > 0 && (
                                    <div className="p-3 border-t border-slate-200 bg-white space-y-2 shrink-0 animate-in slide-in-from-bottom duration-300">
                                        <div className="text-[10px] font-black text-slate-450 uppercase tracking-widest">
                                            {selectedTopicIds.length} topics selected
                                        </div>
                                        {urlLectureId ? (
                                            <button
                                                onClick={handleUpdateLectureSheet}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100"
                                            >
                                                <FileText size={14} />
                                                <span>Update Lecture Sheet</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleCreateLectureSheet}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100"
                                            >
                                                <FileText size={14} />
                                                <span>Create Lecture Sheet</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Topic Content Viewer (Google Doc Print Layout Viewport) */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                                {activeChapter ? (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        {/* Formatting Toolbar */}
                                        <div className="h-14 px-6 border-b border-slate-200/80 flex items-center justify-between shrink-0 bg-white shadow-sm gap-4 text-xs font-bold text-slate-700">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-450 font-semibold">পৃষ্ঠা সাইজ:</span>
                                                    <select 
                                                        value={pageSize} 
                                                        onChange={e => setPageSize(e.target.value)}
                                                        className="bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl px-2.5 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-[11px] font-semibold text-slate-700 transition-all shadow-sm"
                                                    >
                                                        <option value="A4">A4 (Portrait)</option>
                                                        <option value="LETTER">Letter (8.5" × 11")</option>
                                                        <option value="A5">A5 (A5 Size)</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-450 font-semibold">মার্জিন:</span>
                                                    <select 
                                                        value={marginSize} 
                                                        onChange={e => setMarginSize(e.target.value)}
                                                        className="bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl px-2.5 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-[11px] font-semibold text-slate-700 transition-all shadow-sm"
                                                    >
                                                        <option value="NARROW">Narrow (0.5")</option>
                                                        <option value="NORMAL">Normal (0.75")</option>
                                                        <option value="WIDE">Wide (1.0")</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-450 font-semibold">জুম:</span>
                                                    <select 
                                                        value={zoomLevel} 
                                                        onChange={e => setZoomLevel(parseFloat(e.target.value))}
                                                        className="bg-slate-50 border border-slate-200 hover:border-slate-350 rounded-xl px-2.5 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-[11px] font-semibold text-slate-700 transition-all shadow-sm"
                                                    >
                                                        <option value="0.8">80%</option>
                                                        <option value="0.9">90%</option>
                                                        <option value="1.0">100%</option>
                                                        <option value="1.1">110%</option>
                                                        <option value="1.2">120%</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                                                📖 Continuous Document View
                                            </div>
                                        </div>

                                        {/* Google Doc Canvas Viewport */}
                                        <div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 md:p-8 custom-scrollbar scroll-smooth">
                                            <div 
                                                className="mx-auto bg-white border border-slate-200/80 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.06),_0_5px_15px_-5px_rgba(0,0,0,0.03)] transition-all duration-300 rounded-2xl relative max-w-full"
                                                style={{
                                                    width: PAGE_SIZES[pageSize].width,
                                                    minHeight: PAGE_SIZES[pageSize].minHeight,
                                                    padding: MARGIN_SIZES[marginSize].padding,
                                                    zoom: zoomLevel,
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                {/* Header chapter name */}
                                                <div className="text-center border-b border-slate-200/60 pb-5 mb-8">
                                                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">{activeChapter.indexName}</h1>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1.5">{bookDetails?.title}</p>
                                                </div>

                                                {topics.length === 0 ? (
                                                    <div className="text-center py-20 text-slate-400 font-bold text-sm">এই অধ্যায়ে কোনো টপিক নেই।</div>
                                                ) : (
                                                    topics.map((topic, topicIdx) => {
                                                        const topicContentText = getTopicContent(topic);
                                                        const questions = chapterQuestions[topic.id] || [];
                                                        const isSelectedTopic = activeTopic && activeTopic.id === topic.id;

                                                        return (
                                                            <div 
                                                                key={topic.id} 
                                                                id={`topic-section-${topic.id}`}
                                                                onClick={() => setActiveTopic(topic)}
                                                                className={`mb-16 last:mb-0 scroll-mt-6 pl-6 pr-2 py-4 transition-all cursor-pointer border-l-2 relative ${
                                                                    isSelectedTopic
                                                                    ? 'border-indigo-600 bg-slate-50/50'
                                                                    : 'border-transparent hover:bg-slate-50/20 hover:border-slate-200'
                                                                }`}
                                                            >
                                                                {/* Topic Content Text */}
                                                                <div className="prose prose-slate max-w-none mb-8">
                                                                    <MarkdownRenderer 
                                                                        content={topicContentText} 
                                                                        className="font-hind text-justify text-slate-800 text-[14px] leading-relaxed md:leading-loose"
                                                                    />
                                                                </div>

                                                                {/* Topic Questions */}
                                                                {questions.length > 0 && (
                                                                    <div className="mt-8 space-y-8 pt-6 border-t border-dashed border-slate-200">
                                                                        {(() => {
                                                                            const mcqs = questions.filter(q => q.type === 'MCQ');
                                                                            const cqs = questions.filter(q => q.type === 'CQ');
                                                                            const others = questions.filter(q => q.type !== 'MCQ' && q.type !== 'CQ');

                                                                            return (
                                                                                <>
                                                                                    {mcqs.length > 0 && (
                                                                                        <div className="space-y-4">
                                                                                            <h4 className="text-sm font-bold text-slate-800 tracking-wide border-l-4 border-slate-750 pl-2">
                                                                                                বহুনির্বাচনী প্রশ্ন (MCQ)
                                                                                            </h4>
                                                                                            <div className="divide-y divide-slate-100">
                                                                                                {mcqs.map((question, qIdx) => (
                                                                                                    <TopicQuestionCard 
                                                                                                        key={question.id || qIdx} 
                                                                                                        question={question} 
                                                                                                        index={qIdx + 1} 
                                                                                                    />
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    {cqs.length > 0 && (
                                                                                        <div className="space-y-4">
                                                                                            <h4 className="text-sm font-bold text-slate-800 tracking-wide border-l-4 border-slate-750 pl-2">
                                                                                                সৃজনশীল প্রশ্ন (CQ)
                                                                                            </h4>
                                                                                            <div className="divide-y divide-slate-100">
                                                                                                {cqs.map((question, qIdx) => (
                                                                                                    <TopicQuestionCard 
                                                                                                        key={question.id || qIdx} 
                                                                                                        question={question} 
                                                                                                        index={qIdx + 1} 
                                                                                                    />
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                    {others.length > 0 && (
                                                                                        <div className="space-y-4">
                                                                                            <h4 className="text-sm font-bold text-slate-800 tracking-wide border-l-4 border-slate-750 pl-2">
                                                                                                সংক্ষিপ্ত ও অন্যান্য প্রশ্ন
                                                                                            </h4>
                                                                                            <div className="divide-y divide-slate-100">
                                                                                                {others.map((question, qIdx) => (
                                                                                                    <TopicQuestionCard 
                                                                                                        key={question.id || qIdx} 
                                                                                                        question={question} 
                                                                                                        index={qIdx + 1} 
                                                                                                    />
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>

                                        {/* Topic assistant action overlay */}
                                        {activeTopic && (
                                            <div className="p-4 border-t border-slate-200 shrink-0 bg-slate-50/50 flex gap-2.5 justify-center flex-wrap">
                                                <button
                                                    onClick={() => triggerQuickAction('explain')}
                                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <Lightbulb size={14} className="text-amber-500 animate-pulse" />
                                                    <span>💡 ব্যাখ্যা করো: {activeTopic.name}</span>
                                                </button>
                                                <button
                                                    onClick={() => triggerQuickAction('summarize')}
                                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-1.5 shadow-sm"
                                                >
                                                    <FileText size={14} className="text-indigo-600" />
                                                    <span>📝 সংক্ষেপ করো</span>
                                                </button>
                                                <button
                                                    onClick={() => triggerQuickAction('questions')}
                                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100"
                                                >
                                                    <HelpCircle size={14} />
                                                    <span>❓ কুইজ প্রশ্ন তৈরি করো</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto bg-[#F1F3F4] p-8 custom-scrollbar flex items-center justify-center">
                                        <div 
                                            className="bg-white border border-slate-250 shadow-md p-12 text-center flex flex-col items-center justify-center rounded-sm relative"
                                            style={{
                                                width: PAGE_SIZES[pageSize].width,
                                                minHeight: PAGE_SIZES[pageSize].minHeight,
                                                padding: '1.5in',
                                                zoom: zoomLevel,
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <div className="w-16 h-16 bg-slate-100 text-indigo-500 rounded-2xl flex items-center justify-center mb-6 border border-slate-100">
                                                <BookOpen size={30} />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-800">সূচিপত্র (ToC) থেকে অধ্যায় নির্বাচন করুন</h3>
                                            <p className="text-xs font-bold text-slate-400 mt-2.5 max-w-xs leading-relaxed">
                                                বাম সাইডবার থেকে একটি অধ্যায় খুলুন। অধ্যায়ের সমস্ত টপিক ও প্রশ্নাবলি সহ গুগল ডক এর মতো ডিজিটাল বই এখানে প্রদর্শিত হবে।
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Pane (AI Persistent Chat Assistant Panel) */}
                    {isChatPanelOpen && (
                        <div className="w-[420px] shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                            {/* Chat Header Options */}
                            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-xl">
                                        <Brain size={16} />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-800">এআই একাডেমিক অ্যাসিস্ট্যান্ট</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Response Tone Dropdown */}
                                    <select 
                                        value={responseTone}
                                        onChange={e => setResponseTone(e.target.value)}
                                        className="text-[10px] font-black bg-slate-100 border border-slate-200 rounded-lg p-1.5 outline-none cursor-pointer text-slate-700"
                                        title="রেসপন্স টোন"
                                    >
                                        <option value="professional">🎓 Professional</option>
                                        <option value="friendly">🤝 Friendly</option>
                                        <option value="socratic">🤔 Socratic Hint</option>
                                    </select>
                                </div>
                            </div>

                            {/* Chat Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                                        <Bot size={40} strokeWidth={1.5} className="text-indigo-400 mb-3 animate-bounce" />
                                        <p className="text-xs font-black text-slate-700">আমি আপনার এআই লার্নিং কো-পাইলট</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1.5 leading-relaxed max-w-xs">
                                            যেকোনো প্রশ্নের সমাধান, কুইজ জেনারেশন বা জটিল টপিক সহজ ভাষায় বুঝতে আমাকে প্রশ্ন করুন।
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isAi = msg.role === 'ai' || msg.role === 'assistant';
                                        
                                        // Parse actionable config if exists
                                        let actionableConfig = null;
                                        if (msg.actionableData) {
                                            try {
                                                const parsed = JSON.parse(msg.actionableData);
                                                if (parsed.actionable_type === 'exam_config') {
                                                    actionableConfig = parsed.data;
                                                }
                                            } catch (e) {
                                                console.error('Failed to parse actionable data:', e);
                                            }
                                        }

                                        return (
                                            <div key={msg.id || idx} className={`flex gap-3 ${!isAi ? 'flex-row-reverse' : ''}`}>
                                                {/* Avatar */}
                                                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm border ${
                                                    isAi 
                                                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                                                    : 'bg-white border-slate-200 text-slate-600'
                                                }`}>
                                                    {isAi ? <Bot size={15} /> : <User size={15} />}
                                                </div>

                                                {/* Chat bubble body */}
                                                <div className="max-w-[80%] space-y-2">
                                                    <div className={`p-3 rounded-2xl border text-xs shadow-sm ${
                                                        isAi
                                                        ? 'bg-white border-slate-200 text-slate-800'
                                                        : 'bg-indigo-600 border-indigo-500 text-white'
                                                    }`}>
                                                        <MarkdownRenderer 
                                                            content={msg.content} 
                                                            className={isAi ? 'prose-p:text-slate-800' : 'prose-p:text-white'}
                                                        />
                                                    </div>

                                                    {/* In-Chat Actionable Exam Widget Card */}
                                                    {isAi && actionableConfig && (
                                                        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 uppercase tracking-wider">
                                                                <Sparkles size={12} />
                                                                <span>এআই রেডি এক্সাম কনফিগ</span>
                                                            </div>
                                                            <div className="space-y-1.5 text-xs text-slate-700">
                                                                <p className="font-bold flex justify-between">
                                                                    <span className="text-slate-400 font-medium">পরীক্ষার বিষয়:</span>
                                                                    <span>{actionableConfig.subject}</span>
                                                                </p>
                                                                <p className="font-bold flex justify-between">
                                                                    <span className="text-slate-400 font-medium">অধ্যায়:</span>
                                                                    <span>{actionableConfig.chapter || 'সম্পূর্ণ বই'}</span>
                                                                </p>
                                                                <p className="font-bold flex justify-between">
                                                                    <span className="text-slate-400 font-medium">প্রশ্নের সংখ্যা:</span>
                                                                    <span>{actionableConfig.questionCount} টি</span>
                                                                </p>
                                                                <p className="font-bold flex justify-between">
                                                                    <span className="text-slate-400 font-medium">প্রশ্নের ধরণ:</span>
                                                                    <span>{actionableConfig.questionType}</span>
                                                                </p>
                                                                <p className="font-bold flex justify-between">
                                                                    <span className="text-slate-400 font-medium">কঠিনতা:</span>
                                                                    <span>{actionableConfig.difficulty}</span>
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleWidgetAction(actionableConfig)}
                                                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-50 flex items-center justify-center gap-1.5"
                                                            >
                                                                <Sliders size={12} />
                                                                <span>পরীক্ষা তৈরি করুন (Exam Generator)</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Suggestions / Quick Prompts */}
                            {activeTopic && (
                                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 shrink-0 flex gap-2 overflow-x-auto hide-scrollbar">
                                    <button 
                                        onClick={() => handleSendMessage(`এই টপিকটি সহজে বুঝিয়ে দাও`)}
                                        className="px-3 py-1 rounded-full text-[10px] bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 font-bold whitespace-nowrap"
                                    >
                                        💡 সহজ ব্যাখ্যা
                                    </button>
                                    <button 
                                        onClick={() => handleSendMessage(`এই টপিক থেকে গুরুত্বপূর্ণ ৩টি কুইজ করো`)}
                                        className="px-3 py-1 rounded-full text-[10px] bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 font-bold whitespace-nowrap"
                                    >
                                        ❓ কুইজ প্র্যাকটিস
                                    </button>
                                    <button 
                                        onClick={() => handleSendMessage(`Thermodynamics এর ওপর ১টি MCQ কুইজ বানাও`)}
                                        className="px-3 py-1 rounded-full text-[10px] bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 font-bold whitespace-nowrap"
                                    >
                                        📝 এক্সাম কুপাইলট
                                    </button>
                                </div>
                            )}

                            {/* Message input bar */}
                            <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                    placeholder={activeTopic ? `টপিক "${activeTopic.name}" নিয়ে প্রশ্ন করুন...` : "এআই অ্যাসিস্ট্যান্টকে প্রশ্ন করুন..."}
                                    disabled={isSendingMessage || !chatSession}
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all disabled:opacity-50"
                                />
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={isSendingMessage || !chatSession || !chatInput.trim()}
                                    className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shrink-0"
                                >
                                    {isSendingMessage ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Send size={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AiBookReader;
