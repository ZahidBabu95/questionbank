import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Save, BookOpen, Layers, Search, Plus, Trash2, Loader2, Target, Check, LayoutGrid, ChevronRight, ChevronLeft, Copy, Eye, EyeOff, Bookmark, CheckCircle, BookmarkCheck, FileText } from 'lucide-react';
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

const defaultMarksMap = { 'MCQ': 1, 'CQ': 10, 'SHORT': 2 };

const QuestionCard = React.memo(({
    q,
    idx,
    inCart,
    onAdd,
    addLoading,
    cartLength,
    targetQs,
    isSaved,
    onToggleSave,
    examInfo
}) => {
    const [showAnswer, setShowAnswer] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

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
    const hasAnswer = q.correctAnswer && q.correctAnswer.replace(/<[^>]*>/g, '').trim().length > 0;
    const hasExplanation = finalExplanation && finalExplanation.replace(/<[^>]*>/g, '').trim().length > 0;

    const typeLabel = q.type === 'MCQ' ? 'MCQ' : q.type === 'CQ' ? 'Creative' : q.type === 'SHORT' ? 'Short Answer' : q.type;

    const difficultyStyle = {
        EASY: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        MEDIUM: 'bg-amber-50 text-amber-700 border-amber-100',
        HARD: 'bg-rose-50 text-rose-700 border-rose-100',
    };

    return (
        <div 
            id={`question-item-${q.id}`}
            className={`rounded-xl border transition-all duration-300 shadow-sm p-2.5 sm:p-3 ${
                inCart 
                    ? 'bg-emerald-50/15 border-emerald-250 ring-1 ring-emerald-100/20 shadow-md' 
                    : 'bg-white border-slate-100 hover:border-indigo-150 hover:shadow-md'
            }`}
        >
            {/* ── Header Row (Ultra-Compact labels) ── */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
                <span className="text-[9px] font-black text-slate-700 bg-slate-100 px-1 py-px rounded border border-slate-200">Q #{idx + 1}</span>
                <span className="text-[8px] font-extrabold bg-slate-100 text-slate-600 px-1 py-px rounded border border-slate-200">{typeLabel}</span>
                
                {q.status === 'APPROVED' && <span className="px-1 py-px bg-emerald-50 text-emerald-700 rounded text-[7.5px] font-bold uppercase border border-emerald-100">Approved</span>}
                {q.status === 'PENDING' && <span className="px-1 py-px bg-amber-50 text-amber-700 rounded text-[7.5px] font-bold uppercase border border-amber-100">Pending</span>}
                {q.status === 'REVISED' && <span className="px-1 py-px bg-rose-100 text-rose-850 rounded text-[7.5px] font-bold uppercase border border-rose-200 animate-pulse">Revised</span>}
                {q.aiGenerated && <span className="px-1 py-px bg-violet-50 text-violet-700 rounded text-[7.5px] font-bold uppercase border border-violet-100">AI Synced</span>}
                
                <span className={`px-1 py-px rounded text-[7.5px] font-bold uppercase border ${difficultyStyle[q.difficulty] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {q.difficulty}
                </span>
                {q.bloomLevel && (
                    <span className="px-1 py-px bg-indigo-50 text-indigo-700 rounded text-[7.5px] font-bold border border-indigo-100 uppercase">
                        {q.bloomLevel}
                    </span>
                )}
                {/* Render Rich Source Tags dynamically */}
                {q.sources && q.sources.length > 0 ? (
                    q.sources.map((src, sIdx) => {
                        const type = src.sourceType || 'OTHER';
                        const org = src.organizationName || '';
                        const year = src.examYear ? ` ${src.examYear}` : '';
                        const exam = src.examName ? ` - ${src.examName}` : '';
                        const displayName = `${org}${exam}${year}`;

                        if (type === 'BOARD_EXAM') {
                            return (
                                <span key={sIdx} className="px-1 py-px bg-purple-50 text-purple-700 rounded text-[7.5px] font-bold border border-purple-100 uppercase">
                                    🏛️ {displayName}
                                </span>
                            );
                        }
                        if (type === 'UNIVERSITY_ADMISSION') {
                            return (
                                <span key={sIdx} className="px-1 py-px bg-indigo-50 text-indigo-700 rounded text-[7.5px] font-bold border border-indigo-100 uppercase">
                                    🎓 {displayName}
                                </span>
                            );
                        }
                        if (type === 'INSTITUTION_TEST') {
                            return (
                                <span key={sIdx} className="px-1 py-px bg-emerald-50 text-emerald-700 rounded text-[7.5px] font-bold border border-emerald-100 uppercase">
                                    🏫 {displayName}
                                </span>
                            );
                        }
                        if (type === 'JOB_EXAM') {
                            return (
                                <span key={sIdx} className="px-1 py-px bg-amber-50 text-amber-700 rounded text-[7.5px] font-bold border border-amber-100 uppercase">
                                    💼 {displayName}
                                </span>
                            );
                        }
                        return (
                            <span key={sIdx} className="px-1 py-px bg-slate-100 text-slate-600 rounded text-[7.5px] font-bold border border-slate-200 uppercase">
                                🏛️ {displayName}
                            </span>
                        );
                    })
                ) : (
                    q.sourceReference && (
                        q.sourceReference === 'Textbook Content' ? (
                            <span className="px-1 py-px bg-slate-100 text-slate-600 rounded text-[7.5px] font-bold border border-slate-200 uppercase">
                                📖 Textbook
                            </span>
                        ) : (
                            <span className="px-1 py-px bg-purple-50 text-purple-700 rounded text-[7.5px] font-bold border border-purple-100 uppercase">
                                🏛️ {q.sourceReference}
                            </span>
                        )
                    )
                )}
                <span className="px-1 py-px bg-slate-50 text-slate-600 rounded text-[7.5px] font-bold border border-slate-200">
                    {examInfo.language === 'Bangla' ? `${toBnNum(defaultMarksMap[q.type] || 1)} মার্কস` : `${defaultMarksMap[q.type] || 1} M`}
                </span>
            </div>

            {/* ── Stimulus (Left accent line banner - Ultra-Slim layout) ── */}
            {(() => {
                let stimulusContent = null;
                if (q.stimulus) {
                    const cleanStimulus = q.stimulus.replace(/<[^>]*>/g, '').trim().toLowerCase();
                    const isPlaceholder = 
                        cleanStimulus === '' || 
                        cleanStimulus === 'generated question' || 
                        cleanStimulus === 'dynamic question' || 
                        cleanStimulus === 'ডায়নামিক প্রশ্ন' ||
                        cleanStimulus === 'ডায়নামিক প্রশ্ন';
                    if (!isPlaceholder) {
                        stimulusContent = q.stimulus;
                    }
                }
                
                if (!stimulusContent && q.type === 'CQ' && q.questionText && q.questionText.includes('<div class="cq-questions">')) {
                    const parts = q.questionText.split('<div class="cq-questions">');
                    const prospectiveStimulus = parts[0].trim();
                    const cleanProspective = prospectiveStimulus.replace(/<[^>]*>/g, '').trim();
                    if (cleanProspective.length > 0) {
                        stimulusContent = prospectiveStimulus;
                    }
                }
                
                if (!stimulusContent) return null;
                
                return (
                    <div className="w-full mb-1.5 px-2 py-1 bg-indigo-50/20 border-l-4 border-l-indigo-500 rounded-r-md text-[11px] sm:text-[12px] text-slate-700 font-semibold leading-normal shadow-sm">
                        <span className="block text-[8px] font-black text-indigo-600 uppercase tracking-wider mb-0.5">Stimulus / উদ্দীপক:</span>
                        <MarkdownRenderer content={parseMarkdownImages(stimulusContent)} />
                    </div>
                );
            })()}

            {/* ── Question Text (Ultra-Compact & highly readable) ── */}
            <div className="w-full mb-1.5 text-[12px] sm:text-[13px] font-bold text-slate-800 leading-snug">
                {q.type === 'CQ' ? (
                    <CQCombinedRenderer q={q} showAnswer={showAnswer} showExplanation={showExplanation} />
                ) : q.dynamicData ? (
                    <DynamicQuestionViewer q={q} mode="list" showAnswer={showAnswer} showExplanation={showExplanation} />
                ) : (
                    <MarkdownRenderer content={parseMarkdownImages(examInfo.language === 'Bangla' ? formatBanglaNumbers(q.questionText) : q.questionText)} />
                )}
                
                {!q.dynamicData && q.mcqType === 'MULTIPLE_COMPLETION' && q.statements && q.statements.length > 0 && (
                    <div className="mt-1 pl-2.5 border-l border-slate-350 space-y-0.5">
                        {q.statements.map((stmt, sIdx) => (
                            <div key={sIdx} className="text-[11px] text-slate-650 font-semibold leading-snug">
                                <MarkdownRenderer content={parseMarkdownImages(examInfo.language === 'Bangla' ? formatBanglaNumbers(stmt) : stmt)} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── MCQ Options (Ultra-Compact Grid) ── */}
            {q.type === 'MCQ' && q.options && q.options.length > 0 && (
                <div className="w-full mb-1 grid grid-cols-1 sm:grid-cols-2 gap-0.5 sm:gap-1">
                    {q.options.map((opt, idx) => {
                        const isEnglish = q.language && q.language.toLowerCase() === 'english';
                        const displayLabel = isEnglish ? String.fromCharCode(65 + idx) : (['ক', 'খ', 'গ', 'ঘ'][idx] || String.fromCharCode(65 + idx));
                        const isCorrect = opt.isCorrect || opt.correct;
                        return (
                            <div key={opt.id} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[10.5px] sm:text-[11px] font-medium transition-all duration-300 ${
                                showAnswer && isCorrect
                                    ? 'bg-emerald-50 border-emerald-350 text-emerald-800 shadow-sm'
                                    : showAnswer && !isCorrect
                                    ? 'bg-white border-slate-100 text-slate-400 opacity-60'
                                    : 'bg-slate-50/50 border-slate-150 text-slate-700 hover:bg-slate-100/50 hover:border-slate-250'
                            }`}>
                                <span className={`shrink-0 flex items-center justify-center w-5.5 h-5.5 rounded-full text-[10.5px] font-black transition-all duration-300 ${
                                    showAnswer && isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {displayLabel}
                                </span>
                                <span className="flex-1 min-w-0 leading-tight text-[11px] sm:text-xs [&_p]:m-0 [&_p]:my-0"><MarkdownRenderer content={parseMarkdownImages(opt.optionText)} /></span>
                                {showAnswer && isCorrect && <CheckCircle size={10} className="text-emerald-500 ml-auto shrink-0 animate-in zoom-in-50 duration-200" />}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Non-MCQ Correct Answer Block ── */}
            {showAnswer && q.type !== 'MCQ' && !q.dynamicData && (q.type !== 'CQ' || !isStructuredCQAnswer) && (
                hasAnswer ? (
                    <div className="w-full mb-1.5 px-2 py-1.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-[11.5px] text-emerald-950 font-semibold leading-snug flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <CheckCircle size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            {q.type === 'CQ' && <span className="block text-[8px] font-black text-emerald-600 uppercase tracking-wide mb-0.5">উত্তর (CQ):</span>}
                            <span><MarkdownRenderer content={parseMarkdownImages(q.correctAnswer)} /></span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full mb-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-400 italic">No answer available.</div>
                )
            )}

            {/* ── Toggles Grid ── */}
            <div className="w-full mb-2 grid grid-cols-2 gap-1.5">
                <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="flex items-center justify-center gap-1 py-1 px-2.5 text-[10px] font-extrabold text-white rounded-lg transition-all duration-300 active:scale-[0.97] border border-white/10"
                    style={{ 
                        background: showAnswer
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #e91e8c 0%, #a855f7 100%)',
                        boxShadow: showAnswer
                            ? '0 1px 4px rgba(16, 185, 129, 0.15)'
                            : '0 1px 4px rgba(168, 85, 247, 0.15)'
                    }}
                >
                    <Eye size={11} /> {showAnswer ? 'Hide Answer' : 'Show Answer'}
                </button>

                <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="flex items-center justify-center gap-1 py-1 px-2.5 text-[10px] font-extrabold rounded-lg transition-all duration-300 active:scale-[0.97] border"
                    style={{ 
                        background: showExplanation
                            ? 'linear-gradient(135deg, #a855f7 0%, #e91e8c 100%)'
                            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderColor: showExplanation ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                        boxShadow: showExplanation
                            ? '0 1px 4px rgba(168, 85, 247, 0.15)'
                            : '0 1px 2px rgba(0,0,0,0.01)',
                    }}
                >
                    <FileText size={11} className={showExplanation ? 'text-white' : 'text-slate-600'} />
                    <span className={showExplanation ? 'text-white font-extrabold' : 'text-slate-600'}>Explanation</span>
                </button>
            </div>

            {/* ── Explanation Block ── */}
            {showExplanation && !q.dynamicData && (q.type !== 'CQ' || !isStructuredCQExplanation) && (
                hasExplanation ? (
                    <div className="w-full mb-1.5 px-2 py-1.5 bg-blue-50/60 border border-blue-200 rounded-lg text-[11.5px] text-blue-950 leading-snug flex items-start gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        <BookOpen size={12} className="text-blue-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                            {q.type === 'CQ' && <span className="block text-[8px] font-black text-blue-600 uppercase tracking-wide mb-0.5">ব্যাখ্যা (CQ):</span>}
                            <span><MarkdownRenderer content={parseMarkdownImages(finalExplanation)} /></span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full mb-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-400 italic">No explanation available.</div>
                )
            )}

            {/* ── Source / Action Footer (Ultra Slim) ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-1.5 border-t border-slate-100 gap-1.5">
                {/* Source */}
                <div className="flex items-center gap-1 text-[8.5px] flex-1 min-w-0 flex-wrap">
                    {q.classSubject ? (
                        <div className="flex flex-wrap items-center gap-1 px-1 py-0.5 bg-indigo-50/80 border border-indigo-100 rounded text-indigo-700 font-bold">
                            <FileText size={9} className="text-indigo-400 shrink-0" />
                            <span className="bg-white text-indigo-800 px-1 py-px rounded border border-indigo-100 text-[7.5px] font-bold shrink-0">{q.classSubject?.subject?.name}</span>
                            <span className="text-indigo-300 shrink-0">›</span>
                            <span className="shrink-0">{q.classSubject?.academicClass?.name}</span>
                            {q.chapter && <><span className="text-indigo-300 shrink-0">›</span><span className="shrink-0">{q.chapter?.name}</span></>}
                        </div>
                    ) : q.sourceReference ? (
                        <div className="flex flex-wrap items-center gap-1 px-1 py-0.5 bg-violet-50/80 border border-violet-100 rounded text-violet-700 font-bold">
                            <FileText size={9} className="text-violet-400 shrink-0" />
                            <span className="font-bold">{q.sourceReference}</span>
                        </div>
                    ) : null}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                    <button 
                        onClick={() => onToggleSave(q)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[9.5px] font-black transition-all duration-300 border ${
                            isSaved 
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-sm active:scale-[0.97]' 
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-amber-500 hover:border-amber-200 active:scale-[0.97]'
                        }`}
                    >
                        {isSaved ? <BookmarkCheck size={10} className="fill-current" /> : <Bookmark size={10} />}
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>

                    <button
                        onClick={() => onAdd(q)}
                        disabled={inCart || addLoading === q.id || cartLength >= targetQs}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[9.5px] font-black transition-all duration-300 border active:scale-[0.97] ${
                            inCart 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-700 cursor-not-allowed shadow-sm' 
                                : (cartLength >= targetQs)
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-sm hover:-translate-y-px'
                        }`}
                    >
                        {addLoading === q.id ? (
                            <Loader2 size={10} className="animate-spin" />
                        ) : inCart ? (
                            <><Check size={10} strokeWidth={3} /> Added</>
                        ) : (
                            <><Plus size={10} strokeWidth={3} /> Add to Exam</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
});


const ManualExamBuilder = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [examId, setExamId] = useState(null);
    const [activeTab, setActiveTab] = useState('results'); // 'filters' | 'results' | 'cart'
    const [displayLimit, setDisplayLimit] = useState(100);
    const [serverPage, setServerPage] = useState(0);

    const handleGoBackStep1 = () => {
        if (window.confirm("আপনি কি নিশ্চিতভাবে শ্রেণী ও বিষয় পরিবর্তন করতে চান? আপনার বর্তমান প্রশ্ন নির্বাচনের অগ্রগতি (draft) সংরক্ষিত থাকবে।")) {
            setStep(1);
        }
    };

    const handleExitBuilder = () => {
        if (window.confirm("আপনি কি নিশ্চিতভাবে এক্সাম বিল্ডার থেকে বের হতে চান? আপনার ড্রাফট পরীক্ষাটি সংরক্ষিত থাকবে, আপনি পরে 'সেভড এক্সাম' ড্রাইভ থেকে এটি পুনরায় এডিট করতে পারবেন।")) {
            if (window.ReactNativeWebView) {
                try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'close_webview'
                    }));
                } catch (e) {}
            } else {
                navigate('/exams/generate/saved');
            }
        }
    };

    const {
        levels, streams, classes, subjects, chapters: subjectChapters,
        levelId, streamId, classId, subjectId,
        setLevelId, setStreamId, setClassId, setSubjectId,
    } = useAcademicHierarchy({ activeOnly: true });

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

    const availableLanguages = React.useMemo(() => {
        const langs = [];
        if (hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bangla') || user.instituteMedium.includes('Bilingual')) {
            langs.push('Bangla');
        }
        if (hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('English') || user.instituteMedium.includes('Bilingual')) {
            langs.push('English');
        }
        if (hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bilingual')) {
            langs.push('Bilingual');
        }
        return langs;
    }, [hasFullLangAccess, user?.instituteMedium]);



    // Auto-select Language if there's only one option
    useEffect(() => {
        if (availableLanguages.length === 1 && examInfo.language !== availableLanguages[0]) {
            setExamInfo(prev => ({ ...prev, language: availableLanguages[0] }));
        }
    }, [availableLanguages, examInfo.language]);

    // Reverted frontend auto-filtering logic per user request to allow simple database-driven dropdown mapping

    const [dynamicSections, setDynamicSections] = useState([]);
    const [userStructure, setUserStructure] = useState({});
    const [loadingBlueprint, setLoadingBlueprint] = useState(false);

    // Builder States
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [availability, setAvailability] = useState({ chapters: {}, topics: {} });
    const [filters, setFilters] = useState({
        chapterId: '', topicId: '', type: '', difficulty: '', bloomLevel: '', keyword: '', board: '', year: '', school: ''
    });

    const getTopicQuestionCount = React.useCallback((topId) => {
        if (!availability?.topics || !availability.topics[topId]) return 0;
        let total = 0;
        const types = availability.topics[topId];
        Object.values(types).forEach(diffs => {
            Object.values(diffs).forEach(count => {
                total += count;
            });
        });
        return total;
    }, [availability]);

    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMoreRemote, setHasMoreRemote] = useState(true);
    const [addLoading, setAddLoading] = useState(null); 
    const [cart, setCart] = useState([]); 

    // Background Caching & UI Toggle States
    const [questionsCache, setQuestionsCache] = useState([]);
    const observerTarget = useRef(null);
    const [backgroundLoading, setBackgroundLoading] = useState(false);
    const [cacheLoadedSubjectId, setCacheLoadedSubjectId] = useState(null);
    const [savedQuestionIds, setSavedQuestionIds] = useState([]);
    const [visibleAnswers, setVisibleAnswers] = useState({});
    const [visibleExplanations, setVisibleExplanations] = useState({}); 

    const displayLimitRef = useRef(displayLimit);
    useEffect(() => {
        displayLimitRef.current = displayLimit;
    }, [displayLimit]);

    const searchResultsRef = useRef(searchResults);
    useEffect(() => {
        searchResultsRef.current = searchResults;
    }, [searchResults]);

    const hasMoreRemoteRef = useRef(hasMoreRemote);
    useEffect(() => {
        hasMoreRemoteRef.current = hasMoreRemote;
    }, [hasMoreRemote]);

    const getFilteredPool = React.useCallback((excludeKey = null) => {
        const pool = (questionsCache && questionsCache.length > 0) ? questionsCache : searchResults;
        if (!pool || pool.length === 0) return [];
        
        return pool.filter(q => {
            if (excludeKey !== 'chapterId' && filters.chapterId) {
                if (q.chapter?.id !== filters.chapterId && q.chapterId !== filters.chapterId) return false;
            }
            if (excludeKey !== 'topicId' && filters.topicId) {
                if (q.topic?.id !== filters.topicId && q.topicId !== filters.topicId) return false;
            }
            if (excludeKey !== 'type' && filters.type) {
                if (q.type !== filters.type) return false;
            }
            if (excludeKey !== 'difficulty' && filters.difficulty) {
                if (q.difficulty !== filters.difficulty) return false;
            }
            if (excludeKey !== 'bloomLevel' && filters.bloomLevel) {
                const normFilter = filters.bloomLevel.toUpperCase();
                const normQ = q.bloomLevel?.toUpperCase() || '';
                let bloomMatch = false;
                if (normFilter === 'KNOWLEDGE') {
                    bloomMatch = normQ === 'KNOWLEDGE' || normQ === 'REMEMBERING' || normQ.includes('জ্ঞান');
                } else if (normFilter === 'COMPREHENSION') {
                    bloomMatch = normQ === 'COMPREHENSION' || normQ === 'UNDERSTANDING' || normQ.includes('অনুধাবন');
                } else if (normFilter === 'APPLICATION') {
                    bloomMatch = normQ === 'APPLICATION' || normQ === 'APPLYING' || normQ.includes('প্রয়োগ');
                } else if (normFilter === 'HIGHER_ORDER') {
                    bloomMatch = normQ === 'HIGHER_ORDER' || normQ === 'ANALYZING' || normQ === 'EVALUATING' || normQ === 'CREATING' || normQ.includes('উচ্চতর');
                } else {
                    bloomMatch = normQ === normFilter;
                }
                if (!bloomMatch) return false;
            }
            if (excludeKey !== 'board' && filters.board) {
                const hasBoard = q.sources?.some(src => src.organizationName === filters.board) || q.sourceReference === filters.board;
                if (!hasBoard) return false;
            }
            if (excludeKey !== 'year' && filters.year) {
                const hasYear = q.sources?.some(src => src.examYear?.toString() === filters.year);
                if (!hasYear) return false;
            }
            if (excludeKey !== 'school' && filters.school) {
                const hasSchool = q.sources?.some(src => src.organizationName === filters.school);
                if (!hasSchool) return false;
            }
            return true;
        });
    }, [questionsCache, searchResults, filters]);

    // Dynamic Filter Options based on available questions in cache or searchResults
    const dynamicOptions = React.useMemo(() => {
        const extractUniqueFields = (pool) => {
            const extractedBoards = new Set();
            const extractedYears = new Set();
            const extractedSchools = new Set();
            const types = new Set();
            const difficulties = new Set();
            const blooms = new Set();

            const bloomMapping = {
                'KNOWLEDGE': 'KNOWLEDGE', 'REMEMBERING': 'KNOWLEDGE', 'KNOW': 'KNOWLEDGE', 'জ্ঞান': 'KNOWLEDGE',
                'COMPREHENSION': 'COMPREHENSION', 'UNDERSTANDING': 'COMPREHENSION', 'COMP': 'COMPREHENSION', 'অনুধাবন': 'COMPREHENSION',
                'APPLICATION': 'APPLICATION', 'APPLYING': 'APPLICATION', 'APPL': 'APPLICATION', 'প্রয়োগ': 'APPLICATION',
                'HIGHER_ORDER': 'HIGHER_ORDER', 'ANALYZING': 'HIGHER_ORDER', 'EVALUATING': 'HIGHER_ORDER', 'CREATING': 'HIGHER_ORDER', 'HIGH': 'HIGHER_ORDER', 'উচ্চতর': 'HIGHER_ORDER'
            };

            pool.forEach(q => {
                if (q.type) types.add(q.type);
                if (q.difficulty) difficulties.add(q.difficulty);
                if (q.bloomLevel) {
                    const norm = bloomMapping[q.bloomLevel.toUpperCase()] || q.bloomLevel.toUpperCase();
                    blooms.add(norm);
                }

                if (q.sources && q.sources.length > 0) {
                    q.sources.forEach(src => {
                        const type = src.sourceType;
                        const org = src.organizationName;
                        const year = src.examYear;
                        
                        if (year) {
                            extractedYears.add(year.toString());
                        }
                        if (org) {
                            if (type === 'BOARD_EXAM' || type === 'UNIVERSITY_ADMISSION') {
                                extractedBoards.add(org);
                            } else if (type === 'INSTITUTION_TEST') {
                                extractedSchools.add(org);
                            }
                        }
                    });
                } else if (q.sourceReference) {
                    const sRef = q.sourceReference;
                    if (sRef !== 'Textbook Content' && !sRef.toLowerCase().includes('chunk')) {
                        extractedBoards.add(sRef);
                    }
                }
            });

            return {
                types: Array.from(types),
                difficulties: Array.from(difficulties),
                blooms: Array.from(blooms),
                boards: Array.from(extractedBoards).sort(),
                years: Array.from(extractedYears).sort((a, b) => b.localeCompare(a)),
                schools: Array.from(extractedSchools).sort()
            };
        };

        const boardPool = getFilteredPool('board');
        const yearPool = getFilteredPool('year');
        const schoolPool = getFilteredPool('school');
        const typePool = getFilteredPool('type');
        const difficultyPool = getFilteredPool('difficulty');
        const bloomPool = getFilteredPool('bloomLevel');

        return {
            boards: extractUniqueFields(boardPool).boards,
            years: extractUniqueFields(yearPool).years,
            schools: extractUniqueFields(schoolPool).schools,
            types: typePool.length > 0 ? extractUniqueFields(typePool).types : ['MCQ', 'CQ', 'SHORT'],
            difficulties: difficultyPool.length > 0 ? extractUniqueFields(difficultyPool).difficulties : ['EASY', 'MEDIUM', 'HARD'],
            blooms: bloomPool.length > 0 ? extractUniqueFields(bloomPool).blooms : ['KNOWLEDGE', 'COMPREHENSION', 'APPLICATION', 'HIGHER_ORDER']
        };
    }, [getFilteredPool]); 

    const currentMarks = cart.reduce((sum, q) => sum + (q.marks || 0), 0);

    const cartCounts = React.useMemo(() => {
        const counts = {};
        cart.forEach(q => {
            const type = q.type || 'MCQ';
            counts[type] = (counts[type] || 0) + 1;
        });
        return counts;
    }, [cart]);

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

    useEffect(() => {
        if (subjectId) {
            questionService.getQuestionAvailability(subjectId, examInfo.language)
                .then(data => {
                    setAvailability(data || { chapters: {}, topics: {} });
                })
                .catch(err => {
                    console.error("Failed to load availability", err);
                    setAvailability({ chapters: {}, topics: {} });
                });
        } else {
            setAvailability({ chapters: {}, topics: {} });
        }
    }, [subjectId, examInfo.language]);

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
                    size: 80, 
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
                        
                        // Throttled state updates every 5 pages to prevent React render-freezes
                        if (currentPage % 5 === 0 || fetched.length < 80) {
                            setQuestionsCache(uniqueList);
                        }
                        
                        if (fetched.length < 80) {
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
            
            // Ensure final full list is successfully cached once complete
            const finalUniqueMap = new Map();
            accumulated.forEach(q => finalUniqueMap.set(q.id, q));
            setQuestionsCache(Array.from(finalUniqueMap.values()));
            
            setCacheLoadedSubjectId(subId);
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

    // Sync local searchResults when caching completes to avoid closure issues
    useEffect(() => {
        if (step === 2 && cacheLoadedSubjectId === subjectId && questionsCache.length > 0) {
            searchQuestions(null, { preserveScroll: true });
        }
    }, [cacheLoadedSubjectId, subjectId, questionsCache.length, step]);

    // Dynamic Main Header updates to prevent double-headers
    useEffect(() => {
        if (step === 2 && examInfo.title) {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
                detail: {
                    title: examInfo.title,
                    subtitle: 'Manual Selection Mode',
                    hideLayoutBars: true
                }
            }));
            
            // Signal Expo Go / React Native WebView to hide app headers & bottom navigation bars
            if (window.ReactNativeWebView) {
                try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'hide_layout_bars',
                        hide: true
                    }));
                } catch (e) {
                    console.error("RN postMessage failed", e);
                }
            }
        } else {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
                detail: {
                    title: 'Manual Exam Builder',
                    subtitle: 'Handpick Questions'
                }
            }));
            
            // Signal Expo Go / React Native WebView to restore app headers & bottom navigation bars
            if (window.ReactNativeWebView) {
                try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'hide_layout_bars',
                        hide: false
                    }));
                } catch (e) {
                    console.error("RN postMessage failed", e);
                }
            }
        }
        return () => {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', { detail: null }));
            if (window.ReactNativeWebView) {
                try {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'hide_layout_bars',
                        hide: false
                    }));
                } catch (e) {}
            }
        };
    }, [step, examInfo.title]);

    const searchQuestions = async (e, options = {}) => {
        if (e) e.preventDefault();
        const preserveScroll = options.preserveScroll || false;
        if (!preserveScroll) {
            setSearching(true);
        }
        
        // If caching is fully complete for this subject, filter locally for instant response!
        if (cacheLoadedSubjectId === subjectId && questionsCache.length > 0) {
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
            if (filters.bloomLevel) {
                const normFilter = filters.bloomLevel.toUpperCase();
                filtered = filtered.filter(q => {
                    const normQ = q.bloomLevel?.toUpperCase() || '';
                    if (normFilter === 'KNOWLEDGE') {
                        return normQ === 'KNOWLEDGE' || normQ === 'REMEMBERING' || normQ.includes('জ্ঞান');
                    }
                    if (normFilter === 'COMPREHENSION') {
                        return normQ === 'COMPREHENSION' || normQ === 'UNDERSTANDING' || normQ.includes('অনুধাবন');
                    }
                    if (normFilter === 'APPLICATION') {
                        return normQ === 'APPLICATION' || normQ === 'APPLYING' || normQ.includes('প্রয়োগ');
                    }
                    if (normFilter === 'HIGHER_ORDER') {
                        return normQ === 'HIGHER_ORDER' || normQ === 'ANALYZING' || normQ === 'EVALUATING' || normQ === 'CREATING' || normQ.includes('উচ্চতর');
                    }
                    return normQ === normFilter;
                });
            }
            if (filters.keyword) {
                const kw = filters.keyword.toLowerCase();
                filtered = filtered.filter(q => 
                    (q.questionText && q.questionText.toLowerCase().includes(kw)) ||
                    (q.stimulus && q.stimulus.toLowerCase().includes(kw))
                );
            }
            if (filters.board) {
                filtered = filtered.filter(q => {
                    if (q.sources && q.sources.length > 0) {
                        return q.sources.some(src => src.organizationName === filters.board);
                    }
                    return q.sourceReference === filters.board;
                });
            }
            if (filters.year) {
                filtered = filtered.filter(q => {
                    if (q.sources && q.sources.length > 0) {
                        return q.sources.some(src => src.examYear && src.examYear.toString() === filters.year);
                    }
                    return false;
                });
            }
            if (filters.school) {
                filtered = filtered.filter(q => {
                    if (q.sources && q.sources.length > 0) {
                        return q.sources.some(src => src.organizationName === filters.school);
                    }
                    return false;
                });
            }
            
            setSearchResults(filtered);
            if (preserveScroll) {
                setDisplayLimit(prev => Math.max(prev, 100));
            } else {
                setDisplayLimit(100); // Reset render limit on filter changes
            }
            setSearching(false);
            return;
        }

        // Fallback to direct API search if cache is not fully ready
        try {
            const cleanFilters = {};
            Object.entries(filters).forEach(([k, v]) => {
                if (v !== '') cleanFilters[k] = v;
            });
            const params = { 
                classSubjectId: subjectId, 
                language: examInfo.language, 
                ...cleanFilters, 
                size: 50, 
                page: 0 
            };
            const res = await examService.searchQuestionsForManualExam(params);
            if (res.success && res.data) {
                const content = res.data.content || [];
                setSearchResults(content);
                setServerPage(0); // Reset server-side pagination page count
                setDisplayLimit(100); // Reset render limit
                setHasMoreRemote(content.length >= 50);
            }
        } catch (e) {
            console.error("Search Questions Error:", e);
            const errMsg = e.response?.data?.message || e.response?.data?.error || e.message || "Unknown Search Error";
            alert(`Error fetching questions: ${errMsg}`);
        } finally {
            setSearching(false);
        }
    };

    // Intersection Observer for Infinite Scrolling / Auto Loading More
    useEffect(() => {
        if (searching || loadingMore) return;
        
        const observer = new IntersectionObserver(
            entries => {
                const entry = entries[0];
                if (entry.isIntersecting && !searching && !loadingMore) {
                    if (cacheLoadedSubjectId === subjectId) {
                        // Local cache ready: expand displayLimit
                        if (searchResultsRef.current.length > displayLimitRef.current) {
                            setDisplayLimit(prev => prev + 100);
                        }
                    } else {
                        // Remote server fallback: paginated load
                        if (searchResultsRef.current.length >= 50 && hasMoreRemoteRef.current) {
                            handleLoadMoreRemote();
                        }
                    }
                }
            },
            { rootMargin: '0px' }
        );

        const target = observerTarget.current;
        if (target) {
            observer.observe(target);
        }

        return () => {
            if (target) observer.unobserve(target);
            observer.disconnect();
        };
    }, [searching, loadingMore, cacheLoadedSubjectId, subjectId]);

    // Remote Server-Side Load More fallback when background cache is still loading or empty
    const handleLoadMoreRemote = async () => {
        if (searching || loadingMore || !hasMoreRemote) return;
        setLoadingMore(true);
        try {
            const nextPage = serverPage + 1;
            const cleanFilters = {};
            Object.entries(filters).forEach(([k, v]) => {
                if (v !== '') cleanFilters[k] = v;
            });
            const params = { 
                classSubjectId: subjectId, 
                language: examInfo.language, 
                ...cleanFilters, 
                size: 50, 
                page: nextPage 
            };
            const res = await examService.searchQuestionsForManualExam(params);
            if (res.success && res.data && res.data.content) {
                const fetched = res.data.content;
                if (fetched.length > 0) {
                    setSearchResults(prev => {
                        const existingIds = new Set(prev.map(q => q.id));
                        const uniqueNew = fetched.filter(q => !existingIds.has(q.id));
                        return [...prev, ...uniqueNew];
                    });
                    setServerPage(nextPage);
                    setDisplayLimit(prev => prev + fetched.length);
                    setHasMoreRemote(fetched.length >= 50);
                } else {
                    setHasMoreRemote(false);
                }
            }
        } catch (e) {
            console.error("Load more remote error:", e);
        } finally {
            setLoadingMore(false);
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
    }, [filters.chapterId, filters.topicId, filters.type, filters.difficulty, filters.bloomLevel, filters.keyword, filters.board, filters.year, filters.school, examInfo.language, step]);

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
                {/* Top Sticky Glassmorphic Header */}
                <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-3 py-1.5 sm:px-4 sm:py-2.5 sticky top-0 z-45 flex justify-between items-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGoBackStep1}
                            className="flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-lg border border-slate-200 transition-all duration-300"
                        >
                            <ChevronLeft size={12} strokeWidth={2.5} />
                            <span>শ্রেণী ও বিষয় পরিবর্তন</span>
                        </button>
                    </div>
                    
                    <div className="hidden md:flex flex-col items-center">
                        <h1 className="font-extrabold text-slate-800 text-xs tracking-tight">{examInfo.title || 'Draft Exam'}</h1>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                            {subjects.find(s => s.classSubjectId == subjectId)?.subjectName || 'Subject'} • {classes.find(c => c.id == classId)?.name || 'Class'}
                        </p>
                    </div>

                    <button
                        onClick={handleExitBuilder}
                        className="flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-lg transition-all duration-300 active:scale-95"
                    >
                        <Trash2 size={11} />
                        <span>বাতিল করে ফিরে যান</span>
                    </button>
                </div>

                {/* Mobile Tab Swapper Bar */}
                <div className="lg:hidden flex border-b border-slate-200 bg-white shrink-0">
                    <button
                        onClick={() => setActiveTab('filters')}
                        className={`flex-1 py-2 text-[10.5px] font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'filters' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Filters
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`flex-1 py-2 text-[10.5px] font-bold uppercase tracking-wider border-b-2 transition-all relative ${activeTab === 'results' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Questions ({searchResults.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('cart')}
                        className={`flex-1 py-2 text-[10.5px] font-bold uppercase tracking-wider border-b-2 transition-all relative ${activeTab === 'cart' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
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
                                        {topics.map(t => {
                                            const count = getTopicQuestionCount(t.id);
                                            return (
                                                <option key={t.id} value={t.id}>
                                                    {t.name} ({count})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Board / University</label>
                                    <select value={filters.board} onChange={(e) => setFilters({ ...filters, board: e.target.value })} className={selectCls}>
                                        <option value="">All Boards & Universities</option>
                                        {dynamicOptions.boards && dynamicOptions.boards.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Year</label>
                                        <select value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} className={selectCls}>
                                            <option value="">Any Year</option>
                                            {dynamicOptions.years && dynamicOptions.years.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">School / College</label>
                                        <select value={filters.school} onChange={(e) => setFilters({ ...filters, school: e.target.value })} className={selectCls}>
                                            <option value="">Any School</option>
                                            {dynamicOptions.schools && dynamicOptions.schools.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Type</label>
                                        <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="w-full bg-white/50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all hover:border-slate-300">
                                            <option value="">Any</option>
                                            {dynamicOptions.types.map(t => {
                                                const label = t === 'MCQ' ? 'MCQ' : t === 'CQ' ? 'CQ' : t === 'SHORT' ? 'Short' : t;
                                                return <option key={t} value={t}>{label}</option>;
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Diff</label>
                                        <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })} className="w-full bg-white/50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all hover:border-slate-300">
                                            <option value="">Any</option>
                                            {dynamicOptions.difficulties.map(d => {
                                                const label = d === 'EASY' ? 'Easy' : d === 'MEDIUM' ? 'Med' : d === 'HARD' ? 'Hard' : d;
                                                return <option key={d} value={d}>{label}</option>;
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Bloom</label>
                                        <select value={filters.bloomLevel} onChange={(e) => setFilters({ ...filters, bloomLevel: e.target.value })} className="w-full bg-white/50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all hover:border-slate-300">
                                            <option value="">Any</option>
                                            {dynamicOptions.blooms.map(b => {
                                                const label = b === 'KNOWLEDGE' ? 'Know' : b === 'COMPREHENSION' ? 'Comp' : b === 'APPLICATION' ? 'Appl' : b === 'HIGHER_ORDER' ? 'High' : b;
                                                return <option key={b} value={b}>{label}</option>;
                                            })}
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
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 xs:p-4 sm:p-5 space-y-4 bg-slate-50/30" style={{ overflowAnchor: 'none', position: 'relative' }}>
                            {searching ? (
                                <div className="flex items-center justify-center h-full text-slate-400"><Loader2 size={32} className="animate-spin" /></div>
                            ) : searchResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <Search size={48} className="text-slate-200 mb-4" />
                                    <p className="font-bold">No questions found.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 relative" style={{ overflowAnchor: 'none' }}>
                                    <div 
                                        ref={observerTarget} 
                                        style={{ position: 'absolute', bottom: 0, height: '2500px', width: '100%', pointerEvents: 'none', zIndex: -1 }} 
                                    />
                                    {searchResults.slice(0, displayLimit).map((q, idx) => (
                                        <QuestionCard 
                                            key={q.id}
                                            q={q}
                                            idx={idx}
                                            inCart={isInCart(q.id)}
                                            onAdd={handleAddQuestion}
                                            addLoading={addLoading}
                                            cartLength={cart.length}
                                            targetQs={targetTotals.qs}
                                            isSaved={isQuestionSaved(q.id)}
                                            onToggleSave={handleToggleSaveQuestion}
                                            examInfo={examInfo}
                                        />
                                    ))}
                                </div>
                            )}
                            {loadingMore && (
                                <div className="py-6 flex flex-col items-center justify-center w-full">
                                    <div className="flex flex-col items-center gap-2 opacity-75">
                                        <div className="w-6 h-6 border-2 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Loading More...</span>
                                    </div>
                                </div>
                            )}

                            {((cacheLoadedSubjectId === subjectId && searchResults.length > displayLimit) || (cacheLoadedSubjectId !== subjectId && hasMoreRemote)) && !loadingMore && (
                                <button 
                                    onClick={cacheLoadedSubjectId === subjectId ? () => setDisplayLimit(prev => prev + 100) : handleLoadMoreRemote}
                                    disabled={searching || loadingMore}
                                    className="w-full py-4 bg-white hover:bg-slate-50 text-slate-600 font-black border border-dashed border-slate-300 hover:border-slate-400 rounded-2xl transition-all text-center flex items-center justify-center gap-2 mt-4 active:scale-95 disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                    {cacheLoadedSubjectId === subjectId 
                                        ? `Load More Questions (Showing ${displayLimit} of ${searchResults.length})` 
                                        : "Load More Questions (Server-Side Pagination)"}
                                </button>
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
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4 shadow-inner">
                                {/* Marks Progress Bar */}
                                <div>
                                    <div className="flex justify-between text-[11px] font-black uppercase mb-1.5">
                                        <span className={currentMarks > targetTotals.marks ? 'text-rose-500' : 'text-slate-500'}>
                                            Score: {currentMarks}
                                        </span>
                                        <span className="text-emerald-600">Target: {targetTotals.marks} M</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-sm">
                                        <div 
                                            className={`h-full transition-all duration-500 ${currentMarks > targetTotals.marks ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} 
                                            style={{ width: `${Math.min((currentMarks / targetTotals.marks) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Questions Progress Bar */}
                                <div>
                                    <div className="flex justify-between text-[11px] font-black uppercase mb-1.5">
                                        <span className={cart.length > targetTotals.qs ? 'text-rose-500' : 'text-slate-500'}>
                                            Questions: {cart.length}
                                        </span>
                                        <span className="text-emerald-600">Target: {targetTotals.qs} Qs</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-sm">
                                        <div 
                                            className={`h-full transition-all duration-500 ${cart.length > targetTotals.qs ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} 
                                            style={{ width: `${Math.min((cart.length / targetTotals.qs) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Section Breakdown */}
                                {Object.entries(userStructure).filter(([_, struct]) => (parseInt(struct.count) || 0) > 0).length > 0 && (
                                    <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5">Section Breakdown</div>
                                        {Object.entries(userStructure)
                                            .filter(([_, struct]) => (parseInt(struct.count) || 0) > 0)
                                            .map(([type, struct]) => {
                                                const target = parseInt(struct.count) || 0;
                                                const current = cartCounts[type] || 0;
                                                const pct = Math.min((current / target) * 100, 100);
                                                const isFulfilled = current === target;
                                                const isOver = current > target;

                                                let barColor = "bg-indigo-500";
                                                let textColor = "text-slate-600 font-bold";
                                                if (isFulfilled) {
                                                    barColor = "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]";
                                                    textColor = "text-emerald-600 font-black";
                                                } else if (isOver) {
                                                    barColor = "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]";
                                                    textColor = "text-rose-600 font-black";
                                                } else if (current > 0) {
                                                    barColor = "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]";
                                                    textColor = "text-amber-600 font-black";
                                                }

                                                return (
                                                    <div key={type} className="space-y-1">
                                                        <div className="flex justify-between text-[10.5px]">
                                                            <span className="text-slate-500 font-bold">{type}</span>
                                                            <span className={textColor}>{current} / {target}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                                            <div 
                                                                className={`h-full ${barColor} transition-all duration-500`} 
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                )}
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
                        <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Cart Target & Progress</div>
                            <div 
                                className="flex flex-row items-center gap-1.5 overflow-x-auto w-full whitespace-nowrap"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {Object.entries(userStructure)
                                    .filter(([_, struct]) => (parseInt(struct.count) || 0) > 0)
                                    .map(([type, struct]) => {
                                        const target = parseInt(struct.count) || 0;
                                        const current = cartCounts[type] || 0;
                                        const isFulfilled = current === target;
                                        const isOver = current > target;

                                        let badgeColor = "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
                                        if (isFulfilled) {
                                            badgeColor = "bg-emerald-500 text-white border-transparent shadow-[0_2px_8px_rgba(16,185,129,0.3)]";
                                        } else if (isOver) {
                                            badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                                        } else if (current > 0) {
                                            badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                                        }

                                        return (
                                            <span 
                                                key={type} 
                                                className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md border transition-all duration-300 shrink-0 shadow-sm ${badgeColor}`}
                                            >
                                                {type}: {current}/{target}
                                            </span>
                                        );
                                    })
                                }
                            </div>
                        </div>
                        <button 
                            onClick={handlePublish} 
                            disabled={loading || cart.length === 0} 
                            className={`px-2.5 sm:px-8 py-1.5 sm:py-3.5 rounded-xl font-black text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 transition-all shadow-xl hover:-translate-y-0.5 shrink-0 ${cart.length > 0 && !loading ? 'bg-slate-800 hover:bg-slate-900 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            {loading ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} 
                            <span className="whitespace-nowrap font-black tracking-tight">
                                <span className="hidden sm:inline">Publish Paper</span>
                                <span className="inline sm:hidden">Publish</span>
                            </span>
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
                                        {levels.length > 1 && (
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Level</label>
                                                <select value={levelId} onChange={e => setLevelId(e.target.value)} className={selectCls}>
                                                    <option value="">Select Level</option>
                                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {!(levelId && streams.length === 1) && (
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Stream</label>
                                                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className={selectCls}>
                                                    <option value="">Select Stream</option>
                                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {!(streamId && classes.length === 1) && (
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Class</label>
                                                <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className={selectCls}>
                                                    <option value="">Select Class</option>
                                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Subject</label>
                                            <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className={selectCls}>
                                                <option value="">Select Subject</option>
                                                {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                            </select>
                                        </div>
                                        {availableLanguages.length > 1 && (
                                            <div>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Language</label>
                                                <select value={examInfo.language} onChange={e => setExamInfo({...examInfo, language: e.target.value})} disabled={!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual')} className={selectCls + (!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual') ? ' opacity-50' : '')}>
                                                    {availableLanguages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">Duration (Min)</label>
                                            <input type="number" value={examInfo.durationMinutes} onChange={e => setExamInfo({...examInfo, durationMinutes: e.target.value})} className={inputCls} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Blueprint Structure */}
                        <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full -mr-10 -mt-10 opacity-50 z-0"></div>
                                    <div className="relative z-10">
                                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2"><Target className="text-emerald-500" /> Target Blueprint</h2>
                                        {subjectId && (
                                            <div className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 mb-4 inline-flex items-center gap-1.5 shadow-sm">
                                                <BookOpen size={12} className="text-emerald-500" />
                                                Subject: {subjects.find(s => s.classSubjectId == subjectId)?.subjectName}
                                            </div>
                                        )}
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

            <div className="fixed bottom-0 left-0 lg:left-64 right-0 backdrop-blur-md bg-white/90 border-t border-slate-200 p-3 sm:p-4 z-50 flex justify-between items-center shadow-[0_-10px_30px_rgb(0,0,0,0.05)]">
                <div className="max-w-[1600px] w-full mx-auto flex flex-row justify-between items-center gap-3">
                    <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Blueprint Target</div>
                        <div 
                            className="flex flex-row items-center gap-1.5 overflow-x-auto w-full whitespace-nowrap"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {Object.entries(userStructure)
                                .filter(([_, struct]) => (parseInt(struct.count) || 0) > 0)
                                .map(([type, struct]) => (
                                    <span 
                                        key={type} 
                                        className="text-[9px] sm:text-[10px] font-extrabold bg-slate-50 text-slate-600 border border-slate-200 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0 shadow-sm"
                                    >
                                        {type}: {struct.count}
                                    </span>
                                ))
                            }
                        </div>
                    </div>
                    <button 
                        onClick={handleCreateDraft}
                        disabled={loading || !subjectId || targetTotals.qs === 0}
                        className="px-2.5 sm:px-10 py-1.5 sm:py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 shrink-0"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={12} />
                        ) : (
                            <span className="whitespace-nowrap font-black tracking-tight">
                                <span className="hidden sm:inline">Start Manual Selection</span>
                                <span className="inline sm:hidden">Start</span>
                            </span>
                        )}
                        {!loading && <ChevronRight size={12} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualExamBuilder;
