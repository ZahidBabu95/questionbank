import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Layers, Calculator, Loader2, Check, BrainCircuit, Target, ListChecks, ChevronRight, LayoutGrid, ChevronLeft, Save, Copy } from 'lucide-react';
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
        levelId, streamId, classId, subjectId, chapterId,
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId,
    } = useAcademicHierarchy();

    const [examInfo, setExamInfo] = useState({
        title: '',
        duration: 120,
        language: 'Bangla',
        examType: 'MODEL_TEST'
    });

    const [selectedChapters, setSelectedChapters] = useState([]);
    const [dynamicSections, setDynamicSections] = useState([]);
    const [userStructure, setUserStructure] = useState({});
    
    const [loadingBlueprint, setLoadingBlueprint] = useState(false);
    const [debugError, setDebugError] = useState('');
    const [difficulty, setDifficulty] = useState({ easy: 30, medium: 50, hard: 20 });
    const [selectedTemplate, setSelectedTemplate] = useState('custom');

    // Fetch schema when transitioning from Step 1 to Step 2
    const fetchSchema = async () => {
        if (!subjectId) return;
        setLoadingBlueprint(true);
        try {
            const selectedSubjectObj = subjects.find(s => s.classSubjectId == subjectId);
            const selectedClassName = classes.find(c => c.id == classId)?.name;
            if (selectedSubjectObj?.subjectName) {
                const subTag = 'RULE_FOR_' + selectedSubjectObj.subjectName.replace(/\s/g, '');
                const altTag = selectedSubjectObj.subjectName;
                
                const kbRes = await axios.get('/v1/support/knowledge');
                let validRules = [];
                
                const tagRules = kbRes.data.filter(k => k.tags && (k.tags.includes(subTag) || k.tags.includes(altTag)));
                const contentRules = kbRes.data.filter(k => k.content && k.content.includes(selectedSubjectObj.subjectName));
                
                validRules = [...tagRules, ...contentRules].filter(k => {
                    try {
                        const parsed = JSON.parse(k.content);
                        return Array.isArray(parsed) || (parsed && parsed.generation_blueprint);
                    } catch(e) { return false; }
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
                            return { name: rule.sectionName || tName, type: tName, target_ratio: "Auto" };
                        });
                        schemaObj.forEach(rule => {
                            let t = rule.questionType === 'MULTIPLE_CHOICE' ? 'MCQ' : rule.questionType === 'CREATIVE' ? 'CQ' : rule.questionType === 'SHORT_ANSWER' ? 'SHORT' : rule.questionType;
                            initialStruct[t] = { count: 0, marks: rule.marks || 1 };
                        });
                    } else {
                        sections = schemaObj.generation_blueprint?.mandatory_sections || [];
                        const scrapingRules = schemaObj.scraping_rules || [];
                        scrapingRules.forEach(rule => {
                            let t = rule.questionType === 'MULTIPLE_CHOICE' ? 'MCQ' : rule.questionType === 'CREATIVE' ? 'CQ' : rule.questionType === 'SHORT_ANSWER' ? 'SHORT' : rule.questionType;
                            initialStruct[t] = { count: 0, marks: rule.marks || 1 };
                        });
                        // Ensure sections are mapped
                        sections.forEach(sec => {
                            if (!initialStruct[sec.type]) initialStruct[sec.type] = { count: 0, marks: 1 };
                        });
                    }
                    
                    setDynamicSections(sections);
                    setUserStructure(initialStruct);
                    setDebugError('');
                } else {
                    setDynamicSections([]);
                }
            }
        } catch (e) {
            setDebugError("Error: " + e.message);
        } finally {
            setLoadingBlueprint(false);
        }
    };

    const handleNextStep = async () => {
        if (step === 1) {
            if (!examInfo.title || !subjectId) return alert("Please enter exam name and select subject.");
            await fetchSchema();
        }
        if (step === 3) {
            // Validation before going to content
            let totalQ = 0;
            Object.values(userStructure).forEach(s => totalQ += parseInt(s.count || 0));
            if (totalQ === 0) return alert("Please add at least 1 question to the structure.");
        }
        setStep(prev => prev + 1);
    };

    const handlePrevStep = () => setStep(prev => prev - 1);

    const toggleChapter = (chId) => {
        if (selectedChapters.includes(chId)) setSelectedChapters(selectedChapters.filter(id => id !== chId));
        else setSelectedChapters([...selectedChapters, chId]);
    };

    const handleGenerate = async () => {
        if (selectedChapters.length === 0) return alert("Select at least one chapter.");
        setLoading(true);
        try {
            let totalMarks = 0;
            let totalQuestions = 0;
            let sectionsPayload = [];

            Object.entries(userStructure).forEach(([type, struct]) => {
                const count = parseInt(struct.count) || 0;
                if (count > 0) {
                    totalQuestions += count;
                    totalMarks += count * (parseFloat(struct.marks) || 1);
                    sectionsPayload.push({
                        sectionType: type,
                        targetQuestions: count,
                        marksPerQuestion: parseFloat(struct.marks) || 1
                    });
                }
            });

            const res = await examService.generateAutoExam({
                title: examInfo.title,
                examType: examInfo.examType,
                classSubjectId: subjectId,
                totalMarks: totalMarks,
                totalQuestions: totalQuestions,
                durationMinutes: parseInt(examInfo.duration),
                language: examInfo.language,
                instructions: "",
                instituteName: "",
                headerText: "",
                shuffleQuestions: true,
                shuffleOptions: true,
                chapterIds: selectedChapters,
                difficultyDistribution: difficulty,
                sections: sectionsPayload
            });

            if (res.success) {
                navigate(`/exams/generate/nexus-editor/${res.data.id}`);
            } else {
                alert(res.message || "Failed to generate exam.");
            }
        } catch (e) {
            console.error(e);
            alert("API Error: Unable to generate exam.");
        } finally {
            setLoading(false);
        }
    };

    const selectCls = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed";

    const totalCalculatedMarks = Object.values(userStructure).reduce((acc, curr) => acc + ((parseInt(curr.count) || 0) * (parseFloat(curr.marks) || 0)), 0);
    const totalCalculatedQs = Object.values(userStructure).reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0);

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-outfit text-slate-800 flex flex-col">
            {/* Top Stepper Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 leading-tight">AI Exam Wizard</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Auto Generation</p>
                    </div>
                </div>
                <div className="hidden md:flex gap-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`flex items-center gap-2 ${step === i ? 'text-indigo-600' : step > i ? 'text-emerald-500' : 'text-slate-300'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step === i ? 'border-indigo-600 bg-indigo-50' : step > i ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}`}>
                                {step > i ? <Check size={14} /> : i}
                            </div>
                            {i < 4 && <div className={`w-6 h-0.5 ${step > i ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 mt-4">
                
                {/* STEP 1: BASIC SETUP */}
                {step === 1 && (
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Basic Setup</h2>
                            <p className="text-slate-500">Enter your exam details and select the target subject.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Exam Title (পরীক্ষার নাম)</label>
                                <input
                                    type="text"
                                    value={examInfo.title}
                                    onChange={(e) => setExamInfo({ ...examInfo, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="e.g. Model Test 1 - Final Term"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">স্তর (Level)</label>
                                <select value={levelId} onChange={e => setLevelId(e.target.value)} className={selectCls}>
                                    <option value="">স্তর বাছুন</option>
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">বিভাগ/ধারা (Stream)</label>
                                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className={selectCls}>
                                    <option value="">বিভাগ বাছুন</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">শ্রেণি (Class)</label>
                                <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className={selectCls}>
                                    <option value="">শ্রেণি বাছুন</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">বিষয় (Subject)</label>
                                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className={selectCls}>
                                    <option value="">বিষয় বাছুন</option>
                                    {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Language</label>
                                <select value={examInfo.language} onChange={(e) => setExamInfo({ ...examInfo, language: e.target.value })} className={selectCls}>
                                    <option value="Bangla">Bangla</option>
                                    <option value="English">English</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Duration (Min)</label>
                                <input
                                    type="number"
                                    value={examInfo.duration}
                                    onChange={(e) => setExamInfo({ ...examInfo, duration: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: TEMPLATE SELECTION */}
                {step === 2 && (
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Select Template</h2>
                            <p className="text-slate-500">Choose a pre-configured template or build your own custom structure.</p>
                        </div>
                        
                        {loadingBlueprint ? (
                            <div className="flex flex-col items-center justify-center py-20 text-indigo-500">
                                <Loader2 size={40} className="animate-spin mb-4" />
                                <span className="font-bold animate-pulse">Loading curriculum blueprint...</span>
                            </div>
                        ) : debugError ? (
                            <div className="p-6 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl font-medium text-center">
                                {debugError}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div 
                                    onClick={() => setSelectedTemplate('custom')}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedTemplate === 'custom' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600 mb-4">
                                        <Layers size={24} />
                                    </div>
                                    <h3 className="font-black text-lg text-slate-800 mb-1">Custom Builder</h3>
                                    <p className="text-sm text-slate-500">Manually set question count and marks based on standard curriculum.</p>
                                </div>

                                <div 
                                    onClick={() => setSelectedTemplate('standard')}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${selectedTemplate === 'standard' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 bg-white'}`}
                                >
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 mb-4">
                                        <Copy size={24} />
                                    </div>
                                    <h3 className="font-black text-lg text-slate-800 mb-1">Standard Board (100 Marks)</h3>
                                    <p className="text-sm text-slate-500">Pre-loaded template matching exact board exam structure.</p>
                                    <div className="mt-4 flex gap-2">
                                        <span className="text-[10px] font-bold bg-white px-2 py-1 rounded text-slate-600 border border-slate-200">MCQ: 30</span>
                                        <span className="text-[10px] font-bold bg-white px-2 py-1 rounded text-slate-600 border border-slate-200">CQ: 7</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: DYNAMIC STRUCTURE */}
                {step === 3 && (
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="mb-8 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 mb-2">Question Structure</h2>
                                <p className="text-slate-500">Define how many questions to generate for each section.</p>
                            </div>
                            <div className="bg-slate-100 px-4 py-2 rounded-xl text-right">
                                <div className="text-xs font-bold text-slate-500 uppercase">Target Blueprint</div>
                                <div className="font-black text-xl text-indigo-600">{totalCalculatedMarks} Marks / {totalCalculatedQs} Qs</div>
                            </div>
                        </div>

                        {dynamicSections.length === 0 ? (
                            <div className="text-center p-8 text-slate-500 font-medium bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                No sections found in curriculum schema.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {dynamicSections.map((sec, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between hover:border-indigo-300 transition-colors">
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-indigo-600 font-black shrink-0">
                                                {sec.type}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">{sec.name}</h3>
                                                <p className="text-xs text-slate-500">Recommended Ratio: {sec.target_ratio || 'Auto'}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-4 w-full md:w-auto">
                                            <div className="flex-1 md:w-24">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Total Qs</label>
                                                <input 
                                                    type="number" 
                                                    value={userStructure[sec.type]?.count || 0}
                                                    onChange={(e) => setUserStructure({...userStructure, [sec.type]: { ...userStructure[sec.type], count: e.target.value }})}
                                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-center font-bold text-slate-800 outline-none focus:border-indigo-500" 
                                                />
                                            </div>
                                            <div className="flex-1 md:w-24">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Marks/Q</label>
                                                <input 
                                                    type="number" 
                                                    value={userStructure[sec.type]?.marks || 1}
                                                    onChange={(e) => setUserStructure({...userStructure, [sec.type]: { ...userStructure[sec.type], marks: e.target.value }})}
                                                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-center font-bold text-slate-800 outline-none focus:border-indigo-500" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: SYLLABUS & CONTENT */}
                {step === 4 && (
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Syllabus & Difficulty</h2>
                            <p className="text-slate-500">Select chapters and target AI difficulty.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <ListChecks size={18} className="text-indigo-500" /> Syllabus Chapters
                                </h3>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {chapters.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">No chapters available for this subject.</p>
                                    ) : chapters.map(c => (
                                        <label key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedChapters.includes(c.id) ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}>
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedChapters.includes(c.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                                {selectedChapters.includes(c.id) && <Check size={14} strokeWidth={3} />}
                                            </div>
                                            <div>
                                                <div className={`font-bold text-sm ${selectedChapters.includes(c.id) ? 'text-indigo-900' : 'text-slate-700'}`}>{c.name}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                    <Target size={18} className="text-rose-500" /> Difficulty Balance
                                </h3>
                                <div className="space-y-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Easy</span>
                                            <span className="text-xs font-bold text-slate-600">{difficulty.easy}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={difficulty.easy} onChange={(e) => setDifficulty({...difficulty, easy: parseInt(e.target.value)})} className="w-full accent-emerald-500" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Medium</span>
                                            <span className="text-xs font-bold text-slate-600">{difficulty.medium}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={difficulty.medium} onChange={(e) => setDifficulty({...difficulty, medium: parseInt(e.target.value)})} className="w-full accent-amber-500" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Hard</span>
                                            <span className="text-xs font-bold text-slate-600">{difficulty.hard}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={difficulty.hard} onChange={(e) => setDifficulty({...difficulty, hard: parseInt(e.target.value)})} className="w-full accent-rose-500" />
                                    </div>
                                    
                                    {(difficulty.easy + difficulty.medium + difficulty.hard) !== 100 && (
                                        <div className="p-3 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold text-center">
                                            Total must be exactly 100% (Current: {difficulty.easy + difficulty.medium + difficulty.hard}%)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-50 flex justify-between items-center">
                <button 
                    onClick={handlePrevStep}
                    disabled={step === 1 || loading}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2 disabled:opacity-30"
                >
                    <ChevronLeft size={20} /> Back
                </button>
                
                {step < 4 ? (
                    <button 
                        onClick={handleNextStep}
                        disabled={loadingBlueprint}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-200"
                    >
                        Continue <ChevronRight size={20} />
                    </button>
                ) : (
                    <button 
                        onClick={handleGenerate}
                        disabled={loading || selectedChapters.length === 0 || (difficulty.easy + difficulty.medium + difficulty.hard) !== 100}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center gap-2 transition-all shadow-md shadow-emerald-200"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <BrainCircuit size={20} />}
                        {loading ? 'Generating Assessment...' : 'Generate AI Assessment'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AutoExamGenerator;
