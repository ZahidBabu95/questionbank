import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Save, BookOpen, Layers, Search, Plus, Trash2, Loader2, Target, Check, LayoutGrid, ChevronRight, ChevronLeft, Copy, Eye, EyeOff, Bookmark, CheckCircle, BookmarkCheck } from 'lucide-react';
import academicService from '../../../services/academicService';
import examService from '../../../services/examService';
import questionService from '../../../services/questionService';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';
import axios from '../../../utils/axios';
import MarkdownRenderer from '../../../components/MarkdownRenderer';
import CQCombinedRenderer from '../QuestionBank/components/CQCombinedRenderer';
import DynamicQuestionViewer from '../QuestionBank/components/DynamicQuestionViewer';

const formatBanglaNumbers = (text) => {
    if (!text) return text;
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    // Safely replace digits that appear inside parenthesis (like marks)
    return text.toString().replace(/\(([\d.]+)\)/g, (match, p1) => {
        const bnNum = p1.replace(/\d/g, d => banglaDigits[d]);
        return `(${bnNum})`;
    });
};

const toBnNum = (num) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, d => banglaDigits[d]);
};

// React-Markdown ignores markdown inside HTML blocks like <div class="cq-stem">.
// So we must manually parse markdown images into HTML <img> tags first.
const parseMarkdownImages = (text) => {
    if (!text) return text;
    return text.toString().replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
        let finalUrl = url;
        // Route R2 bucket images through proxy to avoid CORS/404 block from direct frontend fetch
        if (url.includes('r2.dev') && !url.includes('proxy-image')) {
            finalUrl = `/api/v1/public/proxy-image?url=${encodeURIComponent(url)}`;
        }
        return `<img src="${finalUrl}" alt="${alt}" referrerPolicy="no-referrer" style="max-width: 100%; max-height: 300px; border-radius: 0.5rem; margin: 0.5rem 0; display: block;" />`;
    });
};

const ManualExamBuilder = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [examId, setExamId] = useState(null);
    const [activeTab, setActiveTab] = useState('results'); // 'filters' | 'results' | 'cart'

    const {
        levels, streams, classes, subjects, chapters: subjectChapters,
        levelId, streamId, classId, subjectId,
        setLevelId, setStreamId, setClassId, setSubjectId,
    } = useAcademicHierarchy();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const isSuperAdmin = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    }) || user?.email === 'admin' || user?.email?.includes('admin@');
    const hasFullLangAccess = isSuperAdmin || user?.instituteName === 'DEFAULT';

    const [examInfo, setExamInfo] = useState({
        title: '',
        durationMinutes: 120,
        language: (user?.instituteMedium && user.instituteMedium.includes(',')) ? 'Bangla' : (user?.instituteMedium || 'Bangla'),
        examType: 'MODEL_TEST'
    });

    // Reverted frontend auto-filtering logic per user request to allow simple database-driven dropdown mapping

    const [dynamicSections, setDynamicSections] = useState([]);
    const [userStructure, setUserStructure] = useState({});
    const [loadingBlueprint, setLoadingBlueprint] = useState(false);

    // Builder States
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [filters, setFilters] = useState({
        chapterId: '', topicId: '', type: '', difficulty: '', keyword: ''
    });

    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [addLoading, setAddLoading] = useState(null); 
    const [cart, setCart] = useState([]); 

    // Background Caching & UI Toggle States
    const [questionsCache, setQuestionsCache] = useState([]);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    const [cacheLoadedSubjectId, setCacheLoadedSubjectId] = useState(null);
    const [savedQuestionIds, setSavedQuestionIds] = useState([]);
    const [visibleAnswers, setVisibleAnswers] = useState({});
    const [visibleExplanations, setVisibleExplanations] = useState({}); 

    const currentMarks = cart.reduce((sum, q) => sum + (q.marks || 0), 0);
    const defaultMarksMap = { 'MCQ': 1, 'CQ': 10, 'SHORT': 2 };

    const targetTotals = Object.entries(userStructure).reduce((acc, [type, struct]) => {
        const count = parseInt(struct.count) || 0;
        const marks = parseFloat(struct.marks) || 1;
        acc.qs += count;
        acc.marks += (count * marks);
        acc[type] = count;
        return acc;
    }, { qs: 0, marks: 0 });

    useEffect(() => {
        if (subjectId) fetchSchema();
        else { setDynamicSections([]); setUserStructure({}); }
    }, [subjectId]);

    const fetchSchema = async () => {
        setLoadingBlueprint(true);
        try {
            const selectedSubjectObj = subjects.find(s => s.classSubjectId == subjectId);
            const selectedClassName = classes.find(c => c.id == classId)?.name;
            if (selectedSubjectObj?.subjectName) {
                const cleanSubjectName = selectedSubjectObj.subjectName.replace(/\s*\([^)]*\)\s*$/, '').trim();
                const subTag = 'RULE_FOR_' + cleanSubjectName.replace(/\s/g, '');
                const altTag = cleanSubjectName;
                const origSubTag = 'RULE_FOR_' + selectedSubjectObj.subjectName.replace(/\s/g, '');
                const origAltTag = selectedSubjectObj.subjectName;

                const kbRes = await axios.get('/v1/support/knowledge');
                let validRules = [
                    ...kbRes.data.filter(k => k.tags && (
                        k.tags.includes(subTag) || 
                        k.tags.includes(altTag) || 
                        k.tags.includes(origSubTag) || 
                        k.tags.includes(origAltTag)
                    )), 
                    ...kbRes.data.filter(k => k.content && (
                        k.content.includes(cleanSubjectName) || 
                        k.content.includes(selectedSubjectObj.subjectName)
                    ))
                ];
                validRules = validRules.filter(k => {
                    try { const p = JSON.parse(k.content); return Array.isArray(p) || (p && p.generation_blueprint); } catch(e) { return false; }
                });

                if (validRules.length > 0) {
                    const matchedRule = validRules.find(r => (r.tags && r.tags.includes(selectedClassName)) || (r.content && r.content.includes(selectedClassName))) || validRules[0];
                    const schemaObj = JSON.parse(matchedRule.content);
                    let sections = [];
                    let initialStruct = {};

                    if (Array.isArray(schemaObj)) {
                        const uniqueTypes = [...new Set(schemaObj.map(r => r.questionType))];
                        sections = uniqueTypes.map(t => {
                            const rule = schemaObj.find(r => r.questionType === t);
                            let tName = t === 'MULTIPLE_CHOICE' ? 'MCQ' : t === 'CREATIVE' ? 'CQ' : t === 'SHORT_ANSWER' ? 'SHORT' : t;
                            return { name: rule.sectionName || tName, type: tName };
                        });
                        schemaObj.forEach(r => {
                            let t = r.questionType === 'MULTIPLE_CHOICE' ? 'MCQ' : r.questionType === 'CREATIVE' ? 'CQ' : r.questionType === 'SHORT_ANSWER' ? 'SHORT' : r.questionType;
                            initialStruct[t] = { count: r.totalQuestions || 0, marks: r.marks || 1 };
                        });
                    } else {
                        sections = schemaObj.generation_blueprint?.mandatory_sections || [];
                        (schemaObj.scraping_rules || []).forEach(r => {
                            let t = r.questionType === 'MULTIPLE_CHOICE' ? 'MCQ' : r.questionType === 'CREATIVE' ? 'CQ' : r.questionType === 'SHORT_ANSWER' ? 'SHORT' : r.questionType;
                            initialStruct[t] = { count: r.totalQuestions || 0, marks: r.marks || 1 };
                        });
                        sections.forEach(sec => {
                            if (!initialStruct[sec.type]) {
                                initialStruct[sec.type] = { count: sec.question_count || 0, marks: 1 };
                            } else if (sec.question_count && initialStruct[sec.type].count === 0) {
                                initialStruct[sec.type].count = sec.question_count;
                            }
                        });
                    }
                    setDynamicSections(sections);
                    setUserStructure(initialStruct);
                } else setDynamicSections([]);
            }
        } catch (e) { console.error(e); } finally { setLoadingBlueprint(false); }
    };

    // Initialize chapters for Step 2
    useEffect(() => {
        if (subjectId && step === 2) {
            setChapters(subjectChapters);
        }
    }, [subjectId, step, subjectChapters]);

    useEffect(() => {
        if (filters.chapterId) {
            academicService.getTopicsByChapter(filters.chapterId).then(setTopics).catch(console.error);
        } else {
            setTopics([]);
        }
    }, [filters.chapterId]);

    const handleCreateDraft = async () => {
        if (!examInfo.title || !subjectId) return alert("Please enter exam name and select subject.");
        if (targetTotals.qs === 0) return alert("Please set a valid question structure.");
        setLoading(true);
        try {
            const res = await examService.createManualExam({
                title: examInfo.title,
                examType: examInfo.examType,
                classSubjectId: subjectId,
                totalMarks: targetTotals.marks || 1,
                durationMinutes: parseInt(examInfo.durationMinutes) || 120,
                language: examInfo.language,
                instructions: "",
                instituteName: JSON.parse(localStorage.getItem('user') || '{}').instituteName || "",
                headerText: "",
                shuffleQuestions: false,
                shuffleOptions: false,
                sections: []
            });
            if (res.success) {
                setExamId(res.data.id);
                setCart(res.data.questions || []);
                setStep(2);
                searchQuestions();
            }
        } catch (e) {
            console.error("Create Draft Error:", e);
            const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || "Unknown API Error";
            alert(`Error creating exam draft: ${errMsg}`);
        } finally {
            setLoading(false);
        }
    };

    // Load favorite question IDs on mount
    useEffect(() => {
        const fetchFavoriteIds = async () => {
            try {
                const ids = await questionService.getMyFavoriteIds();
                if (ids && Array.isArray(ids)) {
                    setSavedQuestionIds(ids);
                }
            } catch (e) {
                console.error("Failed to fetch favorite IDs", e);
            }
        };
        fetchFavoriteIds();
    }, []);

    // Trigger background cache loading
    const triggerBackgroundCache = async (subId, lang) => {
        if (backgroundLoading || cacheLoadedSubjectId === subId) return;
        setBackgroundLoading(true);
        setQuestionsCache([]);
        try {
            let currentPage = 0;
            let hasMore = true;
            let accumulated = [];
            
            while (hasMore) {
                const params = { 
                    classSubjectId: subId, 
                    language: lang,
                    size: 150, 
                    page: currentPage 
                };
                const res = await examService.searchQuestionsForManualExam(params);
                if (res.success && res.data && res.data.content) {
                    const fetched = res.data.content;
                    if (fetched.length === 0) {
                        hasMore = false;
                    } else {
                        accumulated = [...accumulated, ...fetched];
                        // Ensure unique items
                        const uniqueMap = new Map();
                        accumulated.forEach(q => uniqueMap.set(q.id, q));
                        const uniqueList = Array.from(uniqueMap.values());
                        
                        setQuestionsCache(uniqueList);
                        
                        if (fetched.length < 150) {
                            hasMore = false;
                        } else {
                            currentPage++;
                        }
                    }
                } else {
                    hasMore = false;
                }
                // Delay to protect server load
                await new Promise(r => setTimeout(r, 250));
            }
            setCacheLoadedSubjectId(subId);
            // Caching complete, sync UI once
            setTimeout(() => {
                searchQuestions();
            }, 50);
        } catch (e) {
            console.error("Background caching error:", e);
        } finally {
            setBackgroundLoading(false);
        }
    };

    // Trigger background cache when step 2 is active
    useEffect(() => {
        if (step === 2 && subjectId) {
            triggerBackgroundCache(subjectId, examInfo.language);
        }
    }, [step, subjectId, examInfo.language]);

    // Dynamic Main Header updates to prevent double-headers
    useEffect(() => {
        if (step === 2 && examInfo.title) {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
                detail: {
                    title: examInfo.title,
                    subtitle: 'Manual Selection Mode'
                }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
                detail: {
                    title: 'Manual Exam Builder',
                    subtitle: 'Handpick Questions'
                }
            }));
        }
        return () => {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', { detail: null }));
        };
    }, [step, examInfo.title]);

    const searchQuestions = async (e) => {
        if (e) e.preventDefault();
        setSearching(true);
        
        // If we have cached questions, filter locally for instant response!
        if (questionsCache.length > 0) {
            let filtered = [...questionsCache];
            
            if (filters.chapterId) {
                filtered = filtered.filter(q => q.chapter?.id === filters.chapterId || q.chapterId === filters.chapterId);
            }
            if (filters.topicId) {
                filtered = filtered.filter(q => q.topic?.id === filters.topicId || q.topicId === filters.topicId);
            }
            if (filters.type) {
                filtered = filtered.filter(q => q.type === filters.type);
            }
            if (filters.difficulty) {
                filtered = filtered.filter(q => q.difficulty === filters.difficulty);
            }
            if (filters.keyword) {
                const kw = filters.keyword.toLowerCase();
                filtered = filtered.filter(q => 
                    (q.questionText && q.questionText.toLowerCase().includes(kw)) ||
                    (q.stimulus && q.stimulus.toLowerCase().includes(kw))
                );
            }
            
            setSearchResults(filtered);
            setSearching(false);
            return;
        }

        // Fallback to direct API search if cache is not ready
        try {
            const cleanFilters = {};
            Object.entries(filters).forEach(([k, v]) => {
                if (v !== '') cleanFilters[k] = v;
            });
            const params = { classSubjectId: subjectId, language: examInfo.language, ...cleanFilters, size: 50 };
            const res = await examService.searchQuestionsForManualExam(params);
            if (res.success) setSearchResults(res.data.content);
        } catch (e) {
            console.error("Search Questions Error:", e);
            const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || "Unknown Search Error";
            alert(`Error fetching questions: ${errMsg}`);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectAll = async () => {
        const unadded = searchResults.filter(q => !isInCart(q.id));
        if (unadded.length === 0) {
            return alert("All visible questions are already in the cart!");
        }

        const currentCount = cart.length;
        const targetCount = targetTotals.qs;
        const availableSlots = targetCount - currentCount;
        if (availableSlots <= 0) {
            return alert("Maximum question limit reached for this exam!");
        }

        const toAdd = unadded.slice(0, availableSlots);
        setLoading(true);
        try {
            let updatedQuestions = [...cart];
            for (const q of toAdd) {
                const payload = { questionId: q.id, marks: defaultMarksMap[q.type] || 1, sectionId: null };
                const res = await examService.addQuestionToManualExam(examId, payload);
                if (res.success) {
                    updatedQuestions = res.data.questions;
                    setCart(updatedQuestions);
                }
            }
            alert(`Successfully added ${toAdd.length} questions to the cart.`);
        } catch (e) {
            console.error("Select All Error:", e);
            alert("Error adding some questions to cart.");
        } finally {
            setLoading(false);
        }
    };

    // Toggle Favorite Action
    const handleToggleSaveQuestion = async (q) => {
        try {
            const res = await questionService.toggleFavorite(q.id);
            if (res.success) {
                if (savedQuestionIds.includes(q.id)) {
                    setSavedQuestionIds(savedQuestionIds.filter(id => id !== q.id));
                } else {
                    setSavedQuestionIds([...savedQuestionIds, q.id]);
                }
            }
        } catch (e) {
            console.error("Save question error:", e);
            alert("Failed to save question");
        }
    };

    // Answer and Explanation Toggles
    const toggleAnswerVisibility = (id) => {
        setVisibleAnswers(prev => ({ ...prev, [id]: !prev[id] }));
    };
    const toggleExplanationVisibility = (id) => {
        setVisibleExplanations(prev => ({ ...prev, [id]: !prev[id] }));
    };
    const isAnswerVisible = (id) => !!visibleAnswers[id];
    const isExplanationVisible = (id) => !!visibleExplanations[id];
    const isQuestionSaved = (id) => savedQuestionIds.includes(id);



    // Triggers local or remote filter updates
    useEffect(() => {
        if (step === 2) {
            const timer = setTimeout(() => {
                searchQuestions();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [filters.chapterId, filters.topicId, filters.type, filters.difficulty, filters.keyword, examInfo.language, step]);

    const handleAddQuestion = async (q, marks) => {
        if (cart.length >= targetTotals.qs) return alert("Maximum question limit reached for this exam!");
        setAddLoading(q.id);
        try {
            const payload = { questionId: q.id, marks: marks || defaultMarksMap[q.type] || 1, sectionId: null };
            const res = await examService.addQuestionToManualExam(examId, payload);
            if (res.success) setCart(res.data.questions);
        } catch (e) {
            alert("Error adding question");
        } finally {
            setAddLoading(null);
        }
    };

    const handleRemoveQuestion = async (questionId) => {
        try {
            const res = await examService.removeQuestionFromManualExam(examId, questionId);
            if (res.success) setCart(res.data.questions);
        } catch (e) {}
    };

    const handlePublish = async () => {
        if (cart.length === 0) return alert("Select at least one question to publish.");
        try {
            setLoading(true);
            const res = await examService.publishManualExam(examId);
            if (res.success) navigate(`/exams/generate/nexus-editor/${examId}`);
        } catch (e) {
            alert("Failed to publish exam.");
        } finally {
            setLoading(false);
        }
    };

    const isInCart = (id) => cart.some(eq => eq.originalQuestionId === id);

    const selectCls = "w-full bg-white/50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all disabled:opacity-40 hover:border-slate-300";
    const inputCls = "w-full bg-white/50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all hover:border-slate-300";
    // --- STEP 2: DUAL PANE BUILDER ---
    if (step === 2) {
        return (
            <div className="min-h-screen bg-slate-50 font-outfit text-slate-800 flex flex-col h-screen overflow-hidden">
                {/* Mobile Tab Swapper Bar */}
                <div className="lg:hidden flex border-b border-slate-200 bg-white shrink-0">
                    <button
                        onClick={() => setActiveTab('filters')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'filters' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Filters
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative ${activeTab === 'results' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Questions ({searchResults.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('cart')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative ${activeTab === 'cart' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Cart ({cart.length})
                    </button>
                </div>

                <div className="flex-1 flex gap-4 overflow-hidden relative p-4 max-w-[1600px] w-full mx-auto">
                    {/* LEFT: Search Panel */}
                    <div className={`w-full lg:w-80 bg-white rounded-2xl lg:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col shrink-0 overflow-hidden ${activeTab === 'filters' ? 'flex' : 'hidden lg:flex'}`}>
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-black text-slate-800 flex items-center gap-2"><Search size={18} className="text-emerald-500" /> Question Bank</h2>
                        </div>
                        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                            <form onSubmit={searchQuestions} className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Chapter</label>
                                    <select value={filters.chapterId} onChange={(e) => setFilters({ ...filters, chapterId: e.target.value })} className={selectCls}>
                                        <option value="">All Chapters</option>
                                        {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Topic</label>
                                    <select value={filters.topicId} onChange={(e) => setFilters({ ...filters, topicId: e.target.value })} className={selectCls}>
                                        <option value="">All Topics</option>
                                        {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Type</label>
                                        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className={selectCls}>
                                            <option value="">Any</option>
                                            <option value="MCQ">MCQ</option>
                                            <option value="CQ">CQ</option>
                                            <option value="SHORT">Short</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Difficulty</label>
                                        <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })} className={selectCls}>
                                            <option value="">Any</option>
                                            <option value="EASY">Easy</option>
                                            <option value="MEDIUM">Med</option>
                                            <option value="HARD">Hard</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Keyword</label>
                                    <input type="text" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} className={inputCls} placeholder="Search text..." />
                                </div>
                                <button type="submit" disabled={searching} className="w-full py-3 bg-emerald-50 text-emerald-700 font-black rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2">
                                    {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} Find Questions
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* MIDDLE: Search Results */}
                    <div className={`flex-1 bg-white rounded-2xl lg:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col min-w-0 overflow-hidden ${activeTab === 'results' ? 'flex' : 'hidden lg:flex'}`}>
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3 flex-wrap">
                            <h2 className="font-black text-slate-800 flex items-center gap-2"><Target size={18} className="text-violet-500" /> Results</h2>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                {backgroundLoading && (
                                    <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 animate-pulse shrink-0">
                                        <Loader2 size={11} className="animate-spin text-indigo-500" />
                                        সব প্রশ্ন লোড হচ্ছে ({questionsCache.length} টি ক্যাশড)
                                    </span>
                                )}
                                {searchResults.length > 0 && (
                                    <button 
                                        onClick={handleSelectAll} 
                                        disabled={loading || cart.length >= targetTotals.qs}
                                        className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl font-black uppercase tracking-wider hover:bg-emerald-100 transition-all disabled:opacity-50"
                                    >
                                        Select All
                                    </button>
                                )}
                                <span className="text-[11px] bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full font-black uppercase tracking-wider">{searchResults.length} found</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 bg-slate-50/30">
                            {searching ? (
                                <div className="flex items-center justify-center h-full text-slate-400"><Loader2 size={32} className="animate-spin" /></div>
                            ) : searchResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <Search size={48} className="text-slate-200 mb-4" />
                                    <p className="font-bold">No questions found.</p>
                                </div>
                            ) : (
                                searchResults.map((q, idx) => {
                                    const inCart = isInCart(q.id);

                                    // Extract fallback explanations for dynamic questions
                                    let finalExplanation = q.explanation;
                                    if (!finalExplanation && q.dynamicData) {
                                        let dData = q.dynamicData;
                                        if (typeof dData === 'string') {
                                            try { dData = JSON.parse(dData); } catch (e) {}
                                        }
                                        if (dData && typeof dData === 'object') {
                                            const expKey = Object.keys(dData).find(k => k.toLowerCase().includes('explanation'));
                                            if (expKey) finalExplanation = dData[expKey];
                                        }
                                    }

                                    const isStructuredCQAnswer = q.type === 'CQ' && q.correctAnswer && q.correctAnswer.includes('cq-ans-part');
                                    const isStructuredCQExplanation = q.type === 'CQ' && finalExplanation && finalExplanation.includes('cq-exp-part');
                                    const hasCQAnswer = q.correctAnswer && q.correctAnswer.replace(/<[^>]*>/g, '').trim().length > 0;
                                    const hasCQExplanation = finalExplanation && finalExplanation.replace(/<[^>]*>/g, '').trim().length > 0;

                                    const typeLabel = q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'CQ' ? 'Creative' : q.type === 'SHORT' ? 'Short Answer' : q.type;

                                    const showAnswer = isAnswerVisible(q.id);
                                    const showExplanation = isExplanationVisible(q.id);

                                    return (
                                        <div key={q.id} className={`p-4 sm:p-5 rounded-2xl border transition-all flex gap-3 sm:gap-5 items-start ${inCart ? 'border-emerald-300 bg-emerald-50/50 opacity-80' : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md'}`}>
                                            <div className="flex-1 min-w-0">
                                                {/* Unified Badge Metadata Row */}
                                                <div className="flex items-center gap-2 flex-wrap mb-3.5">
                                                    <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Q #{idx + 1}</span>
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">{typeLabel}</span>
                                                    
                                                    {q.status === 'APPROVED' && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold uppercase border border-emerald-100">Approved</span>}
                                                    {q.status === 'PENDING' && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold uppercase border border-amber-100">Pending</span>}
                                                    {q.status === 'REVISED' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold uppercase animate-pulse border border-rose-200">Revised</span>}
                                                    {q.aiGenerated && <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md text-[10px] font-bold uppercase border border-violet-100">AI Synced</span>}
                                                    
                                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">
                                                        {q.difficulty}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200">
                                                        {examInfo.language === 'Bangla' ? `${toBnNum(defaultMarksMap[q.type] || 1)} মার্কস` : `${defaultMarksMap[q.type] || 1} Marks`}
                                                    </span>
                                                </div>

                                                {/* CQ Stimulus/Stem rendering (if not already embedded in questionText) */}
                                                {(() => {
                                                    if (!q.stimulus) return null;
                                                    const cleanStimulus = q.stimulus.replace(/<[^>]*>/g, '').trim().toLowerCase();
                                                    const isPlaceholder = 
                                                        cleanStimulus === '' || 
                                                        cleanStimulus === 'generated question' || 
                                                        cleanStimulus === 'dynamic question' || 
                                                        cleanStimulus === 'ডায়নামিক প্রশ্ন' ||
                                                        cleanStimulus === 'ডায়নামিক প্রশ্ন';
                                                    if (isPlaceholder) return null;
                                                    return (
                                                        <div className="mb-3 px-4 py-3 bg-slate-50 border border-slate-200 border-l-4 border-l-indigo-400 rounded-r-xl text-[13px] text-slate-700 font-medium leading-relaxed">
                                                            <MarkdownRenderer content={parseMarkdownImages(q.stimulus)} />
                                                        </div>
                                                    );
                                                })()}

                                                {/* Question text with structured support */}
                                                <div className="text-[14px] font-semibold text-slate-800 leading-snug">
                                                    {q.type === 'CQ' ? (
                                                        <CQCombinedRenderer q={q} showAnswer={showAnswer} showExplanation={showExplanation} />
                                                    ) : q.dynamicData ? (
                                                        <DynamicQuestionViewer q={q} mode="list" showAnswer={showAnswer} showExplanation={showExplanation} />
                                                    ) : (
                                                        <MarkdownRenderer content={parseMarkdownImages(examInfo.language === 'Bangla' ? formatBanglaNumbers(q.questionText) : q.questionText)} />
                                                    )}
                                                </div>
                                                
                                                {/* Statements for MULTIPLE_COMPLETION */}
                                                {!q.dynamicData && q.mcqType === 'MULTIPLE_COMPLETION' && q.statements && q.statements.length > 0 && (
                                                    <div className="mt-2 pl-4 border-l-2 border-primary/20 space-y-1">
                                                        {q.statements.map((stmt, sIdx) => (
                                                            <div key={sIdx} className="text-[12px] text-slate-600 font-medium leading-snug">
                                                                <MarkdownRenderer content={parseMarkdownImages(examInfo.language === 'Bangla' ? formatBanglaNumbers(stmt) : stmt)} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* MCQ Options with high premium correct option highlight */}
                                                {q.type === 'MCQ' && q.options && q.options.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
                                                        {q.options.map((opt, oIdx) => {
                                                            const isEnglish = q.language && q.language.toLowerCase() === 'english';
                                                            const displayLabel = isEnglish ? String.fromCharCode(65 + oIdx) : (['ক', 'খ', 'গ', 'ঘ'][oIdx] || String.fromCharCode(65 + oIdx));
                                                            return (
                                                                <div key={opt.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[13px] font-medium transition-all duration-300 ${
                                                                    showAnswer && opt.isCorrect
                                                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm'
                                                                        : showAnswer && !opt.isCorrect
                                                                        ? 'bg-white border-slate-200 text-slate-400 opacity-60'
                                                                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/70 hover:border-slate-300'
                                                                }`}>
                                                                    <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black transition-all duration-300 ${
                                                                        showAnswer && opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                                                                    }`}>
                                                                        {displayLabel}
                                                                    </span>
                                                                    <span className="flex-1 min-w-0"><MarkdownRenderer content={parseMarkdownImages(opt.optionText)} /></span>
                                                                    {showAnswer && opt.isCorrect && <CheckCircle size={14} className="text-emerald-500 ml-auto shrink-0 animate-in zoom-in-50 duration-200" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Non-MCQ: Correct Answer Block */}
                                                {showAnswer && q.type !== 'MCQ' && !q.dynamicData && (q.type !== 'CQ' || !isStructuredCQAnswer) && q.correctAnswer && hasCQAnswer && (
                                                    <div className="mt-3.5 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-[13px] text-emerald-900 font-semibold leading-relaxed flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <CheckCircle size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            {q.type === 'CQ' && <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1 pl-0.5">সৃজনশীল উত্তর (পুরাতন/আনস্ট্রাকচার্ড ফরম্যাট):</span>}
                                                            <span><MarkdownRenderer content={parseMarkdownImages(q.correctAnswer)} /></span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Non-MCQ: Explanation Block */}
                                                {showExplanation && !q.dynamicData && (q.type !== 'CQ' || !isStructuredCQExplanation) && finalExplanation && hasCQExplanation && (
                                                    <div className="mt-3.5 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-[13px] text-blue-900 leading-relaxed flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <BookOpen size={15} className="text-blue-500 mt-0.5 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            {q.type === 'CQ' && <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1 pl-0.5">সৃজনশীল ব্যাখ্যা (পুরাতন/আনস্ট্রাকচার্ড ফরম্যাট):</span>}
                                                            <span><MarkdownRenderer content={parseMarkdownImages(finalExplanation)} /></span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-28 sm:w-32 shrink-0 flex flex-col items-stretch justify-between border-l border-slate-100 pl-3 sm:pl-4 gap-4 self-stretch">
                                                <div className="flex flex-col items-stretch w-full gap-2.5 sticky top-3">
                                                    {/* Top Marks - visual label */}
                                                    <div className="text-[10px] font-black text-slate-400 text-center uppercase tracking-wider mb-0.5">
                                                        {examInfo.language === 'Bangla' ? `${toBnNum(defaultMarksMap[q.type] || 1)} মার্কস` : `${defaultMarksMap[q.type] || 1} Marks`}
                                                    </div>

                                                    {/* Show Answer Toggle */}
                                                    <button 
                                                        onClick={() => toggleAnswerVisibility(q.id)}
                                                        className={`text-[10px] sm:text-[11px] font-black px-2 py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 active:scale-95 w-full ${
                                                            showAnswer
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {showAnswer ? (
                                                            <><EyeOff size={12} strokeWidth={2.5} /> Hide Ans</>
                                                        ) : (
                                                            <><Eye size={12} strokeWidth={2.5} /> Show Ans</>
                                                        )}
                                                    </button>

                                                    {/* Show Explanation Toggle */}
                                                    <button 
                                                        onClick={() => toggleExplanationVisibility(q.id)}
                                                        className={`text-[10px] sm:text-[11px] font-black px-2 py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 active:scale-95 w-full ${
                                                            showExplanation
                                                                ? 'bg-violet-50 border-violet-200 text-violet-700'
                                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {showExplanation ? (
                                                            <><EyeOff size={12} strokeWidth={2.5} /> Hide Exp</>
                                                        ) : (
                                                            <><Eye size={12} strokeWidth={2.5} /> Show Exp</>
                                                        )}
                                                    </button>

                                                    {/* Save Button */}
                                                    <button 
                                                        onClick={() => handleToggleSaveQuestion(q)}
                                                        className={`text-[10px] sm:text-[11px] font-black px-2 py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 active:scale-95 w-full ${
                                                            isQuestionSaved(q.id) 
                                                                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {isQuestionSaved(q.id) ? (
                                                            <><BookmarkCheck size={12} strokeWidth={2.5} className="fill-amber-500 text-amber-600" /> Saved</>
                                                        ) : (
                                                            <><Bookmark size={12} strokeWidth={2.5} /> Save</>
                                                        )}
                                                    </button>

                                                    {/* Add to exam button */}
                                                    <button
                                                        onClick={() => handleAddQuestion(q)}
                                                        disabled={inCart || addLoading === q.id || cart.length >= targetTotals.qs}
                                                        className={`w-full py-2.5 rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all mt-1 ${inCart ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed border border-emerald-200' : 'bg-white border text-slate-700 hover:bg-slate-50 hover:border-slate-300 border-slate-200 active:scale-95'}`}
                                                    >
                                                        {addLoading === q.id ? <Loader2 size={12} className="animate-spin" /> : inCart ? <><Check size={12} strokeWidth={3} /> Added</> : <><Plus size={12} strokeWidth={3} /> Add</>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Blueprint Cart */}
                    <div className={`w-full lg:w-80 bg-white rounded-2xl lg:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col shrink-0 overflow-hidden relative ${activeTab === 'cart' ? 'flex' : 'hidden lg:flex'}`}>
                        <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        <div className="p-5 border-b border-slate-100 bg-white">
                            <h2 className="font-black flex items-center gap-2 text-slate-800 text-lg mb-4">
                                <BookOpen size={20} className="text-emerald-500" /> Exam Cart
                            </h2>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="flex justify-between text-[11px] font-black uppercase mb-2">
                                    <span className={currentMarks > targetTotals.marks ? 'text-rose-500' : 'text-slate-500'}>Score: {currentMarks}</span>
                                    <span className="text-emerald-600">Target: {targetTotals.marks}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all ${currentMarks > targetTotals.marks ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((currentMarks / targetTotals.marks) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/50">
                            {cart.length === 0 ? (
                                <div className="text-center p-6 text-slate-400 text-[11px] font-black uppercase tracking-widest pt-20 flex flex-col items-center">
                                    <Layers size={40} className="mb-3 text-slate-200" /> Cart is empty
                                </div>
                            ) : (
                                cart.map((q, idx) => (
                                    <div key={q.id} className="p-3 bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between group shadow-sm transition-all hover:shadow-md">
                                        <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</div>
                                        <div className="flex-1 min-w-0 px-3">
                                            <div className="text-[13px] font-bold text-slate-700 truncate" dangerouslySetInnerHTML={{ __html: q.questionText?.substring(0, 40) + '...' }} />
                                            <div className="text-[10px] font-black text-slate-400 uppercase mt-0.5">{q.type} <span className="text-slate-300 mx-1">•</span> {q.marks} Marks</div>
                                        </div>
                                        <button onClick={() => handleRemoveQuestion(q.originalQuestionId)} className="w-8 h-8 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all shrink-0">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Floating Action Bar for Step 2 */}
                <div className="fixed bottom-0 left-0 lg:left-64 right-0 backdrop-blur-md bg-white/90 border-t border-slate-200 p-3 sm:p-4 z-50 flex justify-between items-center shadow-[0_-10px_30px_rgb(0,0,0,0.05)]">
                    <div className="max-w-[1600px] w-full mx-auto flex flex-row justify-between items-center gap-3">
                        <div className="flex flex-col items-start">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cart Target</div>
                            <div className="text-xs sm:text-sm font-black text-slate-700">
                                {cart.length} / {targetTotals.qs} Qs 
                                <span className="text-slate-300 mx-1.5 sm:mx-2">•</span> 
                                <span className="text-emerald-600">{currentMarks} / {targetTotals.marks} Marks</span>
                            </div>
                        </div>
                        <button 
                            onClick={handlePublish} 
                            disabled={loading || cart.length === 0} 
                            className={`px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all shadow-xl hover:-translate-y-0.5 ${cart.length > 0 && !loading ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                            Publish Paper
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- STEP 1 (WIZARD) ---
    return (
        <div className="min-h-screen bg-slate-50 font-outfit pb-24 pt-4">

            <div className="max-w-[1600px] w-full mx-auto p-4 md:p-8 mt-2">
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT: Basic Info */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-6">
                                    <Layers className="text-emerald-500" /> Exam Configuration
                                </h2>
                                <div className="space-y-5">
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Exam Title</label>
                                        <input type="text" value={examInfo.title} onChange={e => setExamInfo({...examInfo, title: e.target.value})} className={inputCls} placeholder="e.g. Weekly Manual Test" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Level</label><select value={levelId} onChange={e => setLevelId(e.target.value)} className={selectCls}><option value="">Select Level</option>{levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                                        <div><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Stream</label><select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className={selectCls}><option value="">Select Stream</option>{streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                        <div><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Class</label><select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className={selectCls}><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                        <div><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Subject</label><select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className={selectCls}><option value="">Select Subject</option>{subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}</select></div>
                                        <div><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Language</label><select value={examInfo.language} onChange={e => setExamInfo({...examInfo, language: e.target.value})} disabled={!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual')} className={selectCls + (!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual') ? ' opacity-50' : '')}>{(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bangla') || user.instituteMedium.includes('Bilingual')) && <option value="Bangla">Bangla</option>}{(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('English') || user.instituteMedium.includes('Bilingual')) && <option value="English">English</option>}{(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bilingual')) && <option value="Bilingual">Bilingual</option>}</select></div>
                                        <div><label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Duration (Min)</label><input type="number" value={examInfo.durationMinutes} onChange={e => setExamInfo({...examInfo, durationMinutes: e.target.value})} className={inputCls} /></div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Blueprint Structure */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full -mr-10 -mt-10 opacity-50 z-0"></div>
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2"><Target className="text-emerald-500" /> Target Blueprint</h2>
                                        <p className="text-sm text-slate-500 mb-6 font-medium">Define your target question counts for manual picking.</p>

                                        {loadingBlueprint ? (
                                            <div className="py-12 flex flex-col items-center justify-center text-emerald-500"><Loader2 size={32} className="animate-spin mb-3" /><span className="font-bold">Loading Structure...</span></div>
                                        ) : !subjectId ? (
                                            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Select a subject to load the blueprint.</div>
                                        ) : (
                                            <div className="space-y-4">
                                                {dynamicSections.map(sec => (
                                                    <div key={sec.type} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-emerald-200 transition-all hover:shadow-sm">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div className="font-bold text-slate-800">{sec.name}</div>
                                                            <div className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase">{sec.type}</div>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target Qs</label><input type="number" min="0" value={userStructure[sec.type]?.count ?? ""} onChange={e => setUserStructure({...userStructure, [sec.type]: { ...userStructure[sec.type], count: e.target.value }})} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-center font-black text-slate-700 outline-none focus:border-emerald-500" /></div>
                                                            <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Marks/Q</label><input type="number" min="1" value={userStructure[sec.type]?.marks ?? ""} onChange={e => setUserStructure({...userStructure, [sec.type]: { ...userStructure[sec.type], marks: e.target.value }})} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-center font-black text-slate-700 outline-none focus:border-emerald-500" /></div>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="mt-6 pt-6 border-t border-slate-100">
                                                    <div className="bg-slate-800 text-white rounded-2xl p-5 shadow-lg shadow-slate-800/20">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cart Capacity</div>
                                                        <div className="text-3xl font-black text-emerald-400">{targetTotals.marks} <span className="text-lg font-bold text-slate-300">Marks</span> / {targetTotals.qs} <span className="text-lg font-bold text-slate-300">Qs</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 lg:left-64 right-0 backdrop-blur-md bg-white/90 border-t border-slate-200 p-3 sm:p-4 z-50 flex justify-between items-center shadow-[0_-10px_30px_rgb(0,0,0,0.05)]">
                <div className="max-w-[1600px] w-full mx-auto flex flex-row justify-between items-center gap-3">
                    <div className="flex flex-col items-start">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Blueprint Target</div>
                        <div className="text-xs sm:text-sm font-black text-slate-700">
                            {targetTotals.qs} Qs 
                            <span className="text-slate-300 mx-1.5 sm:mx-2">•</span> 
                            <span className="text-emerald-600">{targetTotals.marks} Marks</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleCreateDraft}
                        disabled={loading || !subjectId || targetTotals.qs === 0}
                        className="px-6 sm:px-10 py-2.5 sm:py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <span>Start Manual Selection</span>}
                        {!loading && <ChevronRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualExamBuilder;
