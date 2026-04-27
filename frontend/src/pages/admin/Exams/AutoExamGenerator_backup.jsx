import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Layers, Calculator, Loader2, Check, BrainCircuit, Target, ListChecks, ChevronRight } from 'lucide-react';
import academicService from '../../../services/academicService';
import examService from '../../../services/examService';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';
import axios from '../../../utils/axios';

const AutoExamGenerator = () => {
    const navigate = useNavigate();
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

    // Structure & Marking
    const [qStructure, setQStructure] = useState({});
    const [marksConfig, setMarksConfig] = useState({});
    const [dynamicSections, setDynamicSections] = useState([]);
    const [loadingBlueprint, setLoadingBlueprint] = useState(false);
    const [debugError, setDebugError] = useState('');

    // Difficulty (Must sum to 100)
    const [difficulty, setDifficulty] = useState({ easy: 30, medium: 50, hard: 20 });

    // Reset selected chapters when subject changes & Fetch Schema
    useEffect(() => {
        setSelectedChapters([]);
        setDynamicSections([]);
        setQStructure({});
        setMarksConfig({});
        
        if (subjectId) {
            const fetchSchema = async () => {
                setLoadingBlueprint(true);
                try {
                    const selectedSubjectObj = subjects.find(s => s.classSubjectId == subjectId);
                    const selectedClassName = classes.find(c => c.id == classId)?.name;
                    if (selectedSubjectObj?.subjectName) {
                        const subTag = 'RULE_FOR_' + selectedSubjectObj.subjectName.replace(/\s/g, '');
                        const altTag = selectedSubjectObj.subjectName;
                        
                        const kbRes = await axios.get('/v1/support/knowledge');
                        let validRules = [];
                        
                        // Check rules by tag first
                        const tagRules = kbRes.data.filter(k => 
                            k.tags && (k.tags.includes(subTag) || k.tags.includes(altTag))
                        );
                        
                        // Then check rules by content
                        const contentRules = kbRes.data.filter(k => 
                            k.content && k.content.includes(selectedSubjectObj.subjectName)
                        );
                        
                        // Combine and filter only valid schema objects
                        const allPotentialRules = [...tagRules, ...contentRules];
                        validRules = allPotentialRules.filter(k => {
                            try {
                                const parsed = JSON.parse(k.content);
                                return Array.isArray(parsed) || (parsed && parsed.generation_blueprint);
                            } catch(e) {
                                return false;
                            }
                        });

                        if (validRules.length > 0) {
                            // Find the best match by class name, or just take the first valid one
                            const matchedRule = validRules.find(r => 
                                (r.tags && r.tags.includes(selectedClassName)) || 
                                (r.content && r.content.includes(selectedClassName))
                            ) || validRules[0];
                            
                            const schemaObj = JSON.parse(matchedRule.content);
                            
                            let blueprint = null;
                            let scrapingRules = [];

                            if (Array.isArray(schemaObj)) {
                                // Legacy Array Format
                                scrapingRules = schemaObj;
                                const uniqueTypes = [...new Set(schemaObj.map(r => r.questionType))];
                                blueprint = {
                                    mandatory_sections: uniqueTypes.map(t => {
                                        const rule = schemaObj.find(r => r.questionType === t);
                                        let tName = t === 'MULTIPLE_CHOICE' ? 'MCQ' : 
                                                    t === 'CREATIVE' ? 'CQ' : 
                                                    t === 'SHORT_ANSWER' ? 'SHORT' : t;
                                        return {
                                            name: rule.sectionName || tName,
                                            type: tName,
                                            target_ratio: "Auto"
                                        };
                                    })
                                };
                            } else {
                                // New Super Dynamic Format
                                blueprint = schemaObj.generation_blueprint;
                                scrapingRules = schemaObj.scraping_rules || [];
                            }
                            
                            // Initialize Sections
                            if (blueprint && blueprint.mandatory_sections) {
                                setDynamicSections(blueprint.mandatory_sections);
                                const initQStr = {};
                                blueprint.mandatory_sections.forEach(sec => {
                                    initQStr[sec.type] = 0;
                                });
                                setQStructure(initQStr);
                                
                                // Get marks from scraping rules
                                const marksMap = {};
                                scrapingRules.forEach(rule => {
                                    let t = rule.questionType === 'MULTIPLE_CHOICE' ? 'MCQ' : 
                                            rule.questionType === 'CREATIVE' ? 'CQ' : 
                                            rule.questionType === 'SHORT_ANSWER' ? 'SHORT' : rule.questionType;
                                    marksMap[t] = rule.marks || 1;
                                });
                                setMarksConfig(marksMap);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Failed to load blueprint", e);
                    setDebugError("Error: " + e.message);
                } finally {
                    setLoadingBlueprint(false);
                }
            };
            fetchSchema();
        }
    }, [subjectId, subjects, classId, classes]);

    // Checks & Balances
    const totalMarks = Object.keys(qStructure).reduce((sum, key) => sum + (qStructure[key] * (marksConfig[key] || 1)), 0);
    const totalQuestions = Object.keys(qStructure).reduce((sum, key) => sum + qStructure[key], 0);
    const isDifficultyValid = (difficulty.easy + difficulty.medium + difficulty.hard) === 100;

    const isFormValid = examInfo.title && subjectId && totalQuestions > 0 && isDifficultyValid;

    const toggleChapter = (id) => {
        setSelectedChapters(prev =>
            prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
        );
    };

    const handleGenerate = async () => {
        if (!isFormValid) return;
        setLoading(true);
        try {
            const questionTypeRules = Object.keys(qStructure).map(key => ({
                questionType: key,
                count: qStructure[key],
                marksPerQuestion: marksConfig[key] || 1
            })).filter(r => r.count > 0);

            const payload = {
                title: examInfo.title,
                examType: examInfo.examType,
                classSubjectId: subjectId,
                chapterIds: selectedChapters.length > 0 ? selectedChapters : [],
                durationMinutes: examInfo.duration,
                totalMarks: totalMarks,
                totalQuestions: totalQuestions,
                language: examInfo.language,
                easyPercent: difficulty.easy,
                mediumPercent: difficulty.medium,
                hardPercent: difficulty.hard,
                questionTypeRules: questionTypeRules
            };

            const res = await examService.generateExam(payload);
            if (res.success) {
                navigate(`/exams/generate/nexus-editor/${res.data.id}`);
            }
        } catch (e) {
            console.error(e);
            alert("Error: " + (e.response?.data?.message || "Failed to generate assessment. Need more questions in the question bank."));
        } finally {
            setLoading(false);
        }
    };

    const selectCls = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-outfit text-slate-800 pb-20">
            <div className="max-w-full xl:max-w-[1600px] mx-auto">

                {/* Header */}
                <div className="mb-8 border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2 font-bold text-sm tracking-wide uppercase">
                        <Sparkles size={16} /> AI Assessment Studio
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Auto Exam Generator
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">সহজ ধাপে স্বয়ংক্রিয়ভাবে প্রশ্নপত্র তৈরি করুন (Simple Step-by-Step UI)</p>
                </div>

                <div className="flex flex-col xl:flex-row gap-8">

                    {/* LEFT COLUMN: Settings */}
                    <div className="flex-1 space-y-6">

                        {/* Step 1: Basic Info */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-4">
                                <BookOpen className="text-indigo-500" size={20} />
                                Step 1: Basic Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Exam Title */}
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Exam Title (পরীক্ষার নাম)</label>
                                    <input
                                        type="text"
                                        value={examInfo.title}
                                        onChange={(e) => setExamInfo({ ...examInfo, title: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white"
                                        placeholder="e.g. Model Test 1 - Physics"
                                    />
                                </div>

                                {/* Level */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">স্তর (Level)</label>
                                    <select value={levelId} onChange={e => setLevelId(e.target.value)} className={selectCls}>
                                        <option value="">স্তর বাছুন</option>
                                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>

                                {/* Stream */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">বিভাগ/ধারা (Stream)</label>
                                    <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className={selectCls}>
                                        <option value="">বিভাগ বাছুন</option>
                                        {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                {/* Class */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">শ্রেণি (Class)</label>
                                    <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className={selectCls}>
                                        <option value="">শ্রেণি বাছুন</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">বিষয় (Subject)</label>
                                    <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className={selectCls}>
                                        <option value="">বিষয় বাছুন</option>
                                        {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                    </select>
                                </div>

                                {/* Language */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Language (ভাষা)</label>
                                    <select value={examInfo.language} onChange={(e) => setExamInfo({ ...examInfo, language: e.target.value })} className={selectCls}>
                                        <option value="Bangla">Bangla</option>
                                        <option value="English">English</option>
                                    </select>
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Time (সময় - মিনিট)</label>
                                    <input
                                        type="number"
                                        value={examInfo.duration}
                                        onChange={(e) => setExamInfo({ ...examInfo, duration: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Select Chapters */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Layers className="text-sky-500" size={20} />
                                    Step 2: Syllabus / Chapters
                                </h2>
                                <span className="text-xs font-bold text-slate-400">
                                    {selectedChapters.length === 0 ? 'Full Book (পূর্ণাঙ্গ বই)' : `${selectedChapters.length} Chapters selected`}
                                </span>
                            </div>

                            {chapters.length === 0 ? (
                                <div className="text-center p-6 text-slate-400 font-medium text-sm border-2 border-dashed rounded-xl">
                                    বিষয় সিলেক্ট করুন চ্যাপ্টার দেখার জন্য
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                    {chapters.map(ch => (
                                        <div
                                            key={ch.id}
                                            onClick={() => toggleChapter(ch.id)}
                                            className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                                                selectedChapters.includes(ch.id)
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                                                : 'border-slate-100 hover:border-indigo-200 bg-white text-slate-600 font-medium hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                                                selectedChapters.includes(ch.id) ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-slate-300'
                                            }`}>
                                                {selectedChapters.includes(ch.id) && <Check size={14} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <span className="text-sm truncate">{ch.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Step 3: Difficulty Ratio */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 border-b pb-4">
                                <Target className="text-purple-500" size={20} />
                                Step 3: Difficulty Ratio (কাঠিন্যের স্তর)
                            </h2>

                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                                Distribution
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isDifficultyValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    Total: {difficulty.easy + difficulty.medium + difficulty.hard}%
                                </span>
                            </h3>

                            <div className="flex h-3 rounded-full overflow-hidden w-full mb-6 bg-slate-100 shadow-inner">
                                <div style={{ width: `${difficulty.easy}%` }} className="bg-emerald-400 transition-all"></div>
                                <div style={{ width: `${difficulty.medium}%` }} className="bg-amber-400 transition-all"></div>
                                <div style={{ width: `${difficulty.hard}%` }} className="bg-rose-500 transition-all"></div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { key: 'easy', label: 'Easy (সহজ)', color: 'text-emerald-600' },
                                    { key: 'medium', label: 'Medium (মধ্যম)', color: 'text-amber-500' },
                                    { key: 'hard', label: 'Hard (কঠিন)', color: 'text-rose-500' }
                                ].map(level => (
                                    <div key={level.key} className="flex items-center gap-4">
                                        <span className={`text-[11px] font-bold w-24 uppercase truncate ${level.color}`}>{level.label}</span>
                                        <input type="range" min="0" max="100" value={difficulty[level.key]} onChange={(e) => setDifficulty({ ...difficulty, [level.key]: Number(e.target.value) })} className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                                        <span className="text-xs font-black text-slate-600 w-10 text-right">{difficulty[level.key]}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Question Structure & Submit */}
                    <div className="w-full xl:w-[450px] shrink-0">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 sticky top-4 overflow-hidden">
                            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                            <div className="p-6">
                                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <ListChecks size={20} className="text-indigo-600" />
                                    Question Structure
                                </h3>

                                {/* Quick Inputs */}
                                <div className="space-y-4 mb-8">
                                    {loadingBlueprint ? (
                                        <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                                            <Loader2 className="animate-spin mb-2" size={24} />
                                            <span className="text-xs font-medium">Loading Blueprint...</span>
                                        </div>
                                    ) : dynamicSections.length > 0 ? (
                                        dynamicSections.map((sec, idx) => {
                                            const colors = ['indigo', 'purple', 'teal', 'emerald', 'rose'];
                                            const color = colors[idx % colors.length];
                                            return (
                                                <div key={sec.type} className="flex justify-between items-center group bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800">{sec.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Target: {sec.target_ratio} | Per Q: {marksConfig[sec.type] || 1} Marks</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={qStructure[sec.type] || 0}
                                                            onChange={(e) => setQStructure({ ...qStructure, [sec.type]: parseInt(e.target.value) || 0 })}
                                                            className={`w-16 h-10 text-center font-black text-lg bg-white border-2 border-${color}-200 rounded-lg focus:border-${color}-500 outline-none`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center p-4 text-xs text-slate-400 font-medium border-2 border-dashed rounded-xl">
                                            {debugError ? (
                                                <span className="text-red-500">{debugError}</span>
                                            ) : (
                                                <span>Select Subject to load question structure.</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Summary */}
                                <div className="p-5 bg-slate-900 rounded-xl shadow-inner mb-6 text-white text-center">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Expected Marks</p>
                                    <div className="text-4xl font-black text-emerald-400">{totalMarks}</div>
                                    <p className="text-xs font-bold text-slate-400 mt-2">{totalQuestions} Questions Total</p>
                                </div>

                                {/* Generate Button */}
                                <button
                                    onClick={handleGenerate}
                                    disabled={!isFormValid || loading}
                                    className={`w-full py-4 rounded-xl font-black text-lg transition-all flex justify-center items-center gap-3 ${
                                        isFormValid && !loading
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'
                                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Calculator size={24} />}
                                    {loading ? 'Generating...' : 'Create Assessment'}
                                </button>

                                {!isFormValid && (
                                    <p className="text-[10px] text-center text-rose-500 font-bold uppercase mt-3 tracking-wider">
                                        Fill details, select structure & balance difficulty to 100%
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AutoExamGenerator;
