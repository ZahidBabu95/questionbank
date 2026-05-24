import React, { useState, useEffect } from 'react';
import { 
    Layers, ChevronRight, CheckCircle2, Settings2, FileText, CheckCircle, 
    ChevronLeft, BookOpen, Target, Loader2, BrainCircuit, Check, Square, 
    CheckSquare, Search, Sparkles, Clock, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import academicService from '../../../../services/academicService';
import examService from '../../../../services/examService';

const AutoExamWizardWidget = ({ userSubjects, isDark, extractedConfig }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loadingChapters, setLoadingChapters] = useState(false);
    const [chapters, setChapters] = useState([]);
    const [selectedChapters, setSelectedChapters] = useState([]); // Array of { id, name }
    const [generating, setGenerating] = useState(false);
    
    // Search queries
    const [subjectSearch, setSubjectSearch] = useState('');
    const [chapterSearch, setChapterSearch] = useState('');

    const [config, setConfig] = useState({
        subjectId: '',
        subjectName: '',
        title: '',
        qsCount: 10,
        difficulty: 'Medium',
        questionType: 'MCQ' // Default is MCQ, can also be CQ
    });

    // Populate config from extractedConfig if provided (fallback mechanism)
    useEffect(() => {
        if (extractedConfig) {
            let matchSubjectId = '';
            if (extractedConfig.subject && userSubjects) {
                const subMatch = userSubjects.find(s => s.name.toLowerCase().includes(extractedConfig.subject.toLowerCase()));
                if (subMatch) matchSubjectId = subMatch.id;
            }
            
            setConfig({
                subjectId: matchSubjectId,
                subjectName: extractedConfig.subject || '',
                title: `${extractedConfig.subject || 'Auto'} Exam`,
                qsCount: extractedConfig.questionCount || 10,
                difficulty: extractedConfig.difficulty || 'Medium',
                questionType: extractedConfig.questionType || 'MCQ'
            });
            
            if (extractedConfig.chapter && extractedConfig.chapter !== 'All Chapters') {
                setSelectedChapters([{ id: 'extracted', name: extractedConfig.chapter }]);
            } else {
                setSelectedChapters([]);
            }
            
            setStep(4); // Go to summary
        }
    }, [extractedConfig, userSubjects]);

    // Automatically update question count range when questionType changes
    useEffect(() => {
        if (config.questionType === 'CQ' && config.qsCount > 25) {
            setConfig(prev => ({ ...prev, qsCount: 10 }));
        } else if (config.questionType === 'MCQ' && config.qsCount <= 4) {
            setConfig(prev => ({ ...prev, qsCount: 25 }));
        }
    }, [config.questionType]);

    const handleSelectSubject = async (subjectId, subjectName) => {
        setConfig(prev => ({ ...prev, subjectId, subjectName, title: `${subjectName} - Auto Exam` }));
        setStep(2);
        setSelectedChapters([]); // Reset chapters on subject change
        setChapterSearch(''); // Clear chapter search query
        
        // Fetch chapters
        setLoadingChapters(true);
        try {
            const data = await academicService.getChaptersByClassSubject(subjectId);
            setChapters(data || []);
        } catch (error) {
            console.error("Failed to fetch chapters", error);
        } finally {
            setLoadingChapters(false);
        }
    };

    const toggleChapterSelection = (chapterId, chapterName) => {
        setSelectedChapters(prev => {
            const exists = prev.some(c => c.id === chapterId);
            if (exists) {
                return prev.filter(c => c.id !== chapterId);
            } else {
                return [...prev, { id: chapterId, name: chapterName }];
            }
        });
    };

    const handleSelectAllChapters = () => {
        const filtered = chapters.filter(chap => 
            chap.name.toLowerCase().includes(chapterSearch.toLowerCase())
        );

        const allFilteredSelected = filtered.every(f => 
            selectedChapters.some(s => s.id === f.id)
        );

        if (allFilteredSelected) {
            // Deselect all filtered chapters
            setSelectedChapters(prev => prev.filter(p => !filtered.some(f => f.id === p.id)));
        } else {
            // Select all filtered chapters
            setSelectedChapters(prev => {
                const uniqueOnes = [...prev];
                filtered.forEach(f => {
                    if (!uniqueOnes.some(u => u.id === f.id)) {
                        uniqueOnes.push({ id: f.id, name: f.name });
                    }
                });
                return uniqueOnes;
            });
        }
    };

    const handleGenerate = async () => {
        if (!config.subjectId) return alert("Please select a subject.");
        
        setGenerating(true);
        try {
            // Determine percentages based on selected difficulty
            let easy = 30, medium = 50, hard = 20;
            if (config.difficulty === 'Easy') { easy = 50; medium = 40; hard = 10; }
            else if (config.difficulty === 'Medium') { easy = 30; medium = 50; hard = 20; }
            else if (config.difficulty === 'Hard') { easy = 20; medium = 30; hard = 50; }

            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};
            const language = (user?.instituteMedium && user.instituteMedium.includes(',')) ? 'Bangla' : (user?.instituteMedium || 'Bangla');

            const isCQ = config.questionType === 'CQ';
            const marksPerQuestion = isCQ ? 10 : 1;
            const totalMarks = config.qsCount * marksPerQuestion;

            const chapterIds = selectedChapters.map(c => c.id).filter(id => id !== 'extracted');

            const res = await examService.generateExam({
                title: config.title || 'Auto Exam',
                examType: 'MODEL_TEST',
                classSubjectId: config.subjectId,
                totalMarks: totalMarks,
                totalQuestions: config.qsCount,
                durationMinutes: isCQ ? 120 : 60,
                language: language,
                instructions: "",
                instituteName: user.instituteName || "",
                headerText: "",
                shuffleQuestions: true,
                shuffleOptions: true,
                chapterIds: chapterIds.length > 0 ? chapterIds : undefined,
                easyPercent: easy,
                mediumPercent: medium,
                hardPercent: hard,
                questionTypeRules: [
                    { questionType: isCQ ? 'CREATIVE' : 'MCQ', count: config.qsCount, marksPerQuestion: marksPerQuestion }
                ]
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
            setGenerating(false);
        }
    };

    // Advanced, HSL-tailored neon theme definitions based on isDark state
    const design = {
        cardBg: isDark 
            ? 'bg-gradient-to-b from-[#151522]/95 to-[#0d0d14]/95 border-[#28283f]/80 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.35)]' 
            : 'bg-gradient-to-b from-white/95 to-[#f8fafc]/95 border-slate-200/70 backdrop-blur-md shadow-[0_20px_50px_rgba(99,102,241,0.07)]',
        headerBg: isDark 
            ? 'bg-gradient-to-r from-[#1b1b2f]/50 to-[#12121e]/50 border-b border-[#28283f]/80' 
            : 'bg-gradient-to-r from-slate-50/60 to-white/40 border-b border-slate-200/50',
        textPrimary: isDark ? 'text-slate-100' : 'text-slate-800',
        textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
        btnSecondary: isDark 
            ? 'border-[#28283f] text-slate-300 hover:bg-[#1f1f33] hover:text-white transition-all active:scale-[0.98]' 
            : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary transition-all active:scale-[0.98]',
        inputBg: isDark 
            ? 'bg-[#09090f] border-[#252538] text-slate-200 focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10' 
            : 'bg-slate-50/50 border-slate-200 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5',
        activeListItem: isDark 
            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/50 text-indigo-300 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.15)] font-bold' 
            : 'bg-gradient-to-r from-indigo-50/60 to-purple-50/30 border-indigo-200/80 text-indigo-700 font-bold shadow-sm',
        inactiveListItem: isDark 
            ? 'bg-[#151522]/40 border-[#28283f]/60 hover:border-indigo-500/40 hover:bg-indigo-500/5 text-slate-300 hover:text-white' 
            : 'bg-white border-slate-200 hover:border-primary/40 hover:bg-primary/5 text-slate-700 hover:text-primary',
        stepBadge: isDark ? 'bg-[#252538] text-slate-400' : 'bg-slate-200 text-slate-600',
    };

    // Filter user subjects based on query
    const filteredSubjects = userSubjects?.filter(sub => 
        sub.name.toLowerCase().includes(subjectSearch.toLowerCase())
    ) || [];

    // Filter chapters based on query
    const filteredChapters = chapters.filter(chap => 
        chap.name.toLowerCase().includes(chapterSearch.toLowerCase())
    );

    return (
        <div className={`mt-4 border rounded-[2rem] overflow-hidden max-w-2xl w-full transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${design.cardBg}`}>
            {/* Header with Step Indicator */}
            <div className={`px-3.5 py-4 sm:px-5 flex items-center justify-between ${design.headerBg}`}>
                <div className="flex items-center gap-2.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isDark ? 'bg-indigo-500/15 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-primary/10 text-primary'}`}>
                        <BrainCircuit size={18} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className={`font-bold text-[14.5px] tracking-tight flex items-center gap-1.5 ${design.textPrimary}`}>
                            Magic Exam Builder
                            <Sparkles size={13} className="text-amber-500 fill-amber-500" />
                        </h3>
                        <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-indigo-400/80' : 'text-primary/80'}`}>Next-Gen AI Generator</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-200/50 dark:bg-black/30 px-2 py-1 rounded-full">
                    {[1, 2, 3, 4].map(s => (
                        <div 
                            key={s}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                s === step 
                                    ? 'w-5 bg-gradient-to-r from-violet-500 to-indigo-500 shadow-md' 
                                    : s < step 
                                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                                        : (isDark ? 'bg-[#35354f]' : 'bg-slate-300')
                            }`}
                        />
                    ))}
                </div>
            </div>
            
            <div className="p-3.5 sm:p-5 space-y-4">
                {/* STEP 1: Select Subject */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full"></span>
                            <p className={`text-sm font-bold ${design.textPrimary}`}>Select subject for your exam</p>
                        </div>

                        {/* Interactive Dynamic Search Bar */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search assigned subjects..."
                                value={subjectSearch}
                                onChange={e => setSubjectSearch(e.target.value)}
                                className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border outline-none transition-all ${design.inputBg}`}
                            />
                            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                        
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {filteredSubjects.length > 0 ? (
                                filteredSubjects.map(sub => (
                                    <button 
                                        key={sub.id} 
                                        type="button"
                                        onClick={() => handleSelectSubject(sub.id, sub.name)}
                                        className={`text-left text-[13px] p-3.5 rounded-2xl border transition-all flex items-center justify-between active:scale-[0.98] ${design.inactiveListItem}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                <BookOpen size={15} className="shrink-0" />
                                            </div>
                                            <span className="font-semibold truncate">{sub.name}</span>
                                        </div>
                                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <HelpCircle size={24} className="mx-auto text-slate-400 mb-2 stroke-[1.5]" />
                                    <p className={`text-xs ${design.textMuted}`}>
                                        {userSubjects?.length > 0 ? 'No matching subjects found.' : 'No subjects assigned to your account.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* STEP 2: Multi-select Chapters */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full"></span>
                                <p className={`text-sm font-bold ${design.textPrimary}`}>Choose Syllabus Chapters</p>
                            </div>
                            {chapters.length > 0 && (
                                <button 
                                    type="button"
                                    onClick={handleSelectAllChapters}
                                    className="text-[11px] font-bold px-2.5 py-1 bg-indigo-500/10 text-primary dark:text-indigo-400 rounded-full hover:bg-indigo-500/20 active:scale-95 transition-all"
                                >
                                    {filteredChapters.every(f => selectedChapters.some(s => s.id === f.id)) ? 'Deselect Filtered' : 'Select Filtered'}
                                </button>
                            )}
                        </div>

                        {/* Interactive Dynamic Search Bar for Chapters */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search chapter names..."
                                value={chapterSearch}
                                onChange={e => setChapterSearch(e.target.value)}
                                className={`w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border outline-none transition-all ${design.inputBg}`}
                            />
                            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                        
                        {loadingChapters ? (
                            <div className="flex flex-col justify-center items-center py-10 gap-2.5">
                                <Loader2 size={28} className="animate-spin text-primary" />
                                <span className={`text-xs font-medium ${design.textMuted}`}>Fetching syllabus blueprint...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {/* All Chapters preset */}
                                <button 
                                    type="button"
                                    onClick={() => setSelectedChapters([])}
                                    className={`text-left text-[13px] p-3.5 rounded-2xl border transition-all flex items-center justify-between active:scale-[0.98] ${
                                        selectedChapters.length === 0
                                            ? design.activeListItem
                                            : design.inactiveListItem
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${selectedChapters.length === 0 ? 'bg-primary/20 text-primary' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                                            <Layers size={15} /> 
                                        </div>
                                        <span className="font-semibold">All Chapters (Full Syllabus)</span>
                                    </div>
                                    {selectedChapters.length === 0 && <CheckCircle2 size={16} className="text-primary shrink-0 fill-primary/10" />}
                                </button>

                                {filteredChapters.length > 0 ? (
                                    filteredChapters.map(chap => {
                                        const isSelected = selectedChapters.some(c => c.id === chap.id);
                                        return (
                                            <button 
                                                key={chap.id} 
                                                type="button"
                                                onClick={() => toggleChapterSelection(chap.id, chap.name)}
                                                className={`text-left text-[13px] p-3.5 rounded-2xl border transition-all flex items-center justify-between active:scale-[0.98] ${
                                                    isSelected 
                                                        ? design.activeListItem
                                                        : design.inactiveListItem
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {isSelected ? (
                                                        <div className="p-1 rounded-md bg-indigo-500/10 text-primary dark:text-indigo-400">
                                                            <CheckSquare size={16} className="shrink-0" />
                                                        </div>
                                                    ) : (
                                                        <div className="p-1 rounded-md text-slate-400">
                                                            <Square size={16} className="shrink-0" />
                                                        </div>
                                                    )}
                                                    <span className="font-semibold truncate">{chap.name}</span>
                                                </div>
                                                {isSelected && <CheckCircle size={16} className="text-primary shrink-0" />}
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8">
                                        <HelpCircle size={22} className="mx-auto text-slate-400 mb-2 stroke-[1.5]" />
                                        <p className={`text-xs ${design.textMuted}`}>No matching chapters found.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2.5 pt-2">
                            <button 
                                type="button"
                                onClick={() => setStep(1)}
                                className={`flex-1 py-3 rounded-2xl font-bold border transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${design.btnSecondary}`}
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                            <button 
                                type="button"
                                onClick={() => setStep(3)}
                                className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10' : 'bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/10'}`}
                            >
                                Parameters <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
                
                {/* STEP 3: Setup Parameters & Question Type */}
                {step === 3 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full"></span>
                            <p className={`text-sm font-bold ${design.textPrimary}`}>Configure Exam Parameters</p>
                        </div>
                        
                        {/* Question Format Card Selectors */}
                        <div>
                            <label className={`block text-[10.5px] font-bold mb-2.5 uppercase tracking-wider ${design.textMuted}`}>Question Format</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { type: 'MCQ', label: 'MCQ (Multiple Choice)', desc: '1 Mark • Automated grading', icon: <FileText size={16} /> },
                                    { type: 'CQ', label: 'CQ (Creative Written)', desc: '10 Marks • Analytical logic', icon: <BrainCircuit size={16} /> }
                                ].map(opt => {
                                    const active = config.questionType === opt.type;
                                    return (
                                        <button
                                            key={opt.type}
                                            type="button"
                                            onClick={() => setConfig({ ...config, questionType: opt.type })}
                                            className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2.5 transition-all active:scale-[0.98] ${
                                                active 
                                                    ? 'border-indigo-500 bg-indigo-500/5 text-primary shadow-[0_0_15px_rgba(99,102,241,0.12)]' 
                                                    : design.inactiveListItem
                                            }`}
                                        >
                                            <div className="flex justify-between items-center w-full">
                                                <div className={`p-2 rounded-xl ${active ? 'bg-primary/20 text-primary' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                                                    {opt.icon}
                                                </div>
                                                {active && <CheckCircle2 size={16} className="text-primary fill-primary/10" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[12.5px] leading-tight">{opt.label}</p>
                                                <p className={`text-[9.5px] mt-1 font-medium leading-tight ${active ? 'text-indigo-600/80 dark:text-indigo-400/80' : 'text-slate-400'}`}>{opt.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Interactive Range Slider for Questions */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className={`block text-[10.5px] font-bold uppercase tracking-wider ${design.textMuted}`}>Number of Questions</label>
                                <span className={`text-[12.5px] font-extrabold px-2.5 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-primary/10 text-primary'}`}>
                                    {config.qsCount} Qs
                                </span>
                            </div>
                            
                            <div className="space-y-3 bg-slate-100/40 dark:bg-[#181824]/40 border border-slate-200/40 dark:border-[#252538]/40 p-3.5 rounded-2xl">
                                <input 
                                    type="range"
                                    min={config.questionType === 'CQ' ? 2 : 5}
                                    max={config.questionType === 'CQ' ? 20 : 100}
                                    step={config.questionType === 'CQ' ? 1 : 5}
                                    value={config.qsCount}
                                    onChange={e => setConfig({...config, qsCount: parseInt(e.target.value) || 5})}
                                    className="w-full accent-primary h-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 cursor-pointer"
                                />
                                <div className="flex gap-2">
                                    <input 
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={config.qsCount}
                                        onChange={e => setConfig({...config, qsCount: Math.min(100, Math.max(1, parseInt(e.target.value) || 0))})}
                                        className={`w-16 text-center text-[13px] font-bold p-2 rounded-xl border outline-none transition-all ${design.inputBg}`}
                                    />
                                    <div className="flex-1 flex gap-1">
                                        {(config.questionType === 'CQ' ? [5, 10, 15, 20] : [10, 25, 50, 100]).map(val => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => setConfig({...config, qsCount: val})}
                                                className={`flex-1 rounded-xl text-[10.5px] font-bold border transition-all ${
                                                    config.qsCount === val
                                                        ? 'bg-primary border-primary text-white shadow-sm shadow-primary/20'
                                                        : design.btnSecondary
                                                }`}
                                            >
                                                {val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Difficulty Levels with Color Indicator Dots */}
                        <div>
                            <label className={`block text-[10.5px] font-bold mb-2 uppercase tracking-wider ${design.textMuted}`}>Target Difficulty</label>
                            <div className="flex bg-slate-100/80 dark:bg-[#151522] rounded-xl p-1 border border-slate-200/50 dark:border-[#28283f]/60 gap-1">
                                {['Easy', 'Medium', 'Hard'].map(lvl => {
                                    const active = config.difficulty === lvl;
                                    let activeClass = '';
                                    if (active) {
                                        if (lvl === 'Easy') activeClass = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-bold';
                                        else if (lvl === 'Medium') activeClass = 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-bold';
                                        else if (lvl === 'Hard') activeClass = 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.15)] font-bold';
                                    }
                                    return (
                                        <button 
                                            key={lvl}
                                            type="button"
                                            onClick={() => setConfig({...config, difficulty: lvl})}
                                            className={`flex-1 text-xs py-2 border rounded-lg font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${
                                                active 
                                                    ? activeClass 
                                                    : 'border-transparent text-slate-400 hover:text-slate-300 dark:hover:text-slate-300 hover:text-slate-700'
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${
                                                lvl === 'Easy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' :
                                                lvl === 'Medium' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]' :
                                                'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                                            }`} />
                                            {lvl}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Navigation Actions */}
                        <div className="flex gap-2.5 pt-2">
                            <button 
                                type="button"
                                onClick={() => setStep(2)}
                                className={`flex-[1] py-3.5 rounded-2xl font-bold border transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${design.btnSecondary}`}
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                            <button 
                                type="button"
                                onClick={() => setStep(4)}
                                className={`flex-[2] py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10' : 'bg-primary hover:bg-primary/95 text-white shadow-md shadow-primary/10'}`}
                            >
                                Review Summary <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
                
                {/* STEP 4: Review Summary & Trigger API */}
                {step === 4 && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full"></span>
                            <p className={`text-sm font-bold ${design.textPrimary}`}>Confirm Exam Setup Blueprint</p>
                        </div>

                        {/* Premium Digital Blueprint Ticket Layout */}
                        <div className={`p-4.5 rounded-2xl border space-y-3.5 relative overflow-hidden ${
                            isDark 
                                ? 'bg-gradient-to-b from-[#181829]/70 to-[#12121e]/70 border-[#2b2b46]/70 shadow-inner' 
                                : 'bg-gradient-to-b from-slate-50/70 to-slate-100/30 border-slate-200/50 shadow-inner'
                        }`}>
                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] text-primary dark:text-indigo-400 pointer-events-none">
                                <Sparkles size={80} />
                            </div>

                            <div className="flex justify-between items-start text-[13px] border-b pb-2.5 border-dashed border-slate-300 dark:border-[#2f2f4e]">
                                <span className={design.textMuted}>Subject</span>
                                <span className={`font-bold text-right max-w-[65%] truncate ${design.textPrimary}`} title={config.subjectName}>{config.subjectName || '-'}</span>
                            </div>
                            
                            <div className="flex justify-between items-start text-[13px] border-b pb-2.5 border-dashed border-slate-300 dark:border-[#2f2f4e]">
                                <span className={design.textMuted}>Chapters Selected</span>
                                <span className={`font-bold text-right max-w-[65%] truncate ${design.textPrimary}`}>
                                    {selectedChapters.length === 0 
                                        ? 'Full Syllabus (All Chapters)' 
                                        : `${selectedChapters.length} Chapters (${selectedChapters.map(c => c.name).join(', ')})`}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-[13px] border-b pb-2.5 border-dashed border-slate-300 dark:border-[#2f2f4e]">
                                <span className={design.textMuted}>Question Format</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    config.questionType === 'CQ' 
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' 
                                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                                }`}>
                                    {config.questionType === 'CQ' ? 'Creative Written (CQ)' : 'Multiple Choice (MCQ)'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-[13px] border-b pb-2.5 border-dashed border-slate-300 dark:border-[#2f2f4e]">
                                <span className={design.textMuted}>Question Count</span>
                                <span className={`font-bold ${design.textPrimary}`}>{config.qsCount} Questions</span>
                            </div>

                            <div className="flex justify-between items-center text-[13px]">
                                <span className={design.textMuted}>Total Marks / Difficulty</span>
                                <span className={`font-bold ${design.textPrimary}`}>
                                    {config.qsCount * (config.questionType === 'CQ' ? 10 : 1)} Marks ({config.difficulty})
                                </span>
                            </div>
                        </div>
                        
                        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                            isDark 
                                ? 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                                : 'bg-indigo-50 border-indigo-100/70 text-indigo-800'
                        }`}>
                            <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                            <p className="text-[11.5px] leading-relaxed font-medium">
                                Ready to generate. Click below to launch the Auto Generator Engine. This will compile a balanced test paper using dynamic cognitive ratios.
                            </p>
                        </div>

                        <div className="flex gap-2.5">
                            <button 
                                type="button"
                                onClick={() => setStep(3)}
                                className={`flex-[1] py-3.5 rounded-2xl font-bold border transition-all flex items-center justify-center active:scale-[0.98] ${design.btnSecondary}`}
                            >
                                <ChevronLeft size={16} /> Edit
                            </button>
                            <button 
                                type="button"
                                onClick={handleGenerate}
                                disabled={generating}
                                className={`flex-[2.5] py-3.5 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                                    isDark 
                                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
                                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/15'
                                } ${generating ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {generating ? <Loader2 size={18} className="animate-spin text-white" /> : <Layers size={18} />}
                                {generating ? 'Generating Paper...' : 'Generate Exam Paper'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutoExamWizardWidget;
