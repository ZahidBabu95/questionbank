import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Edit, Trash2, CheckCircle, XCircle, Clock, Search, Layers, ListFilter, X, ThumbsUp, ThumbsDown, ChevronDown, Filter, FileText, Settings2, Bookmark, BookmarkCheck, GitCompare } from 'lucide-react';
import questionService from '../../../services/questionService';
import academicService from '../../../services/academicService';
import RevisePanel from './components/RevisePanel';
import RevisionReviewPanel from './components/RevisionReviewPanel';
import MarkdownRenderer from '../../../components/MarkdownRenderer';

const CQCombinedRenderer = ({ q, showAnswer, showExplanation, isDark = false }) => {
    const parts = useMemo(() => {
        const questionText = q.questionText || '';
        const correctAnswer = q.correctAnswer || '';
        const explanation = q.explanation || '';
        
        if (!questionText.includes('<div class="cq-questions">')) return null;

        const strippedQText = '<div class="cq-questions">' + questionText.split('<div class="cq-questions">')[1];

        const parser = new DOMParser();
        const doc = parser.parseFromString(strippedQText, 'text/html');
        const ansDoc = parser.parseFromString(correctAnswer, 'text/html');
        const expDoc = parser.parseFromString(explanation, 'text/html');

        const qList = doc.querySelectorAll('.cq-questions ol li');
        const parsedParts = [];
        
        qList.forEach((li, idx) => {
            const marks = parseFloat(li.getAttribute('data-marks')) || parseFloat(li.querySelector('.cq-marks')?.textContent?.replace(/[^\d.]/g, '')) || 1;
            const textSpan = li.querySelector('.cq-text');
            const label = ['ক', 'খ', 'গ', 'ঘ'][idx] || String.fromCharCode(97 + idx);

            let partAns = '';
            let partExp = '';

            const ansNode = ansDoc.querySelector(`.cq-ans-part[data-label="${label}"] .cq-ans-content`) || ansDoc.querySelector(`.cq-ans-part[data-label="${label}"]`);
            if (ansNode) partAns = ansNode.innerHTML;

            const expNode = expDoc.querySelector(`.cq-exp-part[data-label="${label}"] .cq-exp-content`) || expDoc.querySelector(`.cq-exp-part[data-label="${label}"]`);
            if (expNode) partExp = expNode.innerHTML;

            parsedParts.push({
                label,
                text: textSpan ? textSpan.innerHTML : li.innerHTML,
                marks,
                answer: partAns,
                explanation: partExp
            });
        });
        
        return parsedParts;
    }, [q, showAnswer, showExplanation]);

    if (!parts || parts.length === 0) {
        return <MarkdownRenderer content={q.type === 'CQ' && q.questionText && q.questionText.includes('<div class="cq-questions">') ? '<div class="cq-questions">' + q.questionText.split('<div class="cq-questions">')[1] : q.questionText} className={isDark ? 'prose-invert' : ''} />;
    }

    return (
        <div className="cq-questions">
            <ol>
            {parts.map((p, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 w-full relative mb-1.5">
                    <li className={`flex items-center justify-between ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg p-2.5 px-3 shadow-sm min-h-[44px]`}>
                        <div className="flex items-start gap-2 flex-1 min-w-0 pr-4 z-10 font-[500]">
                            <span className={`shrink-0 font-bold ${isDark ? 'text-slate-300 bg-slate-700 border-slate-600' : 'text-slate-700 bg-slate-50 border-slate-200'} border px-1.5 py-0.5 rounded text-[11px] leading-none mt-0.5`}>{p.label}.</span>
                            <div className="flex-1 min-w-0">
                                <MarkdownRenderer content={p.text} className={`!max-w-full prose-p:!m-0 prose-p:!p-0 ${isDark ? 'prose-invert' : ''}`} />
                            </div>
                        </div>
                        <span className={`text-[10px] font-black ${isDark ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-500 bg-slate-100 border-slate-200/50'} px-2 py-1 rounded shrink-0 z-10 w-8 text-center border`}>({p.marks.toFixed(1)})</span>
                    </li>
                    {showAnswer && p.answer && (
                        <div className={`ml-[1.5rem] p-3 pb-2 pt-2.5 ${isDark ? 'bg-emerald-900/10 border-emerald-800/30 text-emerald-300 border-l-[3px] border-l-emerald-600' : 'bg-emerald-50 border-emerald-200 text-emerald-900 border-l-[3px] border-l-emerald-400'} border mt-0.5 shadow-sm rounded-lg text-[12px]`}>
                            <span className={`flex items-center gap-1.5 text-[10px] font-bold ${isDark ? 'text-emerald-500' : 'text-emerald-600'} mb-1.5 uppercase tracking-wider`}><CheckCircle size={12}/> উত্তর ({p.label}):</span>
                            <MarkdownRenderer content={p.answer} className={`-mt-1 !max-w-full ${isDark ? 'prose-invert' : ''}`} />
                        </div>
                    )}
                    {showExplanation && p.explanation && (
                        <div className={`ml-[1.5rem] p-3 pb-2 pt-2.5 ${isDark ? 'bg-amber-900/10 border-amber-800/30 text-amber-300 border-l-[3px] border-l-amber-600' : 'bg-amber-50 border-amber-200 text-amber-900 border-l-[3px] border-l-amber-400'} border mt-0.5 shadow-sm rounded-lg text-[12px]`}>
                            <span className={`flex items-center gap-1.5 text-[10px] font-bold ${isDark ? 'text-amber-500' : 'text-amber-600'} mb-1.5`}><Layers size={12}/> ব্যাখ্যা ({p.label}):</span>
                            <MarkdownRenderer content={p.explanation} className={`-mt-1 !max-w-full ${isDark ? 'prose-invert' : ''}`} />
                        </div>
                    )}
                </div>
            ))}
            </ol>
        </div>
    );
};

const QuestionListItem = React.memo(({ q, index, isSelected, onSelect, onSave, isSaved, onView, onDelete, onRevise, onReview, isSuperAdmin, hasPerm, splitScreenMode, isViewing }) => {
    const navigate = useNavigate();
    const [showAnswer, setShowAnswer] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    const difficultyStyle = {
        EASY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
        HARD: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    const typeLabel = q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'CQ' ? 'Creative' : q.type === 'SHORT' ? 'Short Answer' : q.type;

    return (
        <div 
            id={`question-item-${q.id}`}
            onClick={(e) => {
                if (splitScreenMode && !['BUTTON', 'INPUT', 'A'].includes(e.target.tagName)) {
                    onView(q);
                }
            }}
            className={`border-b border-slate-200 transition-all duration-200 ${splitScreenMode ? 'cursor-pointer hover:bg-slate-50' : ''} ${
            isViewing ? 'bg-indigo-50 border-l-4 border-l-indigo-500' 
            : q.status === 'REVISED' ? 'bg-rose-50/50 border-l-4 border-l-rose-400'
            : isSelected ? 'bg-blue-50/40' : 'bg-white'
        }`}>

            {/* ── Header Row ── */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <input type="checkbox" checked={isSelected} onChange={() => onSelect(q.id)}
                        className="w-4 h-4 text-primary border-slate-300 rounded cursor-pointer shrink-0" />
                    <span className="text-[12px] font-black text-slate-500 whitespace-nowrap">Question #{index}</span>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold border border-slate-200 whitespace-nowrap">{typeLabel}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {q.status === 'APPROVED' && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase"><CheckCircle size={9} /> Approved</span>}
                    {q.status === 'REJECTED' && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black uppercase"><XCircle size={9} /> Rejected</span>}
                    {q.status === 'PENDING' && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase"><Clock size={9} /> Pending</span>}
                    {q.status === 'REVISED' && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-[10px] font-black uppercase animate-pulse"><Edit size={9} /> Revised</span>}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${difficultyStyle[q.difficulty] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        ⚡ {q.difficulty}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">{q.marks ?? 1} Marks</span>
                    {hasPerm && hasPerm('EDIT') && (
                        <button onClick={() => navigate(`/questions/edit/${q.id}`)} className="p-1 text-slate-400 hover:text-primary transition-colors" title="Edit">
                            <Edit size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Revision Info Banner (visible for REVISED questions) ── */}
            {q.status === 'REVISED' && (
                <div className="mx-4 mb-2 px-3 py-2 bg-rose-100 border border-rose-200 rounded-lg flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="font-bold text-rose-800">✏️ Revised by: <span className="text-rose-900">{q.revisedBy || q.createdBy || 'Unknown'}</span></span>
                    {q.revisedAt && <span className="text-rose-600">📅 {new Date(q.revisedAt).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                    {q.revisionCount > 0 && <span className="px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded font-black">🔄 ×{q.revisionCount}</span>}
                    {q.versionComment && <span className="text-rose-700 italic">📝 "{q.versionComment}"</span>}
                </div>
            )}

            {/* ── Stimulus ── */}
            {q.stimulus && (
                <div className="mx-4 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 border-l-4 border-l-amber-400 rounded-lg text-[12px] text-slate-600 italic leading-snug">
                    <MarkdownRenderer content={q.stimulus} />
                </div>
            )}

            {/* ── Question Text ── */}
            <div className="mx-4 mb-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[13px] font-semibold text-slate-800 leading-snug">
                    {q.type === 'CQ' ? (
                        <CQCombinedRenderer q={q} showAnswer={showAnswer} showExplanation={showExplanation} />
                    ) : (
                        <MarkdownRenderer content={q.questionText} />
                    )}
                </div>
                
                {q.mcqType === 'MULTIPLE_COMPLETION' && q.statements && q.statements.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-primary/20 space-y-1">
                        {q.statements.map((stmt, sIdx) => (
                            <div key={sIdx} className="text-[12px] text-slate-600 font-medium leading-snug">
                                <MarkdownRenderer content={stmt} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── MCQ Options 2x2 on desktop, stacked on mobile — highlights correct only after Show Answer click ── */}
            {q.type === 'MCQ' && q.options && q.options.length > 0 && (
                <div className="mx-4 mb-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.options.map(opt => (
                        <div key={opt.id} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-all duration-300 ${
                            showAnswer && opt.isCorrect
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm'
                                : showAnswer && !opt.isCorrect
                                ? 'bg-white border-slate-200 text-slate-400 opacity-60'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}>
                            <span className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black transition-all duration-300 ${
                                showAnswer && opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                                {opt.optionLabel}
                            </span>
                            <span className="flex-1"><MarkdownRenderer content={opt.optionText} /></span>
                            {showAnswer && opt.isCorrect && <CheckCircle size={13} className="text-emerald-500 ml-auto shrink-0" />}
                        </div>
                    ))}
                </div>
            )}

            {/* Non-MCQ: show correct answer block after Show Answer click */}
            {showAnswer && q.type !== 'MCQ' && q.type !== 'CQ' && q.correctAnswer && (
                <div className="mx-4 mb-2 px-3 py-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-[12px] text-emerald-900 font-semibold leading-snug flex items-start gap-2">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <span><MarkdownRenderer content={q.correctAnswer} /></span>
                </div>
            )}

            {/* ── Show Answer + Explanation Buttons ── */}
            <div className="mx-4 mb-2 grid grid-cols-2 gap-2">
                {/* Show Answer — always gradient, green when active */}
                <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="flex items-center justify-center gap-2 py-2 text-[12px] font-bold text-white rounded-lg transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
                    style={{ background: showAnswer
                        ? '#10b981'
                        : 'linear-gradient(to right, var(--primary-color, #e91e8c), var(--secondary-color, #a855f7))'
                    }}
                >
                    <Eye size={14} /> {showAnswer ? 'Hide Answer' : 'Show Answer'}
                </button>

                {/* Explanation — plain when inactive, reverse gradient when active */}
                <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="flex items-center justify-center gap-2 py-2 text-[12px] font-bold rounded-lg transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98]"
                    style={{ background: showExplanation
                        ? 'linear-gradient(to left, var(--primary-color, #e91e8c), var(--secondary-color, #a855f7))'
                        : '#f1f5f9'
                    }}
                >
                    <FileText size={14} className={showExplanation ? 'text-white' : 'text-slate-600'} />
                    <span className={showExplanation ? 'text-white' : 'text-slate-600'}>Explanation</span>
                </button>
            </div>


            {/* ── Explanation Block ── */}
            {showExplanation && q.type !== 'CQ' && q.explanation && (
                <div className="mx-4 mb-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-900 leading-snug">
                    <MarkdownRenderer content={q.explanation} />
                </div>
            )}
            {showExplanation && q.type !== 'CQ' && !q.explanation && (
                <div className="mx-4 mb-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-400 italic">No explanation available.</div>
            )}

            {/* ── Source / Action Footer ── */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1.5 border-t border-slate-100 gap-2">
                {/* Source — no truncation, allow wrapping */}
                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium flex-1 min-w-0 flex-wrap">
                    {q.classSubject ? (
                        <>
                            <FileText size={11} className="text-slate-400 shrink-0" />
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-px rounded text-[10px] font-bold shrink-0">{q.classSubject?.subject?.name}</span>
                            <span className="text-slate-300 shrink-0">›</span>
                            <span className="shrink-0">{q.classSubject?.academicClass?.name}</span>
                            {q.chapter && <><span className="text-slate-300 shrink-0">›</span><span className="shrink-0">{q.chapter?.name}</span></>}
                            {q.topic && <><span className="text-slate-300 shrink-0">›</span><span className="shrink-0">{q.topic?.name}</span></>}
                        </>
                    ) : q.sourceReference ? (
                        <>
                            <FileText size={11} className="text-slate-400 shrink-0" />
                            <span>{q.sourceReference}</span>
                            {q.aiGenerated && <span className="text-[9px] bg-violet-50 text-violet-600 border border-violet-200 px-1 py-px rounded font-bold uppercase shrink-0">AI</span>}
                        </>
                    ) : null}
                </div>

                {/* Action Buttons */}
                {!splitScreenMode && (
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Like */}
                    <button
                        onClick={() => setIsLiked(!isLiked)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${isLiked ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-400'}`}
                        title="Like"
                    >
                        <ThumbsUp size={11} className={isLiked ? 'fill-current' : ''} />
                        <span>{isLiked ? 'Liked' : 'Like'}</span>
                    </button>

                    {/* Save */}
                    <button
                        onClick={() => onSave(q.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${isSaved ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-500'}`}
                        title={isSaved ? 'Remove from Saved' : 'Save'}
                    >
                        {isSaved ? <BookmarkCheck size={11} className="fill-current" /> : <Bookmark size={11} />}
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                    </button>

                    {/* Revise */}
                    <button
                        onClick={() => onRevise(q)}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary rounded-md text-[10px] font-bold transition-all"
                        title="Revise / Edit"
                    >
                        <Edit size={11} /> Revise
                    </button>

                    {/* Review Revision (Super Admin only, REVISED questions only) */}
                    {q.status === 'REVISED' && isSuperAdmin && (
                        <button
                            onClick={() => onReview(q)}
                            className="flex items-center gap-1 px-3 py-1 text-white rounded-md text-[10px] font-black transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
                            style={{ background: 'linear-gradient(to right, #e11d48, #be123c)' }}
                            title="Review & Approve/Reject"
                        >
                            <GitCompare size={11} /> Review Changes
                        </button>
                    )}

                    {/* AI Synced */}
                    {q.aiGenerated && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-violet-50 border border-violet-200 text-violet-600 rounded-md text-[10px] font-bold">
                            AI SYNCED
                        </span>
                    )}

                    {/* View (full detail modal) */}
                    <button
                        onClick={() => onView(q)}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 rounded-md text-[10px] font-bold transition-all"
                        title="View Full Detail"
                    >
                        <Eye size={11} /> View
                    </button>

                    {/* Delete — Super Admin only */}
                    {isSuperAdmin && (
                        <button
                            onClick={() => onDelete(q.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-md text-[10px] font-bold transition-all"
                            title="Delete"
                        >
                            <Trash2 size={11} /> Delete
                        </button>
                    )}
                </div>
                )}
            </div>
        </div>
    );
});


const QuestionPreviewContent = ({ selectedQuestion, isDark = false }) => {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <span className={`px-2.5 py-1.5 ${isDark ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} border rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max`}><CheckCircle size={14} /> Approved</span>;
            case 'REJECTED': return <span className={`px-2.5 py-1.5 ${isDark ? 'bg-rose-900/30 text-rose-400 border-rose-800/50' : 'bg-rose-50 text-rose-700 border-rose-200'} border rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max`}><XCircle size={14} /> Rejected</span>;
            case 'PENDING': return <span className={`px-2.5 py-1.5 ${isDark ? 'bg-amber-900/30 text-amber-400 border-amber-800/50' : 'bg-amber-50 text-amber-700 border-amber-200'} border rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max`}><Clock size={14} /> Pending</span>;
            case 'REVISED': return <span className={`px-2.5 py-1.5 ${isDark ? 'bg-rose-900/50 text-rose-300 border-rose-800/50' : 'bg-rose-100 text-rose-800 border-rose-300'} border rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max`}><Edit size={14} /> Revised</span>;
            case 'DRAFT': return <span className={`px-2.5 py-1.5 ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'} border rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max`}><FileText size={14} /> Draft</span>;
            default: return <span className={`px-2.5 py-1.5 ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200'} border rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center w-max`}>Draft</span>;
        }
    };

    return (
        <div className={`p-6 overflow-y-auto flex-1 custom-scrollbar ${isDark ? 'text-slate-300' : ''}`}>
            <div className="flex items-center gap-3 mb-6">
                <span className={`px-3 py-1 ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'} rounded-md text-xs font-bold tracking-widest uppercase`}>{selectedQuestion.type}</span>
                <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase ${selectedQuestion.difficulty === 'EASY' ? (isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700') : selectedQuestion.difficulty === 'MEDIUM' ? (isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700') : (isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-700')}`}>{selectedQuestion.difficulty}</span>
                {getStatusBadge(selectedQuestion.status)}
            </div>

            <div className="space-y-6">
                {selectedQuestion.classSubject && (
                    <div>
                        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider mb-2`}>Subject Context</h3>
                        <div className={`p-4 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50/80 border-slate-100'} rounded-xl border`}>
                            <p className={`${isDark ? 'text-slate-200' : 'text-slate-800'} font-semibold`}>{selectedQuestion.classSubject.academicClass?.name} • {selectedQuestion.classSubject.subject?.name}</p>
                            {(selectedQuestion.chapter || selectedQuestion.topic) && (
                                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1.5 flex items-center gap-2`}>
                                    {selectedQuestion.chapter?.name}
                                    {selectedQuestion.topic && <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>/</span>}
                                    {selectedQuestion.topic?.name}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {!selectedQuestion.classSubject && selectedQuestion.sourceReference && (
                    <div>
                        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider mb-2`}>Source / Context</h3>
                        <div className={`p-4 ${isDark ? 'bg-violet-900/20 border-violet-800/50' : 'bg-violet-50/80 border-violet-100'} rounded-xl border flex items-center gap-3`}>
                            <p className={`${isDark ? 'text-slate-200' : 'text-slate-800'} font-semibold flex-1`}>{selectedQuestion.sourceReference}</p>
                            {selectedQuestion.aiGenerated && <span className={`text-[10px] ${isDark ? 'bg-violet-900/50 text-violet-300 border-violet-800' : 'bg-violet-100 text-violet-600 border-violet-200'} border px-2 py-0.5 rounded-md font-bold whitespace-nowrap`}>AI Imported</span>}
                        </div>
                    </div>
                )}

                {selectedQuestion.stimulus && (
                    <div>
                        <h3 className={`text-sm font-bold ${isDark ? 'text-amber-500' : 'text-amber-600'} uppercase tracking-wider mb-2`}>Stimulus (উদ্দীপক)</h3>
                        <div className={`p-4 ${isDark ? 'bg-amber-900/10 border-amber-800/30 text-slate-200' : 'bg-amber-50 border-amber-100 text-slate-800'} rounded-xl border font-medium leading-relaxed`}>
                            <MarkdownRenderer content={selectedQuestion.stimulus} className={isDark ? 'prose-invert' : ''} />
                        </div>
                    </div>
                )}

                <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider mb-2`}>Question</h3>
                    <div className={`text-lg font-medium ${isDark ? 'text-white' : 'text-slate-900'} leading-relaxed`}>
                        {selectedQuestion.type === 'CQ' ? (
                            <CQCombinedRenderer q={selectedQuestion} showAnswer={true} showExplanation={true} isDark={isDark} />
                        ) : (
                            <MarkdownRenderer content={selectedQuestion.questionText} className={isDark ? 'prose-invert' : ''} />
                        )}
                    </div>
                    {selectedQuestion.mcqType === 'MULTIPLE_COMPLETION' && selectedQuestion.statements && selectedQuestion.statements.length > 0 && (
                        <div className={`mt-3 pl-4 border-l-2 ${isDark ? 'border-indigo-500/50 text-slate-300' : 'border-indigo-200 text-slate-700'} space-y-2`}>
                            {selectedQuestion.statements.map((stmt, sIdx) => (
                                <div key={sIdx} className="text-sm font-medium leading-relaxed">
                                    <MarkdownRenderer content={stmt} className={isDark ? 'prose-invert' : ''} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedQuestion.type === 'MCQ' && selectedQuestion.options && selectedQuestion.options.length > 0 && (
                    <div>
                        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider mb-3`}>Answers / Options</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedQuestion.options.map((opt, idx) => {
                                const enLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
                                const bnLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
                                const isEnglish = selectedQuestion.language === 'English';
                                const displayLabel = isEnglish ? enLabels[idx] : bnLabels[idx];
                                return (
                                <div key={opt.id} className={`p-3 rounded-xl border-2 flex items-center gap-3 ${opt.isCorrect ? (isDark ? 'border-emerald-600/50 bg-emerald-900/20' : 'border-emerald-500 bg-emerald-50') : (isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white')}`}>
                                    <span className={`flex shadow-sm items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${opt.isCorrect ? (isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white') : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600')}`}>{displayLabel}</span>
                                    <span className={`text-sm flex-1 ${opt.isCorrect ? (isDark ? 'text-emerald-400 font-bold' : 'text-emerald-900 font-bold') : (isDark ? 'text-slate-300 font-medium' : 'text-slate-700 font-medium')}`}>
                                        <MarkdownRenderer content={opt.optionText} className={isDark ? 'prose-invert' : ''} />
                                    </span>
                                    {opt.isCorrect && <CheckCircle size={18} className={`${isDark ? 'text-emerald-500' : 'text-emerald-500'} ml-auto`} />}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {selectedQuestion.correctAnswer && selectedQuestion.type !== 'MCQ' && selectedQuestion.type !== 'CQ' && (
                    <div>
                        <h3 className={`text-sm font-bold ${isDark ? 'text-emerald-500' : 'text-emerald-600'} uppercase tracking-wider mb-2 flex items-center gap-2`}><CheckCircle size={16} /> Correct Answer</h3>
                        <div className={`p-4 ${isDark ? 'bg-emerald-900/10 text-emerald-300 border-emerald-800/30' : 'bg-emerald-50 text-emerald-900 border-emerald-200'} font-medium leading-relaxed rounded-xl border`}>
                            <MarkdownRenderer content={selectedQuestion.correctAnswer} className={isDark ? 'prose-invert' : ''} />
                        </div>
                    </div>
                )}

                {selectedQuestion.explanation && selectedQuestion.type !== 'CQ' && (
                    <div>
                        <h3 className={`text-sm font-bold ${isDark ? 'text-blue-500' : 'text-blue-600'} uppercase tracking-wider mb-2`}>Explanation (ব্যাখ্যা)</h3>
                        <div className={`p-4 ${isDark ? 'bg-blue-900/10 text-blue-300 border-blue-800/30' : 'bg-blue-50 text-blue-900 border-blue-200'} font-medium leading-relaxed rounded-xl border`}>
                            <MarkdownRenderer content={selectedQuestion.explanation} className={isDark ? 'prose-invert' : ''} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const QuestionList = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isSuperAdmin = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    }) || user?.email === 'admin' || user?.email?.includes('admin@');

    const hasPerm = (action) => {
        if (isSuperAdmin) return true;
        // Dynamically infer permission string based on route
        let permId = 'QUESTION_BANK_REPOSITORY_ALL_QUESTIONS';
        if (location.pathname.includes('/approved')) permId = 'QUESTION_BANK_REPOSITORY_APPROVED';
        if (location.pathname.includes('/pending')) permId = 'QUESTION_BANK_REPOSITORY_PENDING';
        if (location.pathname.includes('/rejected')) permId = 'QUESTION_BANK_REPOSITORY_REJECTED';
        // Note: drafts may not have a specific hardcoded permission, fallback to ALL or standard ones.
        return user?.permissions?.includes(`${permId}_${action}`);
    };

    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');
    const [filterLanguage, setFilterLanguage] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [viewMode, setViewMode] = useState('ALL');
    const [splitScreenMode, setSplitScreenMode] = useState(false);
    const [savedIds, setSavedIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('savedQuestionIds') || '[]'); } catch { return []; }
    });

    const handleSaveToggle = React.useCallback((id) => {
        setSavedIds(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            localStorage.setItem('savedQuestionIds', JSON.stringify(next));
            return next;
        });
    }, []);

    const [reviseItem, setReviseItem] = useState(null); // question to revise
    const [reviewItem, setReviewItem] = useState(null); // revision to review (Super Admin)
    const [revisedIds, setRevisedIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('revisedQuestionIds') || '[]'); } catch { return []; }
    });

    // Hierarchy filter options
    const [levels, setLevels] = useState([]);
    const [streams, setStreams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);

    // Hierarchy filter selections
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [selectedStreamId, setSelectedStreamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState(''); // classSubjectId
    const [selectedChapterId, setSelectedChapterId] = useState('');
    const [selectedTopicId, setSelectedTopicId] = useState('');

    useEffect(() => {
        if (location.pathname.includes('/approved')) setFilterStatus('APPROVED');
        else if (location.pathname.includes('/pending')) setFilterStatus('PENDING');
        else if (location.pathname.includes('/rejected')) setFilterStatus('REJECTED');
        else if (location.pathname.includes('/drafts')) setFilterStatus('DRAFT');
        else setFilterStatus('ALL');

        fetchInitialFilters();
    }, [location.pathname]);

    useEffect(() => {
        const viewId = searchParams.get('view');
        if (viewId) {
            const openQuestion = async () => {
                try {
                    const qObj = await questionService.getQuestionById(viewId);
                    if (qObj) {
                        if (qObj.type === 'MCQ') {
                            try {
                                const options = await questionService.getOptions(qObj.id);
                                qObj.options = options;
                            } catch (e) { console.error('Failed to load options', e); }
                        }
                        
                        if (qObj.status === 'REVISED' && isSuperAdmin) {
                            setReviewItem(qObj);
                        } else {
                            setSelectedQuestion(qObj);
                        }
                    }
                } catch (error) {
                    console.error("Failed to fetch linked question", error);
                }
                
                // Remove parameter from URL
                searchParams.delete('view');
                setSearchParams(searchParams, { replace: true });
            };
            openQuestion();
        }
    }, [searchParams, isSuperAdmin, setSearchParams]);

    const fetchInitialFilters = async () => {
        try {
            const levelData = await academicService.getAllLevels();
            setLevels(levelData);
        } catch (error) {
            console.error("Failed to fetch levels", error);
        }
    };

    // Level → Streams
    useEffect(() => {
        if (selectedLevelId) {
            academicService.getStreamsByLevel(selectedLevelId).then(setStreams).catch(console.error);
        } else {
            setStreams([]);
        }
        setSelectedStreamId(''); setSelectedClassId(''); setSelectedSubjectId('');
        setSelectedChapterId(''); setSelectedTopicId('');
        setClasses([]); setSubjects([]); setChapters([]); setTopics([]);
    }, [selectedLevelId]);

    // Stream → Classes
    useEffect(() => {
        if (selectedStreamId) {
            academicService.getClassesByStream(selectedStreamId).then(setClasses).catch(console.error);
        } else {
            setClasses([]);
        }
        setSelectedClassId(''); setSelectedSubjectId('');
        setSelectedChapterId(''); setSelectedTopicId('');
        setSubjects([]); setChapters([]); setTopics([]);
    }, [selectedStreamId]);

    // Class → Subjects
    useEffect(() => {
        if (selectedClassId) {
            academicService.getSubjectsByClass(selectedClassId).then(setSubjects).catch(console.error);
        } else {
            setSubjects([]);
        }
        setSelectedSubjectId(''); setSelectedChapterId(''); setSelectedTopicId('');
        setChapters([]); setTopics([]);
    }, [selectedClassId]);

    // Subject → Chapters
    useEffect(() => {
        if (selectedSubjectId) {
            academicService.getChaptersByClassSubject(selectedSubjectId).then(setChapters).catch(console.error);
        } else {
            setChapters([]);
        }
        setSelectedChapterId(''); setSelectedTopicId(''); setTopics([]);
    }, [selectedSubjectId]);

    // Chapter → Topics
    useEffect(() => {
        if (selectedChapterId) {
            academicService.getTopicsByChapter(selectedChapterId).then(setTopics).catch(console.error);
        } else {
            setTopics([]);
        }
        setSelectedTopicId('');
    }, [selectedChapterId]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const params = {
                page: currentPage - 1,
                size: itemsPerPage,
                filterStatus: filterStatus === 'ALL' ? '' : filterStatus,
                filterType: filterType === 'ALL' ? '' : filterType,
                language: filterLanguage === 'ALL' ? '' : filterLanguage,
                search: searchQuery,
                levelId: selectedLevelId,
                streamId: selectedStreamId,
                classId: selectedClassId,
                subjectId: selectedSubjectId,
                chapterId: selectedChapterId,
                topicId: selectedTopicId
            };
            const data = await questionService.getAllQuestionsPaginated(params);
            setQuestions(data.content || []);
            setTotalPages(data.totalPages || 0);
            setTotalElements(data.totalElements || 0);
        } catch (error) {
            console.error("Failed to fetch questions", error);
        } finally {
            setLoading(false);
        }
    };

    // Refetch whenever filters or pagination change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchQuestions();
        }, 300); // 300ms debounce for search query typing
        return () => clearTimeout(timer);
    }, [currentPage, itemsPerPage, filterStatus, filterType, filterLanguage, searchQuery, selectedLevelId, selectedStreamId, selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId]);

    const handleDelete = React.useCallback(async (id) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await questionService.deleteQuestion(id);
                setQuestions(prev => prev.filter(q => q.id !== id));
                setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            } catch (error) {
                console.error("Failed to delete", error);
            }
        }
    }, []);

    const handleViewQuestion = React.useCallback(async (q) => {
        setSelectedQuestion(q);
        setTimeout(() => {
            const el = document.getElementById(`question-item-${q.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        
        if (q.type === 'MCQ') {
            try {
                const options = await questionService.getOptions(q.id);
                setSelectedQuestion({ ...q, options });
            } catch (err) {
                console.error('Failed to load options', err);
            }
        }
    }, []);

    const handleSelectItem = React.useCallback((id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(selectedId => selectedId !== id);
            } else {
                return [...prev, id];
            }
        });
    }, []);

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} questions?`)) {
            try {
                await questionService.deleteQuestionsBulk(selectedIds);
                setQuestions(prev => prev.filter(q => !selectedIds.includes(q.id)));
                setSelectedIds([]);
            } catch (error) {
                console.error("Failed to bulk delete", error);
            }
        }
    };

    const handleUpdateStatusBulk = async (status) => {
        if (!selectedIds.length) return;
        if (window.confirm(`Update ${selectedIds.length} questions to ${status}?`)) {
            try {
                await questionService.updateStatusBulk(selectedIds, status);
                setQuestions(prev => prev.map(q =>
                    selectedIds.includes(q.id) ? { ...q, status } : q
                ));
                setSelectedIds([]);
            } catch (error) {
                alert("Status update failed.");
            }
        }
    };

    const handleQuickAction = async (questionId, status) => {
        try {
            await questionService.updateStatusBulk([questionId], status);
            setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, status } : q));
            
            // Auto-select next question
            const currentIndex = questions.findIndex(q => q.id === questionId);
            if (currentIndex >= 0 && currentIndex < questions.length - 1) {
                handleViewQuestion(questions[currentIndex + 1]);
            } else if (currentIndex === questions.length - 1) {
                // If it's the last item on the current page, try to go to next page
                if (currentPage < totalPages) {
                    setCurrentPage(p => p + 1);
                    setSelectedQuestion(null); // will need to click the next page's first item
                } else {
                    setSelectedQuestion(null);
                }
            }
        } catch (error) {
            alert("Action failed.");
        }
    };

    useEffect(() => {
        setSelectedIds([]);
        setCurrentPage(1); // Reset page to 1 when any filter changes
    }, [filterStatus, filterType, filterLanguage, searchQuery, selectedLevelId, selectedStreamId, selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId]);

    const typeTabs = [
        { id: 'ALL', label: 'All Types' },
        { id: 'MCQ', label: 'MCQ' },
        { id: 'CQ', label: 'Creative (CQ)' },
        { id: 'SHORT', label: 'Short Q' },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED':
                return <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><CheckCircle size={14} /> Approved</span>;
            case 'REJECTED':
                return <span className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><XCircle size={14} /> Rejected</span>;
            case 'PENDING':
                return <span className="px-2.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><Clock size={14} /> Pending</span>;
            case 'REVISED':
                return <span className="px-2.5 py-1.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><Edit size={14} /> Revised</span>;
            case 'DRAFT':
                return <span className="px-2.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center gap-1.5 w-max"><FileText size={14} /> Draft</span>;
            default:
                return <span className="px-2.5 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-bold tracking-wide uppercase flex items-center justify-center w-max">Draft</span>;
        }
    };

    const resetFilters = () => {
        setSelectedLevelId('');
        setSelectedStreamId('');
        setSelectedClassId('');
        setSelectedSubjectId('');
        setSelectedChapterId('');
        setSelectedTopicId('');
        setSearchQuery('');
        setFilterType('ALL');
        setFilterLanguage('ALL');
    };

    return (
        <>
        <div className="flex flex-col min-h-full">

            {/* STICKY COMPACT FILTER HEADER — flush with topbar */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-6 pt-3 pb-3 shadow-sm space-y-3">
                
                {/* Top Row: Navigation Tabs & Search */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-lg self-start shrink-0 overflow-x-auto custom-scrollbar w-full md:w-auto">
                        <button
                            onClick={() => { setViewMode('ALL'); setFilterStatus('ALL'); setCurrentPage(1); }}
                            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'ALL'
                                ? 'bg-white text-primary shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                                }`}
                        >
                            <Layers size={14} /> All Questions
                        </button>
                        <button
                            onClick={() => { setViewMode('FAVORITES'); setCurrentPage(1); }}
                            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'FAVORITES'
                                ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                                }`}
                        >
                            <svg className="fill-current w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            My Saved
                        </button>
                        <button
                            onClick={() => { setViewMode('REVISED'); setFilterStatus('REVISED'); setCurrentPage(1); }}
                            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-[13px] font-bold transition-all whitespace-nowrap flex-1 md:flex-auto ${viewMode === 'REVISED'
                                ? 'bg-rose-100 text-rose-700 shadow-sm border border-rose-200'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-black/5'
                                }`}
                        >
                            <Edit size={13} /> Revised
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setSplitScreenMode(!splitScreenMode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold transition-all border shrink-0 ${splitScreenMode ? 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            title="Toggle Split-Screen Review Mode"
                        >
                            <GitCompare size={14} /> Review Mode
                        </button>

                        <div className="relative w-full md:w-[300px] shrink-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search explicitly by question text..."
                                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all placeholder:text-slate-400 font-medium"
                            />
                        </div>
                    </div>
                </div>

                {/* Second Row: Advanced Select Filters */}
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold shrink-0 mr-1">
                        <Filter size={14} className="text-primary" /> <span className="text-[10px] uppercase tracking-wider hidden sm:inline">Filters:</span>
                    </div>

                    <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} className="shrink-0 h-8 px-2 pl-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer min-w-[90px] max-w-[110px] truncate">
                        <option value="ALL">সব ভার্সন</option>
                        <option value="Bangla">Bangla</option>
                        <option value="English">English</option>
                        <option value="Bilingual">Bilingual</option>
                    </select>
                    
                    <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} className="shrink-0 h-8 px-2 pl-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer min-w-[90px] max-w-[130px] truncate">
                        <option value="">সব স্তর</option>
                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>

                    <select value={selectedStreamId} onChange={(e) => setSelectedStreamId(e.target.value)} disabled={!selectedLevelId} className="shrink-0 h-8 px-2 pl-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[90px] max-w-[130px] truncate">
                        <option value="">সব বিভাগ</option>
                        {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>

                    <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} disabled={!selectedStreamId} className="shrink-0 h-8 px-2 pl-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[90px] max-w-[130px] truncate">
                        <option value="">সব শ্রেণি</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} disabled={!selectedClassId} className="shrink-0 h-8 px-2 pl-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[90px] max-w-[130px] truncate">
                        <option value="">সব বিষয়</option>
                        {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                    </select>

                    <select value={selectedChapterId} onChange={(e) => setSelectedChapterId(e.target.value)} disabled={!selectedSubjectId} className="shrink-0 h-8 px-2 pl-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[90px] max-w-[130px] truncate">
                        <option value="">সব অধ্যায়</option>
                        {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                    </select>

                    <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} disabled={!selectedChapterId} className="shrink-0 h-8 px-2 pl-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[90px] max-w-[130px] truncate">
                        <option value="">সব টপিক</option>
                        {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>

                    <button onClick={resetFilters} className="shrink-0 text-[10px] font-bold text-rose-500 hover:bg-rose-50 px-2.5 h-8 rounded-lg border border-transparent hover:border-rose-200 transition-colors flex items-center gap-1.5 ml-auto">
                        <X size={14} /> <span className="hidden sm:inline">Reset</span>
                    </button>
                </div>

                {/* Third Row: Formats, Check All & Bulk Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto custom-scrollbar pb-2 md:pb-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0"><ListFilter size={12} className="inline mr-1" />Format:</span>
                        {typeTabs.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setFilterType(type.id)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all whitespace-nowrap border ${filterType === type.id
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                                    }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto overflow-x-auto justify-end shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shrink-0">
                            <input
                                type="checkbox"
                                checked={questions.length > 0 && selectedIds.length > 0 && questions.every(q => selectedIds.includes(q.id))}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        const newSelected = new Set([...selectedIds, ...questions.map(q => q.id)]);
                                        setSelectedIds(Array.from(newSelected));
                                    } else {
                                        const pageIds = questions.map(q => q.id);
                                        setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
                                    }
                                }}
                                className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/20 m-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap select-none">Select All ({questions.length})</span>
                        </label>

                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-1.5 shrink-0">
                                {isSuperAdmin && (
                                    <>
                                        <button onClick={() => handleUpdateStatusBulk('APPROVED')} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all text-[11px] uppercase tracking-wide">
                                            <ThumbsUp size={12} /> Approve
                                        </button>
                                        <button onClick={() => handleUpdateStatusBulk('REJECTED')} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 hover:bg-rose-100 transition-all text-[11px] uppercase tracking-wide">
                                            <ThumbsDown size={12} /> Reject
                                        </button>
                                        <div className="relative group">
                                            <button className="flex items-center gap-1.5 px-2 py-1.5 bg-white text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-[11px] uppercase tracking-wide shadow-sm">
                                                <ChevronDown size={12} className="text-slate-500" />
                                            </button>
                                            <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden py-1">
                                                <button onClick={() => handleUpdateStatusBulk('PENDING')} className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-amber-600 hover:bg-amber-50 font-bold flex items-center gap-2 transition-colors">
                                                    <Clock size={12} /> Pending
                                                </button>
                                                <button onClick={() => handleUpdateStatusBulk('DRAFT')} className="w-full text-left px-4 py-2 text-[11px] uppercase tracking-wider text-slate-600 hover:bg-slate-50 font-bold flex items-center gap-2 transition-colors">
                                                    <Edit size={12} /> Draft
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                                {hasPerm('DELETE') && (
                                    <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all text-[11px] uppercase tracking-wide ml-1">
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`flex gap-4 px-4 md:px-6 py-4 ${splitScreenMode ? 'flex-col md:flex-row h-[65vh] overflow-hidden' : 'flex-col'}`}>
                {/* List Side */}
                <div className={`${splitScreenMode ? 'w-full md:w-1/2 overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex flex-col gap-4' : 'w-full flex flex-col gap-4'}`}>
                    {loading ? (
                        <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mt-4">
                            <div className="flex flex-col items-center justify-center gap-4">
                                <div className="w-8 h-8 border-4 border-indigo-100 border-t-primary rounded-full animate-spin"></div>
                                <span className="text-slate-500 text-sm font-bold tracking-wide">Loading Questions...</span>
                            </div>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-dashed border-slate-300 mt-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <Layers size={40} className="text-slate-300" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-slate-700 tracking-tight">No elements discovered</h3>
                                <p className="text-slate-500 text-sm mt-1 max-w-sm font-medium">We couldn't find any questions matching your active filters or search terms.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {(viewMode === 'FAVORITES' ? questions.filter(q => savedIds.includes(q.id)) : questions).map((q, index) => (
                                <QuestionListItem 
                                    key={q.id}
                                    q={q}
                                    index={index + 1 + (currentPage - 1) * itemsPerPage}
                                    isSelected={selectedIds.includes(q.id)}
                                    onSelect={handleSelectItem}
                                    onSave={handleSaveToggle}
                                    isSaved={savedIds.includes(q.id)}
                                    onView={handleViewQuestion}
                                    onDelete={handleDelete}
                                    onRevise={setReviseItem}
                                    onReview={setReviewItem}
                                    isSuperAdmin={isSuperAdmin}
                                    hasPerm={hasPerm}
                                    splitScreenMode={splitScreenMode}
                                    isViewing={selectedQuestion?.id === q.id}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Split Screen Preview Side */}
                {splitScreenMode && (
                    <div className="w-full md:w-1/2 hidden md:flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-inner overflow-hidden h-full relative" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        {selectedQuestion ? (
                            <>
                                <div className="bg-slate-900/90 backdrop-blur-sm m-4 rounded-xl shadow-lg border border-slate-700/60 overflow-hidden flex flex-col flex-1 relative">
                                    <QuestionPreviewContent selectedQuestion={selectedQuestion} isDark={true} />
                                </div>
                                <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.5)] z-10">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id);
                                                if (currentIndex > 0) handleViewQuestion(questions[currentIndex - 1]);
                                            }}
                                            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-black tracking-wide hover:bg-slate-700 hover:text-white transition-colors shadow-sm uppercase"
                                        >
                                            Prev
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id);
                                                if (currentIndex < questions.length - 1) handleViewQuestion(questions[currentIndex + 1]);
                                            }}
                                            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-black tracking-wide hover:bg-slate-700 hover:text-white transition-colors shadow-sm uppercase"
                                        >
                                            Next
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {hasPerm && hasPerm('EDIT') && (
                                            <button 
                                                onClick={() => navigate(`/questions/edit/${selectedQuestion.id}`)}
                                                className="flex items-center justify-center w-9 h-9 bg-slate-800 border-2 border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit size={15} />
                                            </button>
                                        )}
                                        {isSuperAdmin && (
                                            <button 
                                                onClick={async () => {
                                                    const currentIndex = questions.findIndex(q => q.id === selectedQuestion.id);
                                                    await handleDelete(selectedQuestion.id);
                                                    if (currentIndex >= 0 && currentIndex < questions.length - 1) {
                                                        handleViewQuestion(questions[currentIndex + 1]);
                                                    } else {
                                                        setSelectedQuestion(null);
                                                    }
                                                }}
                                                className="flex items-center justify-center w-9 h-9 bg-slate-800 border-2 border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-500 hover:bg-rose-900/30 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleQuickAction(selectedQuestion.id, 'REJECTED')}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-2 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500 rounded-lg text-xs font-black transition-colors uppercase tracking-wider"
                                        >
                                            <ThumbsDown size={14} strokeWidth={3} /> Reject
                                        </button>
                                        <button 
                                            onClick={() => handleQuickAction(selectedQuestion.id, 'APPROVED')}
                                            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 rounded-lg text-xs font-black transition-all shadow-md shadow-emerald-900/50 uppercase tracking-wider transform hover:scale-[1.02] active:scale-[0.98] border border-emerald-500/50"
                                        >
                                            <ThumbsUp size={14} strokeWidth={3} /> Approve
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center m-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-dashed border-slate-700">
                                <GitCompare size={48} className="mb-4 text-slate-600" />
                                <h3 className="text-lg font-bold text-slate-300 mb-2">Review Mode Active</h3>
                                <p className="text-sm">Click "View" on any question from the list to preview it here side-by-side.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 bg-slate-50/50 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
                            Showing <span className="text-slate-700 font-bold">{totalElements === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-700 font-bold">{Math.min(currentPage * itemsPerPage, totalElements)}</span> of <span className="text-slate-700 font-bold">{totalElements}</span> questions
                        </div>
                        <div className="flex items-center gap-2 border-l border-slate-300 pl-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Per Page:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                            >
                                <option value={25}>25</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                                <option value={500}>500</option>
                            </select>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 transition-all shadow-sm"
                            >
                                Prev
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${currentPage === pageNum
                                                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                                : 'text-slate-600 hover:bg-white hover:text-primary border border-transparent hover:border-slate-200'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {selectedQuestion && !splitScreenMode && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Question Preview</h2>
                            <button onClick={() => setSelectedQuestion(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold tracking-widest uppercase">{selectedQuestion.type}</span>
                                <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase ${selectedQuestion.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-700' :
                                    selectedQuestion.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                                        'bg-rose-50 text-rose-700'
                                    }`}>{selectedQuestion.difficulty}</span>
                                {getStatusBadge(selectedQuestion.status)}
                            </div>

                            <div className="space-y-6">
                                {selectedQuestion.classSubject && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Subject Context</h3>
                                        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                                            <p className="text-slate-800 font-semibold">{selectedQuestion.classSubject.academicClass?.name} • {selectedQuestion.classSubject.subject?.name}</p>
                                            {(selectedQuestion.chapter || selectedQuestion.topic) && (
                                                <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-2">
                                                    {selectedQuestion.chapter?.name}
                                                    {selectedQuestion.topic && <span className="text-slate-300">/</span>}
                                                    {selectedQuestion.topic?.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!selectedQuestion.classSubject && selectedQuestion.sourceReference && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Source / Context</h3>
                                        <div className="p-4 bg-violet-50/80 rounded-xl border border-violet-100 flex items-center gap-3">
                                            <p className="text-slate-800 font-semibold flex-1">{selectedQuestion.sourceReference}</p>
                                            {selectedQuestion.aiGenerated && <span className="text-[10px] bg-violet-100 text-violet-600 border border-violet-200 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">AI Imported</span>}
                                        </div>
                                    </div>
                                )}

                                {selectedQuestion.stimulus && (
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Stimulus (উদ্দীপক)</h3>
                                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-slate-800 font-medium leading-relaxed">
                                            <MarkdownRenderer content={selectedQuestion.stimulus} />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Question</h3>
                                    <div className="text-lg font-medium text-slate-900 leading-relaxed">
                                        {selectedQuestion.type === 'CQ' ? (
                                            <CQCombinedRenderer q={selectedQuestion} showAnswer={true} showExplanation={true} />
                                        ) : (
                                            <MarkdownRenderer content={selectedQuestion.questionText} />
                                        )}
                                    </div>
                                    {selectedQuestion.mcqType === 'MULTIPLE_COMPLETION' && selectedQuestion.statements && selectedQuestion.statements.length > 0 && (
                                        <div className="mt-3 pl-4 border-l-2 border-indigo-200 space-y-2">
                                            {selectedQuestion.statements.map((stmt, sIdx) => (
                                                <div key={sIdx} className="text-sm text-slate-700 font-medium leading-relaxed">
                                                    <MarkdownRenderer content={stmt} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedQuestion.type === 'MCQ' && selectedQuestion.options && selectedQuestion.options.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Answers / Options</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedQuestion.options.map(opt => (
                                                <div key={opt.id} className={`p-3 rounded-xl border-2 flex items-center gap-3 ${opt.isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                                                    <span className={`flex shadow-sm items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${opt.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{opt.optionLabel}</span>
                                                    <span className={`text-sm flex-1 ${opt.isCorrect ? 'text-emerald-900 font-bold' : 'text-slate-700 font-medium'}`}>
                                                        <MarkdownRenderer content={opt.optionText} />
                                                    </span>
                                                    {opt.isCorrect && <CheckCircle size={18} className="text-emerald-500 ml-auto" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedQuestion.correctAnswer && selectedQuestion.type !== 'MCQ' && selectedQuestion.type !== 'CQ' && (
                                    <div>
                                        <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-2"><CheckCircle size={16} /> Correct Answer</h3>
                                        <div className="p-4 bg-emerald-50 text-emerald-900 font-medium leading-relaxed rounded-xl border border-emerald-200">
                                            <MarkdownRenderer content={selectedQuestion.correctAnswer} />
                                        </div>
                                    </div>
                                )}

                                {selectedQuestion.explanation && selectedQuestion.type !== 'CQ' && (
                                    <div>
                                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-2">Explanation (ব্যাখ্যা)</h3>
                                        <div className="p-4 bg-blue-50 text-blue-900 font-medium leading-relaxed rounded-xl border border-blue-200">
                                            <MarkdownRenderer content={selectedQuestion.explanation} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* ── Revise Panel (right slide-in drawer) ── */}
        <RevisePanel
            question={reviseItem}
            isOpen={!!reviseItem}
            onClose={() => setReviseItem(null)}
            onSuccess={() => {
                setReviseItem(null);
                try { setRevisedIds(JSON.parse(localStorage.getItem('revisedQuestionIds') || '[]')); } catch {}
                fetchQuestions();
            }}
        />

        {/* ── Revision Review Panel (Super Admin diff + approve/reject) ── */}
        <RevisionReviewPanel
            revision={reviewItem}
            isOpen={!!reviewItem}
            onClose={() => setReviewItem(null)}
            onActionComplete={() => {
                setReviewItem(null);
                fetchQuestions();
            }}
        />
        </>
    );
};

export default QuestionList;
