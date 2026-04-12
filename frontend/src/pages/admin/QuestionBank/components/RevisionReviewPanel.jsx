import React, { useState, useEffect } from 'react';
import {
    X, CheckCircle, XCircle, AlertCircle, Loader2, Edit3, Eye,
    ArrowRight, GitCompare, User, Calendar, FileText, MessageSquare, Save
} from 'lucide-react';
import questionService from '../../../../services/questionService';
import { diffWords } from 'diff';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';

// ─── Simple text diff highlighter ────────────────────────────────────────────
const DiffText = ({ original, revised, label }) => {
    if (!original && !revised) return null;
    const orig = (original || '').replace(/<[^>]*>/g, '').trim();
    const rev = (revised || '').replace(/<[^>]*>/g, '').trim();
    const isChanged = orig !== rev;

    let diffs = [];
    if (isChanged) {
        diffs = diffWords(orig, rev);
    }

    return (
        <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="grid grid-cols-2 gap-2">
                <div className={`px-3 py-2 rounded-lg text-[12px] leading-snug border ${isChanged ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-[9px] font-bold text-slate-400 mb-1">ORIGINAL</div>
                    {!isChanged ? (
                        <div className="text-slate-600">
                            {original ? <MarkdownRenderer content={original} /> : <em className="text-slate-400">Empty</em>}
                        </div>
                    ) : (
                        <div className="leading-relaxed text-slate-600">
                            {diffs.filter(p => !p.added).map((part, i) => (
                                <span key={i} className={part.removed ? "bg-rose-200 text-rose-900 line-through px-0.5 rounded" : ""}>
                                    {part.value}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div className={`px-3 py-2 rounded-lg text-[12px] leading-snug border ${isChanged ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-[9px] font-bold text-slate-400 mb-1">REVISED</div>
                    {!isChanged ? (
                        <div className="text-slate-600">
                            {revised ? <MarkdownRenderer content={revised} /> : <em className="text-slate-400">Empty</em>}
                        </div>
                    ) : (
                        <div className="leading-relaxed text-slate-600">
                            {diffs.filter(p => !p.removed).map((part, i) => (
                                <span key={i} className={part.added ? "bg-emerald-200 text-emerald-900 font-semibold px-0.5 rounded" : ""}>
                                    {part.value}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {isChanged && (
                <div className="text-[9px] font-bold text-rose-500 flex items-center gap-1">
                    <Edit3 size={9} /> Changed
                </div>
            )}
        </div>
    );
};

// ─── Option diff ─────────────────────────────────────────────────────────────
const OptionDiff = ({ originalOptions, revisedOptions }) => {
    if (!revisedOptions?.length) return null;

    return (
        <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">MCQ Options</div>
            <div className="grid grid-cols-2 gap-2">
                {/* Original column */}
                <div className="space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 mb-1">ORIGINAL</div>
                    {(originalOptions || []).map((opt, i) => {
                        const revised = revisedOptions[i];
                        const origClean = (opt.optionText || '').replace(/<[^>]*>/g, '').trim();
                        const revClean = (revised?.optionText || '').replace(/<[^>]*>/g, '').trim();
                        const textChanged = revised && origClean !== revClean;
                        
                        const origCorrect = opt.isCorrect ?? opt.correct;
                        const revCorrect = revised?.isCorrect ?? revised?.correct;
                        const correctChanged = revised && origCorrect !== revCorrect;
                        
                        const diffs = textChanged ? diffWords(origClean, revClean) : [];

                        return (
                            <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] border ${
                                textChanged || correctChanged ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                            }`}>
                                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                                    origCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                                }`}>{opt.optionLabel}</span>
                                
                                {!textChanged ? (
                                    <span className="text-slate-600 flex-1"><MarkdownRenderer content={opt.optionText} /></span>
                                ) : (
                                    <span className="leading-relaxed text-slate-600">
                                        {diffs.filter(p => !p.added).map((part, idx) => (
                                            <span key={idx} className={part.removed ? "bg-rose-200 text-rose-900 line-through px-0.5 rounded mx-0.5" : ""}>
                                                {part.value}
                                            </span>
                                        ))}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Revised column */}
                <div className="space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 mb-1">REVISED</div>
                    {revisedOptions.map((opt, i) => {
                        const orig = (originalOptions || [])[i];
                        const origClean = (orig?.optionText || '').replace(/<[^>]*>/g, '').trim();
                        const revClean = (opt.optionText || '').replace(/<[^>]*>/g, '').trim();
                        const textChanged = orig && origClean !== revClean;
                        
                        const origCorrect = orig?.isCorrect ?? orig?.correct;
                        const revCorrect = opt.isCorrect ?? opt.correct;
                        const correctChanged = orig && revCorrect !== origCorrect;
                        
                        const diffs = textChanged ? diffWords(origClean, revClean) : [];

                        return (
                            <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] border ${
                                textChanged || correctChanged ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                            }`}>
                                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                                    revCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                                } ${correctChanged ? 'ring-2 ring-emerald-400' : ''}`}>{opt.optionLabel}</span>
                                
                                {!textChanged ? (
                                    <span className="text-slate-600 flex-1"><MarkdownRenderer content={opt.optionText} /></span>
                                ) : (
                                    <span className="leading-relaxed text-slate-600">
                                        {diffs.filter(p => !p.removed).map((part, idx) => (
                                            <span key={idx} className={part.added ? "bg-emerald-200 text-emerald-900 font-semibold px-0.5 rounded mx-0.5" : ""}>
                                                {part.value}
                                            </span>
                                        ))}
                                    </span>
                                )}
                                {correctChanged && <span className="text-[8px] font-black text-emerald-600 ml-auto leading-none">✓ NEW</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Statement diff ────────────────────────────────────────────────────────
const StatementDiff = ({ originalStatements, revisedStatements }) => {
    if (!revisedStatements?.length && !originalStatements?.length) return null;

    return (
        <div className="space-y-1">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Statements (তথ্য/বিবৃতি)</div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 mb-1">ORIGINAL</div>
                    {(originalStatements || []).map((stmt, i) => {
                        const revised = revisedStatements?.[i];
                        const isChanged = revised !== stmt;
                        const diffs = (isChanged && revised) ? diffWords(stmt || '', revised || '') : [];

                        return (
                            <div key={i} className={`px-2 py-1.5 rounded-md text-[11px] border ${isChanged ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                {!isChanged || !revised ? (
                                    <span className={isChanged ? "text-rose-600 line-through block" : "block"}><MarkdownRenderer content={stmt} /></span>
                                ) : (
                                    <span className="leading-relaxed text-slate-600">
                                        {diffs.filter(p => !p.added).map((part, idx) => (
                                            <span key={idx} className={part.removed ? "bg-rose-200 text-rose-900 line-through px-0.5 rounded mx-0.5" : ""}>
                                                {part.value}
                                            </span>
                                        ))}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="space-y-1">
                    <div className="text-[9px] font-bold text-slate-400 mb-1">REVISED</div>
                    {(revisedStatements || []).map((stmt, i) => {
                        const original = originalStatements?.[i];
                        const isChanged = original !== stmt;
                        const diffs = (isChanged && original) ? diffWords(original || '', stmt || '') : [];

                        return (
                            <div key={i} className={`px-2 py-1.5 rounded-md text-[11px] border ${isChanged ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                {!isChanged || !original ? (
                                    <span className={isChanged ? "text-emerald-800 font-semibold block" : "block"}><MarkdownRenderer content={stmt} /></span>
                                ) : (
                                    <span className="leading-relaxed text-slate-600">
                                        {diffs.filter(p => !p.removed).map((part, idx) => (
                                            <span key={idx} className={part.added ? "bg-emerald-200 text-emerald-900 font-semibold px-0.5 rounded mx-0.5" : ""}>
                                                {part.value}
                                            </span>
                                        ))}
                                    </span>
                                )}
                                {isChanged && <span className="text-[8px] font-black text-emerald-600 float-right mt-0.5">✓ NEW</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Main Review Panel ──────────────────────────────────────────────────────
const RevisionReviewPanel = ({ revision, isOpen, onClose, onActionComplete }) => {
    const [original, setOriginal] = useState(null);
    const [originalOptions, setOriginalOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null); // 'approve' | 'reject'
    const [toast, setToast] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({});

    const [revisionOptions, setRevisionOptions] = useState([]);

    // Fetch original question + revision options when panel opens
    useEffect(() => {
        if (!revision?.parentQuestionId) return;
        setLoading(true);
        setToast(null);
        setEditMode(false);
        Promise.all([
            questionService.getQuestionById(revision.parentQuestionId),
            questionService.getOptions(revision.parentQuestionId),
            questionService.getOptions(revision.id), // fetch revision's own options
        ]).then(([q, origOpts, revOpts]) => {
            setOriginal(q);
            setOriginalOptions(origOpts);
            setRevisionOptions(revOpts);
        }).catch(() => {
            setOriginal(null);
            setOriginalOptions([]);
            setRevisionOptions([]);
        }).finally(() => setLoading(false));
    }, [revision?.id]);

    // Initialize edit form from revision
    useEffect(() => {
        if (!revision) return;
        setEditForm({
            stimulus: revision.stimulus || '',
            questionText: revision.questionText || '',
            correctAnswer: revision.correctAnswer || '',
            explanation: revision.explanation || '',
            statements: revision.statements || [],
        });
    }, [revision?.id]);

    const handleApprove = async () => {
        setActionLoading('approve');
        setToast(null);
        try {
            await questionService.approveRevision(revision.id);
            setToast({ type: 'success', msg: '✅ Revision approved! Original question updated.' });
            setTimeout(() => onActionComplete?.(), 1200);
        } catch (err) {
            setToast({ type: 'error', msg: err?.response?.data?.message || 'Approve failed.' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!window.confirm('এই রিভিশন বাতিল করতে চান? মূল প্রশ্ন অপরিবর্তিত থাকবে।')) return;
        setActionLoading('reject');
        setToast(null);
        try {
            await questionService.deleteQuestion(revision.id);
            setToast({ type: 'success', msg: '❌ Revision rejected & deleted. Original unchanged.' });
            setTimeout(() => onActionComplete?.(), 1200);
        } catch (err) {
            setToast({ type: 'error', msg: err?.response?.data?.message || 'Reject failed.' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleEditAndApprove = async () => {
        setActionLoading('approve');
        setToast(null);
        try {
            // First update the revision with admin edits
            const payload = {
                question: {
                    ...revision,
                    stimulus: editForm.stimulus,
                    questionText: editForm.questionText,
                    correctAnswer: editForm.correctAnswer,
                    explanation: editForm.explanation,
                    statements: editForm.statements,
                },
                options: revision.options,
            };
            await questionService.updateQuestion(revision.id, payload.question, payload.options);
            // Then approve
            await questionService.approveRevision(revision.id);
            setToast({ type: 'success', msg: '✅ Edited & Approved! Original question updated.' });
            setTimeout(() => onActionComplete?.(), 1200);
        } catch (err) {
            setToast({ type: 'error', msg: err?.response?.data?.message || 'Edit & Approve failed.' });
        } finally {
            setActionLoading(null);
        }
    };

    if (!revision) return null;

    const changeCount = (() => {
        if (!original) return 0;
        let count = 0;
        if ((original.stimulus || '') !== (revision.stimulus || '')) count++;
        if ((original.questionText || '') !== (revision.questionText || '')) count++;
        if ((original.correctAnswer || '') !== (revision.correctAnswer || '')) count++;
        if ((original.explanation || '') !== (revision.explanation || '')) count++;
        if (revisionOptions?.length) {
            revisionOptions.forEach((opt, i) => {
                const orig = originalOptions[i];
                if (orig) {
                    const origCorrect = orig.isCorrect ?? orig.correct;
                    const optCorrect = opt.isCorrect ?? opt.correct;
                    if (orig.optionText !== opt.optionText || origCorrect !== optCorrect) count++;
                }
            });
        }
        if (revision.mcqType === 'MULTIPLE_COMPLETION') {
            const revStmts = revision.statements || [];
            const origStmts = original?.statements || [];
            if (revStmts.join('|') !== origStmts.join('|')) count++;
        }
        return count;
    })();

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={onClose} />
            )}

            <div className={`fixed inset-y-0 right-0 z-50 w-full md:w-3/5 lg:w-1/2 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm">
                            <GitCompare size={17} />
                        </div>
                        <div>
                            <h2 className="text-[14px] font-black text-slate-800">Review Revision</h2>
                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-2">
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-black">{changeCount} change{changeCount !== 1 ? 's' : ''}</span>
                                detected
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Revision Metadata */}
                <div className="px-5 py-2.5 bg-rose-50/50 border-b border-rose-100 flex flex-wrap items-center gap-3 text-[11px] shrink-0">
                    <span className="flex items-center gap-1 font-bold text-rose-800">
                        <User size={11} /> {revision.revisedBy || revision.createdBy || 'Unknown'}
                    </span>
                    {revision.revisedAt && (
                        <span className="flex items-center gap-1 text-rose-600">
                            <Calendar size={11} /> {new Date(revision.revisedAt).toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                    )}
                    {revision.versionComment && (
                        <span className="flex items-center gap-1 text-rose-700 italic">
                            <MessageSquare size={11} /> "{revision.versionComment}"
                        </span>
                    )}
                </div>

                {/* Scrollable Diff Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-primary" size={28} />
                            <span className="ml-3 text-slate-500 font-medium">Loading original question...</span>
                        </div>
                    ) : (
                        <div className="px-5 py-4 space-y-4">
                            {/* Type / Difficulty / Marks (always same) */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold border border-slate-200">
                                    {revision.type === 'MCQ' ? 'Multiple Choice' : revision.type}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                    revision.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : revision.difficulty === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>⚡ {revision.difficulty}</span>
                                <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-full text-[11px] font-bold border border-slate-200">
                                    {revision.marks || 1} Marks
                                </span>
                            </div>

                            {/* Diff sections */}
                            {!editMode ? (
                                <>
                                    <DiffText label="উদ্দীপক / Stimulus" original={original?.stimulus} revised={revision.stimulus} />
                                    <DiffText label="প্রশ্ন / Question Text" original={original?.questionText} revised={revision.questionText} />
                                    {revision.mcqType === 'MULTIPLE_COMPLETION' && (
                                        <StatementDiff originalStatements={original?.statements} revisedStatements={revision.statements} />
                                    )}
                                    {revision.type === 'MCQ' && (
                                        <OptionDiff originalOptions={originalOptions} revisedOptions={revisionOptions} />
                                    )}
                                    {revision.type !== 'MCQ' && (
                                        <DiffText label="সঠিক উত্তর / Correct Answer" original={original?.correctAnswer} revised={revision.correctAnswer} />
                                    )}
                                    <DiffText label="ব্যাখ্যা / Explanation" original={original?.explanation} revised={revision.explanation} />
                                </>
                            ) : (
                                /* Edit mode for Admin */
                                <div className="space-y-3">
                                    <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700 font-medium flex items-center gap-2">
                                        <Edit3 size={12} /> Edit Mode — পরিবর্তন করে Approve করুন
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Stimulus</label>
                                        <textarea value={editForm.stimulus} onChange={e => setEditForm(p => ({ ...p, stimulus: e.target.value }))}
                                            rows={2} className="w-full px-3 py-2 text-[12px] bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Question Text</label>
                                        <textarea value={editForm.questionText} onChange={e => setEditForm(p => ({ ...p, questionText: e.target.value }))}
                                            rows={3} className="w-full px-3 py-2 text-[13px] font-medium bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none" />
                                    </div>
                                    {revision.mcqType === 'MULTIPLE_COMPLETION' && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Statements</label>
                                            <div className="space-y-1.5">
                                                {(editForm.statements || []).map((stmt, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-bold text-slate-500 w-4">{['i', 'ii', 'iii'][idx] || idx+1}</span>
                                                        <input type="text" value={stmt.replace(/^[iv]+\.\s*/, '')}
                                                            onChange={(e) => {
                                                                const newStmts = [...editForm.statements];
                                                                const label = ['i', 'ii', 'iii'][idx] || idx+1;
                                                                newStmts[idx] = `${label}. ${e.target.value}`;
                                                                setEditForm(p => ({ ...p, statements: newStmts }));
                                                            }}
                                                            className="flex-1 px-3 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Correct Answer</label>
                                        <textarea value={editForm.correctAnswer} onChange={e => setEditForm(p => ({ ...p, correctAnswer: e.target.value }))}
                                            rows={2} className="w-full px-3 py-2 text-[12px] bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Explanation</label>
                                        <textarea value={editForm.explanation} onChange={e => setEditForm(p => ({ ...p, explanation: e.target.value }))}
                                            rows={2} className="w-full px-3 py-2 text-[12px] bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Toast */}
                {toast && (
                    <div className={`mx-5 mb-2 px-4 py-3 rounded-xl text-[12px] font-semibold flex items-start gap-2.5 border ${
                        toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                        : <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-500" />}
                        {toast.msg}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 shrink-0 space-y-2">
                    <div className="flex items-center gap-2">
                        {/* Reject */}
                        <button onClick={handleReject} disabled={!!actionLoading}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-bold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 transition-all active:scale-[0.98] disabled:opacity-50 flex-1">
                            {actionLoading === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                            Reject
                        </button>

                        {/* Edit toggle */}
                        <button onClick={() => setEditMode(!editMode)} disabled={!!actionLoading}
                            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex-1 ${
                                editMode ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}>
                            <Edit3 size={13} /> {editMode ? 'View Diff' : 'Edit & Approve'}
                        </button>

                        {/* Approve */}
                        <button
                            onClick={editMode ? handleEditAndApprove : handleApprove}
                            disabled={!!actionLoading}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-[12px] font-black text-white rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-50 flex-1"
                            style={{ background: 'linear-gradient(to right, #10b981, #059669)' }}
                        >
                            {actionLoading === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                            {editMode ? 'Save & Approve' : 'Approve'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RevisionReviewPanel;
