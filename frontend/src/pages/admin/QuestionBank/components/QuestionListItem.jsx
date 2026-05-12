import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, CheckCircle, FileText, ThumbsUp, Bookmark, BookmarkCheck, GitCompare, MoreHorizontal, Layers } from 'lucide-react';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';
import CQCombinedRenderer from './CQCombinedRenderer';

const QuestionListItem = React.memo(({ q, index, isSelected, onSelect, onSave, isSaved, onView, onDelete, onRevise, onReview, isSuperAdmin, hasPerm, splitScreenMode, isViewing }) => {
    const navigate = useNavigate();
    const [showAnswer, setShowAnswer] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    const difficultyStyle = {
        EASY: 'bg-emerald-50 text-emerald-700',
        MEDIUM: 'bg-amber-50 text-amber-700',
        HARD: 'bg-rose-50 text-rose-700',
    };
    const typeLabel = q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'CQ' ? 'Creative' : q.type === 'SHORT' ? 'Short Answer' : q.type;

    return (
        <div 
            id={`question-item-${q.id}`}
            onClick={(e) => {
                const isInteractive = e.target.closest('button') || e.target.closest('input') || e.target.closest('a') || e.target.closest('.group');
                if (!isInteractive) {
                    onSelect(q.id);
                    if (splitScreenMode) {
                        onView(q);
                    }
                }
            }}
            className={`border border-slate-200 rounded-xl transition-all duration-300 transform hover:-translate-y-[2px] hover:shadow-lg cursor-pointer relative hover:z-10 ${
            isViewing ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400' 
            : q.status === 'REVISED' ? 'bg-rose-50/50 border-rose-300'
            : isSelected ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200' : 'bg-white hover:border-indigo-200'
        }`}>

            {/* ── Header Row ── */}
            <div className="flex items-start justify-between px-4 pt-3 pb-2 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <input type="checkbox" checked={isSelected} onChange={() => onSelect(q.id)}
                        className="w-4 h-4 text-primary border-slate-300 rounded cursor-pointer shrink-0 mt-0.5" />
                    <span className="text-[12px] font-black text-slate-600 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Q #{index}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200 whitespace-nowrap">{typeLabel}</span>
                    
                    {/* Unified Status Badges */}
                    {q.status === 'APPROVED' && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">Approved</span>}
                    {q.status === 'REJECTED' && <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">Rejected</span>}
                    {q.status === 'PENDING' && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">Pending</span>}
                    {q.status === 'REVISED' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold uppercase whitespace-nowrap animate-pulse">Revised</span>}
                    {q.aiGenerated && <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">AI Synced</span>}
                    
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${difficultyStyle[q.difficulty] || 'bg-slate-50 text-slate-600'}`}>
                        {q.difficulty}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold whitespace-nowrap">{q.marks ?? 1} Marks</span>
                </div>

                {/* Actions Menu (Three-Dot) */}
                <div className="flex items-center gap-1 shrink-0 relative group">
                    <button className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                        <MoreHorizontal size={16} />
                    </button>
                    <div className="absolute right-0 top-full w-36 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 py-1 flex flex-col">
                        <button onClick={(e) => { e.stopPropagation(); onView(q); }} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors text-left w-full"><Eye size={12}/> View Detail</button>
                        {hasPerm && hasPerm('EDIT') && <button onClick={(e) => { e.stopPropagation(); navigate(`/questions/edit/${q.id}`); }} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors text-left w-full"><Edit size={12}/> Edit Source</button>}
                        {q.status === 'REVISED' && isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); onReview(q); }} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left w-full"><GitCompare size={12}/> Review Changes</button>}
                        {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); onDelete(q.id); }} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left w-full"><Trash2 size={12}/> Delete</button>}
                    </div>
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
                <div className="mx-4 mb-2 px-4 py-3 bg-slate-50 border border-slate-200 border-l-4 border-l-indigo-400 rounded-r-lg text-[13px] text-slate-700 font-medium leading-relaxed">
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
                    {q.options.map((opt, idx) => {
                        const isEnglish = q.language && q.language.toLowerCase() === 'english';
                        const displayLabel = isEnglish ? String.fromCharCode(65 + idx) : (['ক', 'খ', 'গ', 'ঘ'][idx] || String.fromCharCode(65 + idx));
                        return (
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
                                {displayLabel}
                            </span>
                            <span className="flex-1"><MarkdownRenderer content={opt.optionText} /></span>
                            {showAnswer && opt.isCorrect && <CheckCircle size={13} className="text-emerald-500 ml-auto shrink-0" />}
                        </div>
                    )})}
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
                <div className="flex items-center gap-1.5 text-[10.5px] flex-1 min-w-0 flex-wrap">
                    {q.classSubject ? (
                        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1 bg-indigo-50/80 border border-indigo-100 rounded-md text-indigo-700 font-semibold">
                            <FileText size={11} className="text-indigo-400 shrink-0" />
                            <span className="bg-white text-indigo-800 px-1.5 py-px rounded border border-indigo-100 text-[10px] font-bold shrink-0 shadow-sm">{q.classSubject?.subject?.name}</span>
                            <span className="text-indigo-300 shrink-0">›</span>
                            <span className="shrink-0">{q.classSubject?.academicClass?.name}</span>
                            {q.chapter && <><span className="text-indigo-300 shrink-0">›</span><span className="shrink-0">{q.chapter?.name}</span></>}
                            {q.topic && <><span className="text-indigo-300 shrink-0">›</span><span className="shrink-0">{q.topic?.name}</span></>}
                        </div>
                    ) : q.sourceReference ? (
                        <div className="flex flex-wrap items-center gap-1.5 px-2 py-1 bg-violet-50/80 border border-violet-100 rounded-md text-violet-700 font-semibold">
                            <FileText size={11} className="text-violet-400 shrink-0" />
                            <span className="font-bold">{q.sourceReference}</span>
                            {q.aiGenerated && <span className="text-[9px] bg-violet-100 text-violet-800 border border-violet-200 px-1.5 py-px rounded font-black uppercase shrink-0">AI Synced</span>}
                        </div>
                    ) : null}
                </div>

                {/* Action Buttons (Only Primary Footer Actions) */}
                {!splitScreenMode && (
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onRevise(q); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10.5px] font-bold transition-all border bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:text-primary hover:border-primary/30`}
                        title="Quick Revise"
                    >
                        <Edit size={12} /> <span>Revise</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${isLiked ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-rose-400'}`}
                        title="Like"
                    >
                        <ThumbsUp size={11} className={isLiked ? 'fill-current' : ''} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onSave(q.id); }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all border ${isSaved ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-500'}`}
                        title={isSaved ? 'Remove from Saved' : 'Save'}
                    >
                        {isSaved ? <BookmarkCheck size={11} className="fill-current" /> : <Bookmark size={11} />}
                        <span>Save</span>
                    </button>
                </div>
                )}
            </div>
        </div>
    );
});

export default QuestionListItem;
