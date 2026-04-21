import React, { memo } from 'react';
import { FileText } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';

const QuestionContentEditor = memo(({ formData, setFormData, questionType }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2 border-b pb-3 border-slate-100">
                <FileText size={18} className="text-amber-500" /> Content Editor
            </h2>

            <div className="space-y-8">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Stimulus / Stem (উদ্দীপক) <span className="text-slate-400 font-normal">- Optional</span></label>
                    <RichTextEditor value={formData.stimulus || ''}
                        onChange={(val) => setFormData(prev => prev.stimulus !== val ? { ...prev, stimulus: val } : prev)}
                        height="min-h-[120px]" className="border border-slate-200 rounded-lg overflow-hidden" />
                </div>

                {questionType !== 'CQ' && (
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Question Text *</label>
                        <RichTextEditor value={formData.questionText || ''}
                            onChange={(val) => setFormData(prev => prev.questionText !== val ? { ...prev, questionText: val } : prev)}
                            height="min-h-[160px]" className="border border-slate-200 rounded-lg overflow-hidden" />
                    </div>
                )}

                {formData.mcqType === 'MULTIPLE_COMPLETION' && (
                    <div className="bg-indigo-50/20 p-5 border border-indigo-100 rounded-xl">
                        <label className="block text-sm font-semibold text-indigo-700 mb-3">Statements (তথ্য/বিবৃতি)</label>
                        <div className="space-y-3">
                            {(formData.statements || []).map((stmt, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border border-indigo-200">{['i', 'ii', 'iii'][idx] || idx+1}</span>
                                    <input type="text" value={stmt.replace(/^(i{1,3}|iv|v|vi)\.\s*/i, '')}
                                        onChange={(e) => {
                                            const newStmts = [...formData.statements];
                                            const label = ['i', 'ii', 'iii'][idx] || idx+1;
                                            newStmts[idx] = `${label}. ${e.target.value}`;
                                            setFormData({ ...formData, statements: newStmts });
                                        }}
                                        className="flex-1 p-3 bg-white border border-slate-200 rounded-lg text-sm shadow-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                                    />
                                    <button type="button" onClick={() => {
                                        const newStmts = formData.statements.filter((_, i) => i !== idx);
                                        setFormData({ ...formData, statements: newStmts });
                                    }} className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition-colors bg-white border border-slate-200 shadow-sm">✕</button>
                                </div>
                            ))}
                            {(formData.statements || []).length < 4 && (
                                <button type="button" onClick={() => {
                                    const newStmts = [...(formData.statements || []), `${['i', 'ii', 'iii'][(formData.statements?.length || 0)] || (formData.statements?.length || 0)+1}. `];
                                    setFormData({ ...formData, statements: newStmts });
                                }} className="text-sm text-indigo-600 font-bold mt-3 hover:underline flex items-center gap-1">+ Add Statement</button>
                            )}
                        </div>
                    </div>
                )}

                {questionType !== 'MCQ' && questionType !== 'CQ' && (
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Correct Answer</label>
                        <RichTextEditor value={formData.correctAnswer || ''}
                            onChange={(val) => setFormData(prev => prev.correctAnswer !== val ? { ...prev, correctAnswer: val } : prev)}
                            height="min-h-[120px]" className="border border-slate-200 rounded-lg overflow-hidden" />
                    </div>
                )}

                {questionType !== 'CQ' && (
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Explanation (ব্যাখ্যা) <span className="text-slate-400 font-normal">- Optional</span></label>
                        <RichTextEditor value={formData.explanation || ''}
                            onChange={(val) => setFormData(prev => prev.explanation !== val ? { ...prev, explanation: val } : prev)}
                            height="min-h-[120px]" className="border border-slate-200 rounded-lg overflow-hidden" />
                    </div>
                )}
            </div>

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
                    </select>
                </div>
            </div>
        </div>
    );
});

export default QuestionContentEditor;
