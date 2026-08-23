import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
    PanelLeftClose, Layers, Loader2, RefreshCw, Edit3, RotateCcw, Trash2, X,
    ChevronDown, ChevronRight, BookOpen, Sparkles, SearchX, GripVertical, Plus
} from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { useAcademicFilters } from '../../hooks/useAcademicFilters';
import questionService from '../../../../../../services/questionService';
import QuestionEdit from '../../../../QuestionBank/QuestionEdit';
import AutoExamGeneratorInline from '../AutoExamGeneratorInline';
import QuestionCreateModal from '../QuestionCreateModal';

const isPlaceholderText = (text) => {
    if (!text) return true;
    const clean = text.toString().replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    return clean === '' || 
           clean.startsWith('generated question') || 
           clean.startsWith('dynamic question') || 
           clean.startsWith('ডায়নামিক প্রশ্ন') || 
           clean.startsWith('ডায়নামিক প্রশ্ন');
};

const getSectionDefaultType = (section, isMCQ) => {
    if (isMCQ === true) return 'MCQ';
    if (isMCQ === false) return 'CQ';
    const sName = (section?.name || '').toLowerCase();
    if (sName.includes('বহুনির্বাচন') || sName.includes('mcq')) return 'MCQ';
    if (sName.includes('সৃজনশীল') || sName.includes('cq') || sName.includes('creative') || sName.includes('রচনামূলক')) return 'CQ';
    if (sName.includes('সংক্ষিপ্ত') || sName.includes('short')) return 'SHORT';
    if (sName.includes('ডায়নামিক') || sName.includes('ডায়নামিক') || sName.includes('dynamic')) return 'DYNAMIC';
    return 'MCQ';
};

const formatMarksDigits = (marksVal, numberingStyle = 'bn') => {
    if (marksVal === null || marksVal === undefined) return '';
    let str = marksVal.toString().trim();
    const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    let enStr = str.replace(/[০-৯]/g, m => bnToEn[m]);
    const num = parseFloat(enStr);
    if (!isNaN(num)) {
        enStr = num.toString();
    }
    if (numberingStyle === 'bn') {
        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return enStr.replace(/[0-9]/g, m => enToBn[m]);
    }
    return enStr;
};

const parseMarkdownImages = (text) => {
    if (!text) return '';
    return text.toString().replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, rawAlt, url) => {
        let finalUrl = url;
        if (url.includes('r2.dev') && !url.includes('proxy-image')) {
            finalUrl = `/api/v1/public/proxy-image?url=${encodeURIComponent(url)}`;
        }
        let alt = rawAlt || '';
        let width = 'auto';
        if (rawAlt && rawAlt.includes('|')) {
            const parts = rawAlt.split('|');
            alt = parts[0];
            if (parts[2]) width = parts[2];
        }
        return `<img src="${finalUrl}" alt="${alt}" style="max-width: 100%; max-height: 180px; object-fit: contain; border-radius: 6px; margin: 6px auto; display: block;" class="rounded-lg border border-slate-200 shadow-2xs" />`;
    });
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
                                        const marksStr = part.marks ? `<span class="text-slate-400 font-bold text-[10px] ml-1">(${formatMarksDigits(part.marks, 'bn')})</span>` : '';
                                        partsTexts.push(`<div class="flex items-start gap-1.5 mt-1.5 text-slate-700 text-xs"><span class="font-bold text-indigo-700 font-mono shrink-0">(${partLabel})</span> <span class="flex-grow leading-relaxed">${val}</span>${marksStr}</div>`);
                                        break;
                                    }
                                }
                            }
                        }
                    });
                    if (partsTexts.length > 0) {
                        return `<div class="space-y-1.5 mt-1 border-t border-slate-100 pt-1.5">${partsTexts.join('')}</div>`;
                    }
                }
            }
        }
        return '';
    }
    return text;
};

const convertDigits = (value, language) => {
    if (value === null || value === undefined) return '';
    const str = value.toString();
    const lang = (language || '').toUpperCase();
    if (lang === 'ENGLISH' || lang === 'EN') {
        const bnToEnMap = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
        return str.replace(/[০-৯]/g, match => bnToEnMap[match] || match);
    }
    const enToBnMap = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return str.replace(/[0-9]/g, match => enToBnMap[match] || match);
};

const LeftSidebar = ({ isDraggingLeft, setIsDraggingLeft }) => {
    const navigate = useNavigate();
    const { 
        uiLang, t, isMobileApp,
        isLeftPanelOpen, setIsLeftPanelOpen,
        leftPanelWidth, 
        leftPanelTab, setLeftPanelTab,
        swapTarget, setSwapTarget,
        editorConfig, rawContent, setRawContent, docSettings,
        setPendingInsertQuestion, setPendingSwapQuestion,
        documentQuestions, addToast, examData,
        editor, editorMode
    } = useNexusEditor();

    React.useEffect(() => {
        document.documentElement.style.setProperty('--left-panel-width', `${leftPanelWidth}px`);
    }, [leftPanelWidth]);

    const [revisingQuestionNode, setRevisingQuestionNode] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({});
    const [draggedQIndex, setDraggedQIndex] = useState(null);
    const [dragOverQIndex, setDragOverQIndex] = useState(null);

    const handleReorderQuestion = (fromIdx, toIdx) => {
        if (fromIdx === null || toIdx === null || fromIdx === toIdx || !editor) return;
        
        const questionNodes = [];
        editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'questionBlock') {
                questionNodes.push({ node, pos, size: node.nodeSize });
            }
        });

        if (fromIdx < 0 || fromIdx >= questionNodes.length || toIdx < 0 || toIdx >= questionNodes.length) {
            return;
        }

        const source = questionNodes[fromIdx];
        const target = questionNodes[toIdx];

        const tr = editor.state.tr;
        const nodeToMove = source.node;

        // Delete source node
        tr.delete(source.pos, source.pos + source.size);

        // Determine target insertion pos after source deletion
        let insertPos;
        if (fromIdx < toIdx) {
            const targetPosAfterDelete = target.pos - source.size;
            insertPos = targetPosAfterDelete + target.size;
        } else {
            insertPos = target.pos;
        }

        tr.insert(insertPos, nodeToMove);
        editor.view.dispatch(tr);
        setRawContent(editor.getHTML());
        window.dispatchEvent(new CustomEvent('nexus-editor-rerender'));
        addToast(uiLang === 'bn' ? 'প্রশ্নের ক্রম সফলভাবে পরিবর্তন করা হয়েছে।' : 'Question sequence reordered successfully.', 'success');
    };

    const [createModalConfig, setCreateModalConfig] = useState({
        isOpen: false,
        defaultType: 'MCQ',
        targetSectionId: null,
        insertAfterIndex: null
    });

    const toggleSectionCollapse = (secId) => {
        setCollapsedSections(prev => ({ ...prev, [secId]: !prev[secId] }));
    };

    // Compute grouped questions by sections for Document Tab
    const groupedQuestions = React.useMemo(() => {
        if (!documentQuestions || documentQuestions.length === 0) return [];
        
        const sections = docSettings?.sections || [];
        if (sections.length === 0) {
            return [{
                section: { id: 'default', name: uiLang === 'bn' ? 'সকল প্রশ্ন' : 'All Questions', isMCQ: null },
                questions: documentQuestions.map((q, idx) => ({ 
                    ...q, 
                    globalIndex: idx,
                    displayNumber: idx + 1
                }))
            }];
        }

        const sectionMap = new Map();
        sections.forEach(sec => {
            sectionMap.set(sec.id, {
                section: sec,
                questions: []
            });
        });

        const unassigned = [];
        let currentSecId = sections[0]?.id;

        documentQuestions.forEach((q, idx) => {
            const item = { ...q, globalIndex: idx };
            const qSecId = q.attrs?.sectionId;
            
            if (qSecId && sectionMap.has(qSecId)) {
                currentSecId = qSecId;
                sectionMap.get(qSecId).questions.push(item);
            } else if (q.attrs?.firstInSection) {
                const matchingSec = sections.find(s => s.isMCQ === (q.attrs?.type === 'MCQ')) || sections[0];
                if (matchingSec && sectionMap.has(matchingSec.id)) {
                    currentSecId = matchingSec.id;
                    sectionMap.get(matchingSec.id).questions.push(item);
                } else {
                    unassigned.push(item);
                }
            } else if (currentSecId && sectionMap.has(currentSecId)) {
                const curSec = sectionMap.get(currentSecId).section;
                if (q.attrs?.type && curSec.isMCQ !== undefined && curSec.isMCQ !== (q.attrs.type === 'MCQ')) {
                    const matchingSec = sections.find(s => s.isMCQ === (q.attrs.type === 'MCQ'));
                    if (matchingSec && sectionMap.has(matchingSec.id)) {
                        currentSecId = matchingSec.id;
                        sectionMap.get(matchingSec.id).questions.push(item);
                    } else {
                        sectionMap.get(currentSecId).questions.push(item);
                    }
                } else {
                    sectionMap.get(currentSecId).questions.push(item);
                }
            } else {
                const matchingSec = sections.find(s => s.isMCQ === (q.attrs?.type === 'MCQ')) || sections[0];
                if (matchingSec && sectionMap.has(matchingSec.id)) {
                    sectionMap.get(matchingSec.id).questions.push(item);
                } else {
                    unassigned.push(item);
                }
            }
        });

        // Compute correct numbering for each section based on continuousNumbering & numberingStart
        let runningGlobalCounter = 0;
        const groups = [];

        sections.forEach(sec => {
            const entry = sectionMap.get(sec.id);
            if (entry && entry.questions.length > 0) {
                const isContinuous = sec.continuousNumbering !== false;
                let secRunningCounter = (Number(sec.numberingStart) || 1) - 1;

                entry.questions.forEach(q => {
                    const isAlternative = q.attrs?.alternativeToId != null && q.attrs?.alternativeToId !== '';
                    if (!isAlternative) {
                        if (isContinuous) {
                            runningGlobalCounter++;
                            q.displayNumber = runningGlobalCounter;
                        } else {
                            secRunningCounter++;
                            q.displayNumber = secRunningCounter;
                        }
                    } else {
                        q.displayNumber = null;
                    }
                });

                groups.push(entry);
            }
        });

        if (unassigned.length > 0) {
            unassigned.forEach(q => {
                const isAlternative = q.attrs?.alternativeToId != null && q.attrs?.alternativeToId !== '';
                if (!isAlternative) {
                    runningGlobalCounter++;
                    q.displayNumber = runningGlobalCounter;
                } else {
                    q.displayNumber = null;
                }
            });
            groups.push({
                section: { id: 'unassigned', name: uiLang === 'bn' ? 'অন্যান্য / সাধারণ প্রশ্ন' : 'Other Questions', isMCQ: null },
                questions: unassigned
            });
        }

        return groups.length > 0 ? groups : [{
            section: { id: 'default', name: uiLang === 'bn' ? 'সকল প্রশ্ন' : 'All Questions', isMCQ: null },
            questions: documentQuestions.map((q, idx) => ({ ...q, globalIndex: idx, displayNumber: idx + 1 }))
        }];
    }, [documentQuestions, docSettings?.sections, uiLang]);

    const handleLinkAsAlternative = (q, idx) => {
        if (idx === 0 || !editor) return;
        const parentQ = documentQuestions[idx - 1];
        if (!parentQ) return;
        const parentId = parentQ.attrs.questionId;

        const tr = editor.state.tr;
        tr.setNodeMarkup(q.pos, undefined, {
            ...q.attrs,
            alternativeToId: parentId
        });
        editor.view.dispatch(tr);
        addToast(uiLang === 'bn' ? 'পূর্ববর্তী প্রশ্নের অথবা হিসেবে লিঙ্ক করা হয়েছে।' : 'Linked as alternative to previous question.', 'success');
    };

    const handleUnlinkAlternative = (q) => {
        if (!editor) return;
        const tr = editor.state.tr;
        tr.setNodeMarkup(q.pos, undefined, {
            ...q.attrs,
            alternativeToId: null
        });
        editor.view.dispatch(tr);
        addToast(uiLang === 'bn' ? 'লিঙ্ক বাতিল করা হয়েছে।' : 'Alternative link removed.', 'info');
    };

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
        const targetSec = docSettings.sections?.find(s => s.isMCQ === (q.type === 'MCQ')) || docSettings.sections?.[0] || {};
        setPendingInsertQuestion({
            type: 'questionBlock',
            attrs: {
                questionId: q.id,
                sectionId: targetSec.id || null,
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
                sectionId: swapTarget.attrs?.sectionId || targetSec.id || null,
                questionNumber: swapTarget.attrs?.questionNumber,
                firstInSection: swapTarget.attrs?.firstInSection,
                alternativeToId: swapTarget.attrs?.alternativeToId,
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
                numberingStyle: swapTarget.attrs?.numberingStyle || targetSec.numberingStyle || 'bn',
                marksConfig: swapTarget.attrs?.marksConfig || targetSec.marksConfig || 'hide',
                optionLayout: swapTarget.attrs?.optionLayout || targetSec.optionLayout || 'col1',
                optionStyle: swapTarget.attrs?.optionStyle || targetSec.optionStyle || 'bn',
                optionDecoration: swapTarget.attrs?.optionDecoration || targetSec.optionDecoration || 'rightBracket',
                fontSize: swapTarget.attrs?.fontSize,
                lineGap: swapTarget.attrs?.lineGap,
                optionGap: swapTarget.attrs?.optionGap,
                questionGap: swapTarget.attrs?.questionGap,
                textAlign: swapTarget.attrs?.textAlign,
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
                            sectionId: attrs?.sectionId || targetSec.id || null,
                            questionNumber: attrs?.questionNumber,
                            firstInSection: attrs?.firstInSection,
                            alternativeToId: attrs?.alternativeToId,
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
                            numberingStyle: attrs?.numberingStyle || targetSec.numberingStyle || 'bn',
                            marksConfig: attrs?.marksConfig || targetSec.marksConfig || 'hide',
                            optionLayout: attrs?.optionLayout || targetSec.optionLayout || 'col1',
                            optionStyle: attrs?.optionStyle || targetSec.optionStyle || 'bn',
                            optionDecoration: attrs?.optionDecoration || targetSec.optionDecoration || 'rightBracket',
                            fontSize: attrs?.fontSize,
                            lineGap: attrs?.lineGap,
                            optionGap: attrs?.optionGap,
                            questionGap: attrs?.questionGap,
                            textAlign: attrs?.textAlign,
                            dynamicData: q.dynamicData || null,
                            options: q.options ? q.options.map(opt => ({ ...opt, optionText: opt.optionText })) : []
                        }
                    });
                    addToast(uiLang === 'bn' ? 'সফলভাবে অটো সোয়াপ করা হয়েছে।' : 'Auto swapped successfully.', 'success');
                    return;
                }
            }
            addToast(uiLang === 'bn' ? "এমন কোনো প্রশ্ন খুঁজে পাওয়া যায়নি" : "No fresh questions available for auto-swap in this chapter.", 'warning');
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
             className={`${!isDraggingLeft ? 'transition-all' : ''} bg-white border-r border-slate-200/80 shrink-0 flex flex-col top-0 left-0 h-full overflow-hidden print:hidden ${
                 isMobileApp 
                     ? 'absolute z-30 shadow-2xl rounded-r-2xl' 
                     : 'relative shadow-none'
             }`}>
            {/* Resize Handle */}
            <div onMouseDown={() => setIsDraggingLeft(true)}
                 className={`absolute top-0 right-[-3px] w-[6px] h-full cursor-col-resize z-40 transition-colors hover:bg-indigo-400 ${!isMobileApp ? 'block' : 'hidden'} ${isDraggingLeft ? 'bg-indigo-500' : 'bg-transparent'}`} />
            
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
                            {swapTarget ? (
                                /* Sleek, Ultra-Clean Single Swap Header */
                                <div className="space-y-2">
                                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/90 p-2 rounded-xl flex items-center justify-between shadow-2xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                                <RefreshCw size={12} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-black text-amber-950">
                                                        {swapTarget.attrs?.type || 'প্রশ্ন'} প্রতিস্থাপন (Swap)
                                                    </span>
                                                </div>
                                                <p className="text-[9.5px] text-amber-800/90 font-semibold truncate">
                                                    {swapTarget.attrs?.chapterName || (docSettings?.subject ? `${docSettings.subject}` : 'উপযুক্ত প্রশ্নসমূহ')}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => { setSwapTarget(null); setLeftPanelTab('document'); }}
                                            className="text-[10px] font-bold text-amber-900 hover:text-red-700 bg-white hover:bg-red-50 border border-amber-200/80 px-2 py-0.5 rounded-md transition-all shadow-2xs shrink-0"
                                        >
                                            ✕ বাতিল
                                        </button>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder={uiLang === 'bn' ? 'উপযুক্ত প্রশ্ন সার্চ করুন...' : 'Search eligible questions...'} 
                                        value={filters.searchQuery}
                                        onChange={(e) => filters.setSearchQuery(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all placeholder-slate-400"
                                    />
                                </div>
                            ) : (
                                /* Normal Browsing Filter Controls */
                                <>
                                    <input 
                                        type="text" placeholder={t.searchQ} value={filters.searchQuery}
                                        onChange={(e) => filters.setSearchQuery(e.target.value)}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                                    />
                                    
                                    <div className="flex items-center justify-between px-0.5">
                                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={filters.onlyEligible}
                                                onChange={(e) => filters.setOnlyEligible(e.target.checked)}
                                                className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="text-[10px] font-bold text-slate-700">
                                                {uiLang === 'bn' ? '⚡ শুধুমাত্র অব্যবহৃত প্রশ্ন' : '⚡ Unused Questions Only'}
                                            </span>
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                        <select value={filters.selectedChapterId} onChange={(e) => filters.setSelectedChapterId(e.target.value)} className="w-full text-[10.5px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 font-medium text-slate-700">
                                            <option value="">{uiLang === 'bn' ? 'সকল অধ্যায়' : 'All Chapters'}</option>
                                            {filters.chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                                        </select>
                                        <select value={filters.selectedTopicId} onChange={(e) => filters.setSelectedTopicId(e.target.value)} disabled={!filters.selectedChapterId} className="w-full text-[10.5px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50">
                                            <option value="">{uiLang === 'bn' ? 'সকল টপিক' : 'All Topics'}</option>
                                            {filters.topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50">
                    
                    {leftPanelTab === 'auto' ? (
                        <AutoExamGeneratorInline />
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
                                    
                                    {q.stimulus && !isPlaceholderText(q.stimulus) && (
                                        <div className="mb-2 p-2 bg-amber-50 rounded-lg text-xs text-slate-800 italic border border-amber-200/50 leading-relaxed shadow-2xs" dangerouslySetInnerHTML={{__html: parseMarkdownImages(q.stimulus)}}></div>
                                    )}
                                    {(() => {
                                        const cleanText = getDisplayQuestionText(q);
                                        return cleanText ? (
                                            <div className="text-xs text-slate-800 font-medium leading-relaxed" dangerouslySetInnerHTML={{__html: parseMarkdownImages(cleanText)}}></div>
                                        ) : null;
                                    })()}
                                    
                                    {q.statements && q.statements.length > 0 && (
                                        <div className="mt-2 mb-2 pl-2.5 space-y-1 border-l-2 border-indigo-300 bg-indigo-50/30 py-1 rounded-r-md">
                                            {q.statements.map((stmt, i) => {
                                                const cleanStmt = (typeof stmt === 'string' ? stmt : '').replace(/^(?:i{1,3}|iv|v|vi{0,3}|ix|x|[0-9]+|[১-৯]+)[\.\)]\s*/i, '').trim();
                                                return (
                                                <div key={i} className="text-[11px] text-slate-700 flex gap-1.5 leading-snug">
                                                    <span className="font-bold text-indigo-700 font-mono shrink-0">{['i', 'ii', 'iii', 'iv', 'v'][i] || i + 1}.</span>
                                                    <span dangerouslySetInnerHTML={{__html: parseMarkdownImages(cleanStmt)}}></span>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    {q.options && q.options.length > 0 && (
                                        <div className="grid grid-cols-2 gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-200/70 shadow-2xs">
                                            {q.options.map((opt, i) => {
                                                const optText = opt.optionText || opt.text || '';
                                                const optLabel = ['(ক)', '(খ)', '(গ)', '(ঘ)'][i] || `(${i + 1})`;
                                                return (
                                                    <div key={i} className={`flex items-start gap-1.5 p-1 rounded text-[11px] leading-snug ${opt.isCorrect ? 'bg-emerald-100/70 border border-emerald-300/80 text-emerald-900 font-semibold' : 'text-slate-700'}`}>
                                                        <span className={`font-mono text-[10px] shrink-0 ${opt.isCorrect ? 'text-emerald-700 font-bold' : 'text-slate-400 font-medium'}`}>{optLabel}</span>
                                                        <span className="flex-grow break-words" dangerouslySetInnerHTML={{__html: parseMarkdownImages(optText.replace(/<p>/g, '').replace(/<\/p>/g, ''))}} />
                                                    </div>
                                                );
                                            })}
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
                            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 my-2">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center mx-auto shadow-2xs">
                                    <SearchX size={20} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black text-slate-800">
                                        {uiLang === 'bn' ? 'এমন কোনো প্রশ্ন খুঁজে পাওয়া যায়নি' : 'No matching questions found'}
                                    </h4>
                                    <p className="text-[10.5px] text-slate-500 max-w-[230px] mx-auto leading-relaxed">
                                        {swapTarget
                                            ? (uiLang === 'bn' ? 'এই অধ্যায় ও টাইপের কোনো অব্যবহৃত যোগ্য প্রশ্ন ডাটাবেজে অবশিষ্ট নেই।' : 'No fresh unused questions available for replacement in this chapter.')
                                            : (uiLang === 'bn' ? 'বর্তমান ফিল্টার বা সার্চ শর্তানুযায়ী কোনো অনুমোদিত প্রশ্ন পাওয়া যায়নি।' : 'No approved questions match the selected filters or search criteria.')
                                        }
                                    </p>
                                </div>
                                {swapTarget ? (
                                    <button
                                        onClick={() => { setSwapTarget(null); setLeftPanelTab('document'); }}
                                        className="mt-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-all border border-slate-200"
                                    >
                                        {uiLang === 'bn' ? 'সোয়াপ বাতিল করুন' : 'Cancel Swap'}
                                    </button>
                                ) : (
                                    filters.onlyEligible && (
                                        <button
                                            onClick={() => filters.setOnlyEligible(false)}
                                            className="mt-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-all border border-indigo-100"
                                        >
                                            {uiLang === 'bn' ? 'সকল প্রশ্ন দেখুন' : 'Show All Questions'}
                                        </button>
                                    )
                                )}
                            </div>
                        )
                    ) : null}
                    
                    {leftPanelTab === 'document' && (
                        <div className="space-y-2 mt-0.5 h-full overflow-y-auto pr-0.5 custom-scrollbar pb-28">
                            {/* Document Header Summary - Ultra Compact */}
                            <div className="bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/60 px-2.5 py-1.5 rounded-xl border border-indigo-100/80 shadow-2xs flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                                        <BookOpen size={11} />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="text-[11px] font-black text-slate-800">
                                            {uiLang === 'bn' ? 'ডকুমেন্ট প্রশ্নমালা' : 'Questions'}
                                        </h4>
                                        <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                                            {groupedQuestions.length} {uiLang === 'bn' ? 'বিভাগ' : 'Sec'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 font-bold">
                                        {uiLang === 'bn' ? 'মোট:' : 'Total:'}
                                    </span>
                                    <span className="text-xs font-black text-indigo-700 bg-white border border-indigo-200/80 px-2 py-0.2 rounded-md shadow-2xs font-mono">
                                        {documentQuestions.length}
                                    </span>
                                </div>
                            </div>
                            
                            {documentQuestions.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-xs italic bg-white rounded-xl border border-slate-100 p-4">
                                    {uiLang === 'bn' ? 'ডকুমেন্টে এখনো কোনো প্রশ্ন যুক্ত করা হয়নি।' : 'No questions in document yet.'}
                                </div>
                            ) : (
                                groupedQuestions.map((group, gIdx) => {
                                    const secId = group.section.id || `sec-${gIdx}`;
                                    const isCollapsed = !!collapsedSections[secId];
                                    const isMCQ = group.section.isMCQ;

                                    return (
                                        <div key={secId} className="space-y-1.5">
                                            {/* Section Header Separator - Compact */}
                                            <div 
                                                onClick={() => toggleSectionCollapse(secId)}
                                                className="sticky top-0 z-10 bg-slate-100/95 hover:bg-slate-200/95 border border-slate-200/90 shadow-2xs backdrop-blur-md rounded-lg px-2.5 py-1.5 flex items-center justify-between cursor-pointer transition-all select-none group"
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <div className={`w-1.5 h-3.5 rounded-full shrink-0 ${isMCQ === true ? 'bg-blue-500' : isMCQ === false ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                                    <span className="text-[11.5px] font-bold text-slate-800 truncate" title={group.section.name}>
                                                        {group.section.name || (uiLang === 'bn' ? `বিভাগ ${gIdx + 1}` : `Section ${gIdx + 1}`)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {isMCQ !== null && isMCQ !== undefined && (
                                                        <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded uppercase ${isMCQ ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {isMCQ ? 'MCQ' : 'CQ/লিখিত'}
                                                        </span>
                                                    )}
                                                    <span className="text-[9.5px] font-extrabold bg-white border border-slate-200 text-slate-700 px-1.5 py-0.2 rounded shadow-2xs">
                                                        {group.questions.length} {uiLang === 'bn' ? 'টি' : 'Qs'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCreateModalConfig({
                                                                isOpen: true,
                                                                defaultType: getSectionDefaultType(group.section, isMCQ),
                                                                targetSectionId: secId,
                                                                insertAfterIndex: group.questions[group.questions.length - 1]?.globalIndex ?? null
                                                            });
                                                        }}
                                                        className="text-[9px] font-extrabold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded shadow-2xs flex items-center gap-0.5 transition-all"
                                                        title={uiLang === 'bn' ? 'এই বিভাগে নতুন প্রশ্ন তৈরি ও যোগ করুন' : 'Create & Add Question'}
                                                    >
                                                        <Plus size={10} />
                                                        <span>{uiLang === 'bn' ? 'নতুন প্রশ্ন' : 'New Q'}</span>
                                                    </button>
                                                    <div className="text-slate-400 group-hover:text-slate-700 transition-transform">
                                                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Questions inside Section - Compact */}
                                            {!isCollapsed && (
                                                <div className="space-y-1.5 pl-0.5">
                                                    {group.questions.map((q) => {
                                                        const idx = q.globalIndex;
                                                        const cleanText = getDisplayQuestionText(q.attrs);
                                                        const hasStimulus = q.attrs.stimulus && !isPlaceholderText(q.attrs.stimulus);
                                                        const hasStatements = q.attrs.statements && q.attrs.statements.length > 0;
                                                        const hasOptions = q.attrs.options && q.attrs.options.length > 0;

                                                        return (
                                                            <React.Fragment key={`${q.attrs.questionId}-${idx}`}>
                                                            <div 
                                                                draggable={true}
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData('text/plain', String(idx));
                                                                    setDraggedQIndex(idx);
                                                                }}
                                                                onDragOver={(e) => {
                                                                    e.preventDefault();
                                                                    e.dataTransfer.dropEffect = 'move';
                                                                    if (dragOverQIndex !== idx) setDragOverQIndex(idx);
                                                                }}
                                                                onDragLeave={() => {
                                                                    if (dragOverQIndex === idx) setDragOverQIndex(null);
                                                                }}
                                                                onDrop={(e) => {
                                                                    e.preventDefault();
                                                                    handleReorderQuestion(draggedQIndex, idx);
                                                                    setDraggedQIndex(null);
                                                                    setDragOverQIndex(null);
                                                                }}
                                                                onDragEnd={() => {
                                                                    setDraggedQIndex(null);
                                                                    setDragOverQIndex(null);
                                                                }}
                                                                className={`bg-white border rounded-lg p-2.5 transition-all group relative shadow-2xs space-y-1.5 cursor-grab active:cursor-grabbing ${
                                                                    draggedQIndex === idx 
                                                                        ? 'opacity-40 scale-[0.98] border-dashed border-indigo-400 bg-indigo-50/20' 
                                                                        : dragOverQIndex === idx && draggedQIndex !== idx
                                                                            ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/60 shadow-md -translate-y-0.5'
                                                                            : 'border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'
                                                                }`}
                                                            >
                                                                {/* Header / Meta row */}
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1 min-w-0">
                                                                        <div 
                                                                            className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 hover:text-indigo-600 transition-colors shrink-0 -ml-0.5" 
                                                                            title={uiLang === 'bn' ? 'টেনে নিয়ে ক্রম পরিবর্তন করুন' : 'Drag to reorder'}
                                                                        >
                                                                            <GripVertical size={13} />
                                                                        </div>
                                                                        <span className="shrink-0 bg-slate-800 text-white text-[9.5px] font-black px-1.5 py-0.2 rounded font-mono shadow-2xs">
                                                                            {q.attrs.alternativeToId 
                                                                                ? (uiLang === 'bn' ? 'অথবা' : 'OR') 
                                                                                : convertDigits(
                                                                                    q.displayNumber || q.attrs.questionNumber || (idx + 1),
                                                                                    group.section.numberingStyle === 'en' ? 'ENGLISH' : 'BANGLA'
                                                                                )
                                                                            }
                                                                        </span>
                                                                        <span className={`text-[8.5px] font-black px-1.2 py-0.2 rounded uppercase ${q.attrs.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                            {q.attrs.type || 'Q'}
                                                                        </span>
                                                                        {q.attrs.marks && (
                                                                            <span className="text-[8.5px] font-bold px-1.2 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/60 font-mono">
                                                                                {uiLang === 'bn' ? `মান: ${convertDigits(q.attrs.marks, 'BANGLA')}` : `M: ${q.attrs.marks}`}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {q.attrs.alternativeToId ? (
                                                                        <span className="shrink-0 bg-amber-50 text-amber-700 text-[8.5px] font-bold px-1.5 py-0.2 rounded border border-amber-200/60 font-sans">
                                                                            OR / অথবা
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[9.5px] font-bold text-slate-400 truncate max-w-[100px]" title={q.attrs.chapterName || q.attrs.subjectName}>
                                                                            {q.attrs.chapterName || q.attrs.subjectName || ''}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Stimulus / উদ্দীপক */}
                                                                {hasStimulus && (
                                                                    <div 
                                                                        className="p-1.5 bg-amber-50/90 rounded-md text-[11px] text-slate-800 italic border border-amber-200/50 leading-relaxed shadow-2xs"
                                                                        dangerouslySetInnerHTML={{ __html: parseMarkdownImages(q.attrs.stimulus) }}
                                                                    />
                                                                )}

                                                                {/* Main Question Text & CQ Sub-parts */}
                                                                {cleanText ? (
                                                                    <div 
                                                                        className="text-[11.5px] text-slate-800 font-medium leading-snug"
                                                                        dangerouslySetInnerHTML={{ __html: parseMarkdownImages(cleanText) }}
                                                                    />
                                                                ) : null}

                                                                {/* Statements (i, ii, iii) */}
                                                                {hasStatements && (
                                                                    <div className="pl-2 py-0.5 space-y-0.5 border-l-2 border-indigo-300 bg-indigo-50/30 rounded-r">
                                                                        {q.attrs.statements.map((stmt, sIdx) => {
                                                                            const cleanStmt = (typeof stmt === 'string' ? stmt : '').replace(/^(?:i{1,3}|iv|v|vi{0,3}|ix|x|[0-9]+|[১-৯]+)[\.\)]\s*/i, '').trim();
                                                                            return (
                                                                                <div key={sIdx} className="text-[10.5px] text-slate-700 flex gap-1 leading-tight">
                                                                                    <span className="font-bold text-indigo-700 font-mono shrink-0">{['i', 'ii', 'iii', 'iv', 'v'][sIdx] || sIdx + 1}.</span>
                                                                                    <span dangerouslySetInnerHTML={{ __html: parseMarkdownImages(cleanStmt) }}></span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}

                                                                {/* Options (ক, খ, গ, ঘ) */}
                                                                {hasOptions && (
                                                                    <div className="grid grid-cols-2 gap-1 mt-1 bg-slate-50/80 p-1.5 rounded-md border border-slate-200/70 shadow-2xs">
                                                                        {q.attrs.options.map((opt, oIdx) => {
                                                                            const optText = opt.optionText || opt.text || '';
                                                                            const optLabel = ['(ক)', '(খ)', '(গ)', '(ঘ)'][oIdx] || `(${oIdx + 1})`;
                                                                            const isCorrect = !!opt.isCorrect;
                                                                            return (
                                                                                <div 
                                                                                    key={oIdx} 
                                                                                    className={`flex items-start gap-1 p-0.5 rounded text-[10.5px] leading-tight ${isCorrect ? 'bg-emerald-100/70 border border-emerald-300/80 text-emerald-900 font-semibold' : 'text-slate-700'}`}
                                                                                >
                                                                                    <span className={`font-mono text-[9.5px] shrink-0 ${isCorrect ? 'text-emerald-700 font-bold' : 'text-slate-400 font-medium'}`}>
                                                                                        {optLabel}
                                                                                    </span>
                                                                                    <span 
                                                                                        className="flex-grow break-words" 
                                                                                        dangerouslySetInnerHTML={{ __html: parseMarkdownImages(optText.replace(/<p>/g, '').replace(/<\/p>/g, '')) }} 
                                                                                    />
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}

                                                                {/* Controls Toolbar */}
                                                                <div className="flex flex-wrap items-center justify-end gap-1 pt-1.5 border-t border-slate-100 opacity-60 group-hover:opacity-100 transition-opacity">
                                                                    {q.attrs.alternativeToId ? (
                                                                        <button 
                                                                            onClick={() => handleUnlinkAlternative(q)} 
                                                                            className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-[9px] font-bold rounded shadow-2xs transition-all"
                                                                            title={uiLang === 'bn' ? 'লিঙ্ক বাতিল করুন' : 'Unlink alternative'}
                                                                        >
                                                                            {uiLang === 'bn' ? 'লিঙ্ক বাতিল' : 'Unlink'}
                                                                        </button>
                                                                    ) : (
                                                                        idx > 0 && (
                                                                            <button 
                                                                                onClick={() => handleLinkAsAlternative(q, idx)} 
                                                                                className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-[9px] font-bold rounded shadow-2xs transition-all"
                                                                                title={uiLang === 'bn' ? 'পূর্ববর্তী প্রশ্নের সাথে অথবা হিসেবে লিঙ্ক করুন' : 'Link as alternative to previous question'}
                                                                            >
                                                                                {uiLang === 'bn' ? 'অথবা লিঙ্ক' : 'Link alternative'}
                                                                            </button>
                                                                        )
                                                                    )}
                                                                    {editorMode === 'FREE_EDIT' ? (
                                                                        <button 
                                                                            onClick={() => setRevisingQuestionNode(q)} 
                                                                            className="p-1 px-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded flex items-center gap-0.5 border border-transparent hover:border-emerald-100 transition-all" 
                                                                            title={uiLang === 'bn' ? 'প্রশ্ন সম্পাদন করুন' : 'Edit Question'}
                                                                        >
                                                                            <Edit3 size={11} />
                                                                            <span className="text-[9px] font-bold uppercase tracking-wider">
                                                                                {uiLang === 'bn' ? 'এডিট' : 'Edit'}
                                                                            </span>
                                                                        </button>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={() => setRevisingQuestionNode(q)} 
                                                                            className="p-1 px-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded flex items-center gap-0.5 border border-transparent hover:border-amber-100 transition-all" 
                                                                            title={uiLang === 'bn' ? 'সংশোধন প্রস্তাব করুন' : 'Suggest a Revision'}
                                                                        >
                                                                            <RotateCcw size={11} />
                                                                            <span className="text-[9px] font-bold uppercase tracking-wider">
                                                                                {uiLang === 'bn' ? 'রিভাইস' : 'Revise'}
                                                                            </span>
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => handleAutoSwap(q)} className="p-1 px-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded flex items-center gap-0.5 border border-transparent hover:border-indigo-100" title="Auto Swap"><RefreshCw size={11} /> <span className="text-[9px] font-bold uppercase tracking-wider">Auto</span></button>
                                                                    <button onClick={() => {
                                                                        window.dispatchEvent(new CustomEvent('nexusSwapRequested', { detail: { pos: q.pos, nodeSize: q.nodeSize, attrs: q.attrs } }));
                                                                    }} className="p-1 px-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded flex items-center gap-0.5 border border-transparent hover:border-blue-100" title="Manual Swap"><RefreshCw size={11} /> <span className="text-[9px] font-bold uppercase tracking-wider">Manual</span></button>
                                                                    <button onClick={() => {
                                                                        if(window.confirm("Are you sure you want to delete this question?")) {
                                                                            window.dispatchEvent(new CustomEvent('nexusDeleteNodeRequested', { detail: { pos: q.pos, nodeSize: q.nodeSize } }));
                                                                            addToast(uiLang === 'bn' ? 'প্রশ্নটি মুছে ফেলা হয়েছে।' : 'Question has been deleted.', 'info');
                                                                        }
                                                                    }} className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Delete Question"><Trash2 size={13} /></button>
                                                                </div>
                                                            </div>
                                                            {/* In-between Add Question Button Line */}
                                                            <div className="relative py-0.5 group/insert flex items-center justify-center">
                                                                <div className="absolute inset-0 flex items-center">
                                                                    <div className="w-full border-t border-dashed border-slate-200 group-hover/insert:border-indigo-300 transition-colors" />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setCreateModalConfig({
                                                                        isOpen: true,
                                                                        defaultType: q.attrs.type || getSectionDefaultType(group.section, isMCQ),
                                                                        targetSectionId: secId,
                                                                        insertAfterIndex: idx
                                                                    })}
                                                                    className="relative z-10 opacity-0 group-hover/insert:opacity-100 transition-all bg-white hover:bg-indigo-600 text-slate-500 hover:text-white border border-slate-200 hover:border-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-black shadow-xs flex items-center gap-1 scale-90 group-hover/insert:scale-100"
                                                                >
                                                                    <Plus size={10} />
                                                                    <span>{uiLang === 'bn' ? 'এখানে নতুন প্রশ্ন তৈরি করুন' : 'Insert Question Here'}</span>
                                                                </button>
                                                            </div>
                                                        </React.Fragment>
                                                        );
                                                    })}
                                                    {/* Bottom of Section Add Question Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setCreateModalConfig({
                                                            isOpen: true,
                                                            defaultType: getSectionDefaultType(group.section, isMCQ),
                                                            targetSectionId: secId,
                                                            insertAfterIndex: group.questions[group.questions.length - 1]?.globalIndex ?? null
                                                        })}
                                                        className="w-full py-1.5 bg-white hover:bg-indigo-50 border border-dashed border-slate-200 hover:border-indigo-300 rounded-lg text-slate-500 hover:text-indigo-700 text-[10.5px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs mt-1"
                                                    >
                                                        <Plus size={12} />
                                                        <span>{uiLang === 'bn' ? '➕ এই বিভাগে নতুন প্রশ্ন তৈরি করুন' : '➕ Add Question to Section'}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
 
            {revisingQuestionNode && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 md:p-6 print:hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col relative border border-slate-700/30">
                        {/* Modern Dark Header Bar */}
                        <div className="flex justify-between items-center px-4 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm z-10 border-b border-slate-800 shrink-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1.5 bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 rounded-lg shadow-2xs shrink-0">
                                    {editorMode === 'FREE_EDIT' ? <Edit3 size={15} strokeWidth={2.5} /> : <RotateCcw size={15} strokeWidth={2.5} />}
                                </div>
                                <div className="truncate">
                                    <h2 className="text-xs font-black text-white tracking-tight flex items-center gap-2">
                                        <span>
                                            {editorMode === 'FREE_EDIT' 
                                                ? (uiLang === 'bn' ? 'প্রশ্ন সম্পাদনা' : 'Edit Question') 
                                                : (uiLang === 'bn' ? 'প্রশ্ন সংশোধন (রিভিশন)' : 'Suggest a Revision')
                                            }
                                        </span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-500/30 text-indigo-200 rounded border border-indigo-400/30 uppercase font-mono">
                                            {revisingQuestionNode.attrs?.type || 'Q'}
                                        </span>
                                    </h2>
                                    <p className="text-[10px] text-slate-300 font-normal truncate">
                                        {editorMode === 'FREE_EDIT'
                                            ? (uiLang === 'bn' ? 'পরিবর্তনগুলো সরাসরি ক্যানভাস এবং ডাটাবেজে সংরক্ষিত হবে।' : 'Changes update canvas and database instantly.')
                                            : (uiLang === 'bn' ? 'পরিবর্তনগুলো অ্যাডমিনের অনুমোদনের পর চূড়ান্ত হবে।' : 'Changes await admin approval.')
                                        }
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setRevisingQuestionNode(null)} 
                                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95 border border-transparent shrink-0"
                                title="Close"
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        {/* Editor Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 relative p-3">
                            <QuestionEdit 
                                inlineId={revisingQuestionNode.attrs.questionId} 
                                forceMode={editorMode === 'FREE_EDIT' ? 'edit' : 'revise'} 
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

            {/* Question Create & Insert Modal */}
            {createModalConfig.isOpen && (
                <QuestionCreateModal
                    isOpen={createModalConfig.isOpen}
                    onClose={() => setCreateModalConfig(prev => ({ ...prev, isOpen: false }))}
                    defaultType={createModalConfig.defaultType}
                    targetSectionId={createModalConfig.targetSectionId}
                    insertAfterIndex={createModalConfig.insertAfterIndex}
                />
            )}
        </div>
    );
};

export default LeftSidebar;
