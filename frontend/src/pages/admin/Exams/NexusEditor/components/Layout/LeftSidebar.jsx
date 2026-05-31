import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
    PanelLeftClose, Layers, Loader2, RefreshCw, Edit3, RotateCcw, Trash2, X
} from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { useAcademicFilters } from '../../hooks/useAcademicFilters';
import questionService from '../../../../../../services/questionService';
import QuestionEdit from '../../../../QuestionBank/QuestionEdit';

const isPlaceholderText = (text) => {
    if (!text) return true;
    const clean = text.toString().replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    return clean === '' || 
           clean.startsWith('generated question') || 
           clean.startsWith('dynamic question') || 
           clean.startsWith('ডায়নামিক প্রশ্ন') || 
           clean.startsWith('ডায়নামিক প্রশ্ন');
};

const getDisplayQuestionText = (q) => {
    if (!q) return '';
    let text = q.questionText || '';
    
    if (q.stimulus) {
        const cleanStim = q.stimulus.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
        const isStimPlaceholder = cleanStim === '' || 
                                  cleanStim.startsWith('generated question') || 
                                  cleanStim.startsWith('dynamic question') || 
                                  cleanStim.startsWith('ডায়নামিক প্রশ্ন') || 
                                  cleanStim.startsWith('ডায়নামিক প্রশ্ন');
        if (!isStimPlaceholder) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const stem = doc.querySelector('.cq-stem');
                if (stem) {
                    stem.remove();
                    text = doc.body.innerHTML;
                }
            } catch (e) {
                console.error("Failed to strip cq-stem in getDisplayQuestionText:", e);
            }
        }
    }

    const cleanText = text.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    const isPlaceholder = cleanText.startsWith('generated question') || 
                          cleanText.startsWith('dynamic question') || 
                          cleanText.startsWith('ডায়নামিক প্রশ্ন') || 
                          cleanText.startsWith('ডায়নামিক প্রশ্ন') || 
                          cleanText === '';
    if (isPlaceholder) {
        let dynamicData = q.dynamicData;
        if (dynamicData) {
            if (typeof dynamicData === 'string') {
                try {
                    dynamicData = JSON.parse(dynamicData);
                } catch (e) {
                    dynamicData = null;
                }
            }
            if (dynamicData) {
                const keys = ['text', 'question', 'questionText', 'question_text', 'content'];
                for (const key of keys) {
                    const val = dynamicData[key];
                    if (val && typeof val === 'string') {
                        const cleanVal = val.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                        if (cleanVal && !cleanVal.startsWith('generated question') && !cleanVal.startsWith('dynamic question') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন')) {
                            return val;
                        }
                    }
                }
                
                // Fallback for CQ_DESCRIPTIVE/sub_parts
                if (Array.isArray(dynamicData.sub_parts) && dynamicData.sub_parts.length > 0) {
                    const partsTexts = [];
                    dynamicData.sub_parts.forEach((part, pIdx) => {
                        if (part && typeof part === 'object') {
                            const subKeys = ['questionText', 'text', 'question', 'content'];
                            for (const key of subKeys) {
                                const val = part[key];
                                if (val && typeof val === 'string') {
                                    const cleanVal = val.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                                    if (cleanVal && !cleanVal.startsWith('generated question') && !cleanVal.startsWith('dynamic question') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন')) {
                                        const partLabel = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                        partsTexts.push(`(${partLabel}) ${val}`);
                                        break;
                                    }
                                }
                            }
                        }
                    });
                    if (partsTexts.length > 0) {
                        return partsTexts.join(' ');
                    }
                }
            }
        }
        return '';
    }
    return text;
};

const LeftSidebar = ({ isDraggingLeft, setIsDraggingLeft }) => {
    const navigate = useNavigate();
    const { 
        uiLang, t, isMobileApp,
        isLeftPanelOpen, setIsLeftPanelOpen,
        leftPanelWidth, 
        leftPanelTab, setLeftPanelTab,
        swapTarget, setSwapTarget,
        editorConfig, rawContent, docSettings,
        setPendingInsertQuestion, setPendingSwapQuestion,
        documentQuestions, addToast, examData
    } = useNexusEditor();

    React.useEffect(() => {
        document.documentElement.style.setProperty('--left-panel-width', `${leftPanelWidth}px`);
    }, [leftPanelWidth]);

    const [revisingQuestionNode, setRevisingQuestionNode] = useState(null);

    const filters = useAcademicFilters();
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const isSuperAdmin = user?.roles?.some(r => {
        const roleName = typeof r === 'string' ? r : (r.name || '');
        return roleName === 'SUPER_ADMIN' || roleName === 'ROLE_SUPER_ADMIN';
    }) || user?.email === 'admin' || user?.email?.includes('admin@');
    const hasFullLangAccess = isSuperAdmin || user?.instituteName === 'DEFAULT';

    const handleDragStart = (e, q) => {
        const targetSec = docSettings.sections?.find(s => s.isMCQ === (q.type === 'MCQ')) || {};
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'questionBlock',
            attrs: {
                questionId: q.id,
                subjectId: q.subjectId,
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
                marks: q.marks || 1,
                numberingStyle: targetSec.numberingStyle || 'bn',
                marksConfig: targetSec.marksConfig || 'hide',
                optionLayout: targetSec.optionLayout || 'col1',
                optionStyle: targetSec.optionStyle || 'bn',
                optionDecoration: targetSec.optionDecoration || 'rightBracket',
                dynamicData: q.dynamicData || null,
                options: q.options ? q.options.map(opt => ({ ...opt, optionText: opt.optionText })) : []
            }
        }));
    };

    React.useEffect(() => {
        const handleReviseRequested = (e) => {
            setRevisingQuestionNode(e.detail);
        };
        window.addEventListener('nexusReviseRequested', handleReviseRequested);
        return () => window.removeEventListener('nexusReviseRequested', handleReviseRequested);
    }, []);

    const handleAddToCanvas = (q) => {
        const targetSec = docSettings.sections?.find(s => s.isMCQ === (q.type === 'MCQ')) || {};
        setPendingInsertQuestion({
            type: 'questionBlock',
            attrs: {
                questionId: q.id,
                subjectId: q.subjectId,
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
                marks: q.marks || 1,
                numberingStyle: targetSec.numberingStyle || 'bn',
                marksConfig: targetSec.marksConfig || 'hide',
                optionLayout: targetSec.optionLayout || 'col1',
                optionStyle: targetSec.optionStyle || 'bn',
                optionDecoration: targetSec.optionDecoration || 'rightBracket',
                dynamicData: q.dynamicData || null,
                options: q.options ? q.options.map(opt => ({ ...opt, optionText: opt.optionText })) : []
            }
        });
        addToast(uiLang === 'bn' ? 'প্রশ্নটি ক্যানভাসে যোগ করা হয়েছে।' : 'Question added to canvas.', 'success');
    };

    const handleReplaceHere = (q) => {
        if (!swapTarget) return;
        const targetSec = docSettings.sections?.find(s => s.isMCQ === (q.type === 'MCQ')) || {};
        setPendingSwapQuestion({
            pos: swapTarget.pos,
            nodeSize: swapTarget.nodeSize,
            attrs: {
                questionId: q.id,
                subjectId: q.subjectId,
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
                marks: q.marks || 1,
                numberingStyle: swapTarget.attrs.numberingStyle || targetSec.numberingStyle || 'bn',
                marksConfig: swapTarget.attrs.marksConfig || targetSec.marksConfig || 'hide',
                optionLayout: swapTarget.attrs.optionLayout || targetSec.optionLayout || 'col1',
                optionStyle: swapTarget.attrs.optionStyle || targetSec.optionStyle || 'bn',
                optionDecoration: swapTarget.attrs.optionDecoration || targetSec.optionDecoration || 'rightBracket',
                fontSize: swapTarget.attrs.fontSize,
                lineGap: swapTarget.attrs.lineGap,
                optionGap: swapTarget.attrs.optionGap,
                questionGap: swapTarget.attrs.questionGap,
                textAlign: swapTarget.attrs.textAlign,
                dynamicData: q.dynamicData || null,
                options: q.options ? q.options.map(opt => ({ ...opt, optionText: opt.optionText })) : []
            }
        });
        setSwapTarget(null);
        setLeftPanelTab('document');
        addToast(uiLang === 'bn' ? 'প্রশ্নটি সফলভাবে প্রতিস্থাপন করা হয়েছে।' : 'Question replaced successfully.', 'success');
    };

    const handleAutoSwap = async (qNode) => {
        const { pos, nodeSize, attrs } = qNode;
        try {
            let targetChapterId = attrs.chapterId;
            let targetSubjectId = attrs.subjectId;

            // Fallback for legacy questions without attributes: fetch details from DB
            if ((!targetChapterId || !targetSubjectId) && attrs.questionId) {
                try {
                    const qDetails = await questionService.getQuestionById(attrs.questionId);
                    if (qDetails) {
                        if (qDetails.chapter?.id) {
                            targetChapterId = qDetails.chapter.id;
                        }
                        if (qDetails.classSubject?.id) {
                            targetSubjectId = qDetails.classSubject.id;
                        }
                    }
                } catch (dbErr) {
                    console.warn("Failed to fetch legacy question details for auto-swap fallback", dbErr);
                }
            }

            const payload = {
                subjectId: targetSubjectId || examData?.classSubjectId || examData?.subjectId || '',
                chapterId: targetChapterId || '',
                className: examData?.className || '',
                subjectName: examData?.subjectName || '',
                filterType: attrs.type || 'MCQ',
                filterStatus: 'APPROVED',
                page: 0,
                size: 50
            };
            console.log("[LeftSidebar] handleAutoSwap payload:", payload);
            const response = await questionService.getAllQuestionsPaginated(payload);
            const content = response?.data?.content || response?.content || [];
            if (content.length > 0) {
                const existingIds = documentQuestions.map(q => q.attrs.questionId);
                const freshQuestions = content.filter(q => !existingIds.includes(q.id));
                if (freshQuestions.length > 0) {
                    const q = freshQuestions[Math.floor(Math.random() * freshQuestions.length)];
                    const targetSec = docSettings.sections?.find(s => s.isMCQ === (q.type === 'MCQ')) || {};
                    setPendingSwapQuestion({
                        pos: pos,
                        nodeSize: nodeSize,
                        attrs: {
                            questionId: q.id,
                            subjectId: q.subjectId,
                            chapterId: q.chapterId,
                            type: q.type || 'MCQ',
                            questionText: q.questionText,
                            stimulus: q.stimulus || '',
                            explanation: q.explanation || '',
                            answer: q.correctAnswer || '',
                            syncedFromDb: true,
                            statements: q.statements || [],
                            chapterName: q.chapterName || q.subjectName || 'General',
                            marks: q.marks || 1,
                            numberingStyle: attrs.numberingStyle || targetSec.numberingStyle || 'bn',
                            marksConfig: attrs.marksConfig || targetSec.marksConfig || 'hide',
                            optionLayout: attrs.optionLayout || targetSec.optionLayout || 'col1',
                            optionStyle: attrs.optionStyle || targetSec.optionStyle || 'bn',
                            optionDecoration: attrs.optionDecoration || targetSec.optionDecoration || 'rightBracket',
                            fontSize: attrs.fontSize,
                            lineGap: attrs.lineGap,
                            optionGap: attrs.optionGap,
                            questionGap: attrs.questionGap,
                            textAlign: attrs.textAlign,
                            dynamicData: q.dynamicData || null,
                            options: q.options ? q.options.map(opt => ({ ...opt, optionText: opt.optionText })) : []
                        }
                    });
                    addToast(uiLang === 'bn' ? 'সফলভাবে অটো সোয়াপ করা হয়েছে।' : 'Auto swapped successfully.', 'success');
                    return;
                }
            }
            addToast(uiLang === 'bn' ? "এই অধ্যায়ে নতুন কোনো প্রশ্ন পাওয়া যায়নি।" : "No fresh questions available for auto-swap in this chapter.", 'warning');
        } catch (err) {
            console.error("Auto swap failed", err);
            addToast(uiLang === 'bn' ? "অটো সোয়াপ ব্যর্থ হয়েছে।" : "Auto swap failed.", 'error');
        }
    };

    return (
        <div style={{ 
            width: isMobileApp ? 'min(85vw, 340px)' : (isLeftPanelOpen ? 'var(--left-panel-width, 320px)' : '0px'),
            transform: isMobileApp ? (isLeftPanelOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)') : 'none',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            visibility: (isMobileApp && !isLeftPanelOpen) ? 'hidden' : 'visible'
        }}
             className={`${!isDraggingLeft ? 'transition-all' : ''} bg-white border-r border-slate-200/80 shrink-0 flex flex-col z-30 absolute lg:relative left-0 top-0 h-full shadow-2xl lg:shadow-none rounded-r-2xl lg:rounded-none overflow-hidden print:hidden`}>
            {/* Resize Handle */}
            <div onMouseDown={() => setIsDraggingLeft(true)}
                 className={`absolute top-0 right-[-3px] w-[6px] h-full cursor-col-resize z-40 hidden lg:block transition-colors hover:bg-indigo-400 ${isDraggingLeft ? 'bg-indigo-500' : 'bg-transparent'}`} />
            
            <div className="h-full flex flex-col bg-white w-full">
                <div className="p-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setLeftPanelTab('document')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${leftPanelTab === 'document' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Document</button>
                            <button onClick={() => setLeftPanelTab('auto')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${leftPanelTab === 'auto' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Auto Gen</button>
                            <button onClick={() => setLeftPanelTab('manual')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${leftPanelTab === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Manual</button>
                        </div>
                        <button onClick={() => setIsLeftPanelOpen(false)} className="text-slate-400 hover:text-slate-700 rounded p-1 hover:bg-slate-100 transition-colors" title="Close Panel">
                            <PanelLeftClose size={14}/>
                        </button>
                    </div>
                    
                    {leftPanelTab === 'manual' && (
                        <div className="space-y-2 mt-1">
                            <input 
                                type="text" placeholder={t.searchQ} value={filters.searchQuery}
                                onChange={(e) => filters.setSearchQuery(e.target.value)}
                                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                            />
                            {(!filters.selectedLevelId && (docSettings.className || docSettings.subject) && !filters.disableAutoFilter) && (
                                <div className="mt-2 text-[10px] bg-blue-50 text-blue-700 px-2 py-1.5 rounded flex justify-between items-center font-medium border border-blue-100">
                                    <span className="truncate pr-2">Auto-filtered: <b>{docSettings.className}</b> {docSettings.subject && `| ${docSettings.subject}`}</span>
                                    <button onClick={() => filters.setDisableAutoFilter(true)} className="text-blue-600 hover:text-blue-800 font-bold" title="Clear filter">✕</button>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <select 
                                    value={filters.selectedLanguage} onChange={(e) => filters.setSelectedLanguage(e.target.value)}
                                    disabled={!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual')}
                                    className={`w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 col-span-2 ${!hasFullLangAccess && user?.instituteMedium && !user.instituteMedium.includes(',') && !user.instituteMedium.includes('Bilingual') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bilingual') || user.instituteMedium.includes(',')) && <option value="ALL">{uiLang === 'bn' ? 'সব ভার্সন' : 'All Versions'}</option>}
                                    {(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bangla') || user.instituteMedium.includes('Bilingual')) && <option value="Bangla">Bangla</option>}
                                    {(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('English') || user.instituteMedium.includes('Bilingual')) && <option value="English">English</option>}
                                    {(hasFullLangAccess || !user?.instituteMedium || user.instituteMedium.includes('Bilingual')) && <option value="Bilingual">Bilingual</option>}
                                </select>
                                
                                {!((!filters.disableAutoFilter && docSettings?.className && docSettings?.subject) || !!swapTarget) && (
                                    <>
                                        <select value={filters.selectedLevelId} onChange={(e) => filters.setSelectedLevelId(e.target.value)} className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700">
                                            <option value="">{uiLang === 'bn' ? 'সকল স্তর' : 'All Levels'}</option>
                                            {filters.levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                        <select value={filters.selectedStreamId} onChange={(e) => filters.setSelectedStreamId(e.target.value)} disabled={!filters.selectedLevelId} className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50">
                                            <option value="">{uiLang === 'bn' ? 'সকল শাখা' : 'All Streams'}</option>
                                            {filters.streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <select value={filters.selectedClassId} onChange={(e) => filters.setSelectedClassId(e.target.value)} disabled={!filters.selectedStreamId && filters.streams.length > 0} className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50">
                                            <option value="">{uiLang === 'bn' ? 'সকল শ্রেণি' : 'All Classes'}</option>
                                            {filters.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <select value={filters.selectedSubjectId} onChange={(e) => filters.setSelectedSubjectId(e.target.value)} disabled={!filters.selectedClassId} className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50">
                                            <option value="">{uiLang === 'bn' ? 'সকল বিষয়' : 'All Subjects'}</option>
                                            {filters.subjects.map(s => <option key={s.classSubjectId || s.id} value={s.classSubjectId || s.id}>{s.subjectName || s.subject?.name}</option>)}
                                        </select>
                                    </>
                                )}
                                <select value={filters.selectedChapterId} onChange={(e) => filters.setSelectedChapterId(e.target.value)} disabled={!filters.selectedSubjectId} className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50">
                                    <option value="">{uiLang === 'bn' ? 'সকল অধ্যায়' : 'All Chapters'}</option>
                                    {filters.chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                                </select>
                                <select value={filters.selectedTopicId} onChange={(e) => filters.setSelectedTopicId(e.target.value)} disabled={!filters.selectedChapterId} className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50">
                                    <option value="">{uiLang === 'bn' ? 'সকল টপিক' : 'All Topics'}</option>
                                    {filters.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50">
                    {swapTarget && (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-between mb-2 shadow-sm animate-pulse">
                            <div>
                                <h4 className="text-amber-800 font-bold text-xs">Swap Mode Active</h4>
                                <p className="text-amber-700/80 text-[10px] mt-0.5 font-medium">Select a question below to replace.</p>
                            </div>
                            <button onClick={() => { setSwapTarget(null); setLeftPanelTab('document'); }} className="text-amber-600 hover:text-amber-800 font-bold px-2 py-1 bg-amber-100 hover:bg-amber-200 rounded text-[10px]">Cancel</button>
                        </div>
                    )}
                    
                    {leftPanelTab === 'auto' ? (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl text-center space-y-3 shadow-sm">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2"><Layers size={24} /></div>
                            <h3 className="text-sm font-bold text-slate-800">AI Exam Generator</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">Click the button below to automatically generate questions based on the selected curriculum rules.</p>
                            <button onClick={() => navigate('/exams/generate/auto')} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg shadow transition-colors flex justify-center items-center gap-2">
                                <Layers size={14} /> Go to AI Generator Wizard
                            </button>
                        </div>
                    ) : leftPanelTab === 'manual' ? (
                        filters.loadingQuestions ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
                        ) : filters.bankQuestions.length > 0 ? (
                            filters.bankQuestions.map(q => {
                                const allowedBlocks = editorConfig?.allowed_blocks || ["MCQ", "CQ", "SHORT"];
                                const isAllowed = allowedBlocks.includes(q.type) || !q.type;
                                
                                return (
                                <div key={q.id} draggable={isAllowed} onDragStart={(e) => isAllowed ? handleDragStart(e, q) : e.preventDefault()}
                                    className={`bg-white p-3 rounded-xl border shadow-sm transition-all group select-none ${isAllowed ? 'border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md' : 'border-red-100 opacity-50 cursor-not-allowed bg-red-50/30'}`}
                                    title={isAllowed ? "Drag me to the canvas!" : "This question type is not allowed for this subject's curriculum"}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${q.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{q.type || 'Q'}</span>
                                            {q.status !== 'APPROVED' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">{q.status || 'DRAFT'}</span>}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{q.chapterName || q.subjectName || 'General'}</span>
                                    </div>
                                    
                                    {q.stimulus && !isPlaceholderText(q.stimulus) && <div className="mb-2 p-2 bg-amber-50 rounded text-xs text-slate-700 italic border border-amber-100/50" dangerouslySetInnerHTML={{__html: q.stimulus}}></div>}
                                    {(() => {
                                        const cleanText = getDisplayQuestionText(q);
                                        return cleanText ? (
                                            <div className={`text-xs text-slate-700 font-medium ${q.type === 'CQ' ? 'line-clamp-none' : 'line-clamp-3'}`} dangerouslySetInnerHTML={{__html: cleanText}}></div>
                                        ) : null;
                                    })()}
                                    
                                    {q.statements && q.statements.length > 0 && (
                                        <div className="mt-2 mb-2 pl-2 space-y-1 border-l-2 border-indigo-200">
                                            {q.statements.map((stmt, i) => {
                                                const cleanStmt = (typeof stmt === 'string' ? stmt : '').replace(/^(?:i{1,3}|iv|v|vi{0,3}|ix|x|[0-9]+|[১-৯]+)[\.\)]\s*/i, '').trim();
                                                return (
                                                <div key={i} className="text-[10px] text-slate-600 flex gap-1">
                                                    <span>{['i', 'ii', 'iii', 'iv', 'v'][i] || i + 1}.</span>
                                                    <span dangerouslySetInnerHTML={{__html: cleanStmt}}></span>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    {q.options && q.options.length > 0 && (
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                                            {q.options.map((opt, i) => (
                                                <div key={i} className="flex items-start gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${opt.isCorrect ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                    <span className={`text-[10px] line-clamp-1 ${opt.isCorrect ? 'text-emerald-700 font-bold' : 'text-slate-600'}`} dangerouslySetInnerHTML={{__html: opt.optionText?.replace(/<p>/g, '').replace(/<\/p>/g, '')}} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {!isAllowed && <p className="text-[9px] font-bold text-red-500 mt-2">❌ {t.typeRestricted}</p>}

                                    {isAllowed && (
                                        <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            {rawContent?.includes(`questionid="${q.id}"`) ? (
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">✓ Already in Exam</span>
                                            ) : swapTarget ? (
                                                <button className="text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded flex items-center gap-1 shadow-sm" onClick={() => handleReplaceHere(q)}>
                                                    <RefreshCw size={10} /> Replace Here
                                                </button>
                                            ) : (
                                                <button className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded" onClick={() => handleAddToCanvas(q)}>
                                                    + Add to Canvas
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                );
                            })
                        ) : (
                            <div className="text-center p-4 text-xs text-slate-400 font-medium">{t.noQ}</div>
                        )
                    ) : null}
                    
                    {leftPanelTab === 'document' && (
                        <div className="space-y-2 mt-2 h-full overflow-y-auto pr-1 custom-scrollbar pb-32">
                            <div className="flex items-center justify-between bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-100 mb-2">
                                <span className="text-xs font-bold">Total Questions:</span>
                                <span className="text-sm font-black">{documentQuestions.length}</span>
                            </div>
                            
                            {documentQuestions.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm italic">No questions in document.</div>
                            ) : (
                                documentQuestions.map((q, idx) => (
                                    <div key={`${q.attrs.questionId}-${idx}`} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-300 transition-colors group relative">
                                        <div className="flex items-start gap-2 mb-2">
                                            <span className="shrink-0 bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{idx + 1}</span>
                                            <div className="text-xs font-medium text-slate-700 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{__html: (getDisplayQuestionText(q.attrs) || '').replace(/<[^>]*>?/gm, '')}} />
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-100 opacity-50 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setRevisingQuestionNode(q)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded" title="Revise Options"><RotateCcw size={14} /></button>
                                            <button onClick={() => handleAutoSwap(q)} className="p-1.5 px-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded flex items-center gap-1 border border-transparent hover:border-indigo-100" title="Auto Swap"><RefreshCw size={12} /> <span className="text-[10px] font-bold uppercase tracking-wider">Auto</span></button>
                                            <button onClick={() => {
                                                window.dispatchEvent(new CustomEvent('nexusSwapRequested', { detail: { pos: q.pos, nodeSize: q.nodeSize, attrs: q.attrs } }));
                                            }} className="p-1.5 px-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded flex items-center gap-1 border border-transparent hover:border-blue-100" title="Manual Swap"><RefreshCw size={12} /> <span className="text-[10px] font-bold uppercase tracking-wider">Manual</span></button>
                                            <button onClick={() => {
                                                if(window.confirm("Are you sure you want to delete this question?")) {
                                                    window.dispatchEvent(new CustomEvent('nexusDeleteNodeRequested', { detail: { pos: q.pos, nodeSize: q.nodeSize } }));
                                                    addToast(uiLang === 'bn' ? 'প্রশ্নটি মুছে ফেলা হয়েছে।' : 'Question has been deleted.', 'info');
                                                }
                                            }} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Delete Question"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {revisingQuestionNode && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative border border-slate-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-md">
                                    <RotateCcw size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Suggest a Revision</h2>
                                    <p className="text-sm text-slate-500 font-medium mt-0.5">Your changes will update the canvas instantly and await admin approval.</p>
                                </div>
                            </div>
                            <button onClick={() => setRevisingQuestionNode(null)} className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all active:scale-95 border border-transparent hover:border-slate-200">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50 relative">
                            <QuestionEdit 
                                inlineId={revisingQuestionNode.attrs.questionId} 
                                forceMode="revise" 
                                onSaveComplete={(revisedData) => {
                                    setRevisingQuestionNode(null);
                                    if (revisedData) {
                                        setPendingSwapQuestion({
                                            pos: revisingQuestionNode.pos,
                                            nodeSize: revisingQuestionNode.nodeSize,
                                            attrs: {
                                                ...revisingQuestionNode.attrs,
                                                questionId: revisingQuestionNode.attrs.questionId,
                                                questionText: revisedData.questionText,
                                                stimulus: revisedData.stimulus || '',
                                                explanation: revisedData.explanation || '',
                                                answer: revisedData.correctAnswer || '',
                                                statements: revisedData.statements || [],
                                                options: revisedData.options ? revisedData.options.map(opt => ({ ...opt, optionText: opt.optionText })) : []
                                            }
                                        });
                                    }
                                }} 
                                onCancel={() => setRevisingQuestionNode(null)} 
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default LeftSidebar;
