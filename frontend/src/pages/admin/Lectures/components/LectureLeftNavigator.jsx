import React from 'react';
import { FileText, Layers, ChevronUp, ChevronDown, List } from 'lucide-react';

const LectureLeftNavigator = ({
    lecture,
    leftPanelOpen,
    activeSectionId,
    setActiveSectionId,
    moveSection,
    isBengaliFont,
    toBengaliNumeral
}) => {
    return (
        <aside className={`${leftPanelOpen ? 'w-64' : 'w-0'} bg-white shadow-xl flex flex-col transition-all duration-300 shrink-0 z-20 relative overflow-hidden font-outfit`}>
            <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers size={14} className="text-slate-400" />
                    Lecture Outline
                </span>
                <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full">
                    {lecture?.sections?.length || 0}
                </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1.5 bg-slate-50/50">
                {!lecture?.sections || lecture.sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 mx-2 mt-4">
                        <FileText size={40} className="text-slate-300 mb-3" />
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Empty Lecture</p>
                    </div>
                ) : (
                    lecture.sections.map((sec, idx) => {
                        const isActive = activeSectionId === sec.id;
                        return (
                            <div
                                key={sec.id}
                                onClick={() => setActiveSectionId(sec.id)}
                                className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer group flex items-start gap-2.5 relative border ${
                                    isActive
                                        ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                                        : 'bg-white border-slate-100 hover:bg-slate-100 hover:border-slate-200'
                                }`}
                            >
                                <span className={`text-[11px] font-black mt-0.5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {isBengaliFont ? toBengaliNumeral(idx + 1) : (idx + 1)}.
                                </span>
                                
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[13px] leading-tight truncate pr-6 ${isActive ? 'text-slate-900 font-black' : 'text-slate-700 font-bold'}`}>
                                        {sec.sectionTitle || 'Untitled Section'}
                                    </p>
                                    <span className={`text-[10px] font-bold block mt-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {sec.questions?.length || 0} Questions
                                    </span>
                                </div>

                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} 
                                        className="p-0.5 hover:text-indigo-600 disabled:opacity-30" 
                                        disabled={idx === 0}
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} 
                                        className="p-0.5 hover:text-indigo-600 disabled:opacity-30" 
                                        disabled={idx === lecture.sections.length - 1}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </aside>
    );
};

export default LectureLeftNavigator;
