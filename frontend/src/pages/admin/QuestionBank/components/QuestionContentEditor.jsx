import React, { memo } from 'react';
import { FileText } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';

const QuestionContentEditor = memo(({ 
    formData, 
    setFormData, 
    questionType,
    isLegacyCQ,
    editMode,
    setEditMode,
    showReference,
    setShowReference,
    originalQuestion,
    isInline
}) => {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${isInline ? 'p-3' : 'p-6'}`}>
            <h2 className={`font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 ${isInline ? 'text-xs mb-3 pb-1.5' : 'text-lg mb-6 pb-3'}`}>
                <FileText size={16} className="text-amber-500" /> Content Editor
            </h2>

            {/* Warning Banner & Mode Selector for Legacy CQ in full editor */}
            {isLegacyCQ && (
                <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3">
                    <div className="flex gap-2.5">
                        <span className="text-amber-600 shrink-0 text-lg font-bold">⚠️</span>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-amber-800">লেগেসি (আনস্ট্রাকচার্ড) সৃজনশীল প্রশ্ন সনাক্ত করা হয়েছে</h4>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                এই প্রশ্নটি ক, খ, গ, ঘ সাব-প্রশ্নে বিভক্ত নয়। আপনি এটিকে সরাসরি মূল টেক্সট হিসেবে এডিট করতে পারেন অথবা নতুন ক, খ, গ, ঘ স্ট্রাকচারে রূপান্তর করতে পারেন।
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2 border-t border-amber-200/60 pt-2.5">
                        <button
                            type="button"
                            onClick={() => setEditMode('legacy')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                editMode === 'legacy'
                                    ? 'bg-amber-600 text-white shadow-sm font-extrabold'
                                    : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-100/50'
                             }`}
                        >
                            Raw Text এডিট করুন
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditMode('structured')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                                editMode === 'structured'
                                    ? 'bg-amber-600 text-white shadow-sm font-extrabold'
                                    : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-100/50'
                            }`}
                        >
                            Structured এ রূপান্তর করুন
                        </button>
                    </div>
                </div>
            )}

            {/* Collapsible Reference Panel for Legacy CQ Conversion */}
            {isLegacyCQ && editMode === 'structured' && originalQuestion && (
                <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                    <button
                        type="button"
                        onClick={() => setShowReference(!showReference)}
                        className="w-full px-4 py-3 bg-slate-100 flex items-center justify-between text-slate-700 hover:bg-slate-200/70 transition-all text-left"
                    >
                        <span className="text-xs font-bold flex items-center gap-1.5">
                            📚 মূল লেগেসি টেক্সট রেফারেন্স (এখান থেকে কপি করুন)
                        </span>
                        <span className={`text-slate-500 transition-transform ${showReference ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {showReference && (
                        <div className="p-4 space-y-4 text-xs border-t border-slate-200 max-h-80 overflow-y-auto custom-scrollbar bg-white">
                            {originalQuestion.stimulus && (
                                <div>
                                    <span className="font-bold text-slate-500 block mb-1">মূল উদ্দীপক (Stimulus):</span>
                                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: originalQuestion.stimulus }} />
                                </div>
                            )}
                            <div>
                                <span className="font-bold text-slate-500 block mb-1">মূল প্রশ্ন টেক্সট (Question Text):</span>
                                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: originalQuestion.questionText || '—' }} />
                            </div>
                            {originalQuestion.correctAnswer && (
                                <div>
                                    <span className="font-bold text-slate-500 block mb-1">মূল উত্তর (Correct Answer):</span>
                                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: originalQuestion.correctAnswer }} />
                                </div>
                            )}
                            {originalQuestion.explanation && (
                                <div>
                                    <span className="font-bold text-slate-500 block mb-1">মূল ব্যাখ্যা (Explanation):</span>
                                    <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-700 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: originalQuestion.explanation }} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {isInline ? (
                    <details className="group border border-slate-200 rounded-xl overflow-hidden bg-slate-55/40" open={!!formData.stimulus}>
                        <summary className="w-full px-3 py-2 bg-slate-100/80 flex items-center justify-between text-slate-700 hover:bg-slate-200/50 transition-all text-[11px] font-black cursor-pointer select-none">
                            <span>📝 Stimulus / Stem (উদ্দীপক) - Optional</span>
                            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="p-3 bg-white border-t border-slate-200">
                            <RichTextEditor value={formData.stimulus || ''}
                                onChange={(val) => setFormData(prev => prev.stimulus !== val ? { ...prev, stimulus: val } : prev)}
                                height="min-h-[80px]" compact={isInline} className="border border-slate-200 rounded-lg overflow-hidden" />
                        </div>
                    </details>
                ) : (
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Stimulus / Stem (উদ্দীপক) <span className="text-slate-400 font-normal">- Optional</span></label>
                        <RichTextEditor value={formData.stimulus || ''}
                            onChange={(val) => setFormData(prev => prev.stimulus !== val ? { ...prev, stimulus: val } : prev)}
                            height="min-h-[120px]" className="border border-slate-200 rounded-lg overflow-hidden" />
                    </div>
                )}

                {(questionType !== 'CQ' || editMode === 'legacy') && (
                    <div>
                        <label className="block text-xs font-bold text-slate-650 mb-1.5">Question Text *</label>
                        <RichTextEditor value={formData.questionText || ''}
                            onChange={(val) => setFormData(prev => prev.questionText !== val ? { ...prev, questionText: val } : prev)}
                            height={isInline ? "min-h-[100px]" : "min-h-[160px]"} compact={isInline} className="border border-slate-200 rounded-lg overflow-hidden" />
                    </div>
                )}

                {formData.mcqType === 'MULTIPLE_COMPLETION' && (
                    <div className="bg-indigo-50/20 p-4 border border-indigo-100 rounded-xl space-y-2">
                        <label className="block text-xs font-bold text-indigo-700">Statements (তথ্য/বিবৃতি)</label>
                        <div className="space-y-2">
                            {(formData.statements || []).map((stmt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-indigo-200">{['i', 'ii', 'iii'][idx] || idx+1}</span>
                                    <input type="text" value={stmt.replace(/^(i{1,3}|iv|v|vi)\.\s*/i, '')}
                                        onChange={(e) => {
                                            const newStmts = [...formData.statements];
                                            const label = ['i', 'ii', 'iii'][idx] || idx+1;
                                            newStmts[idx] = `${label}. ${e.target.value}`;
                                            setFormData({ ...formData, statements: newStmts });
                                        }}
                                        className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-300"
                                    />
                                    <button type="button" onClick={() => {
                                        const newStmts = formData.statements.filter((_, i) => i !== idx);
                                        setFormData({ ...formData, statements: newStmts });
                                    }} className="w-6 h-6 flex items-center justify-center rounded text-rose-500 hover:bg-rose-50 transition-colors bg-white border border-slate-200">✕</button>
                                </div>
                            ))}
                            {(formData.statements || []).length < 4 && (
                                <button type="button" onClick={() => {
                                    const newStmts = [...(formData.statements || []), `${['i', 'ii', 'iii'][(formData.statements?.length || 0)] || (formData.statements?.length || 0)+1}. `];
                                    setFormData({ ...formData, statements: newStmts });
                                }} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">+ Add Statement</button>
                            )}
                        </div>
                    </div>
                )}

                {((questionType !== 'MCQ' && questionType !== 'CQ') || (questionType === 'CQ' && editMode === 'legacy')) && (
                    <div>
                        <label className="block text-xs font-bold text-slate-650 mb-1.5">Correct Answer</label>
                        <RichTextEditor value={formData.correctAnswer || ''}
                            onChange={(val) => setFormData(prev => prev.correctAnswer !== val ? { ...prev, correctAnswer: val } : prev)}
                            height={isInline ? "min-h-[80px]" : "min-h-[120px]"} compact={isInline} className="border border-slate-200 rounded-lg overflow-hidden" />
                    </div>
                )}

                {(questionType !== 'CQ' || editMode === 'legacy') && (
                    isInline ? (
                        <details className="group border border-slate-200 rounded-xl overflow-hidden bg-slate-55/40" open={!!formData.explanation}>
                            <summary className="w-full px-3 py-2 bg-slate-100/80 flex items-center justify-between text-slate-700 hover:bg-slate-200/50 transition-all text-[11px] font-black cursor-pointer select-none">
                                <span>📝 Explanation (ব্যাখ্যা) - Optional</span>
                                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="p-3 bg-white border-t border-slate-200">
                                <RichTextEditor value={formData.explanation || ''}
                                    onChange={(val) => setFormData(prev => prev.explanation !== val ? { ...prev, explanation: val } : prev)}
                                    height="min-h-[80px]" compact={isInline} className="border border-slate-200 rounded-lg overflow-hidden" />
                            </div>
                        </details>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-650 mb-1.5">Explanation (ব্যাখ্যা) - Optional</label>
                            <RichTextEditor value={formData.explanation || ''}
                                onChange={(val) => setFormData(prev => prev.explanation !== val ? { ...prev, explanation: val } : prev)}
                                height="min-h-[120px]" className="border border-slate-200 rounded-lg overflow-hidden" />
                        </div>
                    )
                )}
            </div>

            {!isInline && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-10 pt-6 border-t border-slate-100">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Marks</label>
                        <input type="number" value={formData.marks} onChange={(e) => setFormData({ ...formData, marks: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-400 outline-none" min="1" step="0.5" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bloom Level</label>
                        <select value={formData.bloomLevel} onChange={(e) => setFormData({ ...formData, bloomLevel: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-indigo-400 outline-none">
                            <option value="KNOWLEDGE">Knowledge</option>
                            <option value="COMPREHENSION">Comprehension</option>
                            <option value="APPLICATION">Application</option>
                            <option value="HIGHER_ORDER">Higher Order</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Difficulty</label>
                        <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-indigo-400 outline-none">
                            <option value="EASY">Easy</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HARD">Hard</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Language</label>
                        <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-indigo-400 outline-none">
                            <option value="Bangla">Bangla</option>
                            <option value="English">English</option>
                            <option value="Bilingual">Bilingual</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
});

export default QuestionContentEditor;
