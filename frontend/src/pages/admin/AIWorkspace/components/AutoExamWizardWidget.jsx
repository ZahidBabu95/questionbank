import React, { useState, useEffect } from 'react';
import { Layers, ChevronRight, CheckCircle2, Settings2, FileText, CheckCircle, ChevronLeft, BookOpen, Target, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import academicService from '../../../../services/academicService';
import examService from '../../../../services/examService';

const AutoExamWizardWidget = ({ userSubjects, isDark, extractedConfig }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loadingChapters, setLoadingChapters] = useState(false);
    const [chapters, setChapters] = useState([]);
    const [generating, setGenerating] = useState(false);
    
    const [config, setConfig] = useState({
        subjectId: '',
        subjectName: '',
        chapterId: '', // Empty means "All Chapters"
        chapterName: 'All Chapters',
        title: '',
        qsCount: 10,
        difficulty: 'Medium'
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
                chapterId: '',
                chapterName: extractedConfig.chapter || 'All Chapters',
                title: `${extractedConfig.subject || 'Auto'} Exam - ${extractedConfig.chapter || 'All Chapters'}`,
                qsCount: extractedConfig.questionCount || 10,
                difficulty: extractedConfig.difficulty || 'Medium'
            });
            setStep(4); // Go to summary
        }
    }, [extractedConfig, userSubjects]);

    const handleSelectSubject = async (subjectId, subjectName) => {
        setConfig(prev => ({ ...prev, subjectId, subjectName, title: `${subjectName} - Auto Exam` }));
        setStep(2);
        
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

    const handleSelectChapter = (chapterId, chapterName) => {
        setConfig(prev => ({ 
            ...prev, 
            chapterId, 
            chapterName,
            title: `${prev.subjectName} (${chapterName}) - Auto Exam`
        }));
        setStep(3);
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

            const res = await examService.generateExam({
                title: config.title || 'Auto Exam',
                examType: 'MODEL_TEST',
                classSubjectId: config.subjectId,
                totalMarks: config.qsCount, // Assuming 1 mark per MCQ by default
                totalQuestions: config.qsCount,
                durationMinutes: 60,
                language: language,
                instructions: "",
                instituteName: user.instituteName || "",
                headerText: "",
                shuffleQuestions: true,
                shuffleOptions: true,
                chapterIds: config.chapterId ? [config.chapterId] : undefined,
                easyPercent: easy,
                mediumPercent: medium,
                hardPercent: hard,
                questionTypeRules: [
                    { questionType: 'MCQ', count: config.qsCount, marksPerQuestion: 1 }
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

    return (
        <div className={`mt-4 border rounded-2xl overflow-hidden shadow-sm max-w-md ${isDark ? 'bg-[#111118] border-[#2a2a3d]' : 'bg-white border-slate-200'}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'bg-[#16161f] border-[#2a2a3d]' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-primary/10 text-primary'}`}>
                        <Settings2 size={16} />
                    </div>
                    <h3 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Exam Setup Agent</h3>
                </div>
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-[#2a2a3d] text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                    Step {step > 4 ? 4 : step}/4
                </div>
            </div>
            
            <div className="p-4 space-y-4">
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in">
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Which subject would you like to create an exam for?</p>
                        
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {userSubjects?.length > 0 ? (
                                userSubjects.map(sub => (
                                    <button 
                                        key={sub.id} 
                                        onClick={() => handleSelectSubject(sub.id, sub.name)}
                                        className={`text-left text-sm p-3 rounded-xl border transition-all flex items-center justify-between ${
                                            isDark 
                                                ? 'bg-[#16161f] border-[#2a2a3d] hover:border-indigo-500/50 hover:bg-indigo-500/10 text-slate-300' 
                                                : 'bg-white border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-slate-700'
                                        }`}
                                    >
                                        <span className="font-semibold">{sub.name}</span>
                                        <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                                    </button>
                                ))
                            ) : (
                                <p className={`text-sm text-center py-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No subjects assigned to you.</p>
                            )}
                        </div>
                    </div>
                )}
                
                {step === 2 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Great. Now select a specific chapter, or choose all chapters for a full test.</p>
                        
                        {loadingChapters ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 size={24} className="animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                <button 
                                    onClick={() => handleSelectChapter('', 'All Chapters')}
                                    className={`text-left text-sm p-3 rounded-xl border transition-all flex items-center gap-3 ${
                                        isDark 
                                            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' 
                                            : 'bg-primary/10 border-primary/30 text-primary font-bold'
                                    }`}
                                >
                                    <BookOpen size={16} /> <span>All Chapters (Full Syllabus)</span>
                                </button>

                                {chapters.map(chap => (
                                    <button 
                                        key={chap.id} 
                                        onClick={() => handleSelectChapter(chap.id, chap.name)}
                                        className={`text-left text-sm p-3 rounded-xl border transition-all flex items-center justify-between ${
                                            isDark 
                                                ? 'bg-[#16161f] border-[#2a2a3d] hover:border-indigo-500/50 hover:bg-indigo-500/10 text-slate-300' 
                                                : 'bg-white border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-slate-700'
                                        }`}
                                    >
                                        <span className="font-semibold">{chap.name}</span>
                                        <ChevronRight size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                                    </button>
                                ))}
                            </div>
                        )}

                        <button 
                            onClick={() => setStep(1)}
                            className={`w-full py-2.5 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 ${isDark ? 'border-[#2a2a3d] text-slate-400 hover:bg-[#2a2a3d]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            <ChevronLeft size={16} /> Back to Subjects
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4 animate-in slide-in-from-right-4">
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Almost done! How many questions and what difficulty level do you want?</p>
                        
                        <div>
                            <label className={`block text-xs font-bold mb-1.5 uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Total Questions</label>
                            <input 
                                type="number"
                                value={config.qsCount}
                                onChange={e => setConfig({...config, qsCount: parseInt(e.target.value) || 0})}
                                className={`w-full text-sm p-2.5 rounded-xl border outline-none transition-all ${isDark ? 'bg-[#0a0a0f] border-[#2a2a3d] text-slate-300 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-primary'}`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-bold mb-1.5 uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Target Difficulty</label>
                            <div className="flex bg-slate-100 dark:bg-[#16161f] rounded-lg p-1">
                                {['Easy', 'Medium', 'Hard'].map(lvl => (
                                    <button 
                                        key={lvl}
                                        onClick={() => setConfig({...config, difficulty: lvl})}
                                        className={`flex-1 text-xs py-2 rounded-md font-bold transition-all ${config.difficulty === lvl ? (isDark ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white text-primary shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={() => setStep(2)}
                                className={`flex-[1] py-2.5 rounded-xl font-bold border transition-all flex items-center justify-center gap-1 ${isDark ? 'border-[#2a2a3d] text-slate-300 hover:bg-[#2a2a3d]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                            <button 
                                onClick={() => setStep(4)}
                                className={`flex-[2] py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-primary hover:bg-primary/90 text-white'}`}
                            >
                                Review Summary <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-5 animate-in fade-in">
                        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#16161f] border-[#2a2a3d]' : 'bg-slate-50 border-slate-200'}`}>
                            <h4 className={`text-sm font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                <Target size={16} className="text-indigo-500" /> Draft Configuration
                            </h4>
                            
                            <ul className="space-y-2">
                                <li className="flex justify-between items-center text-[13px]">
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Subject</span>
                                    <span className={`font-bold text-right max-w-[60%] truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`} title={config.subjectName}>{config.subjectName || '-'}</span>
                                </li>
                                <li className="flex justify-between items-center text-[13px]">
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Chapter</span>
                                    <span className={`font-bold text-right max-w-[60%] truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`} title={config.chapterName}>{config.chapterName}</span>
                                </li>
                                <li className="flex justify-between items-center text-[13px]">
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Questions</span>
                                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{config.qsCount}</span>
                                </li>
                                <li className="flex justify-between items-center text-[13px]">
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Difficulty</span>
                                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{config.difficulty}</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div className={`p-3 rounded-xl border flex items-start gap-3 ${isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'}`}>
                            <CheckCircle size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                            <p className={`text-[12px] leading-relaxed ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
                                Blueprint applied. Click below to proceed to the Auto Generator wizard to finalize and build your exam.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => setStep(3)}
                                className={`flex-[1] py-3 rounded-xl font-bold border transition-all flex items-center justify-center ${isDark ? 'border-[#2a2a3d] text-slate-300 hover:bg-[#2a2a3d]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <ChevronLeft size={16} /> Edit
                            </button>
                            <button 
                                onClick={handleGenerate}
                                disabled={generating}
                                className={`flex-[3] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20'} ${generating ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {generating ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
                                {generating ? 'Generating...' : 'Generate Exam'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutoExamWizardWidget;

