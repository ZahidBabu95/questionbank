import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Minus, RotateCcw } from 'lucide-react';
import InlineGoldenEditor from './InlineGoldenEditor';
import { formatDuration } from '../../../../utils/formatUtils';

const marginPixels = {
    'narrow': '48px', // 0.5in
    'moderate': '72px', // 0.75in
    'normal': '96px', // 1.0in
    'wide': '144px'   // 1.5in
};

const marginValues = {
    'narrow': 48,
    'moderate': 72,
    'normal': 96,
    'wide': 144
};

const paperDimensions = {
    'A4': { portrait: { w: 794, h: 1123 }, landscape: { w: 1123, h: 794 } },
    'Legal': { portrait: { w: 816, h: 1344 }, landscape: { w: 1344, h: 816 } },
    'Letter': { portrait: { w: 816, h: 1056 }, landscape: { w: 1056, h: 816 } },
    'A3': { portrait: { w: 1123, h: 1587 }, landscape: { w: 1587, h: 1123 } }
};

const PaperCanvas = ({
    id,
    exam,
    setExam,
    config,
    zoom,
    setZoom,
    selection,
    setSelection,
    setRightPanelOpen,
    isBengaliFont,
    toBengaliNumeral,
    selectedQuestionId,
    updateQuestion,
    updateOption,
    removeOption,
    addOption,
    getOptionLabel,
    navigate,
    rightPanelOpen
}) => {
    const [pageGroups, setPageGroups] = useState([]);

    // Initialize/sync pageGroups with questions
    useEffect(() => {
        if (exam && exam.questions) {
            setPageGroups([exam.questions]); // default to single page first
        } else {
            setPageGroups([]);
        }
    }, [exam?.questions]);

    const measureAndPaginate = () => {
        if (!exam || !exam.questions || exam.questions.length === 0) return;

        const topMargin = marginValues[config.margins] || 96;
        const bottomMargin = marginValues[config.margins] || 96;
        const pageHeight = paperDimensions[config.paperSize][config.orientation].h;
        const printableHeight = pageHeight - topMargin - bottomMargin;
        const columnsCount = config.columns || 1;
        const pageCapacity = columnsCount * printableHeight;

        // Measure header
        const headerEl = document.getElementById('exam-header');
        const headerHeight = headerEl ? headerEl.offsetHeight : 180;

        // Measure footer
        const footerEl = document.getElementById('exam-footer');
        const footerHeight = footerEl ? footerEl.offsetHeight : 45;

        // Measure each question element height
        const questionHeights = {};
        exam.questions.forEach(q => {
            const el = document.getElementById(`question-${q.id}`);
            questionHeights[q.id] = el ? el.offsetHeight : 80;
        });

        const newGroups = [];
        let currentGroup = [];
        let accumulatedHeight = headerHeight + 15; // include safety gap

        exam.questions.forEach(q => {
            const qHeight = questionHeights[q.id] || 80;
            const limit = newGroups.length === 0 
                ? pageCapacity - headerHeight 
                : pageCapacity;

            // Check if we need to break to the next page
            if (accumulatedHeight + qHeight > pageCapacity) {
                if (currentGroup.length > 0) {
                    newGroups.push(currentGroup);
                    currentGroup = [q];
                    accumulatedHeight = qHeight;
                } else {
                    currentGroup.push(q);
                    newGroups.push(currentGroup);
                    currentGroup = [];
                    accumulatedHeight = 0;
                }
            } else {
                currentGroup.push(q);
                accumulatedHeight += qHeight;
            }
        });

        if (currentGroup.length > 0) {
            newGroups.push(currentGroup);
        }

        // Compare new groups serialization to update state
        const currentIds = pageGroups.map(g => g.map(q => q.id).join(',')).join('|');
        const newIds = newGroups.map(g => g.map(q => q.id).join(',')).join('|');

        if (currentIds !== newIds) {
            setPageGroups(newGroups);
        }
    };

    useEffect(() => {
        const runPagination = () => {
            measureAndPaginate();
        };

        const timer = setTimeout(runPagination, 80);

        window.addEventListener('resize', runPagination);

        // Listen for image loads inside the questions area to re-paginate
        const container = document.querySelector('.exam-pages-container');
        if (container) {
            container.addEventListener('load', runPagination, true);
        }

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', runPagination);
            if (container) {
                container.removeEventListener('load', runPagination, true);
            }
        };
    }, [exam?.questions, config, zoom]);

    const getPageStyle = () => {
        const { w, h } = paperDimensions[config.paperSize][config.orientation];
        return {
            width: `${w}px`,
            minHeight: `${h}px`,
            padding: marginPixels[config.margins],
            backgroundColor: config.paperColor || '#ffffff',
            boxShadow: config.showPageBorder
                ? '0 0 0 1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1), inset 0 0 0 2px #334155, inset 0 0 0 5px white, inset 0 0 0 6px #334155'
                : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0,0,0,0.06)',
            border: config.showPageBorder ? 'none' : '1px solid #cbd5e1',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
        };
    };

    const totalPages = pageGroups.length || 1;

    return (
        <main className="flex-1 overflow-auto relative custom-scrollbar scroll-smooth bg-slate-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]">
            <div className="exam-pages-container flex flex-col items-center py-12 min-h-full">
                
                {(!id || !exam) ? (
                    <div 
                        className="bg-white rounded-[1px] p-20 flex flex-col items-center justify-center shadow-lg"
                        style={{ width: `${paperDimensions[config.paperSize][config.orientation].w}px` }}
                    >
                        <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mb-6">
                            <Plus size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Perfect Paper Editor</h3>
                        <p className="text-slate-400 mt-2 max-w-xs text-center text-sm">Select an existing paper to start editing or generate a new one using the Auto Generator.</p>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => navigate('/exams/generate/auto')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:scale-105 transition-all">Generate New</button>
                            <button onClick={() => navigate('/exams/generate/saved')} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">Saved Library</button>
                        </div>
                    </div>
                ) : (
                    pageGroups.map((pageQuestions, pageIdx) => {
                        const isFirstPage = pageIdx === 0;
                        const isLastPage = pageIdx === pageGroups.length - 1;
                        const marginScaledOffset = 20 * (zoom / 100);

                        return (
                            <React.Fragment key={pageIdx}>
                                {/* Page sheet card wrapper */}
                                <div
                                    className={`rounded-[1px] relative group/paper ${config.fontFamily} transition-all`}
                                    data-lang={isBengaliFont ? 'bn' : 'en'}
                                    style={{
                                        ...getPageStyle(),
                                        marginBottom: `${marginScaledOffset}px`,
                                        zIndex: 10
                                    }}
                                >
                                    {/* Watermark overlay */}
                                    {config.watermark && (
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none" style={{ opacity: config.watermarkOpacity / 100 }}>
                                            <h1 className="text-8xl font-black text-slate-800 -rotate-45 whitespace-nowrap uppercase tracking-widest">{config.watermarkText}</h1>
                                        </div>
                                    )}

                                    <div className="relative z-10 flex flex-col h-full justify-between">
                                        <div>
                                            {/* Exam Header */}
                                            {isFirstPage && (
                                                <div 
                                                    id="exam-header"
                                                    onClick={(e) => { e.stopPropagation(); setSelection({ type: 'header', id: null }); setRightPanelOpen(true); }}
                                                    className={`border-b-[1.5px] border-slate-800 pb-4 mb-6 relative z-10 transition-all rounded-lg p-3 -mx-2 group/header ${selection.type === 'header' ? 'bg-indigo-50/50 ring-1 ring-indigo-200 shadow-sm' : 'hover:bg-slate-50/50'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-2 text-[0.85em] font-bold text-slate-800" style={{ fontSize: `${config.metaFontSize}pt` }}>
                                                        <div className="flex flex-col gap-1 items-start">
                                                            <span contentEditable suppressContentEditableWarning onBlur={(e) => setExam({ ...exam, setName: e.target.innerText })} className="outline-none min-w-[80px]">
                                                                {exam?.setName ? `সেট: ${exam.setName}` : "সেট: ________"}
                                                            </span>
                                                            <span className="font-bold">
                                                                {isBengaliFont ? `সময়: ${formatDuration(exam?.durationMinutes, 'BENGALI')}` : `Time: ${formatDuration(exam?.durationMinutes, 'ENGLISH')}`}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1 items-end">
                                                            <span contentEditable suppressContentEditableWarning onBlur={(e) => setExam({ ...exam, chapterName: e.target.innerText })} className="outline-none min-w-[80px] text-right">
                                                                {exam?.chapterName ? `অধ্যায়: ${exam.chapterName}` : "অধ্যায়: ________"}
                                                            </span>
                                                            <span className="font-bold">পূর্ণমান: {exam?.totalMarks}</span>
                                                        </div>
                                                    </div>

                                                    <div className="text-center mb-4">
                                                        {config.showInstituteName && (
                                                            <h1 contentEditable suppressContentEditableWarning onBlur={(e) => setExam({ ...exam, instituteName: e.target.innerText })} className="font-black uppercase tracking-wider text-slate-900 mb-1 outline-none text-center cursor-text" style={{ fontSize: `${config.instituteFontSize}pt` }}>
                                                                {exam?.instituteName || "INSTITUTION NAME"}
                                                            </h1>
                                                        )}
                                                        {config.showTitle && (
                                                            <h2 contentEditable suppressContentEditableWarning onBlur={(e) => setExam({ ...exam, title: e.target.innerText })} className="text-slate-800 font-bold uppercase tracking-wider outline-none text-center cursor-text" style={{ fontSize: `${config.titleFontSize}pt` }}>
                                                                {exam?.title || "EXAMINATION TITLE"}
                                                            </h2>
                                                        )}
                                                        <div className="flex justify-center gap-3 text-slate-800 font-bold mt-1" style={{ fontSize: `${config.metaFontSize}pt` }}>
                                                            <span contentEditable suppressContentEditableWarning onBlur={(e) => setExam({ ...exam, subjectName: e.target.innerText })} className="outline-none">
                                                                বিষয়: {exam?.subjectName || "__________"}
                                                            </span>
                                                            <span>|</span>
                                                            <span contentEditable suppressContentEditableWarning onBlur={(e) => setExam({ ...exam, className: e.target.innerText })} className="outline-none">
                                                                শ্রেণী: {exam?.className || "__________"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {config.showStudentInfo && (
                                                        <div className="flex justify-between items-center gap-4 font-bold text-slate-800 mb-4 pt-2 border-t border-slate-200" style={{ fontSize: `${config.metaFontSize}pt` }}>
                                                            <div className="flex-1 flex items-baseline gap-2">
                                                                <span>শিক্ষার্থীর নাম:</span>
                                                                <div className="flex-1 border-b border-dotted border-slate-600 h-4"></div>
                                                            </div>
                                                            <div className="w-48 flex items-baseline gap-2 shrink-0">
                                                                <span>রোল নং:</span>
                                                                <div className="flex-1 border-b border-dotted border-slate-600 h-4"></div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {config.showInstructions && (
                                                        <div contentEditable suppressContentEditableWarning onBlur={(e) => setExam({ ...exam, instructions: e.target.innerText })} className="font-bold text-slate-900 text-center italic bg-slate-50/50 p-1.5 rounded outline-none" style={{ fontSize: `${config.instructionFontSize}pt` }}>
                                                            {exam?.instructions || "[বি:দ্র: প্রতিটি প্রশ্নের মান সমান]"}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Column Questions container */}
                                            <div
                                                className={`relative z-10 ${config.columnLayout === 'horizontal'
                                                    ? `grid ${config.columns === 1 ? 'grid-cols-1' : config.columns === 2 ? 'grid-cols-2 gap-x-12' : 'grid-cols-3 gap-x-8'}`
                                                    : `${config.columns === 1 ? 'columns-1' : config.columns === 2 ? 'columns-2 gap-12' : 'columns-3 gap-8'}`
                                                    }`}
                                                style={{
                                                    columnRule: (config.columns > 1 && config.showColumnDivider && config.columnLayout === 'vertical') ? '1px solid #cbd5e1' : 'none'
                                                }}
                                            >
                                                {pageQuestions.map((q, qIdx) => (
                                                    <div
                                                        key={q.id}
                                                        id={`question-${q.id}`}
                                                        onClick={(e) => { e.stopPropagation(); setSelection({ type: 'question', id: q.id }); setRightPanelOpen(true); }}
                                                        className={`relative transition-all duration-200 rounded-md -mx-2 p-2 ${config.columnLayout === 'vertical' ? 'break-inside-avoid' : ''} ${selection.type === 'question' && selection.id === q.id
                                                            ? 'bg-blue-50/40 outline outline-1 outline-blue-300 shadow-sm'
                                                            : 'hover:bg-slate-50/80 cursor-pointer'
                                                            }`}
                                                        style={{ marginBottom: `${config.questionGap}em` }}
                                                    >
                                                        <div className="flex gap-2.5 items-start">
                                                            {config.showQuestionNumbers && (
                                                                <span className="font-bold text-slate-900 text-[1em] leading-[1.6] shrink-0">
                                                                    {isBengaliFont ? toBengaliNumeral(q.order || (exam.questions.findIndex(x => x.id === q.id) + 1)) : (q.order || (exam.questions.findIndex(x => x.id === q.id) + 1))}.
                                                                </span>
                                                            )}
                                                            <div className="flex-1 min-w-0 text-[1em]">
                                                                <InlineGoldenEditor
                                                                    value={q.questionText}
                                                                    onChange={(val) => updateQuestion(q.id, 'questionText', val)}
                                                                    className="outline-none text-slate-900 leading-[1.6] mb-3 min-h-[1.5em] cursor-text tiptap-question"
                                                                    placeholder={isBengaliFont ? 'নতুন প্রশ্ন...' : 'Type your question here...'}
                                                                />
                                                                {q.type === 'MCQ' && (
                                                                    <div className="space-y-1.5">
                                                                        <div className={`grid gap-x-3 gap-y-1.5 ${config.optionCols === 1 ? 'grid-cols-1' : config.optionCols === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                                                                            {q.options?.map((opt, oIdx) => (
                                                                                <div key={oIdx} className="flex gap-1.5 items-start group/opt">
                                                                                    <span className={`text-[0.9em] font-medium pt-[2px] shrink-0 ${(config.includeAnswers && opt.isCorrect) ? 'text-emerald-600 font-bold' : 'text-slate-700'}`}>
                                                                                        {getOptionLabel(oIdx)})
                                                                                    </span>
                                                                                    <InlineGoldenEditor
                                                                                        value={opt.optionText || ''}
                                                                                        onChange={(val) => updateOption(q.id, oIdx, val)}
                                                                                        className={`bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-0.5 text-[0.95em] outline-none w-full min-h-[1.5em] tiptap-option ${(config.includeAnswers && opt.isCorrect) ? 'text-emerald-700 font-bold bg-emerald-50/30' : 'text-slate-900 border-b-slate-100 border-dotted cursor-text'}`}
                                                                                        placeholder="Option"
                                                                                    />
                                                                                    {selectedQuestionId === q.id && q.options.length > 2 && (
                                                                                        <button
                                                                                            onClick={() => removeOption(q.id, oIdx)}
                                                                                            className="opacity-0 group-hover/opt:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
                                                                                        >
                                                                                            <Trash2 size={12} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        {selectedQuestionId === q.id && (
                                                                            <button
                                                                                onClick={() => addOption(q.id)}
                                                                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors mt-1"
                                                                            >
                                                                                <Plus size={12} /> Add Choice
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {config.showMarks && (
                                                                <div className="shrink-0 flex items-start pl-1 text-[0.85em] font-bold text-slate-500 pt-[2px]">
                                                                    [{isBengaliFont ? toBengaliNumeral(q.marks) : q.marks}]
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Exam Footer */}
                                        {isLastPage && (
                                            <div id="exam-footer" className="mt-8 pt-4 border-t-[1.5px] border-slate-800 text-center relative group/footer break-inside-avoid">
                                                {config.showPageNumbers && (
                                                    <div className="absolute top-4 right-0 text-[0.8em] font-medium text-slate-500">Page {pageIdx + 1} / {totalPages}</div>
                                                )}
                                                <div
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => setExam({ ...exam, footerText: e.target.innerHTML })}
                                                    className="outline-none min-h-[1.5em] text-[0.85em] text-slate-600 cursor-text z-10 relative"
                                                    dangerouslySetInnerHTML={{ __html: exam?.footerText || '' }}
                                                />
                                                {(!exam?.footerText) && <div className="absolute inset-x-0 top-4 pointer-events-none flex items-center justify-center text-slate-300 italic text-[0.85em]">কার্সার வைத்து ফুটার টেক্সট লিখুন...</div>}
                                            </div>
                                        )}

                                        {!isLastPage && config.showPageNumbers && (
                                            <div className="absolute bottom-4 right-8 text-[0.8em] font-medium text-slate-400">Page {pageIdx + 1} / {totalPages}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Page separator visual break line */}
                                {!isLastPage && (
                                    <div className="w-full flex items-center justify-center my-6 select-none" style={{ transform: `scale(${zoom/100})` }}>
                                        <div className="h-px bg-slate-300 flex-1"></div>
                                        <span className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 z-10">Page Break</span>
                                        <div className="h-px bg-slate-300 flex-1"></div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })
                )}
            </div>

            {/* Bottom floating zoom panel */}
            <div className={`fixed bottom-6 transition-all duration-300 z-[60] bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-4 ${rightPanelOpen ? 'right-72' : 'right-6'} mr-6 border-b-4 border-b-indigo-500`}>
                <div className="flex items-center gap-2 group">
                    <button onClick={() => setZoom(Math.max(25, zoom - 10))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <Minus size={16} />
                    </button>
                    <div className="relative flex items-center w-32 h-6">
                        <input type="range" min="25" max="200" value={zoom} onChange={e => setZoom(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    </div>
                    <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="w-[1px] h-6 bg-slate-200"></div>
                <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-slate-700 w-10 text-center select-none">{zoom}%</span>
                    <button onClick={() => setZoom(100)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600" title="Reset Zoom">
                        <RotateCcw size={12} />
                    </button>
                </div>
            </div>
        </main>
    );
};

export default PaperCanvas;
