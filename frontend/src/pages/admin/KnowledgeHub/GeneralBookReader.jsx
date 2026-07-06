import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
    Book, ChevronLeft, ChevronRight, Headphones, Play, Pause, 
    Volume2, Sun, Moon, Bookmark, FileText, X, Search, Sliders, 
    Settings, Edit3, Save, MessageSquare, Trash2, Palette, Check, Library, RotateCcw,
    CheckCircle, AlertCircle, Layers, Calendar, User, Building, Clock, ZoomIn, ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HTMLFlipBook from 'react-pageflip';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import { knowledgeHubService } from '../../../services/knowledgeHubService';

const bookTypesList = ['ALL', 'TEXTBOOK', 'GUIDE', 'QUESTION_BANK', 'LECTURE_SHEET'];

const pageTurnVariants = {
    initial: (direction) => ({
        x: direction > 0 ? 150 : -150,
        opacity: 0,
    }),
    animate: {
        x: 0,
        opacity: 1,
        transition: {
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.25 }
        }
    },
    exit: (direction) => ({
        x: direction > 0 ? -150 : 150,
        opacity: 0,
        transition: {
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.25 }
        }
    })
};

const FlipPage = React.forwardRef(({ page, highlights, highlightColor, activeRect, isHighlightMode, onMouseDown, onMouseMove, onMouseUp, onImageLoad }, ref) => {
    const localCanvasRef = useRef(null);

    const redrawLocalCanvas = useCallback(() => {
        const canvas = localCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const pageHighlights = highlights.filter(h => h.pageNo === (page.sourcePageNo || page.pageNumber));
        pageHighlights.forEach(h => {
            ctx.fillStyle = h.color + '4D';
            ctx.fillRect(h.rect.x, h.rect.y, h.rect.w, h.rect.h);
            ctx.strokeStyle = h.color;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(h.rect.x, h.rect.y, h.rect.w, h.rect.h);
        });

        if (activeRect && isHighlightMode) {
            ctx.fillStyle = highlightColor + '4D';
            ctx.fillRect(activeRect.x, activeRect.y, activeRect.w, activeRect.h);
            ctx.strokeStyle = highlightColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(activeRect.x, activeRect.y, activeRect.w, activeRect.h);
        }
    }, [highlights, page, activeRect, highlightColor, isHighlightMode]);

    useEffect(() => {
        redrawLocalCanvas();
    }, [redrawLocalCanvas]);

    const handleLocalImageLoad = (e) => {
        const img = e.target;
        const canvas = localCanvasRef.current;
        if (canvas) {
            canvas.width = img.clientWidth;
            canvas.height = img.clientHeight;
            redrawLocalCanvas();
        }
        if (onImageLoad) onImageLoad(e);
    };

    const getProxiedImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http') && url.includes('r2.dev')) {
            return `/api/v1/public/proxy-image?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    return (
        <div className="page-wrapper w-full h-full bg-white relative flex items-center justify-center border border-slate-200 shadow-sm" ref={ref}>
            <div className="relative w-full h-full flex items-center justify-center p-2">
                <img
                    src={getProxiedImageUrl(page.imageUrl)}
                    alt={`Page ${page.sourcePageNo || page.pageNumber}`}
                    className="w-full h-auto object-contain pointer-events-none select-none max-h-[85vh] block shadow-sm border border-slate-100"
                    onLoad={handleLocalImageLoad}
                />
                <canvas
                    ref={localCanvasRef}
                    className={`absolute inset-0 z-10 ${isHighlightMode ? 'cursor-crosshair' : 'cursor-default'}`}
                    onMouseDown={(e) => {
                        if (!isHighlightMode) return;
                        const rect = localCanvasRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        onMouseDown(page, x, y);
                    }}
                    onMouseMove={(e) => {
                        if (!isHighlightMode) return;
                        const rect = localCanvasRef.current.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        onMouseMove(page, x, y);
                    }}
                    onMouseUp={onMouseUp}
                />
            </div>
        </div>
    );
});

const GeneralBookReader = () => {
    const { bookId } = useParams();
    const navigate = useNavigate();

    // Bookshelf States (When bookId is not provided)
    const [books, setBooks] = useState([]);
    const [activeFilterType, setActiveFilterType] = useState('TEXTBOOK');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingBooks, setIsLoadingBooks] = useState(true);
    const [hierarchy, setHierarchy] = useState({ streams: [], classes: [], subjects: [], classSubjects: [], levels: [] });
    
    // Main Bookshelf Filters
    const [filterLevel, setFilterLevel] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterMedium, setFilterMedium] = useState('ALL'); // ALL, Bangla, English, Bilingual, MISMATCHED

    // Kindle Reader States (When bookId is provided)
    const [bookDetails, setBookDetails] = useState(null);
    const [pages, setPages] = useState([]);
    const [indices, setIndices] = useState([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState(1);
    const pageFlipRef = useRef(null);
    const [viewMode, setViewMode] = useState('double'); // 'double' or 'single'
    const [zoomFactor, setZoomFactor] = useState(1.0); // 1.0, 1.25, 1.5, 2.0
    const [drawingPage, setDrawingPage] = useState(null);

    const handlePageChange = (newIndex) => {
        if (newIndex === currentPageIndex) return;
        if (pageFlipRef.current) {
            try {
                pageFlipRef.current.pageFlip().flip(newIndex);
            } catch (err) {
                console.error("Failed to flip page programmatically", err);
                setCurrentPageIndex(newIndex);
            }
        } else {
            setCurrentPageIndex(newIndex);
        }
    };

    const onFlip = useCallback((e) => {
        setCurrentPageIndex(e.data);
    }, []);
    const [isLoadingReader, setIsLoadingReader] = useState(true);
    
    // UI Panels & Customization States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarTab, setSidebarTab] = useState('toc'); // toc, notes
    const [theme, setTheme] = useState('sepia'); // light, sepia, dark
    const [showSettings, setShowSettings] = useState(false);
    
    // Highlight & Drawing States
    const [isHighlightMode, setIsHighlightMode] = useState(false);
    const [highlightColor, setHighlightColor] = useState('#fbbf24'); // Default amber
    const [highlights, setHighlights] = useState([]); // Array of highlights: { id, pageNo, rect: { x, y, w, h }, color, note }
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [activeRect, setActiveRect] = useState(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [pendingNoteText, setPendingNoteText] = useState('');

    // Audio Book TTS States
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const [audioSpeed, setAudioSpeed] = useState(1);
    const [synthVoice, setSynthVoice] = useState(null);
    const [voicesList, setVoicesList] = useState([]);
    const utteranceRef = useRef(null);

    // Display limit for Bookshelf Infinite Scroll
    const [displayLimit, setDisplayLimit] = useState(12);
    const observerTarget = useRef(null);

    // ═══ 1. Bookshelf Logic ═══
    useEffect(() => {
        if (!bookId) {
            fetchBooks();
            academicService.getHierarchy().then(setHierarchy).catch(console.error);
        } else {
            loadReaderData();
        }
    }, [bookId]);

    const fetchBooks = async () => {
        setIsLoadingBooks(true);
        try {
            const data = await knowledgeHubService.getSourceBooks();
            setBooks(data || []);
        } catch (err) {
            console.error('Failed to load books for bookshelf:', err);
        } finally {
            setIsLoadingBooks(false);
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

    // subject mapping for languages
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

    // Filter books based on criteria (Resource Library styling & logic)
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

            let matchesMedium = true;
            if (filterMedium !== 'ALL') {
                if (filterMedium === 'MISMATCHED') {
                    matchesMedium = hasLanguageMismatch(b);
                } else {
                    matchesMedium = b.language === filterMedium;
                }
            }

            return matchesSearch && matchesType && matchesHierarchy && matchesMedium;
        });
    }, [books, searchQuery, activeFilterType, filterLevel, filterStream, filterClass, filterSubject, filterMedium, hierarchy]);

    // Infinite scroll observer
    useEffect(() => {
        if (isLoadingBooks || !observerTarget.current) return;

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
    }, [isLoadingBooks, filteredBooks.length, displayLimit]);

    // Reset pagination on filter change
    useEffect(() => {
        setDisplayLimit(12);
    }, [searchQuery, activeFilterType, filterLevel, filterStream, filterClass, filterSubject, filterMedium]);

    // ═══ 2. Reader Data Loader ═══
    const loadReaderData = async () => {
        setIsLoadingReader(true);
        try {
            const [bookRes, pagesRes, indicesRes] = await Promise.all([
                axios.get(`/v1/knowledge-hub/source-books/${bookId}`),
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/pages`),
                axios.get(`/v1/knowledge-hub/source-books/${bookId}/indices`)
            ]);

            setBookDetails(bookRes.data);
            const sortedPages = (pagesRes.data || []).sort((a, b) => (a.sourcePageNo || a.pageNumber || 0) - (b.sourcePageNo || b.pageNumber || 0));
            setPages(sortedPages);
            setIndices(indicesRes.data || []);
            
            // Load saved highlights from localStorage
            const localSaved = localStorage.getItem(`highlights_${bookId}`);
            if (localSaved) {
                setHighlights(JSON.parse(localSaved));
            } else {
                setHighlights([]);
            }

            // If the book has a pdfPageOffset, find the index of the first page that is page 1 (actualPageNo === 1 or sourcePageNo === pdfPageOffset + 1)
            let startIdx = 0;
            const offset = bookRes.data.pdfPageOffset || 0;
            if (offset > 0) {
                const foundIdx = sortedPages.findIndex(p => (p.actualPageNo === 1) || (p.sourcePageNo === offset + 1));
                if (foundIdx !== -1) {
                    startIdx = foundIdx;
                }
            }
            setCurrentPageIndex(startIdx);
        } catch (err) {
            console.error('Failed to load reader resources:', err);
            alert('বইয়ের ডাটা লোড করতে ব্যর্থ হয়েছে।');
            navigate('/knowledge-hub/reader');
        } finally {
            setIsLoadingReader(false);
        }
    };

    const activePage = pages[currentPageIndex] || null;

    // Resolve Image URL safely
    const getProxiedImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http') && url.includes('r2.dev')) {
            return `/api/v1/public/proxy-image?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    // Current Chapter TOC Mapping
    const currentChapter = useMemo(() => {
        if (!activePage || !indices.length) return null;
        const pageNo = activePage.actualPageNo || activePage.sourcePageNo || activePage.pageNumber;
        return indices.find(ind => pageNo >= ind.startPage && pageNo <= ind.endPage) || null;
    }, [activePage, indices]);

    // ═══ 3. Audiobook (Web Speech API) ═══
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setVoicesList(voices);
            
            // Resolve voice by book language
            const isEnglish = bookDetails?.language === 'English';
            const targetLang = isEnglish ? 'en' : 'bn';
            const bestVoice = voices.find(v => v.lang.toLowerCase().includes(targetLang) || v.lang.toLowerCase().startsWith(targetLang));
            const bnVoice = voices.find(v => v.lang.includes('bn') || v.lang.includes('BD'));
            setSynthVoice(bestVoice || bnVoice || voices[0] || null);
        };
        
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [bookDetails]);

    // Listen to bookshelf auto-play event trigger
    useEffect(() => {
        const triggerAutoPlay = () => {
            setTimeout(() => {
                speakPageText();
            }, 1000);
        };
        window.addEventListener('autoPlayAudioBook', triggerAutoPlay);
        return () => window.removeEventListener('autoPlayAudioBook', triggerAutoPlay);
    }, [pages, currentPageIndex, synthVoice]);

    const speakPageText = useCallback(() => {
        window.speechSynthesis.cancel();
        if (!activePage) return;

        const textToSpeak = activePage.goldenMarkdown || activePage.extractedMarkdown;
        if (!textToSpeak) {
            alert('এই পৃষ্ঠায় পড়ার মতো কোনো টেক্সট পাওয়া যায়নি।');
            setIsPlayingAudio(false);
            return;
        }

        const cleanText = textToSpeak
            .replace(/[#*`_>-\\]/g, '')
            .replace(/<[^>]*>/g, '')
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (synthVoice) utterance.voice = synthVoice;
        utterance.rate = audioSpeed;

        utterance.onend = () => {
            setIsPlayingAudio(false);
        };
        utterance.onerror = () => {
            setIsPlayingAudio(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(true);
    }, [activePage, synthVoice, audioSpeed]);

    const handleAudioPlayPause = () => {
        if (isPlayingAudio) {
            window.speechSynthesis.pause();
            setIsPlayingAudio(false);
        } else {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
                setIsPlayingAudio(true);
            } else {
                speakPageText();
            }
        }
    };

    const handleAudioStop = () => {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
    };

    useEffect(() => {
        if (isPlayingAudio && utteranceRef.current) {
            speakPageText();
        }
    }, [audioSpeed, synthVoice]);

    useEffect(() => {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
    }, [currentPageIndex]);

    // ═══ 4. Highlighting & Notes Engine (Canvas) ═══
    const handleCanvasMouseDown = (page, x, y) => {
        if (!isHighlightMode) return;
        setIsDrawing(true);
        setDrawingPage(page);
        setStartPos({ x, y });
        setActiveRect({ x, y, w: 0, h: 0 });
    };

    const handleCanvasMouseMove = (page, x, y) => {
        if (!isHighlightMode || !isDrawing) return;
        if (drawingPage && drawingPage.id !== page.id) return;
        
        const currentX = x;
        const currentY = y;

        const w = currentX - startPos.x;
        const h = currentY - startPos.y;

        setActiveRect({
            x: w < 0 ? currentX : startPos.x,
            y: h < 0 ? currentY : startPos.y,
            w: Math.abs(w),
            h: Math.abs(h)
        });
    };

    const handleCanvasMouseUp = () => {
        if (!isHighlightMode || !isDrawing) return;
        setIsDrawing(false);
        if (activeRect && activeRect.w > 5 && activeRect.h > 5) {
            setPendingNoteText('');
            setShowNoteModal(true);
        } else {
            setActiveRect(null);
            setDrawingPage(null);
        }
    };

    const saveHighlightNote = () => {
        const targetPage = drawingPage || activePage;
        if (!activeRect || !targetPage) return;
        const newHighlight = {
            id: Date.now().toString(),
            pageNo: targetPage.sourcePageNo || targetPage.pageNumber,
            rect: activeRect,
            color: highlightColor,
            note: pendingNoteText.trim()
        };

        const updated = [...highlights, newHighlight];
        setHighlights(updated);
        localStorage.setItem(`highlights_${bookId}`, JSON.stringify(updated));

        setActiveRect(null);
        setShowNoteModal(false);
        setPendingNoteText('');
        setIsHighlightMode(false);
        setDrawingPage(null);
    };

    const deleteHighlight = (id) => {
        const updated = highlights.filter(h => h.id !== id);
        setHighlights(updated);
        localStorage.setItem(`highlights_${bookId}`, JSON.stringify(updated));
    };

    const getThemeStyles = () => {
        switch (theme) {
            case 'sepia': return { bg: 'bg-[#F4ECD8]', text: 'text-[#4A3B32]', border: 'border-[#E6D9C3]', card: 'bg-[#FAF4E8]' };
            case 'dark': return { bg: 'bg-[#121212]', text: 'text-[#E0E0E0]', border: 'border-[#262626]', card: 'bg-[#1E1E1E]' };
            default: return { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200', card: 'bg-white' };
        }
    };
    const tStyle = getThemeStyles();

    // Render Bookshelf matching Resource Library design
    if (!bookId) {
        const filteredStreams = hierarchy.streams?.filter(s => !filterLevel || s._levelId === filterLevel) || [];
        const filteredClasses = hierarchy.classes?.filter(c => !filterStream || c._streamId === filterStream) || [];
        
        const filteredClassSubjects = hierarchy.classSubjects?.filter(cs => {
            if (filterClass && cs._classId !== filterClass) return false;
            const subData = subjectLanguageMap[cs.id];
            if (!subData) return true;
            if (filterMedium === 'English') return subData.isEnglish === true;
            if (filterMedium === 'Bangla') return subData.isEnglish === false;
            return true;
        }) || [];

        return (
            <div className="w-full h-full flex flex-col bg-[#F8FAFC] relative font-satoshi min-h-screen">
                
                <div className="px-6 my-4">
                    {/* ═══ Cascading Filters & Search Row ═══ */}
                    <div className="sticky top-0 z-30 bg-[#F8FAFC]/80 backdrop-blur-md py-4 space-y-4">
                        <div className="flex flex-col xl:flex-row gap-4">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                                        <option value="MISMATCHED">Mismatch Alert ⚠️</option>
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

                    </div>
                </div>

                {/* ═══ Bookshelf Repository Grid ═══ */}
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
                            <AnimatePresence mode="popLayout">
                                {filteredBooks.slice(0, displayLimit).map((book, idx) => (
                                    <motion.div 
                                        layout
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: idx * 0.03, duration: 0.4, type: "spring", stiffness: 120 }}
                                        key={book.id} 
                                        className="group relative flex flex-col cursor-pointer"
                                    >
                                        {/* ═══ Book Cover with 3D Perspective Effect ═══ */}
                                        <div 
                                            className="relative w-full aspect-[2/3] mb-3"
                                            onClick={() => navigate(`/knowledge-hub/reader/${book.id}`)}
                                        >
                                            {/* 3D Book wrapper */}
                                            <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
                                                
                                                {/* Cover Image */}
                                                {book.coverImageUrl ? (
                                                    <img 
                                                        src={book.coverImageUrl} 
                                                        className="w-full h-full object-cover" 
                                                        alt={book.title} 
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 flex flex-col items-center justify-center gap-2">
                                                        <Book size={36} strokeWidth={1} className="text-slate-300" />
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No Cover</span>
                                                    </div>
                                                )}

                                                {/* Hover Overlay with Actions */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-400 flex flex-col justify-end p-3 z-20">
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/knowledge-hub/reader/${book.id}`); }}
                                                            className="flex-1 bg-white/95 backdrop-blur-sm hover:bg-white text-slate-900 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all duration-200 text-[10px] font-black uppercase tracking-wider shadow-lg"
                                                        >
                                                            <Book size={12} />
                                                            পড়ুন
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/knowledge-hub/reader/${book.id}`);
                                                                setTimeout(() => {
                                                                    window.dispatchEvent(new CustomEvent('autoPlayAudioBook'));
                                                                }, 800);
                                                            }}
                                                            className="bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white p-2 rounded-lg transition-all duration-200 shadow-lg"
                                                            title="অডিওবুক শুনুন"
                                                        >
                                                            <Headphones size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Top-right page count badge */}
                                                {book.totalPages > 0 && (
                                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md z-10">
                                                        {book.totalPages} পৃষ্ঠা
                                                    </div>
                                                )}
                                            </div>

                                            {/* Book Type Badge - Bottom Left */}
                                            <div className="absolute -bottom-1.5 left-2 z-20">
                                                <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border shadow-sm ${getBadgeStyle(book.bookType)}`}>
                                                    {book.bookType.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* ═══ Book Metadata ═══ */}
                                        <div className="px-1 flex-1 flex flex-col" onClick={() => navigate(`/knowledge-hub/reader/${book.id}`)}>
                                            {/* Language tag */}
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {book.language === 'English' && <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase border border-indigo-100">EN</span>}
                                                {book.language === 'Bangla' && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase border border-emerald-100">BN</span>}
                                                {(book.language === 'Bilingual' || book.language === 'Mixed') && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase border border-amber-100">BI</span>}
                                                {hasLanguageMismatch(book) && (
                                                    <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase border border-rose-100 flex items-center gap-0.5" title="Medium mismatch!">
                                                        <AlertCircle size={8} strokeWidth={3} /> !
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 mb-1 group-hover:text-indigo-700 transition-colors duration-300" title={book.title}>
                                                {book.title}
                                            </h3>

                                            {/* Author & Publisher */}
                                            <div className="mt-auto space-y-0.5">
                                                <p className="text-[11px] text-slate-500 font-medium truncate leading-relaxed">
                                                    {book.authorName || 'Unknown Author'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium truncate leading-relaxed">
                                                    {book.publisher || ''}
                                                </p>
                                            </div>
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
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading More...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Render Kindle-Style Reader when bookId is provided
    return (
        <div className={`h-[calc(100vh-140px)] md:h-[calc(100vh-72px)] flex overflow-hidden ${tStyle.bg} ${tStyle.text} font-outfit select-none relative`}>
            
            {/* Sidebar: Table of Contents & Notes */}
            {isSidebarOpen && (
                <div className={`w-80 border-r ${tStyle.border} ${tStyle.card} flex flex-col overflow-hidden animate-in slide-in-from-left duration-200 shrink-0 z-20`}>
                    {/* Tabs Header */}
                    <div className={`flex border-b ${tStyle.border} p-2 gap-1`}>
                        <button
                            onClick={() => setSidebarTab('toc')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                                sidebarTab === 'toc' 
                                ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm' 
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                        >
                            <FileText size={14} />
                            <span>সূচিপত্র (TOC)</span>
                        </button>
                        <button
                            onClick={() => setSidebarTab('notes')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                                sidebarTab === 'notes' 
                                ? 'bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm' 
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                        >
                            <Bookmark size={14} />
                            <span>নোট ও হাইলাইট</span>
                        </button>
                    </div>

                    {/* Tab Body */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {sidebarTab === 'toc' ? (
                            <div className="space-y-2">
                                {indices.length === 0 ? (
                                    <div className="text-center py-10 text-xs font-bold text-slate-400">সূচিপত্র সেট করা নেই।</div>
                                ) : (
                                    indices.map(index => {
                                        const activePageNo = activePage ? (activePage.actualPageNo || activePage.sourcePageNo || activePage.pageNumber) : 0;
                                        const isActive = activePage && activePageNo >= index.startPage && activePageNo <= index.endPage;
                                        return (
                                            <button
                                                key={index.id}
                                                onClick={() => {
                                                    const idx = pages.findIndex(p => (p.actualPageNo === index.startPage) || ((p.sourcePageNo || p.pageNumber) === index.startPage));
                                                    if (idx !== -1) handlePageChange(idx);
                                                }}
                                                className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex justify-between items-center ${
                                                    isActive 
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                                                    : `border-slate-200/50 hover:bg-slate-100 ${tStyle.card}`
                                                }`}
                                            >
                                                <div className="truncate pr-2">
                                                    <p className="truncate font-black">{index.indexName}</p>
                                                    <p className={`text-[9px] mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>{index.categoryName || 'অধ্যায়'}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                                                    P{index.startPage}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {highlights.length === 0 ? (
                                    <div className="text-center py-10 text-xs font-bold text-slate-400">কোনো সেভ করা নোট নেই। পৃষ্ঠার ওপর হাইলাইট করে নোট যোগ করুন।</div>
                                ) : (
                                    highlights.map(h => (
                                        <div key={h.id} className={`p-3 rounded-xl border ${tStyle.border} ${tStyle.card} space-y-2 relative group`}>
                                            <button 
                                                onClick={() => deleteHighlight(h.id)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 p-1 rounded transition-all"
                                                title="মুছে ফেলুন"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: h.color }} />
                                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                    পৃষ্ঠা {(() => {
                                                        const matchingPage = pages.find(p => p.sourcePageNo === h.pageNo);
                                                        return matchingPage ? (matchingPage.actualPageNo || matchingPage.sourcePageNo) : h.pageNo;
                                                    })()}
                                                </span>
                                            </div>
                                            <p className="text-[11px] italic font-medium leading-relaxed bg-slate-50/50 p-1.5 rounded border border-dashed text-slate-600 line-clamp-2">
                                                "{h.highlightedText || 'Highlighted Area'}"
                                            </p>
                                            {h.note && (
                                                <p className="text-xs font-bold text-slate-800 flex items-start gap-1">
                                                    <MessageSquare size={12} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                                                    <span>{h.note}</span>
                                                </p>
                                            )}
                                            <button
                                                onClick={() => {
                                                    const idx = pages.findIndex(p => (p.sourcePageNo || p.pageNumber) === h.pageNo);
                                                    if (idx !== -1) handlePageChange(idx);
                                                }}
                                                className="text-[10px] font-black text-indigo-600 hover:underline pt-1 flex items-center gap-1"
                                            >
                                                <span>পৃষ্ঠায় যান</span>
                                                <ChevronRight size={10} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Reading Board */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Top Control Bar */}
                <div className={`h-14 border-b ${tStyle.border} px-6 flex items-center justify-between z-10 ${tStyle.card}`}>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(s => !s)}
                            className={`p-2 rounded-xl border ${tStyle.border} hover:bg-slate-100 transition-colors`}
                            title={isSidebarOpen ? 'প্যানেল বন্ধ করুন' : 'প্যানেল খুলুন'}
                        >
                            <Sliders size={16} />
                        </button>
                        <div>
                            <h2 className="text-sm font-black truncate max-w-xs">{bookDetails?.title}</h2>
                            <p className="text-[10px] text-slate-400 font-bold truncate">
                                {currentChapter ? currentChapter.indexName : 'অধ্যায় ম্যাপিং হচ্ছে...'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle (Single/Double page) */}
                        <div className={`flex rounded-xl border ${tStyle.border} overflow-hidden bg-white`}>
                            <button
                                onClick={() => {
                                    setViewMode('single');
                                    // Adjust page index to avoid index mismatch
                                    if (currentPageIndex % 2 !== 0 && currentPageIndex > 0) {
                                        setCurrentPageIndex(currentPageIndex - 1);
                                    }
                                }}
                                className={`px-3 py-1.5 text-xs font-bold transition-all ${
                                    viewMode === 'single'
                                    ? 'bg-indigo-600 text-white font-black'
                                    : 'hover:bg-slate-100 text-slate-600'
                                }`}
                                title="সিঙ্গেল পেজ ভিউ"
                            >
                                Single
                            </button>
                            <button
                                onClick={() => setViewMode('double')}
                                className={`px-3 py-1.5 text-xs font-bold transition-all ${
                                    viewMode === 'double'
                                    ? 'bg-indigo-600 text-white font-black'
                                    : 'hover:bg-slate-100 text-slate-600'
                                }`}
                                title="ডাবল পেজ ভিউ"
                            >
                                Double
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className={`flex items-center rounded-xl border ${tStyle.border} bg-white overflow-hidden`}>
                            <button
                                onClick={() => setZoomFactor(prev => Math.max(1.0, prev - 0.25))}
                                disabled={zoomFactor <= 1.0}
                                className="p-2 hover:bg-slate-100 text-slate-600 disabled:opacity-40 transition-colors"
                                title="জুম আউট"
                            >
                                <ZoomOut size={14} />
                            </button>
                            <span className="text-xs font-black px-2 text-slate-700 select-none min-w-[45px] text-center">
                                {Math.round(zoomFactor * 100)}%
                            </span>
                            <button
                                onClick={() => setZoomFactor(prev => Math.min(2.0, prev + 0.25))}
                                disabled={zoomFactor >= 2.0}
                                className="p-2 hover:bg-slate-100 text-slate-600 disabled:opacity-40 transition-colors"
                                title="জুম ইন"
                            >
                                <ZoomIn size={14} />
                            </button>
                        </div>

                        {/* Highlight Toggle Button */}
                        <button
                            onClick={() => setIsHighlightMode(prev => !prev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                isHighlightMode 
                                ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm animate-pulse' 
                                : `hover:bg-slate-100 ${tStyle.border}`
                            }`}
                            title="সমীকরণের ওপর ড্র্যাগ করে হাইলাইট করুন"
                        >
                            <Palette size={14} />
                            <span>{isHighlightMode ? 'হাইলাইট মুড অন' : 'হাইলাইট আঁকুন'}</span>
                        </button>
                        
                        {isHighlightMode && (
                            <div className="flex gap-1 border-l pl-2 mr-2">
                                {['#fbbf24', '#34d399', '#60a5fa', '#f87171'].map(col => (
                                    <button 
                                        key={col}
                                        onClick={() => setHighlightColor(col)}
                                        className={`w-5 h-5 rounded-full border border-black/10 transition-transform ${highlightColor === col ? 'scale-125 ring-2 ring-indigo-500' : ''}`}
                                        style={{ backgroundColor: col }}
                                    />
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowSettings(s => !s)}
                            className={`p-2 rounded-xl border ${tStyle.border} hover:bg-slate-100 transition-colors`}
                            title="রিডিং থিম ও টেক্সট সেটিং"
                        >
                            <Settings size={16} />
                        </button>
                        <button
                            onClick={() => navigate('/knowledge-hub/reader')}
                            className={`p-2 rounded-xl border ${tStyle.border} hover:bg-slate-100 hover:text-rose-500 transition-all`}
                            title="লাইব্রেরীতে ফিরে যান"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Settings Panel (Floating Dropdown) */}
                {showSettings && (
                    <div className={`absolute right-6 top-16 w-60 border ${tStyle.border} rounded-2xl shadow-xl p-4 space-y-4 z-30 ${tStyle.card}`}>
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">রিডিং থিম</span>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setTheme('light')} className={`py-1.5 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 ${theme === 'light' ? 'border-indigo-600 text-indigo-700 bg-indigo-50' : 'border-slate-200 bg-white text-slate-700'}`}>
                                    <Sun size={12} /> Light
                                </button>
                                <button onClick={() => setTheme('sepia')} className={`py-1.5 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 ${theme === 'sepia' ? 'border-[#8F5B34] text-[#8F5B34] bg-[#F4ECD8]' : 'border-slate-200 bg-white text-slate-700'}`}>
                                    Sepia
                                </button>
                                <button onClick={() => setTheme('dark')} className={`py-1.5 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 ${theme === 'dark' ? 'border-slate-700 text-white bg-slate-900' : 'border-slate-200 bg-white text-slate-700'}`}>
                                    <Moon size={12} /> Dark
                                </button>
                            </div>
                        </div>

                        {/* Speech synthesis Voice Select */}
                        <div className="space-y-1.5 pt-2 border-t">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TTS ভয়েস রিডার</span>
                            <select 
                                value={synthVoice ? synthVoice.name : ''}
                                onChange={e => {
                                    const selected = voicesList.find(v => v.name === e.target.value);
                                    if (selected) setSynthVoice(selected);
                                }}
                                className="w-full text-xs font-bold bg-slate-50 border rounded-lg p-2 outline-none cursor-pointer text-slate-700"
                            >
                                {voicesList.filter(v => v.lang.includes('bn') || v.lang.includes('en')).map(v => (
                                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Kindle Canvas Board */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-6 relative custom-scrollbar">
                    {isLoadingReader ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-3">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">পৃষ্ঠা লোড হচ্ছে...</p>
                        </div>
                    ) : pages.length === 0 ? (
                        <div className="text-center py-20">
                            <FileText className="text-slate-300 mx-auto mb-2" size={48} />
                            <p className="text-sm font-bold text-slate-400">এই বইয়ের সাথে কোনো পৃষ্ঠা যুক্ত নেই।</p>
                        </div>
                    ) : (
                        <div 
                            style={{
                                width: `${(viewMode === 'double' ? 960 : 480) * zoomFactor}px`,
                                height: `${640 * zoomFactor}px`,
                                transition: 'width 0.2s ease-out, height 0.2s ease-out'
                            }}
                            className="flex items-center justify-center overflow-visible"
                        >
                            <div style={{
                                transform: `scale(${zoomFactor})`,
                                transformOrigin: 'center center',
                                transition: 'transform 0.2s ease-out',
                                width: viewMode === 'double' ? '960px' : '480px',
                                height: '640px'
                            }} className="flex items-center justify-center shrink-0">
                                <HTMLFlipBook 
                                    width={480}
                                    height={640}
                                    size="stretch"
                                    minWidth={315}
                                    maxWidth={1000}
                                    minHeight={400}
                                    maxHeight={1533}
                                    maxShadowOpacity={0.5}
                                    showCover={false}
                                    mobileScrollSupport={true}
                                    onFlip={onFlip}
                                    ref={pageFlipRef}
                                    startPage={currentPageIndex}
                                    useMouseEvents={zoomFactor === 1.0}
                                    clickEventForward={zoomFactor === 1.0}
                                    usePortrait={viewMode === 'single'}
                                    key={`${viewMode}_${zoomFactor}`}
                                >
                                    {pages.map((page, idx) => (
                                        <FlipPage
                                            key={page.id || idx}
                                            page={page}
                                            highlights={highlights}
                                            highlightColor={highlightColor}
                                            activeRect={drawingPage && drawingPage.id === page.id ? activeRect : null}
                                            isHighlightMode={isHighlightMode}
                                            onMouseDown={handleCanvasMouseDown}
                                            onMouseMove={handleCanvasMouseMove}
                                            onMouseUp={handleCanvasMouseUp}
                                        />
                                    ))}
                                </HTMLFlipBook>
                            </div>
                        </div>
                    )}

                    {/* Left/Right Floating Arrows */}
                    {currentPageIndex > 0 && (
                        <button
                            onClick={() => {
                                if (pageFlipRef.current) {
                                    try {
                                        pageFlipRef.current.pageFlip().flipPrev();
                                    } catch (e) {
                                        handlePageChange(Math.max(0, currentPageIndex - (viewMode === 'double' ? 2 : 1)));
                                    }
                                } else {
                                    handlePageChange(Math.max(0, currentPageIndex - (viewMode === 'double' ? 2 : 1)));
                                }
                            }}
                            className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full border shadow-md active:scale-95 transition-all ${tStyle.border} ${tStyle.card} z-20`}
                            title="পূর্ববর্তী পৃষ্ঠা"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    {currentPageIndex < pages.length - 1 && (
                        <button
                            onClick={() => {
                                if (pageFlipRef.current) {
                                    try {
                                        pageFlipRef.current.pageFlip().flipNext();
                                    } catch (e) {
                                        handlePageChange(Math.min(pages.length - 1, currentPageIndex + (viewMode === 'double' ? 2 : 1)));
                                    }
                                } else {
                                    handlePageChange(Math.min(pages.length - 1, currentPageIndex + (viewMode === 'double' ? 2 : 1)));
                                }
                            }}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full border shadow-md active:scale-95 transition-all ${tStyle.border} ${tStyle.card} z-20`}
                            title="পরবর্তী পৃষ্ঠা"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>

                {/* Bottom Timeline & Audiobook controls */}
                <div className={`border-t ${tStyle.border} p-4 flex flex-col gap-4 ${tStyle.card}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleAudioPlayPause}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
                                    isPlayingAudio 
                                    ? 'bg-amber-500 text-white shadow-amber-200' 
                                    : 'bg-indigo-600 text-white shadow-indigo-200'
                                }`}
                                title={isPlayingAudio ? 'থামুন' : 'শুনুন'}
                            >
                                {isPlayingAudio ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                            </button>
                            <button
                                onClick={handleAudioStop}
                                className={`p-2 rounded-xl border ${tStyle.border} hover:bg-slate-100 hover:text-rose-500 transition-colors`}
                                title="বন্ধ করুন"
                            >
                                <RotateCcw size={15} />
                            </button>

                            <div className="h-6 w-px bg-slate-300 mx-1" />

                            <div className="flex items-center gap-1.5">
                                <Volume2 size={15} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">গতি</span>
                                <select 
                                    value={audioSpeed} 
                                    onChange={e => setAudioSpeed(parseFloat(e.target.value))}
                                    className="text-xs font-bold bg-slate-50 border rounded-lg p-1 text-slate-700"
                                >
                                    <option value={0.75}>0.75x</option>
                                    <option value={1}>1.0x</option>
                                    <option value={1.25}>1.25x</option>
                                    <option value={1.5}>1.5x</option>
                                    <option value={2}>2.0x</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center gap-4 w-full">
                            <span className="text-xs font-bold text-slate-400">
                                P. {activePage ? (activePage.actualPageNo || activePage.sourcePageNo) : 0} 
                                {activePage && activePage.actualPageNo !== activePage.sourcePageNo ? ` (PDF: ${activePage.sourcePageNo})` : ''}
                            </span>
                            <input
                                type="range"
                                min={0}
                                max={pages.length > 0 ? pages.length - 1 : 0}
                                value={currentPageIndex}
                                onChange={(e) => handlePageChange(parseInt(e.target.value))}
                                className="flex-1 accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                            />
                            <span className="text-xs font-bold text-slate-400">{pages.length} Pages</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Note & Highlight Save Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowNoteModal(false); setActiveRect(null); setDrawingPage(null); }}>
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-1.5">
                                <Bookmark size={18} className="text-amber-500" />
                                <span>ব্যক্তিগত নোট ও হাইলাইট</span>
                            </h3>
                            <button onClick={() => { setShowNoteModal(false); setActiveRect(null); setDrawingPage(null); }} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">নোট টাইপ করুন</label>
                            <textarea
                                value={pendingNoteText}
                                onChange={e => setPendingNoteText(e.target.value)}
                                rows={4}
                                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white resize-none font-medium placeholder-slate-400"
                                placeholder="এই পৃষ্ঠার ওপর আপনার মন্তব্য বা নোট লিখুন..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 text-xs font-bold pt-2">
                            <button
                                onClick={() => { setShowNoteModal(false); setActiveRect(null); setDrawingPage(null); }}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200"
                            >
                                বাতিল
                            </button>
                            <button
                                onClick={saveHighlightNote}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-1.5"
                            >
                                <Save size={14} />
                                <span>সংরক্ষণ করুন</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GeneralBookReader;
