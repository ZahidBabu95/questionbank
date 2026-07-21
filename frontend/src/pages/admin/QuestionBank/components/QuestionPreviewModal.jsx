import React from 'react';
import { X, CheckCircle } from 'lucide-react';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';
import CQCombinedRenderer from './CQCombinedRenderer';

export default function QuestionPreviewModal({
    selectedQuestion,
    onClose,
    getStatusBadge
}) {
    if (!selectedQuestion) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Question Preview</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
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
                        {getStatusBadge && getStatusBadge(selectedQuestion.status)}
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

                        {!selectedQuestion.classSubject && selectedQuestion.sourceReference && !selectedQuestion.sourceReference.toUpperCase().includes('CHUNK_') && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Source / Context</h3>
                                <div className="p-4 bg-violet-50/80 rounded-xl border border-violet-100 flex items-center gap-3">
                                    <p className="text-slate-800 font-semibold flex-1">{selectedQuestion.sourceReference}</p>
                                    {selectedQuestion.aiGenerated && <span className="text-[10px] bg-violet-100 text-violet-600 border border-violet-200 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">AI Imported</span>}
                                </div>
                            </div>
                        )}

                        {(() => {
                            if (!selectedQuestion.stimulus) return null;
                            const cleanStimulus = selectedQuestion.stimulus.replace(/<[^>]*>/g, '').trim().toLowerCase();
                            const isPlaceholder = 
                                cleanStimulus === '' || 
                                cleanStimulus === 'generated question' || 
                                cleanStimulus === 'dynamic question' || 
                                cleanStimulus === 'ডায়নামিক প্রশ্ন' ||
                                cleanStimulus === 'ডায়নামিক প্রশ্ন';
                            if (isPlaceholder) return null;
                            return (
                                <div>
                                    <h3 className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-2">Stimulus (উদ্দীপক)</h3>
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-slate-800 font-medium leading-relaxed">
                                        <MarkdownRenderer content={selectedQuestion.stimulus} />
                                    </div>
                                </div>
                            );
                        })()}

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
    );
}
