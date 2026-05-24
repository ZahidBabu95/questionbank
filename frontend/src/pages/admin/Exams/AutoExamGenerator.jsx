import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, LayoutGrid, ChevronRight, ChevronLeft, CheckCircle2, Target, BookOpen, ChevronDown, ChevronUp, Loader2, ListChecks, BrainCircuit, AlertCircle } from 'lucide-react';
import academicService from '../../../services/academicService';
import examService from '../../../services/examService';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';
import axios from '../../../utils/axios';

const AutoExamGenerator = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const {
        levels, streams, classes, subjects, chapters,
        levelId, streamId, classId, subjectId,
        setLevelId, setStreamId, setClassId, setSubjectId,
        restoreHierarchy
    } = useAcademicHierarchy({ activeOnly: true });

    const location = useLocation();

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const isSuperAdmin = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    }) || user?.email === 'admin' || user?.email?.includes('admin@');
    const hasFullLangAccess = isSuperAdmin || user?.instituteName === 'DEFAULT';

    const [examInfo, setExamInfo] = useState({
        title: '',
        duration: 120,
        language: (user?.instituteMedium && user.instituteMedium.includes(',')) ? 'Bangla' : (user?.instituteMedium || 'Bangla'),
        examType: 'MODEL_TEST'
    });

    useEffect(() => {
        if (location.state?.prefill && !subjectId) {
            const prefill = location.state.prefill;
            const resolveHierarchyAndRestore = async () => {
                try {
                    const { data } = await axios.get(`/v1/academic/class-subjects/${prefill.subjectId}/hierarchy`);
                    
                    if (data && data.levelId) {
                        restoreHierarchy({
                            levelId: data.levelId,
                            streamId: data.streamId,
                            classId: data.classId,
                            classSubjectId: data.classSubjectId,
                            chapterId: prefill.chapterId || ''
                        });

                        setExamInfo(prev => ({ ...prev, title: prefill.title }));
                        
                        if (prefill.difficulty) {
                            if (prefill.difficulty === 'Easy') setDifficulty({ easy: 50, medium: 40, hard: 10 });
                            if (prefill.difficulty === 'Medium') setDifficulty({ easy: 30, medium: 50, hard: 20 });
                            if (prefill.difficulty === 'Hard') setDifficulty({ easy: 20, medium: 30, hard: 50 });
                        }
                        
                        setStep(2);
                    }
                } catch (e) {
                    console.error("Failed to auto-restore hierarchy from prefill", e);
                }
            };
            resolveHierarchyAndRestore();
        }
    }, [location.state]);

    const [dynamicSections, setDynamicSections] = useState([]);
    const [userStructure, setUserStructure] = useState({});
    const [loadingBlueprint, setLoadingBlueprint] = useState(false);
    
    // Syllabus Allocation State
    // Format: { chapterId: { MCQ: 5, CQ: 2 }, topicId: { MCQ: 2, CQ: 0 } }
    const [allocations, setAllocations] = useState({});
    const [expandedChapters, setExpandedChapters] = useState([]);
    const [chapterTopics, setChapterTopics] = useState({}); // { chId: [topics] }
    const [topicsLoading, setTopicsLoading] = useState({});

    const [difficulty, setDifficulty] = useState({ easy: 30, medium: 50, hard: 20 });

    const [expandedCategories, setExpandedCategories] = useState([]);

    // Group chapters by category
    const groupedChapters = React.useMemo(() => {
        const groups = {};
        chapters.forEach(ch => {
            const cat = ch.categoryName || 'অন্যান্য';
            if (!groups[cat]) {
                groups[cat] = [];
            }
            groups[cat].push(ch);
        });
        return groups;
    }, [chapters]);

    // Initialize expanded categories when chapters load
    useEffect(() => {
        if (chapters.length > 0) {
            const categories = [...new Set(chapters.map(ch => ch.categoryName || 'অন্যান্য'))];
            setExpandedCategories(categories);
        }
    }, [chapters]);

    const toggleCategoryExpand = (categoryName) => {
        if (expandedCategories.includes(categoryName)) {
            setExpandedCategories(expandedCategories.filter(cat => cat !== categoryName));
        } else {
            setExpandedCategories([...expandedCategories, categoryName]);
        }
    };

    const getCategoryStyles = (category) => {
        switch (category) {
            case 'গদ্য':
                return {
                    border: 'border-emerald-200',
                    bg: 'bg-emerald-50/50',
                    text: 'text-emerald-800',
                    badge: 'bg-emerald-100 text-emerald-700',
                    accent: 'from-emerald-500 to-teal-600',
                    iconBg: 'bg-emerald-100 text-emerald-600',
                    sidebar: 'border-l-emerald-500'
                };
            case 'পদ্য':
            case 'কবিতা':
                return {
                    border: 'border-rose-200',
                    bg: 'bg-rose-50/50',
                    text: 'text-rose-800',
                    badge: 'bg-rose-100 text-rose-700',
                    accent: 'from-rose-500 to-pink-600',
                    iconBg: 'bg-rose-100 text-rose-600',
                    sidebar: 'border-l-rose-500'
                };
            case 'উপন্যাস':
            case 'সহপাঠ':
                return {
                    border: 'border-violet-200',
                    bg: 'bg-violet-50/50',
                    text: 'text-violet-800',
                    badge: 'bg-violet-100 text-violet-700',
                    accent: 'from-violet-500 to-purple-600',
                    iconBg: 'bg-violet-100 text-violet-600',
                    sidebar: 'border-l-violet-500'
                };
            case 'নাটক':
                return {
                    border: 'border-amber-200',
                    bg: 'bg-amber-50/50',
                    text: 'text-amber-800',
                    badge: 'bg-amber-100 text-amber-700',
                    accent: 'from-amber-500 to-orange-600',
                    iconBg: 'bg-amber-100 text-amber-600',
                    sidebar: 'border-l-amber-500'
                };
            case 'অন্যান্য':
                return {
                    border: 'border-slate-200',
                    bg: 'bg-slate-50/50',
                    text: 'text-slate-800',
                    badge: 'bg-slate-100 text-slate-700',
                    accent: 'from-slate-500 to-slate-600',
                    iconBg: 'bg-slate-100 text-slate-600',
                    sidebar: 'border-l-slate-500'
                };
            default:
                // Generate a stable color scheme based on category name hash
                let hash = 0;
                if (category) {
                    for (let i = 0; i < category.length; i++) {
                        hash = category.charCodeAt(i) + ((hash << 5) - hash);
                    }
                }
                const colorPalettes = [
                    {
                        border: 'border-indigo-200',
                        bg: 'bg-indigo-50/50',
                        text: 'text-indigo-800',
                        badge: 'bg-indigo-100 text-indigo-700',
                        accent: 'from-indigo-500 to-blue-600',
                        iconBg: 'bg-indigo-100 text-indigo-600',
                        sidebar: 'border-l-indigo-500'
                    },
                    {
                        border: 'border-teal-200',
                        bg: 'bg-teal-50/50',
                        text: 'text-teal-800',
                        badge: 'bg-teal-100 text-teal-700',
                        accent: 'from-teal-500 to-emerald-600',
                        iconBg: 'bg-teal-100 text-teal-600',
                        sidebar: 'border-l-teal-500'
                    },
                    {
                        border: 'border-sky-200',
                        bg: 'bg-sky-50/50',
                        text: 'text-sky-800',
                        badge: 'bg-sky-100 text-sky-700',
                        accent: 'from-sky-500 to-blue-500',
                        iconBg: 'bg-sky-100 text-sky-600',
                        sidebar: 'border-l-sky-500'
                    },
                    {
                        border: 'border-orange-200',
                        bg: 'bg-orange-50/50',
                        text: 'text-orange-800',
                        badge: 'bg-orange-100 text-orange-700',
                        accent: 'from-orange-500 to-amber-600',
                        iconBg: 'bg-orange-100 text-orange-600',
                        sidebar: 'border-l-orange-500'
                    },
                    {
                        border: 'border-pink-200',
                        bg: 'bg-pink-50/50',
                        text: 'text-pink-800',
                        badge: 'bg-pink-100 text-pink-700',
                        accent: 'from-pink-500 to-rose-600',
                        iconBg: 'bg-pink-100 text-pink-600',
                        sidebar: 'border-l-pink-500'
                    }
                ];
                const index = Math.abs(hash) % colorPalettes.length;
                return colorPalettes[index];
        }
    };

    // Calculate Targets
    const targetTotals = Object.entries(userStructure).reduce((acc, [type, struct]) => {
        const count = parseInt(struct.count) || 0;
        const marks = parseFloat(struct.marks) || 1;
        acc.qs += count;
        acc.marks += (count * marks);
        acc[type] = count;
        return acc;
    }, { qs: 0, marks: 0 });

    // Calculate Allocated
    const allocatedTotals = Object.values(allocations).reduce((acc, counts) => {
        Object.entries(counts).forEach(([type, count]) => {
            if (!acc[type]) acc[type] = 0;
            acc[type] += (parseInt(count) || 0);
            acc.total += (parseInt(count) || 0);
        });
        return acc;
    }, { total: 0 });

    // Fetch Schema when subject changes
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
                const subTag = 'RULE_FOR_' + selectedSubjectObj.subjectName.replace(/\s/g, '');
                const altTag = selectedSubjectObj.subjectName;
                const kbRes = await axios.get('/v1/support/knowledge');
                let validRules = [...kbRes.data.filter(k => k.tags && (k.tags.includes(subTag) || k.tags.includes(altTag))), ...kbRes.data.filter(k => k.content && k.content.includes(selectedSubjectObj.subjectName))];
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
                            initialStruct[t] = { count: 0, marks: r.marks || 1 };
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
                    if (location.state?.prefill) {
                        const prefill = location.state.prefill;
                        // Overwrite userStructure with custom qsCount if provided
                        if (prefill.qsCount && prefill.qsCount > 0) {
                            const mainType = initialStruct['MCQ'] ? 'MCQ' : Object.keys(initialStruct)[0];
                            if (mainType) {
                                Object.keys(initialStruct).forEach(k => {
                                    initialStruct[k].count = 0; // Reset others
                                });
                                initialStruct[mainType].count = prefill.qsCount;
                            }
                        }
                    }

                    setDynamicSections(sections);
                    setUserStructure(initialStruct);

                    // Auto-allocate if specific chapter is provided in prefill
                    if (location.state?.prefill?.chapterId) {
                        const cId = location.state.prefill.chapterId;
                        const mainType = initialStruct['MCQ'] ? 'MCQ' : Object.keys(initialStruct)[0];
                        if (mainType && initialStruct[mainType]?.count > 0) {
                            setAllocations({
                                [cId]: { [mainType]: initialStruct[mainType].count }
                            });
                            // Auto expand that chapter
                            setExpandedChapters([cId]);
                        }
                    }
                } else setDynamicSections([]);
            }
        } catch (e) { console.error(e); } finally { setLoadingBlueprint(false); }
    };

    const activeSections = dynamicSections.filter(sec => (parseInt(userStructure[sec.type]?.count) || 0) > 0);

    const toggleChapterExpand = async (chapterId) => {
        if (expandedChapters.includes(chapterId)) {
            setExpandedChapters(expandedChapters.filter(id => id !== chapterId));
        } else {
            setExpandedChapters([...expandedChapters, chapterId]);
            if (!chapterTopics[chapterId]) {
                setTopicsLoading({ ...topicsLoading, [chapterId]: true });
                try {
                    const tops = await academicService.getTopicsByChapter(chapterId);
                    setChapterTopics({ ...chapterTopics, [chapterId]: tops });
                } catch (e) { console.error(e); } finally {
                    setTopicsLoading({ ...topicsLoading, [chapterId]: false });
                }
            }
        }
    };

    const handleAllocationChange = (id, type, value) => {
        const num = parseInt(value) || 0;
        setAllocations(prev => ({
            ...prev,
            [id]: { ...prev[id], [type]: num }
        }));
    };

    const handleGenerate = async () => {
        if (targetTotals.qs === 0) return alert("Total questions must be greater than 0.");
        
        // Ensure difficulty is 100
        if (difficulty.easy + difficulty.medium + difficulty.hard !== 100) {
            return alert("Difficulty percentages must equal exactly 100%.");
        }

        // Collect selected chapters/topics from allocations
        const selectedChapterIds = [];
        const selectedTopicIds = [];
        Object.entries(allocations).forEach(([id, counts]) => {
            const hasAllocation = Object.values(counts).some(v => v > 0);
            if (hasAllocation) {
                if (chapters.find(c => c.id === id)) selectedChapterIds.push(id);
                else selectedTopicIds.push(id);
            }
        });

        if (selectedChapterIds.length === 0 && selectedTopicIds.length === 0) {
            return alert("Please allocate at least one question from the syllabus chapters/topics.");
        }

        setLoading(true);
        try {
            let qTypes = [];
            Object.entries(userStructure).forEach(([type, struct]) => {
                const count = parseInt(struct.count) || 0;
                if (count > 0) {
                    qTypes.push({
                        questionType: type,
                        count: count,
                        marksPerQuestion: parseFloat(struct.marks) || 1
                    });
                }
            });

            const res = await examService.generateExam({
                title: examInfo.title,
                examType: examInfo.examType,
                classSubjectId: subjectId,
                totalMarks: targetTotals.marks,
                totalQuestions: targetTotals.qs,
                durationMinutes: parseInt(examInfo.duration),
                language: examInfo.language,
                instructions: "",
                instituteName: JSON.parse(localStorage.getItem('user') || '{}').instituteName || "",
                headerText: "",
                shuffleQuestions: true,
                shuffleOptions: true,
                chapterIds: selectedChapterIds.length > 0 ? selectedChapterIds : undefined, 
                topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
                easyPercent: difficulty.easy,
                mediumPercent: difficulty.medium,
                hardPercent: difficulty.hard,
                questionTypeRules: qTypes
            });

            if (res.success) {
                navigate(`/exams/generate/nexus-editor/${res.data.id}`);
            } else {
                alert(res.message || "Failed to generate exam.");
            }
        } catch (e) {
            console.error("Generate API Error:", e);
            const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || "Unknown API Error";
            alert(`API Error: ${errMsg}`);
        } finally {
            setLoading(false);
        }
    };

    // --- UI HELPERS ---
    const selectCls = "w-full bg-white/50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all disabled:opacity-40 hover:border-slate-300";
    const inputCls = "w-full bg-white/50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-700 outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all hover:border-slate-300";

    return (
        <div className="min-h-screen bg-slate-50 font-outfit pb-24">
            
            {/* Header / Stepper Progress */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 py-3.5 sm:py-5 shadow-sm">
                <div className="max-w-6xl mx-auto flex flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2.5 sm:gap-4">
                        <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black text-slate-800 tracking-tight">AI Exam Generator</h1>
                            <p className="text-[10px] sm:text-sm font-bold text-violet-600 tracking-wide uppercase">Dynamic Wizard</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className={`flex flex-col items-center gap-0.5 sm:gap-1 ${step === 1 ? 'opacity-100' : 'opacity-40'}`}>
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${step >= 1 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
                            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">Config</span>
                        </div>
                        <div className="w-6 sm:w-10 h-0.5 bg-slate-200 mt-[-10px] sm:mt-[-15px]"></div>
                        <div className={`flex flex-col items-center gap-0.5 sm:gap-1 ${step === 2 ? 'opacity-100' : 'opacity-40'}`}>
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${step >= 2 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
                            <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">Syllabus</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-8">
                
                {/* STEP 1: CONFIGURATION & STRUCTURE */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* LEFT: Basic Info */}
                            <div className="lg:col-span-7 space-y-6">
                                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-6">
                                        <LayoutGrid className="text-violet-500" /> Exam Configuration
                                    </h2>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Exam Title</label>
                                            <input type="text" value={examInfo.title} onChange={e => setExamInfo({...examInfo, title: e.target.value})} className={inputCls} placeholder="e.g. Final Term Examination - 2026" />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Level</label>
                                                <select value={levelId} onChange={e => setLevelId(e.target.value)} className={selectCls}>
                                                    <option value="">Select Level</option>
                                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Stream</label>
                                                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className={selectCls}>
                                                    <option value="">Select Stream</option>
                                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Class</label>
                                                <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className={selectCls}>
                                                    <option value="">Select Class</option>
                                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Subject</label>
                                                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className={selectCls}>
                                                    <option value="">Select Subject</option>
                                                    {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Language</label>
                                                <select value={examInfo.language} onChange={e => setExamInfo({...examInfo, language: e.target.value})} disabled={!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual')} className={selectCls + (!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual') ? ' opacity-50' : '')}>
                                                    {(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bangla') || user.instituteMedium.includes('Bilingual')) && <option value="Bangla">Bangla</option>}
                                                    {(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('English') || user.instituteMedium.includes('Bilingual')) && <option value="English">English</option>}
                                                    {(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bilingual')) && <option value="Bilingual">Bilingual</option>}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Duration (Min)</label>
                                                <input type="number" value={examInfo.duration} onChange={e => setExamInfo({...examInfo, duration: e.target.value})} className={inputCls} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Blueprint Structure */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100 rounded-bl-full -mr-10 -mt-10 opacity-50 z-0"></div>
                                    
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
                                            <Target className="text-violet-500" /> Blueprint Target
                                        </h2>
                                        <p className="text-sm text-slate-500 mb-6 font-medium">Define structure to see allocation targets.</p>

                                        {loadingBlueprint ? (
                                            <div className="py-12 flex flex-col items-center justify-center text-violet-500">
                                                <Loader2 size={32} className="animate-spin mb-3" />
                                                <span className="font-bold">Loading Structure...</span>
                                            </div>
                                        ) : !subjectId ? (
                                            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                Select a subject to load the blueprint.
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {dynamicSections.map(sec => (
                                                    <div key={sec.type} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-violet-200 transition-all hover:shadow-sm">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <div className="font-bold text-slate-800">{sec.name}</div>
                                                            <div className="text-[10px] font-black bg-violet-100 text-violet-700 px-2 py-1 rounded uppercase">{sec.type}</div>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target Qs</label>
                                                                <input type="number" min="0" value={userStructure[sec.type]?.count || 0} onChange={e => setUserStructure({...userStructure, [sec.type]: { ...userStructure[sec.type], count: e.target.value }})} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-center font-black text-slate-700 outline-none focus:border-violet-500" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Marks/Q</label>
                                                                <input type="number" min="1" value={userStructure[sec.type]?.marks || 1} onChange={e => setUserStructure({...userStructure, [sec.type]: { ...userStructure[sec.type], marks: e.target.value }})} className="w-full bg-white border border-slate-200 rounded-xl p-2 text-center font-black text-slate-700 outline-none focus:border-violet-500" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="mt-6 pt-6 border-t border-slate-100">
                                                    <div className="bg-slate-800 text-white rounded-2xl p-5 shadow-lg shadow-slate-800/20">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Assessment Target</div>
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
                )}

                {/* STEP 2: SYLLABUS ALLOCATION */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
                        
                        {/* Tracker Top Bar */}
                        {/* Tracker Top Bar */}
                        <div className="bg-white rounded-2xl p-3.5 md:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-200 sticky top-[65px] md:top-24 z-30 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                            <div>
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-base sm:text-lg">
                                    <ListChecks className="text-violet-600 shrink-0" size={18} /> Syllabus Allocation Tracker
                                </h3>
                                <p className="text-[11px] sm:text-xs font-bold text-slate-500">Allocate your target questions across chapters and topics.</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                                {activeSections.map(sec => {
                                    const target = targetTotals[sec.type] || 0;
                                    const alloc = allocatedTotals[sec.type] || 0;
                                    const isComplete = target === alloc;
                                    const isOver = alloc > target;
                                    
                                    return (
                                        <div key={sec.type} className={`px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border flex flex-col items-center min-w-[75px] sm:min-w-[90px] flex-1 sm:flex-none ${isComplete ? 'bg-emerald-50 border-emerald-200' : isOver ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isComplete ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-slate-500'}`}>{sec.type}</span>
                                            <div className="flex items-baseline gap-0.5 sm:gap-1">
                                                <span className={`text-base sm:text-lg font-black ${isComplete ? 'text-emerald-700' : isOver ? 'text-rose-700' : 'text-slate-800'}`}>{alloc}</span>
                                                <span className="text-[10px] sm:text-xs font-bold text-slate-400">/ {target}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Chapters & Topics List */}
                            <div className="lg:col-span-8 space-y-6 order-2 lg:order-1">
                                {chapters.length === 0 ? (
                                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">No chapters found for this subject.</div>
                                ) : (
                                    Object.entries(groupedChapters).map(([category, catChapters]) => {
                                        const isCatExpanded = expandedCategories.includes(category);
                                        const styles = getCategoryStyles(category);
                                        
                                        return (
                                            <div key={category} className={`bg-white rounded-2xl sm:rounded-[2rem] border ${styles.border} shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all duration-300`}>
                                                
                                                {/* Category Header */}
                                                <div 
                                                    onClick={() => toggleCategoryExpand(category)}
                                                    className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer select-none bg-gradient-to-r ${styles.bg} border-b ${styles.border} transition-colors duration-200 hover:bg-opacity-80 gap-3`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all bg-white shadow-sm shrink-0 ${styles.text}`}>
                                                            {isCatExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <h3 className={`text-base sm:text-lg font-black tracking-tight ${styles.text}`}>{category}</h3>
                                                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5">{catChapters.length}টি সক্রিয় অধ্যায়</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full ${styles.badge} shadow-sm self-start sm:self-auto`}>
                                                        {category} বিভাগ
                                                    </span>
                                                </div>

                                                {/* Category Chapters Container */}
                                                {isCatExpanded && (
                                                    <div className="p-6 space-y-4 bg-slate-50/20">
                                                        {catChapters.map(ch => {
                                                            const isExpanded = expandedChapters.includes(ch.id);
                                                            return (
                                                                <div key={ch.id} className={`bg-white rounded-2xl border border-slate-150 transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-violet-300 ring-4 ring-violet-500/5' : 'hover:border-slate-300'}`}>
                                                                    
                                                                    {/* Chapter Header */}
                                                                    <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50" onClick={() => toggleChapterExpand(ch.id)}>
                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${isExpanded ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <h4 className={`font-bold text-sm sm:text-base break-words ${isExpanded ? 'text-violet-900' : 'text-slate-700'}`}>{ch.name}</h4>
                                                                                {ch.chapterNumber && <p className="text-[10px] font-bold text-slate-400 uppercase">অধ্যায় {ch.chapterNumber}</p>}
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        {/* Chapter Level Allocation */}
                                                                        <div className="flex gap-3 justify-start sm:justify-start w-full sm:w-auto pl-11 sm:pl-0" onClick={e => e.stopPropagation()}>
                                                                            {activeSections.map(sec => (
                                                                                <div key={sec.type} className="flex flex-col items-center w-16">
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{sec.type}</span>
                                                                                    <input 
                                                                                        type="number" 
                                                                                        min="0"
                                                                                        value={allocations[ch.id]?.[sec.type] || ''} 
                                                                                        onChange={(e) => handleAllocationChange(ch.id, sec.type, e.target.value)}
                                                                                        placeholder="0"
                                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-center text-sm font-black text-slate-800 outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all" 
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>

                                                                    {/* Topics List (Expanded) */}
                                                                    {isExpanded && (
                                                                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 pl-6 sm:pl-12 space-y-3">
                                                                            {topicsLoading[ch.id] ? (
                                                                                <div className="flex items-center gap-2 text-violet-500 text-sm font-bold py-2"><Loader2 size={16} className="animate-spin"/> Loading topics...</div>
                                                                            ) : chapterTopics[ch.id]?.length > 0 ? (
                                                                                chapterTopics[ch.id].map(top => (
                                                                                    <div key={top.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-150 rounded-xl shadow-sm gap-2.5">
                                                                                        <span className="text-sm font-bold text-slate-600 break-words flex-1">{top.name}</span>
                                                                                        <div className="flex flex-wrap gap-3 justify-start sm:justify-end w-full sm:w-auto">
                                                                                            {activeSections.map(sec => (
                                                                                                <div key={sec.type} className="flex items-center gap-2 w-20">
                                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase w-6 text-right shrink-0">{sec.type}</span>
                                                                                                    <input 
                                                                                                        type="number" 
                                                                                                        min="0"
                                                                                                        value={allocations[top.id]?.[sec.type] || ''} 
                                                                                                        onChange={(e) => handleAllocationChange(top.id, sec.type, e.target.value)}
                                                                                                        placeholder="0"
                                                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-sm font-black text-slate-800 outline-none focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 transition-all" 
                                                                                                    />
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <div className="text-xs font-bold text-slate-400 py-2 italic text-center sm:text-left">কোন টপিক পাওয়া যায়নি। উপরের অধ্যায়ে সরাসরি প্রশ্ন বরাদ্দ করুন।</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* RIGHT: Difficulty & Status */}
                            <div className="lg:col-span-4 space-y-6 order-1 lg:order-2">
                                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                                    <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6">
                                        <BrainCircuit className="text-rose-500" /> Difficulty AI Prompt
                                    </h3>
                                    
                                    <div className="space-y-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-black text-emerald-500 uppercase tracking-wider">Easy</span>
                                                <span className="text-xs font-black text-slate-700">{difficulty.easy}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={difficulty.easy} onChange={(e) => setDifficulty({...difficulty, easy: parseInt(e.target.value)})} className="w-full accent-emerald-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-black text-amber-500 uppercase tracking-wider">Medium</span>
                                                <span className="text-xs font-black text-slate-700">{difficulty.medium}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={difficulty.medium} onChange={(e) => setDifficulty({...difficulty, medium: parseInt(e.target.value)})} className="w-full accent-amber-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs font-black text-rose-500 uppercase tracking-wider">Hard</span>
                                                <span className="text-xs font-black text-slate-700">{difficulty.hard}%</span>
                                            </div>
                                            <input type="range" min="0" max="100" value={difficulty.hard} onChange={(e) => setDifficulty({...difficulty, hard: parseInt(e.target.value)})} className="w-full accent-rose-500" />
                                        </div>
                                        
                                        {(difficulty.easy + difficulty.medium + difficulty.hard) !== 100 && (
                                            <div className="p-3 bg-rose-100 text-rose-700 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 border border-rose-200">
                                                <AlertCircle size={14} /> Total must equal 100% 
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 backdrop-blur-md bg-white/80 border-t border-slate-200 p-3 sm:p-4 z-50 flex justify-between items-center shadow-[0_-10px_30px_rgb(0,0,0,0.05)]">
                <div className="max-w-6xl w-full mx-auto flex justify-between items-center gap-3">
                    <button 
                        onClick={() => setStep(1)}
                        className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1 sm:gap-2 shrink-0 ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'}`}
                    >
                        <ChevronLeft size={16} /> Back
                    </button>
                    
                    {step === 1 ? (
                        <button 
                            onClick={() => {
                                if(!examInfo.title || !subjectId) return alert("Fill title and subject");
                                if(targetTotals.qs === 0) return alert("Define question targets");
                                setStep(2);
                            }}
                            disabled={loadingBlueprint}
                            className="px-4 sm:px-8 py-2.5 sm:py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            Next: Syllabus Allocation <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className="px-4 sm:px-8 py-2.5 sm:py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 sm:gap-3 transition-all shadow-xl shadow-violet-500/30 hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                            {loading ? 'Processing AI Models...' : 'Generate Exam Paper'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoExamGenerator;
