import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, Trash2, CheckCircle, FileText, ThumbsUp, Bookmark, BookmarkCheck, GitCompare, MoreHorizontal, Layers } from 'lucide-react';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';
import CQCombinedRenderer from './CQCombinedRenderer';
import DynamicQuestionViewer from './DynamicQuestionViewer';

const QuestionListItem = React.memo(({ q, index, isSelected, onSelect, onSave, isSaved, onView, onDelete, onRevise, onReview, isSuperAdmin, hasPerm, splitScreenMode, isViewing, isDefaultOrSuperAdmin }) => {
    const navigate = useNavigate();
    const [showAnswer, setShowAnswer] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const difficultyStyle = {
        EASY: 'bg-emerald-50 text-emerald-700',
        MEDIUM: 'bg-amber-50 text-amber-700',
        HARD: 'bg-rose-50 text-rose-700',
    };
    const typeLabel = q.type === 'MCQ' ? 'Multiple Choice' : q.type === 'CQ' ? 'Creative' : q.type === 'SHORT' ? 'Short Answer' : q.type;

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

    return (
        <div 
            id={`question-item-${q.id}`}
            onClick={(e) => {
                const isInteractive = e.target.closest('button') || e.target.closest('input') || e.target.closest('a') || e.target.closest('.group');
                if (!isInteractive) {
                    if (isDefaultOrSuperAdmin) {
                        onSelect(q.id);
                        if (splitScreenMode) {
                            onView(q);
                        }
                    } else {
                        onView(q);
                    }
                }
            }}
            className={`border border-slate-200 rounded-xl transition-all duration-300 transform hover:-translate-y-[2px] hover:shadow-lg cursor-pointer relative hover:z-10 ${
            isViewing ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400' 
            : q.status === 'REVISED' ? 'bg-rose-50/50 border-rose-300'
            : isSelected && isDefaultOrSuperAdmin ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-200' : 'bg-white hover:border-indigo-200'
        }`}>

            {/* ── Header Row ── */}
            <div className="flex items-start justify-between px-4 pt-3 pb-2 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {isDefaultOrSuperAdmin && (
                        <input type="checkbox" checked={isSelected} onChange={() => onSelect(q.id)}
                            className="w-4 h-4 text-primary border-slate-300 rounded cursor-pointer shrink-0 mt-0.5" />
                    )}
                    <span className="text-[12px] font-black text-slate-600 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">Q #{index}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200 whitespace-nowrap">{typeLabel}</span>
                    
                    {/* Unified Status Badges */}
                    {q.status === 'APPROVED' && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">Approved</span>}
                    {q.status === 'REJECTED' && <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">Rejected</span>}
                    {q.status === 'PENDING' && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">Pending</span>}
                    {q.status === 'REVISED' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold uppercase whitespace-nowrap animate-pulse">Revised</span>}
                    {q.aiGenerated && isDefaultOrSuperAdmin && <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md text-[10px] font-bold uppercase whitespace-nowrap">AI Synced</span>}
                    
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${difficultyStyle[q.difficulty] || 'bg-slate-50 text-slate-600'}`}>
                        {q.difficulty}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold whitespace-nowrap">{q.marks ?? 1} Marks</span>
                </div>

                {/* Actions Menu (Three-Dot) */}
                {isDefaultOrSuperAdmin && (
                    <div ref={menuRef} className="flex items-center gap-1 shrink-0 relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            <MoreHorizontal size={16} />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full w-36 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 flex flex-col animate-in fade-in slide-in-from-top-1 duration-150">
                                <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onView(q); }} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors text-left w-full"><Eye size={12}/> View Detail</button>
                                {hasPerm && hasPerm('EDIT') && <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); navigate(`/questions/edit/${q.id}`); }} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors text-left w-full"><Edit size={12}/> Edit Source</button>}
                                {q.status === 'REVISED' && isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onReview(q); }} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left w-full"><GitCompare size={12}/> Review Changes</button>}
                                {isSuperAdmin && <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onDelete(q.id); }} className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left w-full"><Trash2 size={12}/> Delete</button>}
                            </div>
                        )}
                    </div>
                )}
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
                    <div className="mx-4 mb-2 px-4 py-3 bg-slate-50 border border-slate-200 border-l-4 border-l-indigo-400 rounded-r-lg text-[13px] text-slate-700 font-medium leading-relaxed">
                        <MarkdownRenderer content={q.stimulus} />
                    </div>
                );
            })()}

            {/* ── Question Text ── */}
            <div className="mx-4 mb-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-[13px] font-semibold text-slate-800 leading-snug">
                    {q.type === 'CQ' ? (
                        <CQCombinedRenderer q={q} showAnswer={showAnswer} showExplanation={showExplanation} />
                    ) : q.dynamicData ? (
                        <DynamicQuestionViewer q={q} mode="list" showAnswer={showAnswer} showExplanation={showExplanation} />
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
            {showAnswer && q.type !== 'MCQ' && !q.dynamicData && (q.type !== 'CQ' || !isStructuredCQAnswer) && q.correctAnswer && hasCQAnswer && (
                <div className="mx-4 mb-2 px-3 py-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-[12px] text-emerald-900 font-semibold leading-snug flex items-start gap-2">
                    <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        {q.type === 'CQ' && <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">সৃজনশীল উত্তর (পুরাতন/আনস্ট্রাকচার্ড ফরম্যাট):</span>}
                        <span><MarkdownRenderer content={q.correctAnswer} /></span>
                    </div>
                </div>
            )}
            {showAnswer && q.type === 'CQ' && !q.dynamicData && (!q.correctAnswer || !hasCQAnswer) && (
                <div className="mx-4 mb-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-400 italic">No answer available.</div>
            )}

            <div className="mx-4 mb-2 grid grid-cols-2 gap-3">
                {/* Show Answer — always gradient, green when active */}
                <button
                    onClick={() => setShowAnswer(!showAnswer)}
                    className="flex items-center justify-center gap-2 py-2 px-4 text-[12px] font-extrabold text-white rounded-xl transition-all duration-300 active:scale-[0.97] border border-white/10"
                    style={{ 
                        background: showAnswer
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #e91e8c 0%, #a855f7 100%)',
                        boxShadow: showAnswer
                            ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                            : '0 4px 14px rgba(168, 85, 247, 0.35)'
                    }}
                >
                    <Eye size={14} /> {showAnswer ? 'Hide Answer' : 'Show Answer'}
                </button>

                {/* Explanation — plain when inactive, reverse gradient when active */}
                <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="flex items-center justify-center gap-2 py-2 px-4 text-[12px] font-extrabold rounded-xl transition-all duration-300 active:scale-[0.97] border"
                    style={{ 
                        background: showExplanation
                            ? 'linear-gradient(135deg, #a855f7 0%, #e91e8c 100%)'
                            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderColor: showExplanation ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                        boxShadow: showExplanation
                            ? '0 4px 14px rgba(168, 85, 247, 0.35)'
                            : '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                >
                    <FileText size={14} className={showExplanation ? 'text-white' : 'text-slate-600'} />
                    <span className={showExplanation ? 'text-white font-extrabold' : 'text-slate-600'}>Explanation</span>
                </button>
            </div>


            {/* ── Explanation Block ── */}
            {showExplanation && !q.dynamicData && (q.type !== 'CQ' || !isStructuredCQExplanation) && finalExplanation && hasCQExplanation && (
                <div className="mx-4 mb-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-900 leading-snug">
                    <div className="flex-1 min-w-0">
                        {q.type === 'CQ' && <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">সৃজনশীল ব্যাখ্যা (পুরাতন/আনস্ট্রাকচার্ড ফরম্যাট):</span>}
                        <MarkdownRenderer content={finalExplanation} />
                    </div>
                </div>
            )}
            {showExplanation && q.type === 'CQ' && !q.dynamicData && (!finalExplanation || !hasCQExplanation) && (
                <div className="mx-4 mb-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-400 italic">No explanation available.</div>
            )}
            {showExplanation && q.type !== 'CQ' && !q.dynamicData && !finalExplanation && (
                <div className="mx-4 mb-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-400 italic">No explanation available.</div>
            )}

            {/* ── Source / Action Footer ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 pb-3 pt-1.5 border-t border-slate-100 gap-3">
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
                            {q.aiGenerated && isDefaultOrSuperAdmin && <span className="text-[9px] bg-violet-100 text-violet-800 border border-violet-200 px-1.5 py-px rounded font-black uppercase shrink-0">AI Synced</span>}
                        </div>
                    ) : null}
                </div>

                {/* Action Buttons (Only Primary Footer Actions) */}
                {!splitScreenMode && (
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto shrink-0 border-t border-slate-100 sm:border-0 pt-2 sm:pt-0">
                        {isDefaultOrSuperAdmin && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRevise(q); }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-extrabold transition-all duration-300 border bg-gradient-to-b from-white to-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:text-primary hover:border-primary/40 hover:-translate-y-px active:scale-[0.97]"
                                title="Quick Revise"
                            >
                                <Edit size={12} /> <span>Revise</span>
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-extrabold transition-all duration-300 border ${isLiked ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-transparent shadow-[0_3px_10px_rgba(244,63,94,0.3)] hover:shadow-[0_4px_14px_rgba(244,63,94,0.4)] hover:-translate-y-px active:scale-[0.97]' : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-rose-500 hover:border-rose-200 hover:-translate-y-px active:scale-[0.97]'}`}
                            title="Like"
                        >
                            <ThumbsUp size={12} className={isLiked ? 'fill-current' : ''} />
                            <span>Like</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onSave(q.id); }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-extrabold transition-all duration-300 border ${isSaved ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-[0_3px_10px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_14px_rgba(245,158,11,0.4)] hover:-translate-y-px active:scale-[0.97]' : 'bg-gradient-to-b from-white to-slate-50 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-amber-500 hover:border-amber-200 hover:-translate-y-px active:scale-[0.97]'}`}
                            title={isSaved ? 'Remove from Saved' : 'Save'}
                        >
                            {isSaved ? <BookmarkCheck size={12} className="fill-current" /> : <Bookmark size={12} />}
                            <span>Save</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default QuestionListItem;
