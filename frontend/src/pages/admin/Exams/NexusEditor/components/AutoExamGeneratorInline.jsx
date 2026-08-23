import React, { useState, useEffect } from 'react';
import { 
    Sparkles, Layers, BookOpen, CheckSquare, Square, 
    Loader2, CheckCircle2, RefreshCw, SlidersHorizontal, ChevronDown, ChevronUp, PlusCircle
} from 'lucide-react';
import { useNexusEditor } from '../context/NexusEditorContext';
import academicService from '../../../../../services/academicService';
import questionService from '../../../../../services/questionService';

const AutoExamGeneratorInline = () => {
    const { 
        uiLang, t, examData, docSettings, 
        editor, setRawContent, addToast, setLeftPanelTab, documentQuestions
    } = useNexusEditor();

    const [chapters, setChapters] = useState([]);
    const [selectedChapterIds, setSelectedChapterIds] = useState([]);
    const [loadingChapters, setLoadingChapters] = useState(false);
    
    // Question Counts
    const [mcqCount, setMcqCount] = useState(25);
    const [cqCount, setCqCount] = useState(0);
    const [difficulty, setDifficulty] = useState('BALANCED'); // 'BALANCED', 'EASY', 'HARD'
    const [sourceMode, setSourceMode] = useState('ALL'); // 'ALL', 'BOARD', 'SCHOOL', 'NEW'
    const [insertMode, setInsertMode] = useState('APPEND'); // 'APPEND' | 'REPLACE'

    const [isGenerating, setIsGenerating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const subjectId = examData?.classSubjectId || examData?.subjectId || docSettings?.subjectId || '';
    const subjectName = examData?.subjectName || docSettings?.subject || 'বিষয়';
    const className = examData?.className || docSettings?.className || 'শ্রেণি';

    // Fetch chapters for the current exam subject
    useEffect(() => {
        if (subjectId) {
            setLoadingChapters(true);
            academicService.getChaptersByClassSubject(subjectId)
                .then(data => {
                    const chList = Array.isArray(data) ? data : (data?.content || []);
                    setChapters(chList);
                    // Select all chapters by default
                    setSelectedChapterIds(chList.map(c => c.id));
                })
                .catch(err => {
                    console.error("Failed to load chapters for auto-gen", err);
                    setChapters([]);
                })
                .finally(() => setLoadingChapters(false));
        }
    }, [subjectId]);

    const handleToggleChapter = (cId) => {
        setSelectedChapterIds(prev => 
            prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]
        );
    };

    const handleSelectAllChapters = () => {
        if (selectedChapterIds.length === chapters.length) {
            setSelectedChapterIds([]);
        } else {
            setSelectedChapterIds(chapters.map(c => c.id));
        }
    };

    const handleRunAutoGenerate = async () => {
        const totalTarget = (parseInt(mcqCount) || 0) + (parseInt(cqCount) || 0);
        if (totalTarget <= 0) {
            addToast(uiLang === 'bn' ? 'অনুগ্রহ করে প্রশ্নের সংখ্যা নির্ধারণ করুন।' : 'Please specify question counts.', 'warning');
            return;
        }

        if (chapters.length > 0 && selectedChapterIds.length === 0) {
            addToast(uiLang === 'bn' ? 'কমপক্ষে একটি অধ্যায় নির্বাচন করুন।' : 'Please select at least one chapter.', 'warning');
            return;
        }

        if (!editor) {
            addToast(uiLang === 'bn' ? 'এডিটর প্রস্তুত নয়।' : 'Editor is not ready.', 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const existingIds = new Set((documentQuestions || []).map(q => q.attrs?.questionId).filter(Boolean));
            const fetchedQuestions = [];

            // 1. Fetch MCQs if requested
            if (parseInt(mcqCount) > 0) {
                const targetMCQ = parseInt(mcqCount);
                const mcqRes = await questionService.getAllQuestionsPaginated({
                    page: 0,
                    size: 150,
                    subjectId: subjectId,
                    chapterId: selectedChapterIds.length === 1 ? selectedChapterIds[0] : '',
                    filterType: 'MCQ',
                    filterStatus: 'APPROVED',
                    language: docSettings?.language || 'Bangla'
                });

                let availableMCQs = (mcqRes?.content || []).filter(q => {
                    if (existingIds.has(q.id)) return false;
                    if (selectedChapterIds.length > 0 && q.chapterId && !selectedChapterIds.includes(q.chapterId)) {
                        return false;
                    }
                    return true;
                });

                // Shuffle
                availableMCQs = availableMCQs.sort(() => 0.5 - Math.random());
                const pickedMCQs = availableMCQs.slice(0, targetMCQ);
                fetchedQuestions.push(...pickedMCQs);
            }

            // 2. Fetch CQs if requested
            if (parseInt(cqCount) > 0) {
                const targetCQ = parseInt(cqCount);
                const cqRes = await questionService.getAllQuestionsPaginated({
                    page: 0,
                    size: 80,
                    subjectId: subjectId,
                    chapterId: selectedChapterIds.length === 1 ? selectedChapterIds[0] : '',
                    filterType: 'CQ',
                    filterStatus: 'APPROVED',
                    language: docSettings?.language || 'Bangla'
                });

                let availableCQs = (cqRes?.content || []).filter(q => {
                    if (existingIds.has(q.id)) return false;
                    if (selectedChapterIds.length > 0 && q.chapterId && !selectedChapterIds.includes(q.chapterId)) {
                        return false;
                    }
                    return true;
                });

                // Shuffle
                availableCQs = availableCQs.sort(() => 0.5 - Math.random());
                const pickedCQs = availableCQs.slice(0, targetCQ);
                fetchedQuestions.push(...pickedCQs);
            }

            if (fetchedQuestions.length === 0) {
                addToast(uiLang === 'bn' ? 'এমন কোনো প্রশ্ন খুঁজে পাওয়া যায়নি (ডাটাবেজে পর্যাপ্ত অব্যবহৃত প্রশ্ন নেই)।' : 'No eligible unused questions found in bank.', 'warning');
                setIsGenerating(false);
                return;
            }

            // Insert into editor
            const { schema } = editor.state;
            let tr = editor.state.tr;

            if (insertMode === 'REPLACE') {
                // Clear existing document content
                tr = tr.delete(0, editor.state.doc.content.size);
            }

            const targetMCQSec = docSettings.sections?.find(s => s.isMCQ === true) || docSettings.sections?.[0] || {};
            const targetCQSec = docSettings.sections?.find(s => s.isMCQ === false) || docSettings.sections?.[1] || docSettings.sections?.[0] || {};

            fetchedQuestions.forEach(q => {
                const isMCQ = q.type === 'MCQ';
                const targetSec = isMCQ ? targetMCQSec : targetCQSec;
                const node = schema.nodes.questionBlock.create({
                    questionId: q.id,
                    sectionId: targetSec.id || null,
                    subjectId: q.subjectId || subjectId,
                    chapterId: q.chapterId,
                    type: q.type || 'MCQ',
                    questionText: q.questionText,
                    stimulus: q.stimulus || '',
                    explanation: q.explanation || '',
                    answer: q.correctAnswer || '',
                    syncedFromDb: true,
                    language: q.language || 'Bangla',
                    statements: q.statements || [],
                    chapterName: q.chapterName || q.subjectName || 'General',
                    marks: q.marks || (isMCQ ? 1 : 10),
                    numberingStyle: targetSec.numberingStyle || 'bn',
                    marksConfig: targetSec.marksConfig || 'hide',
                    optionLayout: targetSec.optionLayout || 'col1',
                    optionStyle: targetSec.optionStyle || 'bn',
                    optionDecoration: targetSec.optionDecoration || 'rightBracket',
                    dynamicData: q.dynamicData || null,
                    options: q.options ? q.options.map(opt => ({ ...opt, optionText: opt.optionText })) : []
                });
                tr = tr.insert(tr.doc.content.size, node);
            });

            editor.view.dispatch(tr);
            setRawContent(editor.getHTML());
            window.dispatchEvent(new CustomEvent('nexus-editor-rerender'));

            addToast(
                uiLang === 'bn' 
                    ? `সফলভাবে ${fetchedQuestions.length}টি প্রশ্ন জেনারেট ও যুক্ত করা হয়েছে!` 
                    : `Successfully auto-generated and added ${fetchedQuestions.length} questions!`, 
                'success'
            );

            // Switch to Document tab to view the added questions
            setLeftPanelTab('document');
        } catch (err) {
            console.error("Auto generation error:", err);
            addToast(uiLang === 'bn' ? 'প্রশ্ন জেনারেশনে সমস্যা হয়েছে।' : 'Failed to generate questions.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-3 pb-8">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-200/80 p-2.5 rounded-xl shadow-2xs">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                        <Sparkles size={14} className="animate-pulse" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-xs font-black text-slate-800">
                            {uiLang === 'bn' ? 'ইনস্ট্যান্ট AI প্রশ্ন জেনারেটর' : 'Instant AI Question Generator'}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold truncate">
                            {className} {subjectName && `• ${subjectName}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Question Counts Section */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                            {uiLang === 'bn' ? 'বহুনির্বাচনী (MCQ) প্রশ্ন' : 'MCQ Questions'}
                        </span>
                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {mcqCount} টি
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {[0, 10, 20, 25, 30].map(cnt => (
                            <button
                                key={cnt}
                                type="button"
                                onClick={() => setMcqCount(cnt)}
                                className={`flex-1 py-1 rounded-md text-[10.5px] font-bold transition-all ${
                                    mcqCount === cnt 
                                        ? 'bg-indigo-600 text-white shadow-2xs' 
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                                }`}
                            >
                                {cnt === 0 ? '০' : cnt}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                            {uiLang === 'bn' ? 'সৃজনশীল (CQ) প্রশ্ন' : 'Creative (CQ) Questions'}
                        </span>
                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {cqCount} টি
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {[0, 3, 5, 7, 11].map(cnt => (
                            <button
                                key={cnt}
                                type="button"
                                onClick={() => setCqCount(cnt)}
                                className={`flex-1 py-1 rounded-md text-[10.5px] font-bold transition-all ${
                                    cqCount === cnt 
                                        ? 'bg-emerald-600 text-white shadow-2xs' 
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                                }`}
                            >
                                {cnt === 0 ? '০' : cnt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chapter Selection Checklist */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                        <BookOpen size={13} className="text-slate-500" />
                        <span className="text-xs font-black text-slate-800">
                            {uiLang === 'bn' ? 'অধ্যায়সমূহ' : 'Chapters'}
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-400">
                            ({selectedChapterIds.length}/{chapters.length})
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleSelectAllChapters}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                    >
                        {selectedChapterIds.length === chapters.length 
                            ? (uiLang === 'bn' ? 'সব বাদ' : 'Deselect') 
                            : (uiLang === 'bn' ? 'সব সিলেক্ট' : 'Select All')}
                    </button>
                </div>

                {loadingChapters ? (
                    <div className="flex justify-center p-3">
                        <Loader2 className="animate-spin text-slate-400" size={16} />
                    </div>
                ) : chapters.length > 0 ? (
                    <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {chapters.map(ch => {
                            const isSelected = selectedChapterIds.includes(ch.id);
                            return (
                                <div
                                    key={ch.id}
                                    onClick={() => handleToggleChapter(ch.id)}
                                    className={`flex items-center gap-2 p-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all ${
                                        isSelected 
                                            ? 'bg-indigo-50/80 text-indigo-900 font-semibold' 
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {isSelected ? (
                                        <CheckSquare size={14} className="text-indigo-600 shrink-0" />
                                    ) : (
                                        <Square size={14} className="text-slate-300 shrink-0" />
                                    )}
                                    <span className="truncate">{ch.name}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-[10.5px] text-slate-400 py-2 text-center">
                        {uiLang === 'bn' ? 'কোনো অধ্যায় পাওয়া যায়নি' : 'No chapters available'}
                    </div>
                )}
            </div>

            {/* Advanced Filters Accordion */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(prev => !prev)}
                    className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    <span className="flex items-center gap-1.5">
                        <SlidersHorizontal size={13} className="text-slate-500" />
                        {uiLang === 'bn' ? 'অগ্রিম সেটিংস (Difficulty & Mode)' : 'Advanced Settings'}
                    </span>
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showAdvanced && (
                    <div className="p-3 pt-0 space-y-2.5 border-t border-slate-100 mt-1">
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                {uiLang === 'bn' ? 'যোগ করার মোড' : 'Insertion Mode'}
                            </span>
                            <div className="grid grid-cols-2 gap-1.5 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setInsertMode('APPEND')}
                                    className={`py-1 px-2 rounded text-[10px] font-bold transition-all ${
                                        insertMode === 'APPEND' 
                                            ? 'bg-indigo-50 border border-indigo-300 text-indigo-700' 
                                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                                    }`}
                                >
                                    + যোগ করুন (Append)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInsertMode('REPLACE')}
                                    className={`py-1 px-2 rounded text-[10px] font-bold transition-all ${
                                        insertMode === 'REPLACE' 
                                            ? 'bg-rose-50 border border-rose-300 text-rose-700' 
                                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                                    }`}
                                >
                                    🔄 নতুন করে (Replace)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Trigger Button */}
            <button
                type="button"
                onClick={handleRunAutoGenerate}
                disabled={isGenerating || (mcqCount === 0 && cqCount === 0)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGenerating ? (
                    <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>{uiLang === 'bn' ? 'AI প্রশ্ন লোড হচ্ছে...' : 'Generating Questions...'}</span>
                    </>
                ) : (
                    <>
                        <Sparkles size={15} />
                        <span>{uiLang === 'bn' ? '⚡ স্বয়ংক্রিয় প্রশ্ন জেনারেট করুন' : '⚡ Auto Generate Questions'}</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default AutoExamGeneratorInline;
