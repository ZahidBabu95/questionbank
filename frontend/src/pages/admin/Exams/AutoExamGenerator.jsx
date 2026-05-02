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
    } = useAcademicHierarchy();

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
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 py-5 shadow-sm">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI Exam Generator</h1>
                            <p className="text-sm font-bold text-violet-600 tracking-wide uppercase">Dynamic Wizard</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className={`flex flex-col items-center gap-1 ${step === 1 ? 'opacity-100' : 'opacity-40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Config</span>
                        </div>
                        <div className="w-10 h-0.5 bg-slate-200 mt-[-15px]"></div>
                        <div className={`flex flex-col items-center gap-1 ${step === 2 ? 'opacity-100' : step > 2 ? 'opacity-40' : 'opacity-40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Syllabus</span>
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
                                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-6">
                                        <LayoutGrid className="text-violet-500" /> Exam Configuration
                                    </h2>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Exam Title</label>
                                            <input type="text" value={examInfo.title} onChange={e => setExamInfo({...examInfo, title: e.target.value})} className={inputCls} placeholder="e.g. Final Term Examination - 2026" />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
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
                                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-full relative overflow-hidden">
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
                        <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-200 sticky top-24 z-30 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                                    <ListChecks className="text-violet-600" /> Syllabus Allocation Tracker
                                </h3>
                                <p className="text-xs font-bold text-slate-500">Allocate your target questions across chapters and topics.</p>
                            </div>
                            
                            <div className="flex gap-4">
                                {activeSections.map(sec => {
                                    const target = targetTotals[sec.type] || 0;
                                    const alloc = allocatedTotals[sec.type] || 0;
                                    const isComplete = target === alloc;
                                    const isOver = alloc > target;
                                    
                                    return (
                                        <div key={sec.type} className={`px-4 py-2 rounded-xl border flex flex-col items-center min-w-[90px] ${isComplete ? 'bg-emerald-50 border-emerald-200' : isOver ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${isComplete ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-slate-500'}`}>{sec.type}</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className={`text-lg font-black ${isComplete ? 'text-emerald-700' : isOver ? 'text-rose-700' : 'text-slate-800'}`}>{alloc}</span>
                                                <span className="text-xs font-bold text-slate-400">/ {target}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* Chapters & Topics List */}
                            <div className="lg:col-span-8 space-y-4">
                                {chapters.length === 0 ? (
                                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium">No chapters found for this subject.</div>
                                ) : chapters.map(ch => {
                                    const isExpanded = expandedChapters.includes(ch.id);
                                    return (
                                        <div key={ch.id} className={`bg-white rounded-2xl border transition-all overflow-hidden ${isExpanded ? 'border-violet-300 shadow-md shadow-violet-500/5' : 'border-slate-200 hover:border-slate-300'}`}>
                                            
                                            {/* Chapter Header */}
                                            <div className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50" onClick={() => toggleChapterExpand(ch.id)}>
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </div>
                                                    <h4 className={`font-bold ${isExpanded ? 'text-violet-900' : 'text-slate-700'}`}>{ch.name}</h4>
                                                </div>
                                                
                                                {/* Chapter Level Allocation */}
                                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                                    {activeSections.map(sec => (
                                                        <div key={sec.type} className="flex flex-col items-center w-16">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase">{sec.type}</span>
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                value={allocations[ch.id]?.[sec.type] || ''} 
                                                                onChange={(e) => handleAllocationChange(ch.id, sec.type, e.target.value)}
                                                                placeholder="0"
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-sm font-black text-slate-800 outline-none focus:border-violet-500 focus:bg-white" 
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Topics List (Expanded) */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/50 p-4 pl-12 space-y-3">
                                                    {topicsLoading[ch.id] ? (
                                                        <div className="flex items-center gap-2 text-violet-500 text-sm font-bold py-2"><Loader2 size={16} className="animate-spin"/> Loading topics...</div>
                                                    ) : chapterTopics[ch.id]?.length > 0 ? (
                                                        chapterTopics[ch.id].map(top => (
                                                            <div key={top.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                                <span className="text-sm font-bold text-slate-600 truncate mr-4">{top.name}</span>
                                                                <div className="flex gap-2">
                                                                    {activeSections.map(sec => (
                                                                        <div key={sec.type} className="flex items-center gap-2 w-20">
                                                                            <span className="text-[9px] font-black text-slate-400 uppercase w-6">{sec.type}</span>
                                                                            <input 
                                                                                type="number" 
                                                                                min="0"
                                                                                value={allocations[top.id]?.[sec.type] || ''} 
                                                                                onChange={(e) => handleAllocationChange(top.id, sec.type, e.target.value)}
                                                                                placeholder="0"
                                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-center text-sm font-black text-slate-800 outline-none focus:border-violet-500 focus:bg-white" 
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-xs font-bold text-slate-400 py-2 italic">No topics found. Add allocation to the chapter above.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* RIGHT: Difficulty & Status */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
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
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 backdrop-blur-md bg-white/80 border-t border-slate-200 p-4 z-50 flex justify-between items-center shadow-[0_-10px_30px_rgb(0,0,0,0.05)]">
                <div className="max-w-6xl w-full mx-auto flex justify-between items-center">
                    <button 
                        onClick={() => setStep(1)}
                        className={`px-6 py-3.5 rounded-xl font-bold transition-all flex items-center gap-2 ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'}`}
                    >
                        <ChevronLeft size={20} /> Back
                    </button>
                    
                    {step === 1 ? (
                        <button 
                            onClick={() => {
                                if(!examInfo.title || !subjectId) return alert("Fill title and subject");
                                if(targetTotals.qs === 0) return alert("Define question targets");
                                setStep(2);
                            }}
                            disabled={loadingBlueprint}
                            className="px-10 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:-translate-y-0.5"
                        >
                            Next: Syllabus Allocation <ChevronRight size={20} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleGenerate}
                            disabled={loading}
                            className="px-10 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl font-black flex items-center gap-3 transition-all shadow-xl shadow-violet-500/30 hover:-translate-y-0.5"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
                            {loading ? 'Processing AI Models...' : 'Generate Exam Paper'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoExamGenerator;
