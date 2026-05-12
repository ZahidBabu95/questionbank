import React from 'react';
import { CheckCircle, XCircle, Clock, Edit, FileText } from 'lucide-react';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';
import CQCombinedRenderer from './CQCombinedRenderer';

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

export default QuestionPreviewContent;
