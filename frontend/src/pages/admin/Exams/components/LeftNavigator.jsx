import React from 'react';
import { FileText } from 'lucide-react';

const LeftNavigator = ({
    id,
    exam,
    leftPanelOpen,
    selectedQuestionId,
    setSelectedQuestionId,
    isBengaliFont,
    toBengaliNumeral,
    moveQuestion,
    navigate
}) => {
    return (
        <aside className={`${leftPanelOpen ? 'w-64' : 'w-0'} bg-white shadow-xl flex flex-col transition-all duration-300 shrink-0 z-20 relative overflow-hidden`}>
            <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">Navigator</span>
                <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full">{exam?.questions?.length || 0}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1 bg-slate-50/50">
                {(!id || !exam) ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 mx-2 mt-4">
                        <FileText size={40} className="text-slate-300 mb-3" />
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">No Paper Selected</p>
                        <button
                            onClick={() => navigate('/exams/generate/saved')}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md"
                        >
                            Select from Library
                        </button>
                    </div>
                ) : exam.questions?.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium italic">
                        Your paper is empty. Use the 'Insert' tab to add questions.
                    </div>
                ) : (
                    exam.questions.map((q, idx) => (
                        <div
                            key={q.id}
                            onClick={() => setSelectedQuestionId(q.id)}
                            className={`w-full text-left p-2.5 rounded-md transition-all cursor-pointer group flex items-start gap-2 relative ${selectedQuestionId === q.id
                                ? 'bg-blue-50 border border-blue-200 shadow-sm'
                                : 'border border-transparent hover:bg-slate-100 hover:border-slate-200'
                                }`}
                        >
                            <span className={`text-[11px] font-black mt-0.5 shrink-0 ${selectedQuestionId === q.id ? 'text-blue-700' : 'text-slate-400'}`}>{isBengaliFont ? toBengaliNumeral(idx + 1) : (idx + 1)}.</span>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[13px] leading-tight truncate pr-4 ${selectedQuestionId === q.id ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
                                    {q.questionText.replace(/<[^>]*>?/gm, '') || 'Empty Question'}
                                </p>
                                <span className={`text-[10px] font-semibold block mt-1 ${selectedQuestionId === q.id ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {q.type} • {q.marks} Marks
                                </span>
                            </div>
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); moveQuestion(idx, 'up'); }} className="p-1 hover:text-indigo-600 disabled:opacity-0" disabled={idx === 0}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); moveQuestion(idx, 'down'); }} className="p-1 hover:text-indigo-600 disabled:opacity-0" disabled={idx === exam.questions.length - 1}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>
    );
};

export default LeftNavigator;
