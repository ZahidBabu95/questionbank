import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Sparkles, Check, AlertTriangle, Plus, Trash2, Book, 
    Layers, Image as ImageIcon, Upload, Loader2, Tag, ChevronDown, ChevronUp, Save,
    CheckSquare, FileText, Settings, HelpCircle, FileSpreadsheet
} from 'lucide-react';
import academicService from '../../../../../services/academicService';
import questionService from '../../../../../services/questionService';
import RichTextEditorComponent from '../../../../../components/RichTextEditor';
import QuestionSourceTagger from '../../../QuestionBank/components/QuestionSourceTagger';
import ImageEditorModal from '../../../../../components/ImageEditorModal';
import { useNexusEditor } from '../context/NexusEditorContext';

// ═══ Bloom's Taxonomy NCTB Framework ═══
const BLOOM_LEVELS = {
    KNOWLEDGE: { label: 'Knowledge (জ্ঞান)', bn: 'জ্ঞানমূলক', color: 'bg-blue-50 text-blue-700 border-blue-200', active: 'bg-blue-600 text-white' },
    COMPREHENSION: { label: 'Comprehension (অনুধাবন)', bn: 'অনুধাবনমূলক', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', active: 'bg-emerald-600 text-white' },
    APPLICATION: { label: 'Application (প্রয়োগ)', bn: 'প্রয়োগমূলক', color: 'bg-amber-50 text-amber-700 border-amber-200', active: 'bg-amber-600 text-white' },
    HIGHER_ORDER: { label: 'Higher Order (উচ্চতর দক্ষতা)', bn: 'উচ্চতর দক্ষতা', color: 'bg-rose-50 text-rose-700 border-rose-200', active: 'bg-rose-600 text-white' }
};

// ═══ MCQ Types ═══
const MCQ_TYPES = {
    SIMPLE: { label: 'সাধারন বহুনির্বাচনি', desc: 'একটি প্রশ্ন + ৪টি বিকল্প উত্তর' },
    MULTIPLE_COMPLETION: { label: 'বহুপদী সমাপ্তিসূচক', desc: '৩টি তথ্য/বিবৃতি (i, ii, iii) থেকে সমন্বয় করে ৪টি বিকল্প' },
    SITUATION_SET: { label: 'অভিন্ন তথ্যভিত্তিক', desc: 'উদ্দীপক দিয়ে একাধিক প্রশ্ন' }
};

// ═══ CQ Structures (NCTB) ═══
const CQ_STRUCTURES = {
    STANDARD: {
        label: 'সাধারণ (৪ অংশ - ১০ নম্বর)',
        subtitle: 'বাংলা, ইংরেজি, বিজ্ঞান, সামাজিক বিজ্ঞান',
        totalMarks: 10,
        parts: [
            { label: 'ক', marks: 1, level: 'জ্ঞানমূলক', placeholder: 'জ্ঞানমূলক — সংজ্ঞা, তথ্য, সরাসরি উত্তর...' },
            { label: 'খ', marks: 2, level: 'অনুধাবনমূলক', placeholder: 'অনুধাবনমূলক — ব্যাখ্যা, বর্ণনা, পার্থক্য...' },
            { label: 'গ', marks: 3, level: 'প্রয়োগমূলক', placeholder: 'প্রয়োগমূলক — উদ্দীপকের আলোকে প্রয়োগ...' },
            { label: 'ঘ', marks: 4, level: 'উচ্চতর দক্ষতা', placeholder: 'উচ্চতর দক্ষতা — বিশ্লেষণ, মূল্যায়ন, যুক্তি...' }
        ]
    },
    MATH: {
        label: 'গণিত/বিজ্ঞান (৩ অংশ - ১০ নম্বর)',
        subtitle: 'উচ্চতর গণিত, সাধারণ গণিত, পদার্থবিজ্ঞান',
        totalMarks: 10,
        parts: [
            { label: 'ক', marks: 2, level: 'জ্ঞান/অনুধাবন', placeholder: 'সংজ্ঞা, সূত্র, সমীকরণ — সরাসরি...' },
            { label: 'খ', marks: 4, level: 'প্রয়োগমূলক', placeholder: 'সমস্যা সমাধান, প্রমাণ, নির্ণয় — উদ্দীপক ভিত্তিক...' },
            { label: 'গ', marks: 4, level: 'উচ্চতর দক্ষতা', placeholder: 'বিশ্লেষণ, প্রমাণ, যাচাই — উদ্দীপক ভিত্তিক...' }
        ]
    }
};

const QuestionCreateModal = ({ 
    isOpen, 
    onClose, 
    defaultType = 'MCQ',
    targetSectionId = null,
    insertAfterIndex = null,
    onQuestionCreated 
}) => {
    const { 
        uiLang, t, examData, docSettings, 
        editor, setRawContent, addToast, documentQuestions 
    } = useNexusEditor();

    // Determine exact target question type without any manual tab switching
    const normalizeType = (t) => {
        if (!t) return 'MCQ';
        const upper = t.toString().toUpperCase().trim();
        if (upper === 'MCQ' || upper.includes('বহুনির্বাচন') || upper.includes('MULTIPLE_CHOICE')) return 'MCQ';
        if (upper === 'CQ' || upper.includes('CREATIVE') || upper.includes('সৃজনশীল') || upper.includes('রচনামূলক')) return 'CQ';
        if (upper === 'SHORT' || upper.includes('SHORT_ANSWER') || upper.includes('সংক্ষিপ্ত')) return 'SHORT';
        if (upper === 'DYNAMIC' || upper.includes('ডায়নামিক') || upper.includes('ডায়নামিক')) return 'DYNAMIC';
        if (upper.includes('MCQ')) return 'MCQ';
        if (upper.includes('CQ')) return 'CQ';
        return 'MCQ';
    };

    const targetType = normalizeType(defaultType);

    const [mcqType, setMcqType] = useState('SIMPLE');
    const [cqStructure, setCqStructure] = useState('STANDARD');

    const subjectId = examData?.classSubjectId || examData?.subjectId || docSettings?.subjectId || '';
    const subjectName = examData?.subjectName || docSettings?.subject || 'বিষয়';
    const className = examData?.className || docSettings?.className || 'শ্রেণি';
    const academicClassId = examData?.classId || docSettings?.classId || '';

    // Academic Data
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [selectedChapterId, setSelectedChapterId] = useState('');
    const [selectedTopicId, setSelectedTopicId] = useState('');

    // Common Form Fields
    const [questionText, setQuestionText] = useState('');
    const [stimulus, setStimulus] = useState('');
    const [explanation, setExplanation] = useState('');
    const [difficulty, setDifficulty] = useState('MEDIUM');
    const [bloomLevel, setBloomLevel] = useState('KNOWLEDGE');
    const [marks, setMarks] = useState(targetType === 'CQ' ? 10 : (targetType === 'SHORT' ? 2 : 1));
    const [language, setLanguage] = useState(docSettings?.language || 'Bangla');

    // Dynamic Variables (for DYNAMIC question type)
    const [dynamicVariables, setDynamicVariables] = useState([
        { name: 'a', min: 1, max: 10, step: 1 },
        { name: 'b', min: 2, max: 20, step: 2 }
    ]);
    const [dynamicFormula, setDynamicFormula] = useState('{a} + {b}');

    // MCQ Options
    const [options, setOptions] = useState([
        { optionLabel: 'ক', optionText: '', isCorrect: false },
        { optionLabel: 'খ', optionText: '', isCorrect: false },
        { optionLabel: 'গ', optionText: '', isCorrect: false },
        { optionLabel: 'ঘ', optionText: '', isCorrect: false }
    ]);

    // Multiple Completion Statements
    const [statements, setStatements] = useState([
        { label: 'i', text: '' },
        { label: 'ii', text: '' },
        { label: 'iii', text: '' }
    ]);

    // Situation Set Multiple Questions
    const [situationQuestions, setSituationQuestions] = useState([
        {
            questionText: '',
            explanation: '',
            options: [
                { optionLabel: 'ক', optionText: '', isCorrect: false },
                { optionLabel: 'খ', optionText: '', isCorrect: false },
                { optionLabel: 'গ', optionText: '', isCorrect: false },
                { optionLabel: 'ঘ', optionText: '', isCorrect: false }
            ]
        }
    ]);

    // CQ Parts
    const [cqParts, setCqParts] = useState(
        CQ_STRUCTURES.STANDARD.parts.map(p => ({ label: p.label, marks: p.marks, text: '', answer: '', explanation: '' }))
    );

    // Source Tagging
    const [examSources, setExamSources] = useState([]);
    const [showSourceTagger, setShowSourceTagger] = useState(false);

    // Image Upload & Crop
    const [editingImageFile, setEditingImageFile] = useState(null);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [isSaving, setIsSaving] = useState(false);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            const currentNorm = normalizeType(defaultType);
            if (currentNorm === 'CQ') setMarks(10);
            else if (currentNorm === 'SHORT') setMarks(2);
            else setMarks(1);

            setQuestionText('');
            setStimulus('');
            setExplanation('');
            setOptions([
                { optionLabel: 'ক', optionText: '', isCorrect: false },
                { optionLabel: 'খ', optionText: '', isCorrect: false },
                { optionLabel: 'গ', optionText: '', isCorrect: false },
                { optionLabel: 'ঘ', optionText: '', isCorrect: false }
            ]);
            setStatements([
                { label: 'i', text: '' },
                { label: 'ii', text: '' },
                { label: 'iii', text: '' }
            ]);
            setCqParts(
                CQ_STRUCTURES.STANDARD.parts.map(p => ({ label: p.label, marks: p.marks, text: '', answer: '', explanation: '' }))
            );
        }
    }, [isOpen, defaultType]);

    // Load chapters for current class & subject
    useEffect(() => {
        if (isOpen && subjectId) {
            academicService.getChaptersByClassSubject(subjectId)
                .then(data => {
                    const list = Array.isArray(data) ? data : (data?.content || []);
                    setChapters(list);
                    if (list.length > 0 && !selectedChapterId) {
                        setSelectedChapterId(list[0].id);
                    }
                })
                .catch(console.error);
        }
    }, [isOpen, subjectId]);

    // Load topics when chapter changes
    useEffect(() => {
        if (selectedChapterId) {
            academicService.getTopicsByChapter(selectedChapterId)
                .then(data => {
                    const list = Array.isArray(data) ? data : (data?.content || []);
                    setTopics(list);
                })
                .catch(console.error);
        } else {
            setTopics([]);
        }
    }, [selectedChapterId]);

    const handleMcqTypeChange = (type) => {
        setMcqType(type);
        if (type === 'MULTIPLE_COMPLETION') {
            setOptions([
                { optionLabel: 'ক', optionText: 'i ও ii', isCorrect: false },
                { optionLabel: 'খ', optionText: 'i ও iii', isCorrect: false },
                { optionLabel: 'গ', optionText: 'ii ও iii', isCorrect: false },
                { optionLabel: 'ঘ', optionText: 'i, ii ও iii', isCorrect: false }
            ]);
        } else {
            setOptions([
                { optionLabel: 'ক', optionText: '', isCorrect: false },
                { optionLabel: 'খ', optionText: '', isCorrect: false },
                { optionLabel: 'গ', optionText: '', isCorrect: false },
                { optionLabel: 'ঘ', optionText: '', isCorrect: false }
            ]);
        }
    };

    const handleCqStructureChange = (structKey) => {
        setCqStructure(structKey);
        const struct = CQ_STRUCTURES[structKey];
        setCqParts(struct.parts.map(p => ({ label: p.label, marks: p.marks, text: '', answer: '', explanation: '' })));
    };

    const handleImageEditorSave = async (processedFile) => {
        setImageUploading(true);
        try {
            const r = await questionService.uploadStimulusImage(processedFile);
            if (r.url) {
                const imgMarkdown = `\n![ছবি](${r.url})\n`;
                setStimulus(prev => (prev || '') + imgMarkdown);
                addToast(uiLang === 'bn' ? 'ছবি যুক্ত করা হয়েছে।' : 'Image attached.', 'success');
            }
        } catch (err) {
            console.error("Image upload failed", err);
            addToast(uiLang === 'bn' ? 'ছবি আপলোড ব্যর্থ হয়েছে।' : 'Image upload failed.', 'error');
        } finally {
            setImageUploading(false);
            setShowImageEditor(false);
            setEditingImageFile(null);
        }
    };

    const handleSaveAndInsert = async () => {
        if (!selectedChapterId && chapters.length > 0) {
            addToast(uiLang === 'bn' ? 'অনুগ্রহ করে অধ্যায় নির্বাচন করুন।' : 'Please select a chapter.', 'warning');
            return;
        }

        // Validation based on exact question type
        if (targetType === 'MCQ') {
            if (!questionText.trim()) {
                addToast(uiLang === 'bn' ? 'প্রশ্নের মূল টেক্সট লিখুন।' : 'Please write question text.', 'warning');
                return;
            }
            if (options.some(o => !o.optionText.trim())) {
                addToast(uiLang === 'bn' ? 'সকল বিকল্পের উত্তর পূরণ করুন।' : 'Please fill all options.', 'warning');
                return;
            }
            if (!options.some(o => o.isCorrect)) {
                addToast(uiLang === 'bn' ? 'একটি সঠিক উত্তর (Correct Answer) নির্বাচন করুন।' : 'Please select the correct answer.', 'warning');
                return;
            }
        } else if (targetType === 'CQ') {
            if (cqParts.some(p => !p.text.trim())) {
                addToast(uiLang === 'bn' ? 'সৃজনশীল প্রশ্নের প্রতিটি সাব-পার্ট (ক, খ, গ...) পূরণ করুন।' : 'Please fill all CQ parts.', 'warning');
                return;
            }
        } else if (targetType === 'SHORT') {
            if (!questionText.trim()) {
                addToast(uiLang === 'bn' ? 'সংক্ষিপ্ত প্রশ্নের টেক্সট লিখুন।' : 'Please write short question text.', 'warning');
                return;
            }
        } else if (targetType === 'DYNAMIC') {
            if (!questionText.trim()) {
                addToast(uiLang === 'bn' ? 'ডায়নামিক প্রশ্নের টেমপ্লেট টেক্সট লিখুন।' : 'Please write dynamic question template.', 'warning');
                return;
            }
        }

        setIsSaving(true);
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};
            const instituteId = user?.instituteId || null;

            let savedQuestion = null;

            if (targetType === 'MCQ') {
                const mcqPayload = {
                    classSubject: subjectId ? { id: subjectId } : null,
                    chapter: selectedChapterId ? { id: selectedChapterId } : null,
                    topic: selectedTopicId ? { id: selectedTopicId } : null,
                    questionText: questionText,
                    stimulus: stimulus || '',
                    bloomLevel: bloomLevel,
                    difficulty: difficulty,
                    language: language,
                    explanation: explanation || '',
                    mcqType: mcqType,
                    marks: parseFloat(marks) || 1,
                    statements: mcqType === 'MULTIPLE_COMPLETION' ? statements.map(s => `${s.label}. ${s.text}`) : [],
                    status: 'APPROVED',
                    instituteId: instituteId
                };

                const formattedOptions = options.map((opt, i) => ({
                    optionLabel: opt.optionLabel || ['ক', 'খ', 'গ', 'ঘ'][i],
                    optionText: opt.optionText,
                    isCorrect: !!opt.isCorrect
                }));

                const metadata = examSources.length > 0 ? { examSources } : null;
                const res = await questionService.createMCQ(mcqPayload, formattedOptions, metadata);
                savedQuestion = res?.data || res;
            } else if (targetType === 'CQ') {
                const cqPayload = {
                    classSubject: subjectId ? { id: subjectId } : null,
                    chapter: selectedChapterId ? { id: selectedChapterId } : null,
                    topic: selectedTopicId ? { id: selectedTopicId } : null,
                    questionText: stimulus || '',
                    stem: stimulus || '',
                    difficulty: difficulty,
                    language: language,
                    status: 'APPROVED',
                    instituteId: instituteId,
                    subQuestions: cqParts.map(p => ({
                        label: p.label,
                        text: p.text,
                        marks: p.marks,
                        answer: p.answer || '',
                        explanation: p.explanation || ''
                    }))
                };

                const res = await questionService.createCQ(cqPayload);
                savedQuestion = res?.data || res;
            } else if (targetType === 'SHORT') {
                const shortPayload = {
                    questionText: questionText,
                    marks: parseFloat(marks) || 2,
                    difficulty: difficulty,
                    language: language,
                    explanation: explanation || '',
                    bloomLevel: bloomLevel,
                    stimulus: stimulus || '',
                    classSubject: subjectId ? { id: subjectId } : null,
                    chapter: selectedChapterId ? { id: selectedChapterId } : null,
                    topic: selectedTopicId ? { id: selectedTopicId } : null,
                    sources: examSources.length > 0 ? examSources : [],
                    status: 'APPROVED',
                    instituteId: instituteId
                };
                const res = await questionService.createShortQuestion(shortPayload);
                savedQuestion = res?.data || res;
            } else if (targetType === 'DYNAMIC') {
                const dynamicPayload = {
                    classSubject: subjectId ? { id: subjectId } : null,
                    chapter: selectedChapterId ? { id: selectedChapterId } : null,
                    topic: selectedTopicId ? { id: selectedTopicId } : null,
                    questionText: questionText,
                    stimulus: stimulus || '',
                    bloomLevel: bloomLevel,
                    difficulty: difficulty,
                    language: language,
                    explanation: explanation || '',
                    marks: parseFloat(marks) || 1,
                    type: 'DYNAMIC',
                    dynamicData: JSON.stringify({
                        variables: dynamicVariables,
                        formula: dynamicFormula
                    }),
                    status: 'APPROVED',
                    instituteId: instituteId
                };
                const res = await questionService.createQuestion(dynamicPayload);
                savedQuestion = res?.data || res;
            }

            if (!savedQuestion || (!savedQuestion.id && !savedQuestion.questionId)) {
                throw new Error("Invalid response from question creation API");
            }

            const qId = savedQuestion.id || savedQuestion.questionId;
            
            // Auto bookmark to favorites and clear question cache so it immediately appears in My Saved and Question Bank
            try {
                await questionService.toggleFavorite(qId);
            } catch (favErr) {}
            if (questionService.clearQuestionCache) {
                questionService.clearQuestionCache();
            }

            const chapterObj = chapters.find(c => c.id === selectedChapterId);
            const targetSec = docSettings.sections?.find(s => s.id === targetSectionId) 
                           || docSettings.sections?.find(s => s.isMCQ === (targetType === 'MCQ')) 
                           || docSettings.sections?.[0] || {};

            // Prepare TipTap questionBlock node attributes
            let dynamicDataStr = null;
            if (targetType === 'CQ') {
                dynamicDataStr = JSON.stringify({
                    stem: stimulus || '',
                    parts: cqParts.map(p => ({
                        label: p.label,
                        text: p.text,
                        marks: p.marks,
                        answer: p.answer || '',
                        explanation: p.explanation || ''
                    }))
                });
            } else if (targetType === 'DYNAMIC') {
                dynamicDataStr = JSON.stringify({
                    variables: dynamicVariables,
                    formula: dynamicFormula
                });
            }

            const newBlockAttrs = {
                questionId: qId,
                sectionId: targetSec.id || null,
                subjectId: subjectId,
                chapterId: selectedChapterId,
                type: targetType,
                questionText: targetType === 'CQ' ? '' : questionText,
                stimulus: stimulus || '',
                explanation: explanation || '',
                answer: targetType === 'MCQ' ? (options.find(o => o.isCorrect)?.optionLabel || '') : (explanation || ''),
                syncedFromDb: true,
                language: language,
                statements: targetType === 'MCQ' && mcqType === 'MULTIPLE_COMPLETION' ? statements.map(s => `${s.label}. ${s.text}`) : [],
                chapterName: chapterObj?.name || subjectName || 'General',
                marks: targetType === 'CQ' ? 10 : parseFloat(marks) || 1,
                numberingStyle: targetSec.numberingStyle || 'bn',
                marksConfig: targetSec.marksConfig || 'hide',
                optionLayout: targetSec.optionLayout || 'col1',
                optionStyle: targetSec.optionStyle || 'bn',
                optionDecoration: targetSec.optionDecoration || 'rightBracket',
                dynamicData: dynamicDataStr,
                options: targetType === 'MCQ' ? options.map(opt => ({ ...opt, optionText: opt.optionText })) : []
            };

            // Programmatically insert into ProseMirror editor
            if (editor) {
                const { schema } = editor.state;
                const node = schema.nodes.questionBlock.create(newBlockAttrs);
                let tr = editor.state.tr;

                if (insertAfterIndex !== null && insertAfterIndex >= 0 && insertAfterIndex < documentQuestions.length) {
                    const targetDocQ = documentQuestions[insertAfterIndex];
                    const insertPos = targetDocQ.pos + targetDocQ.nodeSize;
                    tr = tr.insert(insertPos, node);
                } else {
                    tr = tr.insert(tr.doc.content.size, node);
                }

                editor.view.dispatch(tr);
                setRawContent(editor.getHTML());
                window.dispatchEvent(new CustomEvent('nexus-editor-rerender'));
            }

            addToast(
                uiLang === 'bn' 
                    ? 'প্রশ্নটি প্রতিষ্ঠানের প্রশ্ন ব্যাংকে সংরক্ষিত ও ডকুমেন্টে যুক্ত হয়েছে!' 
                    : 'Question saved to institute question bank & added to exam!', 
                'success'
            );

            if (onQuestionCreated) {
                onQuestionCreated(newBlockAttrs, insertAfterIndex);
            }
            onClose();
        } catch (err) {
            console.error("Failed to save and insert question", err);
            addToast(uiLang === 'bn' ? 'প্রশ্ন সংরক্ষণে সমস্যা হয়েছে: ' + (err.response?.data?.message || err.message) : 'Failed to save question.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // Header badge & title according to the specific question type
    const getHeaderInfo = () => {
        if (targetType === 'MCQ') {
            return {
                title: uiLang === 'bn' ? 'বহুনির্বাচনী প্রশ্ন তৈরি (MCQ Create)' : 'Create MCQ Question',
                badge: 'MCQ (বহুনির্বাচনী)',
                badgeClass: 'bg-blue-500/30 text-blue-200 border-blue-400/30'
            };
        } else if (targetType === 'CQ') {
            return {
                title: uiLang === 'bn' ? 'সৃজনশীল প্রশ্ন তৈরি (CQ Create)' : 'Create Creative Question (CQ)',
                badge: 'CQ (সৃজনশীল)',
                badgeClass: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30'
            };
        } else if (targetType === 'SHORT') {
            return {
                title: uiLang === 'bn' ? 'সংক্ষিপ্ত প্রশ্ন তৈরি (Short Question Create)' : 'Create Short Question',
                badge: 'SHORT (সংক্ষিপ্ত)',
                badgeClass: 'bg-amber-500/30 text-amber-200 border-amber-400/30'
            };
        } else {
            return {
                title: uiLang === 'bn' ? 'ডায়নামিক প্রশ্ন তৈরি (Dynamic Question Create)' : 'Create Dynamic Question',
                badge: 'DYNAMIC (ডায়নামিক)',
                badgeClass: 'bg-purple-500/30 text-purple-200 border-purple-400/30'
            };
        }
    };

    const headerInfo = getHeaderInfo();

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
            <div 
                className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs">
                            <Sparkles size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black tracking-tight">
                                    {headerInfo.title}
                                </h3>
                                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${headerInfo.badgeClass}`}>
                                    {headerInfo.badge}
                                </span>
                            </div>
                            <p className="text-[10.5px] text-slate-300 font-medium">
                                {className} • {subjectName} (সংরক্ষণ করলে প্রতিষ্ঠানের প্রশ্ন ব্যাংকে যুক্ত হবে)
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-50/50">
                    
                    {/* Structure Picker (For MCQ or CQ) */}
                    {targetType === 'MCQ' && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                {uiLang === 'bn' ? 'MCQ কাঠামো' : 'MCQ Structure'}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(MCQ_TYPES).filter(([k]) => k !== 'SITUATION_SET').map(([k, v]) => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => handleMcqTypeChange(k)}
                                        className={`p-2 rounded-xl text-left border transition-all ${
                                            mcqType === k 
                                                ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/50 text-blue-950 font-bold' 
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="text-xs font-black">{v.label}</div>
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">{v.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {targetType === 'CQ' && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                {uiLang === 'bn' ? 'সৃজনশীল প্রশ্নের কাঠামো (NCTB)' : 'CQ Structure'}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(CQ_STRUCTURES).map(([k, v]) => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => handleCqStructureChange(k)}
                                        className={`p-2 rounded-xl text-left border transition-all ${
                                            cqStructure === k 
                                                ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/50 text-emerald-950 font-bold' 
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="text-xs font-black">{v.label}</div>
                                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">{v.subtitle}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Academic Context (Chapter & Topic) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div>
                            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                {uiLang === 'bn' ? 'অধ্যায় *' : 'Chapter *'}
                            </label>
                            <select
                                value={selectedChapterId}
                                onChange={(e) => setSelectedChapterId(e.target.value)}
                                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 text-slate-800"
                            >
                                <option value="">{uiLang === 'bn' ? '-- অধ্যায় নির্বাচন করুন --' : '-- Select Chapter --'}</option>
                                {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                {uiLang === 'bn' ? 'টপিক (ঐচ্ছিক)' : 'Topic (Optional)'}
                            </label>
                            <select
                                value={selectedTopicId}
                                onChange={(e) => setSelectedTopicId(e.target.value)}
                                disabled={!selectedChapterId || topics.length === 0}
                                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 text-slate-800 disabled:opacity-50"
                            >
                                <option value="">{uiLang === 'bn' ? '-- সকল টপিক --' : '-- All Topics --'}</option>
                                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Bloom's Level & Difficulty */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div className="sm:col-span-2">
                            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                {uiLang === 'bn' ? 'চিন্তন দক্ষতা (Bloom\'s Level)' : "Bloom's Level"}
                            </label>
                            <div className="grid grid-cols-2 gap-1">
                                {Object.entries(BLOOM_LEVELS).map(([k, v]) => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setBloomLevel(k)}
                                        className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-all text-left truncate ${
                                            bloomLevel === k ? v.active : v.color
                                        }`}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    {uiLang === 'bn' ? 'কঠিনতা' : 'Difficulty'}
                                </label>
                                <div className="grid grid-cols-3 gap-1">
                                    {[
                                        { id: 'EASY', label: 'সহজ', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', active: 'bg-emerald-600 text-white' },
                                        { id: 'MEDIUM', label: 'মাঝারি', color: 'bg-amber-50 text-amber-700 border-amber-200', active: 'bg-amber-600 text-white' },
                                        { id: 'HARD', label: 'কঠিন', color: 'bg-rose-50 text-rose-700 border-rose-200', active: 'bg-rose-600 text-white' }
                                    ].map(d => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            onClick={() => setDifficulty(d.id)}
                                            className={`py-1 rounded text-[10px] font-black border transition-all text-center ${
                                                difficulty === d.id ? d.active : d.color
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    {uiLang === 'bn' ? 'নম্বর (Marks)' : 'Marks'}
                                </label>
                                <input
                                    type="number"
                                    value={marks}
                                    onChange={(e) => setMarks(e.target.value)}
                                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stimulus / উদ্দীপক Section */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-800">
                                {uiLang === 'bn' ? 'উদ্দীপক / দৃশ্যকল্প (ঐচ্ছিক)' : 'Stimulus / Passage (Optional)'}
                            </span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setEditingImageFile(e.target.files[0]);
                                            setShowImageEditor(true);
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={imageUploading}
                                    className="text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center gap-1 transition-all"
                                >
                                    <ImageIcon size={12} />
                                    <span>{imageUploading ? 'আপলোড হচ্ছে...' : 'ছবি যুক্ত করুন'}</span>
                                </button>
                            </div>
                        </div>
                        <RichTextEditorComponent
                            value={stimulus}
                            onChange={setStimulus}
                            placeholder="উদ্দীপক, অনুচ্ছেদ বা চিত্র লিখুন (যদি থাকে)..."
                            height="h-24"
                            minimal={true}
                            className="text-xs"
                        />
                    </div>

                    {/* ═══ EXACT QUESTION BODY ACCORDING TO TYPE ═══ */}
                    {targetType === 'MCQ' && (
                        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                            <div>
                                <span className="text-xs font-black text-slate-800 block mb-1.5">
                                    {uiLang === 'bn' ? 'মূল প্রশ্ন টেক্সট *' : 'Question Text *'}
                                </span>
                                <RichTextEditorComponent
                                    value={questionText}
                                    onChange={setQuestionText}
                                    placeholder="প্রশ্নের মূল বক্তব্য লিখুন..."
                                    height="h-20"
                                    minimal={true}
                                    className="text-xs"
                                />
                            </div>

                            {/* Multiple Completion Statements */}
                            {mcqType === 'MULTIPLE_COMPLETION' && (
                                <div className="space-y-1.5 bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-100">
                                    <span className="text-[11px] font-bold text-indigo-900 block">
                                        বিবৃতিসমূহ (i, ii, iii):
                                    </span>
                                    {statements.map((stmt, sIdx) => (
                                        <div key={sIdx} className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-indigo-700 text-xs w-5 shrink-0">
                                                {stmt.label}.
                                            </span>
                                            <input
                                                type="text"
                                                value={stmt.text}
                                                onChange={(e) => {
                                                    const copy = [...statements];
                                                    copy[sIdx].text = e.target.value;
                                                    setStatements(copy);
                                                }}
                                                placeholder={`বিবৃতি ${stmt.label} এর টেক্সট...`}
                                                className="flex-1 text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 outline-none focus:border-indigo-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* MCQ Options */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-800">
                                        {uiLang === 'bn' ? 'বিকল্পসমূহ ও সঠিক উত্তর *' : 'Options & Correct Answer *'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                        (সঠিক উত্তরের বিকল্পে টিক দিন)
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {options.map((opt, oIdx) => (
                                        <div 
                                            key={oIdx} 
                                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                                opt.isCorrect 
                                                    ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400/50' 
                                                    : 'bg-slate-50 border-slate-200/80'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOptions(options.map((o, i) => ({ ...o, isCorrect: i === oIdx })));
                                                }}
                                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                                                    opt.isCorrect 
                                                        ? 'bg-emerald-600 text-white shadow-2xs' 
                                                        : 'bg-white border border-slate-300 text-slate-500 hover:border-emerald-400'
                                                }`}
                                                title="সঠিক উত্তর হিসেবে নির্বাচন করুন"
                                            >
                                                {opt.optionLabel}
                                            </button>
                                            <input
                                                type="text"
                                                value={opt.optionText}
                                                onChange={(e) => {
                                                    const copy = [...options];
                                                    copy[oIdx].optionText = e.target.value;
                                                    setOptions(copy);
                                                }}
                                                placeholder={`বিকল্প (${opt.optionLabel}) এর টেক্সট...`}
                                                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-indigo-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {targetType === 'CQ' && (
                        /* CQ Sub-parts (ক, খ, গ, ঘ) */
                        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                            <span className="text-xs font-black text-slate-800 block">
                                {uiLang === 'bn' ? 'সৃজনশীল প্রশ্ন সাব-পার্টসমূহ *' : 'CQ Sub-parts *'}
                            </span>
                            <div className="space-y-2.5">
                                {cqParts.map((part, pIdx) => (
                                    <div key={pIdx} className="bg-slate-50/80 border border-slate-200/80 p-2.5 rounded-xl space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-md bg-slate-800 text-white flex items-center justify-center font-black text-xs font-mono shadow-2xs">
                                                    {part.label}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                    নম্বর: {part.marks}
                                                </span>
                                            </div>
                                        </div>
                                        <RichTextEditorComponent
                                            value={part.text}
                                            onChange={(val) => {
                                                const copy = [...cqParts];
                                                copy[pIdx].text = val;
                                                setCqParts(copy);
                                            }}
                                            placeholder={`${part.label} অংশের প্রশ্ন লিখুন...`}
                                            height="h-16"
                                            minimal={true}
                                            compact={true}
                                            className="text-xs bg-white"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {targetType === 'SHORT' && (
                        /* Short Question Body */
                        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                            <div>
                                <span className="text-xs font-black text-slate-800 block mb-1.5">
                                    {uiLang === 'bn' ? 'সংক্ষিপ্ত প্রশ্ন টেক্সট *' : 'Short Question Text *'}
                                </span>
                                <RichTextEditorComponent
                                    value={questionText}
                                    onChange={setQuestionText}
                                    placeholder="সংক্ষিপ্ত প্রশ্নটি লিখুন..."
                                    height="h-20"
                                    minimal={true}
                                    className="text-xs"
                                />
                            </div>
                        </div>
                    )}

                    {targetType === 'DYNAMIC' && (
                        /* Dynamic Question Body */
                        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                            <div>
                                <span className="text-xs font-black text-slate-800 block mb-1.5">
                                    {uiLang === 'bn' ? 'ডায়নামিক প্রশ্ন টেমপ্লেট টেক্সট *' : 'Dynamic Question Template *'}
                                </span>
                                <RichTextEditorComponent
                                    value={questionText}
                                    onChange={setQuestionText}
                                    placeholder="ডায়নামিক প্রশ্ন লিখুন (যেমন: যদি a = {a} এবং b = {b} হয়, তবে a + b = কত?)..."
                                    height="h-20"
                                    minimal={true}
                                    className="text-xs"
                                />
                            </div>

                            {/* Dynamic Variables list */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                                <span className="text-[11px] font-bold text-slate-700 block">
                                    ডায়নামিক ভ্যারিয়েবলসমূহ:
                                </span>
                                {dynamicVariables.map((v, vIdx) => (
                                    <div key={vIdx} className="flex items-center gap-2 text-xs">
                                        <span className="font-bold text-purple-700 font-mono w-6">{v.name}:</span>
                                        <span className="text-slate-500 text-[10px]">Min:</span>
                                        <input
                                            type="number"
                                            value={v.min}
                                            onChange={(e) => {
                                                const copy = [...dynamicVariables];
                                                copy[vIdx].min = parseFloat(e.target.value);
                                                setDynamicVariables(copy);
                                            }}
                                            className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5"
                                        />
                                        <span className="text-slate-500 text-[10px]">Max:</span>
                                        <input
                                            type="number"
                                            value={v.max}
                                            onChange={(e) => {
                                                const copy = [...dynamicVariables];
                                                copy[vIdx].max = parseFloat(e.target.value);
                                                setDynamicVariables(copy);
                                            }}
                                            className="w-14 bg-white border border-slate-200 rounded px-1.5 py-0.5"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Explanation / সলিউশন */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5">
                        <span className="text-xs font-black text-slate-800 block">
                            {uiLang === 'bn' ? 'উত্তর নির্দেশিকা / ব্যাখ্যা (ঐচ্ছিক)' : 'Answer Guide / Explanation (Optional)'}
                        </span>
                        <RichTextEditorComponent
                            value={explanation}
                            onChange={setExplanation}
                            placeholder="প্রশ্নের সমাধান, সঠিক উত্তরের নির্দেশনা বা ব্যাখ্যা লিখুন..."
                            height="h-16"
                            minimal={true}
                            className="text-xs"
                        />
                    </div>

                    {/* Source Tagging Accordion */}
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowSourceTagger(prev => !prev)}
                            className="w-full p-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <span className="flex items-center gap-1.5">
                                <Tag size={13} className="text-slate-500" />
                                {uiLang === 'bn' ? 'বোর্ড ও স্কুল সোর্স ট্যাগ (Source Tags)' : 'Exam Source Tags'}
                            </span>
                            {showSourceTagger ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {showSourceTagger && (
                            <div className="p-3 pt-0 border-t border-slate-100 mt-1">
                                <QuestionSourceTagger
                                    examSources={examSources}
                                    setExamSources={setExamSources}
                                    isInline={true}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-4 py-3 bg-white border-t border-slate-200/90 flex items-center justify-between shrink-0 shadow-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
                    >
                        {uiLang === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveAndInsert}
                        disabled={isSaving}
                        className="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all flex items-center gap-2 active:scale-98 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>{uiLang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving to Bank...'}</span>
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                <span>{uiLang === 'bn' ? 'সংরক্ষণ ও ডকুমেন্টে যোগ করুন' : 'Save to Bank & Add to Canvas'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Image Cropper Modal */}
            {showImageEditor && editingImageFile && (
                <ImageEditorModal
                    imageFile={editingImageFile}
                    onSave={handleImageEditorSave}
                    onClose={() => {
                        setShowImageEditor(false);
                        setEditingImageFile(null);
                    }}
                />
            )}
        </div>,
        document.body
    );
};

export default QuestionCreateModal;
