import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { 
    PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
    CheckCircle2, AlertTriangle, BookOpen, FileDown, FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import lectureService from '../../../services/lectureService';
import academicService from '../../../services/academicService';
import questionService from '../../../services/questionService';
import LectureToolbar from './components/LectureToolbar';
import LectureLeftNavigator from './components/LectureLeftNavigator';
import LecturePaperCanvas from './components/LecturePaperCanvas';
import LectureRightProperties from './components/LectureRightProperties';
import AttachmentPanel from './components/AttachmentPanel';
import EquationEditorModal from '../../../components/EquationEditorModal';
import ImageEditorModal from '../../../components/ImageEditorModal';
import PresentationWizard from './components/PresentationWizard';
import ImportKnowledgeHubModal from './components/ImportKnowledgeHubModal';

const generateUUID = () => {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const cleanGoldenReference = (html) => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Clean golden references and instruction headings
        const headings = Array.from(doc.querySelectorAll('h3'));
        headings.forEach(h3 => {
            const txt = (h3.textContent || '').trim();
            if (txt.includes('📚 গোল্ডেন সোর্স বুক রিডিং রেফারেন্স') || txt.includes('Reference Source')) {
                let sibling = h3.nextElementSibling;
                h3.remove();
                while (sibling && (sibling.tagName.toLowerCase() === 'br' || sibling.textContent.trim() === '')) {
                    const next = sibling.nextElementSibling;
                    sibling.remove();
                    sibling = next;
                }
            } else if (txt.includes('টপিক সারসংক্ষেপ ও ব্যাখ্যা') || txt.includes('Topic Summary & Explanation')) {
                h3.remove();
            }
        });

        // Clean instruction paragraph texts
        const paragraphs = Array.from(doc.querySelectorAll('p'));
        paragraphs.forEach(p => {
            const txt = (p.textContent || '').trim();
            if (txt.includes('এই টপিকের ওপর আলোচনা ও ব্যাখ্যা') || txt.includes('Write your discussion and explanation here')) {
                p.remove();
            }
        });

        return doc.body.innerHTML;
    } catch (e) {
        console.error("Error cleaning golden reference:", e);
        return html;
    }
};

const generateInitialHtml = (sections) => {
    const container = document.createElement('div');
    if (sections && sections.length > 0) {
        sections.forEach(sec => {
            // 1. Create section header
            const h3 = document.createElement('h3');
            h3.className = 'lecture-section-header';
            h3.setAttribute('data-section-id', sec.id || `new-${Date.now()}`);
            h3.textContent = sec.sectionTitle || 'Untitled Section';
            container.appendChild(h3);

            // 2. Append section content
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = sec.content || '';
            while (contentDiv.firstChild) {
                container.appendChild(contentDiv.firstChild);
            }

            // 3. Group and Append questions category-wise
            if (sec.questions && sec.questions.length > 0) {
                const qsByType = { MCQ: [], CQ: [], SHORT: [], OTHER: [] };
                sec.questions.forEach(q => {
                    const type = q.type || 'MCQ';
                    if (type === 'MCQ') qsByType.MCQ.push(q);
                    else if (type === 'CQ' || type === 'CQ_DESCRIPTIVE') qsByType.CQ.push(q);
                    else if (type === 'SHORT') qsByType.SHORT.push(q);
                    else qsByType.OTHER.push(q);
                });

                const categoryNames = {
                    MCQ: 'বহুনির্বাচনী প্রশ্ন',
                    CQ: 'সৃজনশীল প্রশ্ন',
                    SHORT: 'সংক্ষিপ্ত প্রশ্ন',
                    OTHER: 'অন্যান্য প্রশ্ন'
                };

                ['MCQ', 'CQ', 'SHORT', 'OTHER'].forEach(type => {
                    const qs = qsByType[type];
                    if (qs && qs.length > 0) {
                        // Create category header
                        const catH4 = document.createElement('h4');
                        catH4.className = 'lecture-category-header';
                        catH4.textContent = categoryNames[type];
                        container.appendChild(catH4);

                        // Append questions of this category
                        qs.forEach(q => {
                            const qDiv = document.createElement('div');
                            qDiv.setAttribute('data-type', 'question-block');
                            qDiv.setAttribute('questionid', q.questionId || q.id);
                            qDiv.setAttribute('data-section-id', sec.id);
                            qDiv.setAttribute('type', q.type || 'MCQ');
                            qDiv.setAttribute('questiontext', q.questionText || '');
                            qDiv.setAttribute('marks', String(q.marks || 1));
                            qDiv.setAttribute('data-options', JSON.stringify(q.options || []));
                            qDiv.setAttribute('data-statements', JSON.stringify(q.statements || []));
                            qDiv.setAttribute('stimulus', q.stimulus || '');
                            qDiv.setAttribute('explanation', q.explanation || '');
                            qDiv.setAttribute('answer', q.answer || q.correctAnswer || '');
                            qDiv.setAttribute('chaptername', q.chapterName || '');
                            if (q.mcqType) qDiv.setAttribute('mcqtype', q.mcqType);
                            if (q.difficulty) qDiv.setAttribute('difficulty', q.difficulty);
                            container.appendChild(qDiv);
                        });
                    }
                });
            }
        });
    } else {
        container.innerHTML = '<p></p>';
    }
    return container.innerHTML;
};

const cleanHtmlForSave = (html) => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const qBlocks = doc.querySelectorAll('[data-type="question-block"]');
        qBlocks.forEach(block => {
            block.removeAttribute('data-options');
            block.removeAttribute('data-statements');
            block.removeAttribute('questiontext');
            block.removeAttribute('stimulus');
            block.removeAttribute('explanation');
            block.removeAttribute('answer');
            block.removeAttribute('data-dynamic-data');
            block.setAttribute('syncedfromdb', 'true');
        });
        return doc.body.innerHTML;
    } catch (e) {
        console.error("Failed to clean HTML for save:", e);
        return html;
    }
};

const parseHtmlToSections = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    const sections = [];
    let currentSection = null;
    let currentContentNodes = [];

    const flushCurrentSection = () => {
        if (currentSection) {
            const tempDiv = document.createElement('div');
            currentContentNodes.forEach(node => {
                tempDiv.appendChild(node.cloneNode(true));
            });
            currentSection.content = tempDiv.innerHTML;
            sections.push(currentSection);
        }
    };

    Array.from(body.childNodes).forEach(node => {
        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'h4' && node.classList.contains('lecture-category-header')) {
            // Ignore category headers since they are generated dynamically
            return;
        }
        if (node.nodeType === 1 && node.tagName.toLowerCase() === 'h3' && node.getAttribute('data-section-id')) {
            flushCurrentSection();
            currentSection = {
                id: node.getAttribute('data-section-id'),
                sectionTitle: node.textContent || 'Untitled Section',
                content: '',
                questions: []
            };
            currentContentNodes = [];
        } else if (node.nodeType === 1 && node.getAttribute('data-type') === 'question-block') {
            if (!currentSection) {
                currentSection = {
                    id: 'new-' + Date.now(),
                    sectionTitle: 'Default Section',
                    content: '',
                    questions: []
                };
                currentContentNodes = [];
            }
            const qId = node.getAttribute('questionid') || node.getAttribute('id') || 'q-' + Date.now();
            const optionsRaw = node.getAttribute('data-options');
            let options = [];
            if (optionsRaw) {
                try {
                    options = JSON.parse(optionsRaw);
                } catch (e) {
                    console.error("Failed to parse options in save", e);
                }
            }
            const statementsRaw = node.getAttribute('data-statements');
            let statements = [];
            if (statementsRaw) {
                try {
                    statements = JSON.parse(statementsRaw);
                } catch (e) {
                    console.error("Failed to parse statements in save", e);
                }
            }
            const q = {
                questionId: qId,
                id: qId,
                questionText: node.getAttribute('questiontext') || '',
                type: node.getAttribute('type') || 'MCQ',
                difficulty: node.getAttribute('difficulty') || 'MEDIUM',
                marks: Number(node.getAttribute('marks')) || 1,
                mcqType: node.getAttribute('mcqtype') || 'SINGLE_CHOICE',
                statements: statements,
                options: options,
                stimulus: node.getAttribute('stimulus') || '',
                explanation: node.getAttribute('explanation') || '',
                answer: node.getAttribute('answer') || '',
                chapterName: node.getAttribute('chaptername') || ''
            };
            currentSection.questions.push(q);
        } else {
            if (!currentSection) {
                currentSection = {
                    id: 'new-' + Date.now(),
                    sectionTitle: 'Default Section',
                    content: '',
                    questions: []
                };
                currentContentNodes = [];
            }
            currentContentNodes.push(node);
        }
    });

    flushCurrentSection();
    return sections;
};

const LectureEditor = () => {
    const fileInputRef = React.useRef(null);
    const debouncedEditorChangeRef = React.useRef(null);
    const [equationModalOpen, setEquationModalOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [pendingImageFile, setPendingImageFile] = useState(null);
    const [importModalOpen, setImportModalOpen] = useState(false);

    // Single unified tiptap states
    const [rawContent, setRawContent] = useState('');
    const [editor, setEditor] = useState(null);

    // PDF generation states
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfProgress, setPdfProgress] = useState(0);
    const [pdfStatus, setPdfStatus] = useState('');

    // Presentation wizard states
    const [isPresentationOpen, setIsPresentationOpen] = useState(false);

    // Track active formatting styles for selection/cursor
    const [editorStyles, setEditorStyles] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        fontFamily: null,
        fontSize: null,
        textColor: null,
        highlightColor: null,
        textAlign: 'left',
        isSelectionEmpty: true,
    });

    const fontMap = {
        'font-serif': 'Georgia, serif',
        'font-sans': 'ui-sans-serif, system-ui, sans-serif',
        'font-hind text-lg': 'Hind Siliguri, sans-serif',
        'font-noto text-lg': 'Noto Sans Bengali, sans-serif',
        'font-tiro text-lg': 'Tiro Bangla, serif'
    };

    const getFontFamilyClass = (cssValue) => {
        if (!cssValue) return '';
        const cleanValue = cssValue.replace(/['"]/g, '').toLowerCase();
        for (const [key, value] of Object.entries(fontMap)) {
            const cleanMapped = value.replace(/['"]/g, '').toLowerCase();
            if (cleanMapped === cleanValue || cleanMapped.includes(cleanValue) || cleanValue.includes(cleanMapped)) {
                return key;
            }
        }
        return '';
    };

    useEffect(() => {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        if (document.documentElement) {
            document.documentElement.scrollTop = 0;
        }
    }, []);

    useEffect(() => {
        if (!editor) return;
        
        let timeoutId = null;
        
        const updateStyles = () => {
            if (timeoutId) clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
                if (!editor || editor.isDestroyed) return;
                const attrs = editor.getAttributes('textStyle');
                setEditorStyles({
                    bold: editor.isActive('bold'),
                    italic: editor.isActive('italic'),
                    underline: editor.isActive('underline'),
                    strikethrough: editor.isActive('strike'),
                    fontFamily: attrs.fontFamily || null,
                    fontSize: attrs.fontSize ? parseInt(attrs.fontSize) : null,
                    textColor: attrs.color || null,
                    highlightColor: attrs.highlightColor || null,
                    textAlign: editor.isActive({ textAlign: 'center' }) ? 'center' : 
                                editor.isActive({ textAlign: 'right' }) ? 'right' : 
                                editor.isActive({ textAlign: 'justify' }) ? 'justify' : 'left',
                    isSelectionEmpty: editor.state.selection.empty,
                });
            }, 100); // Debounce to prevent lag during fast typing
        };

        editor.on('selectionUpdate', updateStyles);
        editor.on('focus', updateStyles);
        
        // Initial update
        const attrs = editor.getAttributes('textStyle');
        setEditorStyles({
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            strikethrough: editor.isActive('strike'),
            fontFamily: attrs.fontFamily || null,
            fontSize: attrs.fontSize ? parseInt(attrs.fontSize) : null,
            textColor: attrs.color || null,
            highlightColor: attrs.highlightColor || null,
            textAlign: editor.isActive({ textAlign: 'center' }) ? 'center' : 
                        editor.isActive({ textAlign: 'right' }) ? 'right' : 
                        editor.isActive({ textAlign: 'justify' }) ? 'justify' : 'left',
            isSelectionEmpty: editor.state.selection.empty,
        });

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            editor.off('selectionUpdate', updateStyles);
            editor.off('focus', updateStyles);
        };
    }, [editor]);

    const applyCommand = (e, command, value = null) => {
        let actualCommand = command;
        let actualValue = value;
        
        if (e && typeof e === 'object' && e.preventDefault) {
            e.preventDefault();
        } else if (typeof e === 'string') {
            actualCommand = e;
            actualValue = command;
        }

        if (!editor) return;

        // Formatting commands only work if there is active selection
        const formattingCommands = [
            'bold', 'italic', 'underline', 'strikethrough', 
            'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull',
            'foreColor', 'hiliteColor', 'unsetHighlightColor', 
            'fontSize', 'fontFamily'
        ];

        if (formattingCommands.includes(actualCommand) && editor.state.selection.empty) {
            return;
        }

        const cmdMap = {
            'undo': () => editor.chain().focus().undo().run(),
            'redo': () => editor.chain().focus().redo().run(),
            'bold': () => editor.chain().focus().toggleBold().run(),
            'italic': () => editor.chain().focus().toggleItalic().run(),
            'underline': () => editor.chain().focus().toggleUnderline().run(),
            'strikethrough': () => editor.chain().focus().toggleStrike().run(),
            'justifyLeft': () => editor.chain().focus().setTextAlign('left').run(),
            'justifyCenter': () => editor.chain().focus().setTextAlign('center').run(),
            'justifyRight': () => editor.chain().focus().setTextAlign('right').run(),
            'justifyFull': () => editor.chain().focus().setTextAlign('justify').run(),
            'foreColor': () => editor.chain().focus().setColor(actualValue).run(),
            'hiliteColor': () => editor.chain().focus().setHighlightColor(actualValue).run(),
            'unsetHighlightColor': () => editor.chain().focus().unsetHighlightColor().run(),
            'fontSize': () => editor.chain().focus().setFontSize(actualValue).run(),
            'fontFamily': () => editor.chain().focus().setFontFamily(actualValue).run(),
            'insertHTML': () => editor.chain().focus().insertContent(actualValue).run(),
        };

        if (cmdMap[actualCommand]) {
            cmdMap[actualCommand]();
        }
    };

    const handleFontFamilyChange = (familyClass) => {
        const cssValue = fontMap[familyClass] || familyClass;
        if (editor && !editor.state.selection.empty) {
            editor.chain().focus().setFontFamily(cssValue).run();
        }
    };

    const handleFontSizeChange = (size) => {
        const pxValue = `${size}px`;
        if (editor && !editor.state.selection.empty) {
            editor.chain().focus().setFontSize(pxValue).run();
        } else {
            setConfig(prev => ({ ...prev, fontSize: size }));
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setPendingImageFile(file);
            setImageModalOpen(true);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImageSave = (finalFile) => {
        if (!editor) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const imgHtml = `<img src="${reader.result}" alt="inserted image" style="max-width: 100%; max-height: 250px; display: block; margin: 8px 0; border-radius: 4px;" />`;
            editor.chain().focus().insertContent(imgHtml).run();
        };
        reader.readAsDataURL(finalFile);
    };

    const handleEquationInsert = (html, latex) => {
        if (!editor) return;
        editor.chain().focus().insertContent(html).run();
    };

    const addQuestion = (type) => {
        if (!activeSectionId) {
            triggerToast('error', 'প্রশ্ন যোগ করার আগে অনুগ্রহ করে একটি সেকশন সিলেক্ট করুন!');
            return;
        }
        
        const qId = generateUUID();
        const options = type === 'MCQ' ? [
            { optionText: 'Option A', isCorrect: false },
            { optionText: 'Option B', isCorrect: false },
            { optionText: 'Option C', isCorrect: false },
            { optionText: 'Option D', isCorrect: false }
        ] : [];
        
        const tempDiv = document.createElement('div');
        const qDiv = document.createElement('div');
        qDiv.setAttribute('data-type', 'question-block');
        qDiv.setAttribute('questionid', qId);
        qDiv.setAttribute('data-section-id', activeSectionId);
        qDiv.setAttribute('type', type);
        qDiv.setAttribute('questiontext', type === 'MCQ' ? 'নতুন বহুনির্বাচনী প্রশ্ন...' : 'নতুন সৃজনশীল/লিখিত প্রশ্ন...');
        qDiv.setAttribute('marks', String(type === 'MCQ' ? 1 : 10));
        qDiv.setAttribute('data-options', JSON.stringify(options));
        qDiv.setAttribute('data-statements', JSON.stringify([]));
        tempDiv.appendChild(qDiv);
        
        const questionHtml = tempDiv.innerHTML;

        if (editor) {
            editor.chain().focus().insertContent(questionHtml).run();
        } else {
            setRawContent(prev => prev + questionHtml);
        }

        triggerToast('success', 'নতুন প্রশ্ন যোগ করা হয়েছে!');
    };

    const handleImportSuccess = (htmlContent, matchedTopics, classSubjectId, chapterId) => {
        if (!editor) return;
        
        let cName = lecture.className;
        let sName = lecture.subjectName;
        if (classSubjectId && hierarchy?.classSubjects) {
            const cs = hierarchy.classSubjects.find(c => c.id === classSubjectId);
            if (cs) {
                sName = cs.name || cs.subjectName || '';
                const cl = hierarchy.classes?.find(x => x.id === cs._classId);
                if (cl) cName = cl.name || '';
            }
        }

        setLecture(prev => {
            const existingSections = prev.sections || [];
            
            const newSections = matchedTopics.map(t => {
                const goldenContent = t.goldenText 
                    ? `<blockquote class="golden-ref" style="border-left: 4px solid #4f46e5; padding-left: 12px; margin-left: 0; color: #475569; font-style: normal; background-color: #f8fafc; padding: 12px; border-radius: 8px;">` + t.goldenText.replace(/\n/g, '<br/>') + `</blockquote>`
                    : `<p style="color: #94a3b8; font-style: normal;">এই টপিকের অধীনে কোনো গোল্ডেন মেটেরিয়াল পাওয়া যায়নি।</p>`;

                const templateContent = `
                    <h3>📖 ${t.name}</h3>
                    ${goldenContent}
                `.trim();

                return {
                    id: t.id,
                    sectionTitle: t.name,
                    content: templateContent,
                    questions: t.approvedQuestions ? t.approvedQuestions.map(q => ({
                        questionId: q.questionId || q.id,
                        questionText: q.questionText,
                        type: q.type,
                        difficulty: q.difficulty,
                        marks: q.marks,
                        mcqType: q.mcqType,
                        statements: q.statements,
                        options: q.options || [],
                        stimulus: q.stimulus || '',
                        explanation: q.explanation || '',
                        answer: q.answer || q.correctAnswer || '',
                        chapterName: q.chapterName || ''
                    })) : []
                };
            });

            newSections.forEach(s => {
                if (s.questions && s.questions.length > 0) {
                    questionService.seedQuestionCache(s.questions);
                }
            });

            const mergedSections = [...existingSections];
            newSections.forEach(ns => {
                const exists = mergedSections.some(es => es.sectionTitle.trim().toLowerCase() === ns.sectionTitle.trim().toLowerCase());
                if (!exists) {
                    mergedSections.push(ns);
                }
            });

            const updatedTitle = prev.title === 'New Lecture Sheet' || prev.title === 'Untitled Lecture'
                ? `লেকচার শিট - ${matchedTopics[0]?.name || 'টপিক'}${matchedTopics.length > 1 ? ` (এবং আরও ${matchedTopics.length - 1} টি টপিক)` : ''}`
                : prev.title;

            return {
                ...prev,
                title: updatedTitle,
                className: cName || prev.className,
                subjectName: sName || prev.subjectName,
                classSubjectId: classSubjectId || prev.classSubjectId,
                chapterId: chapterId || prev.chapterId,
                sections: mergedSections
            };
        });

        editor.chain().focus().insertContent(htmlContent).run();
        triggerToast('success', `${matchedTopics.length}টি টপিক সফলভাবে ইম্পোর্ট করা হয়েছে!`);
    };

    const handleEditorChange = (html) => {
        if (debouncedEditorChangeRef.current) {
            clearTimeout(debouncedEditorChangeRef.current);
        }
        debouncedEditorChangeRef.current = setTimeout(() => {
            setRawContent(html);
            const parsedSections = parseHtmlToSections(html);
            setLecture(prev => ({
                ...prev,
                sections: parsedSections
            }));
        }, 800); // 800ms debounce
    };

    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const getProfileInstituteName = () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            return storedUser.instituteNameBn || storedUser.instituteName || storedUser.instituteNameEn || 'Perfect Academy';
        } catch (e) {
            return 'Perfect Academy';
        }
    };

    // Editor configurations
    const [config, setConfig] = useState({
        columns: 1,
        showMarks: true,
        showQuestionNumbers: true,
        resetNumberingByType: true,
        headerStyle: 'standard',
        headerLayout: 'centered',
        fontFamily: 'font-tiro text-lg',
        fontSize: 11,
        instituteFontSize: 22,
        titleFontSize: 16, metadataFontSize: 11, footerFontSize: 9, coverBgImage: null, coverBgLayout: 'full', coverBgOpacity: 15,
        metaFontSize: 10,
        showInstituteName: true,
        showTitle: true,
        paperSize: 'A4',
        orientation: 'portrait',
        watermark: false,
        watermarkText: 'Perfect Lecture',
        watermarkOpacity: 10,
        lineSpacing: 1.5,
        letterSpacing: 0,
        margins: 'narrow',
        pageView: 'continuous',
        paperColor: '#ffffff',
        showPageBorder: false,
        showAnswers: true,
        showExplanations: true,
        showSources: true,
        optionCols: 'auto',
        resetNumberingBySection: false,
        questionsAtEnd: false,
        columnGap: 32,
        showColumnDivider: true,
        columnDividerStyle: 'solid',
        columnDividerColor: '#cbd5e1',
        columnDividerWidth: 1
    });

    const [lecture, setLecture] = useState({
        title: 'New Lecture Sheet',
        instituteName: getProfileInstituteName(),
        className: '',
        subjectName: '',
        language: 'Bangla',
        difficultyLevel: 'EASY',
        lectureTimeMinutes: 45,
        classSubjectId: null,
        chapterId: null,
        topicId: null,
        sections: []
    });

    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const [showInstructions, setShowInstructions] = useState(false);
    const [highlightedSection, setHighlightedSection] = useState(null);

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        setRightPanelOpen(true);
    };
    const [zoom, setZoom] = useState(100);
    const [selection, setSelection] = useState({ type: 'page', id: null });
    const [activeSectionId, setActiveSectionId] = useState(null);

    // States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [generatingExam, setGeneratingExam] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [hierarchy, setHierarchy] = useState({ classSubjects: [], classes: [], streams: [], levels: [], subjects: [] });

    const subjectLanguageMap = React.useMemo(() => {
        const map = {};
        if (!hierarchy.classSubjects || !hierarchy.subjects) return map;
        hierarchy.classSubjects.forEach(cs => {
            const subject = hierarchy.subjects.find(s => s.id === cs._subjectId);
            if (subject) {
                map[cs.id] = {
                    name: subject.name || '',
                    isEnglish: subject.isEnglishVersion || subject.englishVersion || false
                };
            }
        });
        return map;
    }, [hierarchy.classSubjects, hierarchy.subjects]);

    // Toast message helper
    const triggerToast = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // Load config from localStorage when lecture.id changes
    useEffect(() => {
        const key = `lecture_config_${lecture.id || 'new'}`;
        const savedConfig = localStorage.getItem(key);
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                setConfig(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to load config from localStorage", e);
            }
        }
    }, [lecture.id]);

    // Save config to localStorage whenever it changes
    useEffect(() => {
        const key = `lecture_config_${lecture.id || 'new'}`;
        localStorage.setItem(key, JSON.stringify(config));
    }, [config, lecture.id]);

    // Helper formatting numerals
    const toBengaliNumeral = (num) => {
        const banglaDigits = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return String(num).replace(/[0-9]/g, x => banglaDigits[x]);
    };

    const getOptionLabel = (index) => {
        const banglaChars = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ'];
        return banglaChars[index] || banglaChars[0];
    };

    // Load lecture and hierarchy
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const queryId = params.get('id');
        const id = routeId || queryId;

        // Query parameters for auto-creation from bookshelf:
        const qClassSubjectId = params.get('classSubjectId');
        const qChapterId = params.get('chapterId');
        const qTopicIds = params.get('topicIds');

        const initializeEditor = async () => {
            setLoading(true);
            try {
                // Fetch Academic Hierarchy
                const hData = await academicService.getHierarchy();
                setHierarchy(hData || { classSubjects: [], classes: [], streams: [], levels: [], subjects: [] });

                if (id) {
                    // Load existing Lecture
                    const res = await lectureService.getLecture(id);
                    if (res.success && res.data) {
                        const data = res.data;
                        
                        // Populate hierarchy mappings
                        let cName = '';
                        let sName = '';
                        if (data.classSubjectId && hData?.classSubjects) {
                            const cs = hData.classSubjects.find(c => c.id === data.classSubjectId);
                            if (cs) {
                                sName = cs.name || cs.subjectName || '';
                                const cl = hData.classes?.find(x => x.id === cs._classId);
                                if (cl) cName = cl.name || '';
                            }
                        }

                        let loadedSections = data.sections ? data.sections.map(s => ({
                            id: s.id,
                            sectionTitle: s.sectionTitle || 'Untitled Section',
                            content: cleanGoldenReference(s.content || ''),
                            questions: s.sectionQuestions ? s.sectionQuestions.map(sq => ({
                                questionId: sq.questionId || sq.id,
                                questionText: sq.questionText || '',
                                type: sq.type || 'MCQ',
                                difficulty: sq.difficulty || 'MEDIUM',
                                marks: sq.marks || 1,
                                mcqType: sq.mcqType || 'SINGLE_CHOICE',
                                statements: sq.statements || [],
                                options: sq.options || [],
                                stimulus: sq.stimulus || '',
                                explanation: sq.explanation || '',
                                answer: sq.answer || sq.correctAnswer || '',
                                chapterName: sq.chapterName || ''
                            })) : []
                        })) : [];

                        // Sync with qTopicIds from AiBookReader if provided
                        if (qTopicIds && qChapterId) {
                            const pendingTopicIds = qTopicIds.split(',');
                            const metadataRes = await lectureService.getChapterMetadata(qChapterId);
                            if (metadataRes.success && metadataRes.data) {
                                const chapterMetadata = metadataRes.data;
                                const matchedTopics = chapterMetadata.topics?.filter(t => 
                                    t.id && pendingTopicIds.some(pid => pid.trim().toLowerCase() === t.id.toString().trim().toLowerCase())
                                ) || [];

                                const chapterTopicNames = (chapterMetadata.topics || []).map(t => t.name.trim().toLowerCase());
                                const matchedTopicNames = matchedTopics.map(t => t.name.trim().toLowerCase());

                                // Remove sections that belong to this chapter but were deselected
                                loadedSections = loadedSections.filter(s => {
                                    const titleLower = s.sectionTitle.trim().toLowerCase();
                                    return !chapterTopicNames.includes(titleLower) || matchedTopicNames.includes(titleLower);
                                });

                                // Add new sections for matched topics
                                matchedTopics.forEach(t => {
                                    const exists = loadedSections.some(s => s.sectionTitle.trim().toLowerCase() === t.name.trim().toLowerCase());
                                    if (!exists) {
                                        const goldenContent = t.goldenText 
                                            ? `<blockquote class="golden-ref" style="border-left: 4px solid #4f46e5; padding-left: 12px; margin-left: 0; color: #475569; font-style: normal; background-color: #f8fafc; padding: 12px; border-radius: 8px;">` + t.goldenText.replace(/\n/g, '<br/>') + `</blockquote>`
                                            : `<p style="color: #94a3b8; font-style: normal;">এই টপিকের অধীনে কোনো গোল্ডেন মেটেরিয়াল পাওয়া যায়নি।</p>`;

                                        const templateContent = `
                                            <h3>📖 ${t.name}</h3>
                                            ${goldenContent}
                                        `.trim();

                                        loadedSections.push({
                                            id: t.id,
                                            sectionTitle: t.name,
                                            content: templateContent,
                                            questions: t.approvedQuestions ? t.approvedQuestions.map(q => ({
                                                questionId: q.questionId,
                                                questionText: q.questionText,
                                                type: q.type,
                                                difficulty: q.difficulty,
                                                marks: q.marks,
                                                mcqType: q.mcqType,
                                                statements: q.statements,
                                                options: q.options || [],
                                                stimulus: q.stimulus || '',
                                                explanation: q.explanation || '',
                                                answer: q.answer || q.correctAnswer || '',
                                                chapterName: q.chapterName || ''
                                            })) : []
                                        });
                                    }
                                });
                            }
                        }

                        const loadedLecture = {
                            id: data.id,
                            title: data.title || 'Untitled Lecture',
                            instituteName: data.instituteName || getProfileInstituteName(),
                            className: cName,
                            subjectName: sName,
                            language: data.language || 'Bangla',
                            difficultyLevel: data.difficultyLevel || 'EASY',
                            lectureTimeMinutes: data.lectureTimeMinutes || 45,
                            classSubjectId: data.classSubjectId || null,
                            chapterId: data.chapterId || null,
                            topicId: data.topicId || null,
                            sections: loadedSections
                        };

                        // Seed Cache
                        loadedSections.forEach(s => {
                            if (s.questions && s.questions.length > 0) {
                                questionService.seedQuestionCache(s.questions);
                            }
                        });

                        setLecture(loadedLecture);
                        const initialHtml = generateInitialHtml(loadedSections);
                        setRawContent(initialHtml);
                        if (loadedSections.length > 0) {
                            setActiveSectionId(loadedSections[0].id);
                        }
                    }
                } else if (qClassSubjectId && qChapterId && qTopicIds) {
                    // Create dynamic Lecture Draft from Bookshelf topics
                    const pendingTopicIds = qTopicIds.split(',');
                    const metadataRes = await lectureService.getChapterMetadata(qChapterId);
                    
                    if (metadataRes.success && metadataRes.data) {
                        const chapterMetadata = metadataRes.data;
                        // Case-insensitive trimmed match
                        const matchedTopics = chapterMetadata.topics?.filter(t => 
                            t.id && pendingTopicIds.some(pid => pid.trim().toLowerCase() === t.id.toString().trim().toLowerCase())
                        ) || [];

                        // Mapped details
                        let cName = '';
                        let sName = '';
                        const cs = hData.classSubjects?.find(c => c.id === qClassSubjectId);
                        if (cs) {
                            sName = cs.name || cs.subjectName || '';
                            const cl = hData.classes?.find(x => x.id === cs._classId);
                            if (cl) cName = cl.name || '';
                        }

                        const generatedSections = matchedTopics.map((t) => {
                            const goldenContent = t.goldenText 
                                ? `<blockquote class="golden-ref" style="border-left: 4px solid #4f46e5; padding-left: 12px; margin-left: 0; color: #475569; font-style: normal; background-color: #f8fafc; padding: 12px; border-radius: 8px;">` + t.goldenText.replace(/\n/g, '<br/>') + `</blockquote>`
                                : `<p style="color: #94a3b8; font-style: normal;">এই টপিকের অধীনে কোনো গোল্ডেন মেটেরিয়াল পাওয়া যায়নি।</p>`;

                            const templateContent = `
                                <h3>📖 ${t.name}</h3>
                                ${goldenContent}
                            `.trim();

                            return {
                                id: t.id,
                                sectionTitle: t.name,
                                content: templateContent,
                                questions: t.approvedQuestions ? t.approvedQuestions.map(q => ({
                                    questionId: q.questionId,
                                    questionText: q.questionText,
                                    type: q.type,
                                    difficulty: q.difficulty,
                                    marks: q.marks,
                                    mcqType: q.mcqType,
                                    statements: q.statements,
                                    options: q.options || [],
                                    stimulus: q.stimulus || '',
                                    explanation: q.explanation || '',
                                    answer: q.answer || q.correctAnswer || '',
                                    chapterName: q.chapterName || ''
                                })) : []
                            };
                        });

                        const lectureTitle = `লেকচার শিট - ${matchedTopics[0]?.name || 'টপিক'}${matchedTopics.length > 1 ? ` (এবং আরও ${matchedTopics.length - 1} টি টপিক)` : ''}`;

                        // Auto save draft to backend immediately
                        const savePayload = {
                            title: lectureTitle,
                            instituteName: getProfileInstituteName(),
                            language: 'Bangla',
                            difficultyLevel: 'EASY',
                            lectureTimeMinutes: 45,
                            classSubjectId: qClassSubjectId,
                            chapterId: qChapterId,
                            topicId: matchedTopics[0]?.id || null,
                            sections: generatedSections.map((s, idx) => ({
                                id: null,
                                sectionTitle: s.sectionTitle,
                                content: s.content,
                                sectionOrder: idx,
                                questionIds: s.questions ? s.questions.map(q => q.questionId || q.id) : []
                            }))
                        };

                        const saveRes = await lectureService.createLecture(savePayload);
                        if (saveRes.success && saveRes.data) {
                            const data = saveRes.data;
                            const savedLecture = {
                                id: data.id,
                                title: data.title || lectureTitle,
                                instituteName: data.instituteName || getProfileInstituteName(),
                                className: cName,
                                subjectName: sName,
                                language: data.language || 'Bangla',
                                difficultyLevel: data.difficultyLevel || 'EASY',
                                lectureTimeMinutes: data.lectureTimeMinutes || 45,
                                classSubjectId: data.classSubjectId || null,
                                chapterId: data.chapterId || null,
                                topicId: data.topicId || null,
                                sections: data.sections ? data.sections.map(s => ({
                                    id: s.id,
                                    sectionTitle: s.sectionTitle || 'Untitled Section',
                                    content: cleanGoldenReference(s.content || ''),
                                    questions: s.sectionQuestions ? s.sectionQuestions.map(sq => ({
                                        questionId: sq.questionId || sq.id,
                                        questionText: sq.questionText || '',
                                        type: sq.type || 'MCQ',
                                        difficulty: sq.difficulty || 'MEDIUM',
                                        marks: sq.marks || 1,
                                        mcqType: sq.mcqType || 'SINGLE_CHOICE',
                                        statements: sq.statements || [],
                                        options: sq.options || [],
                                        stimulus: sq.stimulus || '',
                                        explanation: sq.explanation || '',
                                        answer: sq.answer || sq.correctAnswer || '',
                                        chapterName: sq.chapterName || ''
                                    })) : []
                                })) : []
                            };

                            // Seed Cache
                            savedLecture.sections.forEach(s => {
                                if (s.questions && s.questions.length > 0) {
                                    questionService.seedQuestionCache(s.questions);
                                }
                            });

                            setLecture(savedLecture);
                            const initialHtml = generateInitialHtml(savedLecture.sections);
                            setRawContent(initialHtml);
                            if (savedLecture.sections.length > 0) {
                                setActiveSectionId(savedLecture.sections[0].id);
                            }
                            // Redirect with replace history
                            navigate(`/lectures/editor/${data.id}`, { replace: true });
                        }
                    }
                } else {
                    // Blank/New lecture fallback
                    const defaultSection = {
                        id: `new-${Date.now()}`,
                        sectionTitle: 'নতুন সেকশন',
                        content: '<p>এখানে বিস্তারিত লিখুন...</p>',
                        questions: []
                    };
                    const initialLecture = {
                        ...lecture,
                        sections: [defaultSection]
                    };
                    setLecture(initialLecture);
                    setRawContent(generateInitialHtml([defaultSection]));
                    setActiveSectionId(defaultSection.id);
                }
            } catch (err) {
                console.error("Failed to load/initialize editor:", err);
                triggerToast('error', 'এডিটর লোড করতে ত্রুটি হয়েছে।');
            } finally {
                setLoading(false);
            }
        };

        initializeEditor();
    }, [routeId, location.search]);

    // Save Lecture Draft
    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            let currentSections = lecture.sections;
            if (editor) {
                currentSections = parseHtmlToSections(editor.getHTML());
            }

            const payload = {
                title: lecture.title,
                instituteName: lecture.instituteName,
                language: lecture.language,
                difficultyLevel: lecture.difficultyLevel,
                lectureTimeMinutes: lecture.lectureTimeMinutes,
                classSubjectId: lecture.classSubjectId,
                chapterId: lecture.chapterId,
                topicId: lecture.topicId,
                sections: currentSections.map((s, idx) => ({
                    id: s.id && s.id.length > 10 && !s.id.startsWith('new-') ? s.id : null, // valid uuid or null
                    sectionTitle: s.sectionTitle,
                    content: cleanHtmlForSave(s.content),
                    sectionOrder: idx,
                    questionIds: s.questions ? s.questions.map(q => q.questionId || q.id) : []
                }))
            };

            let res;
            if (lecture.id) {
                res = await lectureService.updateLecture(lecture.id, payload);
            } else {
                res = await lectureService.createLecture(payload);
            }

            if (res.success && res.data) {
                const newId = res.data.id;
                const oldId = lecture.id;
                
                // Copy localStorage config if transitioning from new to saved ID
                if (!oldId && newId) {
                    const newKey = `lecture_config_${newId}`;
                    try {
                        const currentConfig = localStorage.getItem('lecture_config_new');
                        if (currentConfig) {
                            localStorage.setItem(newKey, currentConfig);
                        }
                    } catch (e) {
                        console.error("Failed to copy config to new lecture key", e);
                    }
                }

                const savedSections = res.data.sections ? res.data.sections.map(s => ({
                    id: s.id,
                    sectionTitle: s.sectionTitle,
                    content: cleanGoldenReference(s.content),
                    questions: s.sectionQuestions ? s.sectionQuestions.map(sq => ({
                        questionId: sq.questionId || sq.id,
                        questionText: sq.questionText || '',
                        type: sq.type || 'MCQ',
                        difficulty: sq.difficulty || 'MEDIUM',
                        marks: sq.marks || 1,
                        mcqType: sq.mcqType || 'SINGLE_CHOICE',
                        statements: sq.statements || [],
                        options: sq.options || [],
                        stimulus: sq.stimulus || '',
                        explanation: sq.explanation || '',
                        answer: sq.answer || sq.correctAnswer || '',
                        chapterName: sq.chapterName || ''
                    })) : []
                })) : [];

                const savedLecture = {
                    ...lecture,
                    id: res.data.id,
                    sections: savedSections
                };

                // Seed Cache
                savedSections.forEach(s => {
                    if (s.questions && s.questions.length > 0) {
                        questionService.seedQuestionCache(s.questions);
                    }
                });

                setLecture(savedLecture);
                const initialHtml = generateInitialHtml(savedSections);
                setRawContent(initialHtml);

                triggerToast('success', 'লেকচার শিট সফলভাবে সেভ হয়েছে!');
                
                // Replace URL with actual ID if it was a create route
                if (!lecture.id) {
                    navigate(`/lectures/editor/${res.data.id}`, { replace: true });
                }
            }
        } catch (err) {
            console.error("Failed to save lecture:", err);
            triggerToast('error', 'সেভ করতে ব্যর্থ হয়েছে।');
        } finally {
            setSaving(false);
        }
    };

    // One-Click Exam generation from lecture questions
    const handleCreateExam = async () => {
        if (!lecture.id) {
            triggerToast('error', 'পরীক্ষা জেনারেট করার আগে অনুগ্রহ করে লেকচার শিট ড্রাফটটি সেভ করুন!');
            return;
        }
        setGeneratingExam(true);
        try {
            const res = await lectureService.createExamFromLecture(lecture.id);
            if (res.success && res.data?.id) {
                triggerToast('success', 'প্রশ্নপত্র সফলভাবে জেনারেট হয়েছে!');
                setTimeout(() => {
                    window.location.href = `/exams/generate/editor/${res.data.id}`;
                }, 1000);
            }
        } catch (err) {
            console.error(err);
            triggerToast('error', 'প্রশ্নপত্র জেনারেট করতে ব্যর্থ হয়েছে। নিশ্চিত করুন লেকচারে প্রশ্ন সংযুক্ত আছে।');
        } finally {
            setGeneratingExam(false);
        }
    };



    // PDF Download handler
    const handleDownloadPDF = async (coverOnlyParam = false) => {
        const coverOnly = coverOnlyParam === true;
        
        const toBengaliNumerals = (num) => {
            const banglaDigits = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
            return String(num).split('').map(digit => banglaDigits[digit] || digit).join('');
        };
        setPdfLoading(true);
        setPdfProgress(10);
        setPdfStatus('ডকুমেন্ট প্রিপারেশন করা হচ্ছে...');

        try {
            const margin = config.margins === 'narrow' ? 48 : config.margins === 'moderate' ? 72 : config.margins === 'normal' ? 96 : 144;
            const orientation = config.orientation || 'portrait';
            const paperSize = config.paperSize || 'A4';
            
            const dimsMap = {
                'A4': { portrait: { w: 794, h: 1123 }, landscape: { w: 1123, h: 794 } },
                'Legal': { portrait: { w: 816, h: 1344 }, landscape: { w: 1344, h: 816 } },
                'Letter': { portrait: { w: 816, h: 1056 }, landscape: { w: 1056, h: 816 } }
            };
            
            const dims = dimsMap[paperSize]?.[orientation] || dimsMap['A4'].portrait;
            const w = dims.w;
            const h = dims.h;
            const printableH = h - margin * 2;
            const printableW = w - margin * 2;

            const isContinuous = config.pageView === 'continuous';

            const pm = document.querySelector('.ProseMirror');
            if (!pm) {
                throw new Error("ProseMirror editor not found");
            }
            // Create global print stylesheet
            const printStyle = document.createElement('style');
            printStyle.textContent = `
                .ProseMirror {
                    column-count: ${config.columns || 1} !important;
                    column-gap: ${config.columnGap || 32}px !important;
                    column-rule: ${config.columns > 1 && config.showColumnDivider !== false ? `${config.columnDividerWidth || 1}px ${config.columnDividerStyle || 'solid'} ${config.columnDividerColor || '#cbd5e1'}` : 'none'} !important;
                    text-align: justify !important;
                }
                .ProseMirror > * {
                    margin-top: 0 !important;
                    padding-top: 2px !important;
                }
                .ProseMirror img, 
                .ProseMirror [data-type="question-block"],
                .ProseMirror table,
                .ProseMirror p,
                .ProseMirror li {
                    break-inside: avoid-column !important;
                    page-break-inside: avoid !important;
                    max-width: 100% !important;
                }
                .questions-at-end .ProseMirror [data-type="question-block"],
                .questions-at-end[data-type="question-block"],
                .questions-at-end.ProseMirror [data-type="question-block"] {
                    display: none !important;
                }
                .questions-at-end-section-print {
                    column-count: ${config.columns || 1} !important;
                    column-gap: ${config.columnGap || 32}px !important;
                    column-rule: ${config.columns > 1 && config.showColumnDivider !== false ? `${config.columnDividerWidth || 1}px ${config.columnDividerStyle || 'solid'} ${config.columnDividerColor || '#cbd5e1'}` : 'none'} !important;
                }
                .questions-at-end-section-print [data-type="question-block"] {
                    display: block !important;
                    margin-bottom: 24px !important;
                    break-inside: avoid-column !important;
                    page-break-inside: avoid !important;
                }
            `;

            // Create temporary measure element to calculate pages correctly (especially for questionsAtEnd)
            const measureDiv = document.createElement('div');
            measureDiv.style.position = 'absolute';
            measureDiv.style.left = '-9999px';
            measureDiv.style.top = '-9999px';
            measureDiv.style.width = `${printableW}px`;
            measureDiv.style.display = 'flex';
            measureDiv.style.flexDirection = 'column';
            
            const clonedPmForMeasure = pm.cloneNode(true);
            clonedPmForMeasure.style.width = '100%';
            clonedPmForMeasure.style.marginTop = '0px';
            
            measureDiv.className = config.fontFamily || '';
            const styleWrapperMeasure = document.createElement('div');
            styleWrapperMeasure.className = [
                config.showAnswers ? 'show-answers-inline' : '',
                config.showExplanations ? 'show-explanation-inline' : '',
                config.showSources ? 'show-sources-inline' : '',
                !config.showQuestionNumbers ? 'hide-question-numbers' : '',
                config.questionsAtEnd ? 'questions-at-end' : ''
            ].filter(Boolean).join(' ');
            
            styleWrapperMeasure.appendChild(clonedPmForMeasure);
            
            if (config.questionsAtEnd) {
                const endContainer = document.createElement('div');
                endContainer.className = 'questions-at-end-section-print';
                endContainer.style.marginTop = '40px';
                endContainer.style.borderTop = '2px solid #4f46e5';
                endContainer.style.paddingTop = '20px';
                
                const heading = document.createElement('h3');
                heading.textContent = 'অনুশীলনী প্রশ্নাবলী (Exercises)';
                heading.style.fontSize = '14pt';
                heading.style.fontWeight = '900';
                heading.style.marginBottom = '20px';
                heading.style.color = '#1e293b';
                endContainer.appendChild(heading);
                
                const qBlocks = clonedPmForMeasure.querySelectorAll('[data-type="question-block"]');
                qBlocks.forEach(q => {
                    const qClone = q.cloneNode(true);
                    qClone.style.display = 'block';
                    qClone.style.marginBottom = '24px';
                    
                    const actions = qClone.querySelector('.question-actions');
                    if (actions) actions.remove();
                    const dragHandle = qClone.querySelector('.drag-handle');
                    if (dragHandle) dragHandle.remove();
                    
                    endContainer.appendChild(qClone);
                });
                styleWrapperMeasure.appendChild(endContainer);
            }
            
            measureDiv.appendChild(styleWrapperMeasure);
            measureDiv.appendChild(printStyle.cloneNode(true));
            document.body.appendChild(measureDiv);
            const totalHeight = measureDiv.offsetHeight;
            document.body.removeChild(measureDiv);

            const getPDFTitleHtml = (templateName) => {
                if (!config.showTitle) return '';
                const isAutoGenerated = lecture.title && (lecture.title.includes("লেকচার শিট") || lecture.title.includes("টি টপিক"));
                
                if (isAutoGenerated) {
                    if (templateName === 'minimal') {
                        const bullets = (lecture.sections || []).map(sec => {
                            return `<li style="margin-bottom: 6px;">${sec.sectionTitle || sec.title}</li>`;
                        }).join('');
                        
                        return `
                            <div style="display: flex; flex-direction: column; align-items: flex-start; width: 100%; text-align: left; margin-bottom: 12px;">
                                <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; width: 100%;">টপিকসমূহ (Topics)</p>
                                <ul style="list-style-type: disc; padding-left: 20px; margin: 0; font-size: ${(config.titleFontSize || 16) + 4}pt; font-weight: bold; color: #1e293b; line-height: 1.4;">
                                    ${bullets}
                                </ul>
                            </div>
                        `;
                    }
                    return ''; // Hidden for other templates since they have the topics list card below
                } else {
                    const align = templateName === 'minimal' ? 'left' : 'center';
                    const fontWeight = templateName === 'premium' ? 'bold' : (templateName === 'minimal' ? '800' : '900');
                    const fontFamily = templateName === 'premium' ? 'font-family: serif;' : '';
                    
                    return `<h2 style="font-size: ${config.titleFontSize + 8}pt; font-weight: ${fontWeight}; color: #0f172a; margin: 0; line-height: 1.3; max-width: 500px; text-align: ${align}; ${fontFamily}">${lecture.title || "LECTURE TITLE"}</h2>`;
                }
            };

            const hasCoverPage = config.showInstituteName || config.showTitle;
            const gapVal = isContinuous ? 0 : 24;
            const pageStep = isContinuous ? printableH : (h + gapVal);
            const pages = Math.max(1, Math.ceil(totalHeight / pageStep));
            const totalPages = coverOnly ? 1 : (hasCoverPage ? pages + 1 : pages);

            let coverPageDiv = null;
            if (hasCoverPage) {
                coverPageDiv = document.createElement('div');
                coverPageDiv.style.width = `${w}px`;
                coverPageDiv.style.height = `${h}px`;
                coverPageDiv.style.backgroundColor = config.paperColor || '#ffffff';
                coverPageDiv.style.boxSizing = 'border-box';
                coverPageDiv.style.position = 'relative';
                coverPageDiv.style.overflow = 'hidden';
                coverPageDiv.className = config.fontFamily || '';

                if (config.coverBgImage) {
                    const bgDiv = document.createElement('div');
                    bgDiv.style.position = 'absolute';
                    bgDiv.style.pointerEvents = 'none';
                    bgDiv.style.zIndex = '0';
                    bgDiv.style.opacity = `${(config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100}`;
                    bgDiv.style.backgroundImage = `url(${config.coverBgImage})`;
                    bgDiv.style.backgroundRepeat = 'no-repeat';
                    bgDiv.style.backgroundPosition = 'center';
                    bgDiv.style.webkitPrintColorAdjust = 'exact';
                    bgDiv.style.printColorAdjust = 'exact';
                    
                    if (config.coverBgLayout === 'partial') {
                        const bgSize = config.coverBgSize || 300;
                        bgDiv.style.width = `${bgSize}px`;
                        bgDiv.style.height = `${bgSize}px`;
                        bgDiv.style.left = '50%';
                        bgDiv.style.top = '50%';
                        bgDiv.style.transform = 'translate(-50%, -50%)';
                        bgDiv.style.backgroundSize = 'contain';
                        
                        if (config.coverBgBorder) {
                            bgDiv.style.border = `2px solid ${cAccent}`;
                            bgDiv.style.borderRadius = '12px';
                        }
                    } else if (config.coverBgLayout === 'under_topics') {
                        // Already handled inside content block
                        bgDiv.style.display = 'none';
                    } else {
                        bgDiv.style.inset = '0';
                        bgDiv.style.backgroundSize = 'cover';
                    }
                    coverPageDiv.appendChild(bgDiv);
                }

                const cTemplate = config.coverTemplate || 'classic';
                const cAccent = config.coverAccentColor || '#4f46e5';

                // 1. Margins and borders
                if (cTemplate !== 'minimal') {
                    if (config.showPageBorder) {
                        coverPageDiv.style.boxShadow = 'inset 0 0 0 2px #334155, inset 0 0 0 5px white, inset 0 0 0 6px #334155';
                    } else {
                        coverPageDiv.style.border = '1px solid #cbd5e1';
                    }

                    const innerBorder = document.createElement('div');
                    innerBorder.style.position = 'absolute';
                    innerBorder.style.top = `${margin}px`;
                    innerBorder.style.left = `${margin}px`;
                    innerBorder.style.right = `${margin}px`;
                    innerBorder.style.bottom = `${margin}px`;
                    innerBorder.style.border = cTemplate === 'premium' ? `2px double ${cAccent}` : '2px solid #1e293b';
                    innerBorder.style.boxSizing = 'border-box';
                    innerBorder.style.zIndex = '0';
                    
                    const innerBorderInner = document.createElement('div');
                    innerBorderInner.style.position = 'absolute';
                    innerBorderInner.style.top = '4px';
                    innerBorderInner.style.left = '4px';
                    innerBorderInner.style.right = '4px';
                    innerBorderInner.style.bottom = '4px';
                    innerBorderInner.style.border = cTemplate === 'premium' ? `1px solid ${cAccent}` : '1px solid #1e293b';
                    innerBorderInner.style.opacity = cTemplate === 'premium' ? '0.3' : '0.5';
                    innerBorderInner.style.boxSizing = 'border-box';
                    innerBorder.appendChild(innerBorderInner);
                    coverPageDiv.appendChild(innerBorder);
                } else {
                    // minimal sidebar highlight
                    const sidebar = document.createElement('div');
                    sidebar.style.position = 'absolute';
                    sidebar.style.top = `${margin}px`;
                    sidebar.style.left = `${margin}px`;
                    sidebar.style.bottom = `${margin}px`;
                    sidebar.style.width = '6px';
                    sidebar.style.backgroundColor = cAccent;
                    sidebar.style.zIndex = '0';
                    coverPageDiv.appendChild(sidebar);
                }

                if (config.watermark) {
                    const wm = document.createElement('div');
                    wm.style.position = 'absolute';
                    wm.style.inset = '0';
                    wm.style.pointerEvents = 'none';
                    wm.style.display = 'flex';
                    wm.style.alignItems = 'center';
                    wm.style.justifyContent = 'center';
                    wm.style.overflow = 'hidden';
                    wm.style.zIndex = '0';
                    wm.style.userSelect = 'none';
                    wm.style.opacity = `${(config.watermarkOpacity || 10) / 100}`;
                    wm.innerHTML = `<h1 style="font-size: 8rem; font-weight: 900; color: #1e293b; transform: rotate(-45deg); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.1em;">${config.watermarkText || 'Perfect Lecture'}</h1>`;
                    coverPageDiv.appendChild(wm);
                }

                const contentDiv = document.createElement('div');
                contentDiv.style.position = 'absolute';
                contentDiv.style.inset = `${margin + 24}px`;
                contentDiv.style.display = 'flex';
                contentDiv.style.flexDirection = 'column';
                contentDiv.style.justifyContent = 'space-between';
                contentDiv.style.zIndex = '10';
                contentDiv.style.boxSizing = 'border-box';

                if (cTemplate === 'classic') {
                    contentDiv.innerHTML = `
                        <div style="text-align: center;">
                            ${config.showInstituteName ? `
                                <h1 style="font-size: ${config.instituteFontSize + 4}pt; font-weight: 900; tracking: 4px; color: #1e293b; text-transform: uppercase; margin: 0;">${lecture.instituteName || "PERFECT ACADEMY"}</h1>
                                <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #64748b; font-weight: bold; margin: 4px 0 0 0;">Academic Concept Series</p>
                            ` : ''}
                            ${config.coverLogo ? `
                                <div style="display: flex; justify-content: center; margin-top: 16px; margin-bottom: 8px; width: 100%;">
                                    <img src="${config.coverLogo}" alt="Institute Logo" style="max-height: ${config.coverLogoSize || 64}px; object-fit: contain; -webkit-print-color-adjust: exact; print-color-adjust: exact;" />
                                </div>
                            ` : ''}
                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px;">
                                <div style="width: 48px; height: 1px; background-color: #cbd5e1;"></div>
                                <span style="color: #94a3b8; font-size: 12px;">◆</span>
                                <div style="width: 48px; height: 1px; background-color: #cbd5e1;"></div>
                            </div>
                        </div>
                        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: auto 0;">
                            <div style="background-color: #e0e7ff; border: 1px solid #c7d2fe; color: #4338ca; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 24px; letter-spacing: 2px;">
                                Lecture Sheet & Study Guide
                            </div>
                            ${getPDFTitleHtml('classic')}
                            <div style="margin-top: 32px; color: #6366f1;">
                                <svg style="width: 64px; height: 64px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                                    <path d="M6 6h10" /><path d="M6 10h10" /><path d="M6 14h10" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            ${config.coverBgImage && config.coverBgLayout === 'under_topics' ? `
                                <div style="margin: 16px auto; display: flex; justify-content: center; align-items: center; pointer-events: none; width: 100%; height: ${config.coverBgSize || 150}px;">
                                    <div style="width: ${config.coverBgSize || 150}px; height: ${config.coverBgSize || 150}px; background-image: url(${config.coverBgImage}); background-repeat: no-repeat; background-position: center; background-size: contain; opacity: ${(config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100}; ${config.coverBgBorder ? `border: 2px solid #4f46e5; border-radius: 12px;` : ''}; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
                                </div>
                            ` : ''}
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; max-width: 420px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; color: #1e293b; font-size: ${config.metadataFontSize || 11}pt; font-weight: bold;">
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <span style="color: #94a3b8;">বিষয়:</span>
                                        <span>${lecture.subjectName || "__________"}</span>
                                    </div>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <span style="color: #94a3b8;">শ্রেণী:</span>
                                        <span>${lecture.className || "__________"}</span>
                                    </div>
                                    <div style="display: flex; gap: 8px; align-items: center; grid-column: span 2; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 4px;">
                                        <span style="color: #94a3b8;">সংস্করণ:</span>
                                        <span>${lecture.language || "Bangla"} Version</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    `;
                } else if (cTemplate === 'minimal') {
                    contentDiv.innerHTML = `
                        <div style="text-align: left; padding-left: 24px;">
                            ${config.showInstituteName ? `
                                <h1 style="font-size: ${config.instituteFontSize + 2}pt; font-weight: 900; tracking: 2px; color: ${cAccent}; text-transform: uppercase; margin: 0;">${lecture.instituteName || "PERFECT ACADEMY"}</h1>
                                <p style="font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: bold; margin: 4px 0 0 0;">Lecture Notes Series</p>
                            ` : ''}
                            ${config.coverLogo ? `
                                <div style="display: flex; justify-content: flex-start; margin-top: 12px; margin-bottom: 8px; width: 100%;">
                                    <img src="${config.coverLogo}" alt="Institute Logo" style="max-height: ${config.coverLogoSize || 56}px; object-fit: contain; -webkit-print-color-adjust: exact; print-color-adjust: exact;" />
                                </div>
                            ` : ''}
                        </div>
                        <div style="text-align: left; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; margin: auto 0; padding-left: 24px;">
                            <div style="color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px;">
                                Lecture Sheet & Course Guide
                            </div>
                            ${getPDFTitleHtml('minimal')}
                            <div style="width: 80px; height: 4px; border-radius: 9999px; background-color: ${cAccent}; margin-top: 24px;"></div>
                        </div>
                        <div style="padding-left: 24px;">
                            <div style="border-left: 2px solid ${cAccent}; padding-left: 16px; max-width: 420px;">
                                ${config.coverBgImage && config.coverBgLayout === 'under_topics' ? `
                                    <div style="margin: 8px auto 16px 0; display: flex; justify-content: flex-start; align-items: flex-start; pointer-events: none; width: 100%;">
                                        <div style="width: ${config.coverBgSize || 150}px; height: ${config.coverBgSize || 150}px; background-image: url(${config.coverBgImage}); background-repeat: no-repeat; background-position: center; background-size: contain; opacity: ${(config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100}; ${config.coverBgBorder ? `border: 2px solid ${cAccent}; border-radius: 12px;` : ''}"></div>
                                    </div>
                                ` : ''}
                                <div style="display: flex; flex-direction: column; gap: 8px; color: #1e293b; font-size: ${config.metadataFontSize || 11}pt; font-weight: bold;">
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <span style="color: #94a3b8;">বিষয়:</span>
                                        <span>${lecture.subjectName || "__________"}</span>
                                    </div>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <span style="color: #94a3b8;">শ্রেণী:</span>
                                        <span>${lecture.className || "__________"}</span>
                                    </div>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <span style="color: #94a3b8;">সংস্করণ:</span>
                                        <span>${lecture.language || "Bangla"} Version</span>
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: left; margin-top: 24px; color: #94a3b8;">
                                <p style="font-size: 9px; font-weight: 950; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Academic Publication</p>
                                <p style="font-size: 8px; font-weight: bold; margin: 2px 0 0 0;">শিক্ষাবর্ষ: ২০২৬-২০২৭</p>
                            </div>
                        </div>
                    `;
                } else if (cTemplate === 'modern') {
                    // header banner element background
                    const banner = document.createElement('div');
                    banner.style.position = 'absolute';
                    banner.style.top = '0';
                    banner.style.left = '0';
                    banner.style.right = '0';
                    banner.style.height = '128px';
                    banner.style.backgroundColor = cAccent;
                    banner.style.display = 'flex';
                    banner.style.alignItems = 'center';
                    banner.style.justifyContent = 'center';
                    banner.style.padding = '0 32px';
                    banner.style.color = '#ffffff';
                    banner.style.zIndex = '0';
                    if (config.showInstituteName) {
                        banner.innerHTML = `<h1 style="font-size: ${config.instituteFontSize}pt; font-weight: 900; tracking: 3px; text-transform: uppercase; margin: 0; color: #ffffff; text-align: center;">${lecture.instituteName || "PERFECT ACADEMY"}</h1>`;
                    }
                    coverPageDiv.appendChild(banner);

                    contentDiv.innerHTML = `
                        <div style="height: 128px;"></div>
                        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: auto 0;">
                            <div style="background-color: ${cAccent}; color: #ffffff; padding: 16px; border-radius: 9999px; display: inline-flex; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                                <svg style="width: 48px; height: 48px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                                    <path d="M6 6h10" /><path d="M6 10h10" /><path d="M6 14h10" />
                                </svg>
                            </div>
                            ${getPDFTitleHtml('modern')}
                            <p style="font-size: 11px; font-weight: bold; color: #64748b; margin-top: 12px; letter-spacing: 2px; text-transform: uppercase;">Lecture Sheet & Study Material</p>
                            ${lecture.sections && lecture.sections.length > 0 && true ? `
                                <div style="margin-top: 24px; text-align: left; max-width: 380px; width: 100%; background-color: rgba(248, 250, 252, 0.8); border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin-left: auto; margin-right: auto;">
                                    <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">টপিকসমূহ (Topics)</p>
                                    <ul style="padding: 0; margin: 0; list-style: none;">
                                        ${lecture.sections.map((sec, idx) => `
                                            <li style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 6px;">
                                                <span style="color: ${cAccent};">▪</span>
                                                <span>${sec.sectionTitle || "নতুন টপিক"}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                        <div>
                            ${config.coverBgImage && config.coverBgLayout === 'under_topics' ? `
                                <div style="margin: 8px auto 16px auto; display: flex; justify-content: center; align-items: flex-start; pointer-events: none; width: 100%;">
                                    <div style="width: ${config.coverBgSize || 150}px; height: ${config.coverBgSize || 150}px; background-image: url(${config.coverBgImage}); background-repeat: no-repeat; background-position: center; background-size: contain; opacity: ${(config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100}; ${config.coverBgBorder ? `border: 2px solid ${cAccent}; border-radius: 12px;` : ''}"></div>
                                </div>
                            ` : ''}
                            <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; max-width: 420px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; color: #1e293b; font-size: ${config.metadataFontSize || 11}pt; font-weight: bold; text-align: center;">
                                    <div style="border-right: 1px solid #cbd5e1;">
                                        <span style="font-size: 9px; color: #94a3b8; display: block; margin-bottom: 2px;">বিষয়</span>
                                        <span>${lecture.subjectName || "__________"}</span>
                                    </div>
                                    <div style="border-right: 1px solid #cbd5e1;">
                                        <span style="font-size: 9px; color: #94a3b8; display: block; margin-bottom: 2px;">শ্রেণী</span>
                                        <span>${lecture.className || "__________"}</span>
                                    </div>
                                    <div>
                                        <span style="font-size: 9px; color: #94a3b8; display: block; margin-bottom: 2px;">সংস্করণ</span>
                                        <span>${lecture.language || "Bangla"}</span>
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: center; margin-top: 24px;">
                                <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Perfect Academic Publication</p>
                                <p style="font-size: 8px; font-weight: bold; color: #94a3b8; margin: 4px 0 0 0;">শিক্ষাবর্ষ: ২০২৬-২০২৭</p>
                            </div>
                        </div>
                    `;
                } else if (cTemplate === 'premium') {
                    contentDiv.style.fontFamily = 'serif';
                    contentDiv.innerHTML = `
                        <div style="text-align: center;">
                            ${config.showInstituteName ? `
                                <h1 style="font-size: ${config.instituteFontSize + 4}pt; font-weight: 900; color: ${cAccent}; font-style: italic; margin: 0; font-family: serif;">${lecture.instituteName || "PERFECT ACADEMY"}</h1>
                                <p style="font-size: 9px; text-transform: uppercase; letter-spacing: 3px; color: #64748b; font-weight: bold; margin: 4px 0 0 0; font-style: italic; font-family: serif;">Academic Master Class Collection</p>
                            ` : ''}
                            ${config.coverLogo ? `
                                <div style="display: flex; justify-content: center; margin-top: 16px; margin-bottom: 8px; width: 100%;">
                                    <img src="${config.coverLogo}" alt="Institute Logo" style="max-height: ${config.coverLogoSize || 64}px; object-fit: contain; -webkit-print-color-adjust: exact; print-color-adjust: exact;" />
                                </div>
                            ` : ''}
                        </div>
                        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: auto 0; font-family: serif;">
                            <div style="color: #94a3b8; font-size: 12px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 16px; font-style: italic;">
                                - Lecture Companion -
                            </div>
                            ${getPDFTitleHtml('premium')}
                            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 24px; color: #94a3b8; width: 100%;">
                                <div style="width: 64px; height: 1px; background-color: #cbd5e1;"></div>
                                <span style="font-size: 14px; color: ${cAccent};">⚜</span>
                                <div style="width: 64px; height: 1px; background-color: #cbd5e1;"></div>
                            </div>
                            ${lecture.sections && lecture.sections.length > 0 && true ? `
                                <div style="margin-top: 24px; text-align: left; max-width: 380px; width: 100%; background-color: rgba(251, 191, 36, 0.02); border: 1px solid rgba(251, 191, 36, 0.1); border-radius: 16px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.01); margin-left: auto; margin-right: auto; font-family: serif;">
                                    <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 8px 0; border-bottom: 1px solid rgba(251, 191, 36, 0.1); padding-bottom: 4px;">টপিকসমূহ (Topics)</p>
                                    <ul style="padding: 0; margin: 0; list-style: none;">
                                        ${lecture.sections.map((sec, idx) => `
                                            <li style="font-size: 12px; font-weight: bold; color: #334155; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 6px;">
                                                <span style="color: ${cAccent};">▪</span>
                                                <span>${sec.sectionTitle || "নতুন টপিক"}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                        ${config.coverBgImage && config.coverBgLayout === 'under_topics' ? `
                            <div style="margin: 16px auto; display: flex; justify-content: center; align-items: center; pointer-events: none; width: 100%; height: ${config.coverBgSize || 150}px;">
                                <div style="width: ${config.coverBgSize || 150}px; height: ${config.coverBgSize || 150}px; background-image: url(${config.coverBgImage}); background-repeat: no-repeat; background-position: center; background-size: contain; opacity: ${(config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100}; ${config.coverBgBorder ? `border: 2px solid ${cAccent}; border-radius: 12px;` : ''}"></div>
                            </div>
                        ` : ''}
                        <div style="font-family: serif;">
                            <div style="background-color: rgba(251, 191, 36, 0.05); border: 1px solid rgba(251, 191, 36, 0.15); border-radius: 12px; padding: 20px; max-width: 420px; margin: 0 auto; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                                <table style="width: 100%; color: #1e293b; font-size: 12px; font-weight: bold; border-collapse: collapse;">
                                    <tbody>
                                        <tr style="border-bottom: 1px solid rgba(251, 191, 36, 0.15);">
                                            <td style="padding: 6px 0; color: #94a3b8; font-weight: normal; text-align: left;">বিষয়:</td>
                                            <td style="padding: 6px 0; text-align: right;">${lecture.subjectName || "__________"}</td>
                                        </tr>
                                        <tr style="border-bottom: 1px solid rgba(251, 191, 36, 0.15);">
                                            <td style="padding: 6px 0; color: #94a3b8; font-weight: normal; text-align: left;">শ্রেণী:</td>
                                            <td style="padding: 6px 0; text-align: right;">${lecture.className || "__________"}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: #94a3b8; font-weight: normal; text-align: left;">সংস্করণ:</td>
                                            <td style="padding: 6px 0; text-align: right;">${lecture.language || "Bangla"} Version</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style="text-align: center; margin-top: 24px; color: #94a3b8;">
                                <p style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; margin: 0;">Premium Publishing House</p>
                                <p style="font-size: 8px; font-weight: bold; margin: 4px 0 0 0;">Academic Year: 2026-2027</p>
                            </div>
                        </div>
                    `;
                }

                coverPageDiv.appendChild(contentDiv);

                // Add absolute Cover Footer at bottom margin (below/outside the border)
                if (!coverPageDiv.querySelector('.cover-footer-pdf-abs')) {
                    const coverFooterDiv = document.createElement('div');
                    coverFooterDiv.className = 'cover-footer-pdf-abs';
                    coverFooterDiv.style.position = 'absolute';
                    coverFooterDiv.style.bottom = `${margin - 36}px`;
                    coverFooterDiv.style.left = '0';
                    coverFooterDiv.style.right = '0';
                    coverFooterDiv.style.textAlign = 'center';
                    coverFooterDiv.style.zIndex = '20';
                    
                    let footerHtml = '';
                    if (config.showCoverFooterText !== false) {
                        const pubText = config.coverFooterText || (cTemplate === 'premium' ? "Premium Publishing House" : (cTemplate === 'minimal' ? "Academic Publication" : "Perfect Academic Publication"));
                        footerHtml += `<p style="font-size: ${config.footerFontSize || 9}pt; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; font-family: ${cTemplate === 'premium' ? 'serif' : 'inherit'};">${pubText}</p>`;
                    }
                    if (config.showCoverAcademicYearText !== false) {
                        const yearText = config.coverAcademicYearText || (cTemplate === 'premium' ? "Academic Year: 2026-2027" : "শিক্ষাবর্ষ: ২০২৬-২০২৭");
                        footerHtml += `<p style="font-size: ${(config.footerFontSize || 9) - 1}pt; font-weight: bold; color: #94a3b8; margin: 2px 0 0 0; font-family: ${cTemplate === 'premium' ? 'serif' : 'inherit'};">${yearText}</p>`;
                    }
                    coverFooterDiv.innerHTML = footerHtml;
                    coverPageDiv.appendChild(coverFooterDiv);
                }

                // Add absolute Cover Footer at bottom margin (below/outside the border)
                if (!coverPageDiv.querySelector('.cover-footer-pdf-abs')) {
                    const coverFooterDiv = document.createElement('div');
                    coverFooterDiv.className = 'cover-footer-pdf-abs';
                    coverFooterDiv.style.position = 'absolute';
                    coverFooterDiv.style.bottom = `${margin - 36}px`;
                    coverFooterDiv.style.left = '0';
                    coverFooterDiv.style.right = '0';
                    coverFooterDiv.style.textAlign = 'center';
                    coverFooterDiv.style.zIndex = '20';
                    
                    let footerHtml = '';
                    if (config.showCoverFooterText !== false) {
                        const pubText = config.coverFooterText || (cTemplate === 'premium' ? "Premium Publishing House" : (cTemplate === 'minimal' ? "Academic Publication" : "Perfect Academic Publication"));
                        footerHtml += `<p style="font-size: ${config.footerFontSize || 9}pt; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; font-family: ${cTemplate === 'premium' ? 'serif' : 'inherit'};">${pubText}</p>`;
                    }
                    if (config.showCoverAcademicYearText !== false) {
                        const yearText = config.coverAcademicYearText || (cTemplate === 'premium' ? "Academic Year: 2026-2027" : "শিক্ষাবর্ষ: ২০২৬-২০২৭");
                        footerHtml += `<p style="font-size: ${(config.footerFontSize || 9) - 1}pt; font-weight: bold; color: #94a3b8; margin: 2px 0 0 0; font-family: ${cTemplate === 'premium' ? 'serif' : 'inherit'};">${yearText}</p>`;
                    }
                    coverFooterDiv.innerHTML = footerHtml;
                    coverPageDiv.appendChild(coverFooterDiv);
                }
            }

            setPdfProgress(30);
            setPdfStatus('ডকুমেন্ট রেন্ডারিং শুরু হচ্ছে...');

            const pdf = new jsPDF({
                orientation: orientation,
                unit: 'px',
                format: [w, h]
            });

            for (let i = 0; i < totalPages; i++) {
                setPdfStatus(`পৃষ্ঠা ${i + 1} রেন্ডার করা হচ্ছে...`);
                setPdfProgress(30 + Math.round((i / totalPages) * 55));

                const pageWrapper = document.createElement('div');
                pageWrapper.style.position = 'absolute';
                pageWrapper.style.left = '-9999px';
                pageWrapper.style.top = '-9999px';
                pageWrapper.style.width = `${w}px`;
                pageWrapper.style.height = `${h}px`;
                pageWrapper.style.backgroundColor = config.paperColor || '#ffffff';
                pageWrapper.style.boxSizing = 'border-box';
                pageWrapper.style.overflow = 'hidden';
                pageWrapper.className = config.fontFamily || '';
                pageWrapper.appendChild(printStyle.cloneNode(true));

                if (hasCoverPage && i === 0) {
                    pageWrapper.appendChild(coverPageDiv);
                } else {
                    const contentIndex = hasCoverPage ? i - 1 : i;

                    if (config.showPageBorder) {
                        pageWrapper.style.boxShadow = 'inset 0 0 0 2px #334155, inset 0 0 0 5px white, inset 0 0 0 6px #334155';
                    } else {
                        pageWrapper.style.border = '1px solid #cbd5e1';
                    }

                    if (config.watermark) {
                        const wm = document.createElement('div');
                        wm.style.position = 'absolute';
                        wm.style.inset = '0';
                        wm.style.pointerEvents = 'none';
                        wm.style.display = 'flex';
                        wm.style.alignItems = 'center';
                        wm.style.justifyContent = 'center';
                        wm.style.overflow = 'hidden';
                        wm.style.zIndex = '0';
                        wm.style.userSelect = 'none';
                        wm.style.opacity = `${(config.watermarkOpacity || 10) / 100}`;
                        wm.innerHTML = `<h1 style="font-size: 8rem; font-weight: 900; color: #1e293b; transform: rotate(-45deg); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.1em;">${config.watermarkText || 'Perfect Lecture'}</h1>`;
                        pageWrapper.appendChild(wm);
                    }

                    // Page Header (PDF) - only if enableHeaderFooter is active
                    if (config.enableHeaderFooter && config.showPageHeader) {
                        const headerDiv = document.createElement('div');
                        headerDiv.style.position = 'absolute';
                        headerDiv.style.top = `${margin / 2}px`;
                        headerDiv.style.left = `${margin}px`;
                        headerDiv.style.right = `${margin}px`;
                        headerDiv.style.display = 'flex';
                        headerDiv.style.justifyContent = 'space-between';
                        headerDiv.style.alignItems = 'center';
                        headerDiv.style.fontSize = '9px';
                        headerDiv.style.fontWeight = 'bold';
                        headerDiv.style.color = '#94a3b8';
                        headerDiv.style.borderBottom = '0.5px solid #e2e8f0';
                        headerDiv.style.paddingBottom = '4px';
                        headerDiv.style.zIndex = '10';
                        
                        const leftSpan = document.createElement('span');
                        leftSpan.textContent = config.pageHeaderText !== undefined ? config.pageHeaderText : (lecture.title || '');
                        const rightSpan = document.createElement('span');
                        rightSpan.textContent = lecture.subjectName || '';
                        
                        headerDiv.appendChild(leftSpan);
                        headerDiv.appendChild(rightSpan);
                        pageWrapper.appendChild(headerDiv);
                    }

                    // Page Footer (PDF) - only if enableHeaderFooter is active
                    if (config.enableHeaderFooter) {
                        const footerDiv = document.createElement('div');
                        footerDiv.style.position = 'absolute';
                        footerDiv.style.bottom = `${margin / 2}px`;
                        footerDiv.style.left = `${margin}px`;
                        footerDiv.style.right = `${margin}px`;
                        footerDiv.style.display = 'flex';
                        footerDiv.style.justifyContent = 'space-between';
                        footerDiv.style.alignItems = 'center';
                        footerDiv.style.fontSize = '9px';
                        footerDiv.style.fontWeight = 'bold';
                        footerDiv.style.color = '#94a3b8';
                        footerDiv.style.borderTop = '0.5px solid #e2e8f0';
                        footerDiv.style.paddingTop = '4px';
                        footerDiv.style.zIndex = '10';
                        
                        const footerLeftSpan = document.createElement('span');
                        const isLastPage = i === (totalPages - 1);
                        footerLeftSpan.textContent = (isLastPage && config.showPageFooterText) ? (config.pageFooterText || "Perfect Academic Publication") : "";
                        
                        const footerRightSpan = document.createElement('span');
                        footerRightSpan.textContent = config.showPageNumbers 
                            ? (config.pageNumberLanguage === 'bn' 
                                ? `পৃষ্ঠা ${toBengaliNumerals(i + 1)} / ${toBengaliNumerals(totalPages)}` 
                                : `Page ${i + 1} / ${totalPages}`)
                            : "";
                        
                        footerDiv.appendChild(footerLeftSpan);
                        footerDiv.appendChild(footerRightSpan);
                        pageWrapper.appendChild(footerDiv);
                    }

                    const contentWrapper = document.createElement('div');
                    contentWrapper.style.position = 'absolute';
                    contentWrapper.style.top = `${margin}px`;
                    contentWrapper.style.left = `${margin}px`;
                    contentWrapper.style.width = `${printableW}px`;
                    contentWrapper.style.height = `${printableH}px`;
                    contentWrapper.style.overflow = 'hidden';
                    contentWrapper.style.zIndex = '10';
                    contentWrapper.style.boxSizing = 'border-box';

                    const clonedContent = styleWrapperMeasure.cloneNode(true);
                    clonedContent.style.position = 'absolute';
                    clonedContent.style.top = `-${contentIndex * pageStep}px`;
                    clonedContent.style.left = '0';
                    clonedContent.style.width = `${printableW}px`;
                    clonedContent.style.marginTop = '0px';

                    contentWrapper.appendChild(clonedContent);
                    pageWrapper.appendChild(contentWrapper);
                }

                document.body.appendChild(pageWrapper);

                await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50)));

                const canvas = await html2canvas(pageWrapper, {
                    scale: totalPages > 12 ? 1.4 : 2.2, // scale down for large docs to prevent crash
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: config.paperColor || '#ffffff',
                    logging: false,
                    width: w,
                    height: h,
                    windowWidth: w,
                    windowHeight: h,
                    scrollX: 0,
                    scrollY: 0
                });

                const imgData = canvas.toDataURL('image/jpeg', totalPages > 12 ? 0.90 : 0.95);

                document.body.removeChild(pageWrapper); // Immediately remove to clean memory!

                if (i > 0) {
                    pdf.addPage([w, h], orientation);
                }

                pdf.addImage(imgData, 'JPEG', 0, 0, w, h, undefined, 'FAST');
            }

            setPdfProgress(90);
            setPdfStatus('পিডিএফ ফাইল ডাউনলোড করা হচ্ছে...');

            const safeTitle = (lecture.title || 'lecture').substring(0, 20).replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, "_");
            pdf.save(coverOnly ? `Cover_${safeTitle}.pdf` : `Lecture_${safeTitle}.pdf`);

            setPdfProgress(100);
            setPdfStatus('ডাউনলোড সম্পন্ন হয়েছে!');
            
            setTimeout(() => {
                setPdfLoading(false);
                setPdfProgress(0);
            }, 800);

        } catch (err) {
            console.error("PDF generation error: ", err);
            triggerToast('error', 'পিডিএফ ডাউনলোড করতে সমস্যা হয়েছে।');
            setPdfLoading(false);
        }
    };

    // AI Write assist inside active section
    const handleAIAssist = async (targetSection) => {
        const sec = targetSection || lecture.sections.find(s => s.id === activeSectionId);
        if (!sec || !sec.sectionTitle) return;
        
        setAiGenerating(true);
        try {
            // Check if section id is a valid UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sec.id);
            const res = await lectureService.aiGenerate({
                topic: sec.sectionTitle,
                topicId: isUuid ? sec.id : null,
                class: lecture.className || '10',
                difficulty: lecture.difficultyLevel,
                language: lecture.language
            });

            if (res.success && res.data) {
                if (editor) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(editor.getHTML(), 'text/html');
                    const h3 = doc.querySelector(`h3[data-section-id="${sec.id}"]`);
                    if (h3) {
                        const explanationDiv = document.createElement('div');
                        explanationDiv.innerHTML = "<br/>" + res.data.explanation;
                        
                        let nextNode = h3.nextSibling;
                        while (nextNode && !(nextNode.nodeType === 1 && (nextNode.tagName.toLowerCase() === 'h3' || nextNode.getAttribute('data-type') === 'question-block'))) {
                            nextNode = nextNode.nextSibling;
                        }
                        
                        if (nextNode) {
                            nextNode.parentNode.insertBefore(explanationDiv, nextNode);
                        } else {
                            h3.parentNode.appendChild(explanationDiv);
                        }

                        while (explanationDiv.firstChild) {
                            explanationDiv.parentNode.insertBefore(explanationDiv.firstChild, explanationDiv);
                        }
                        explanationDiv.parentNode.removeChild(explanationDiv);

                        const newHtml = doc.body.innerHTML;
                        editor.commands.setContent(newHtml);
                        setRawContent(newHtml);
                    } else {
                        editor.chain().focus().insertContent("<br/><br/>" + res.data.explanation).run();
                    }
                } else {
                    const newContent = sec.content + "<br/><br/>" + res.data.explanation;
                    updateSectionContent(sec.id, newContent);
                }
                triggerToast('success', 'এআই অ্যাসিস্ট সফলভাবে ব্যাখ্যা যুক্ত করেছে!');
            }
        } catch (err) {
            console.error(err);
            triggerToast('error', 'এআই রাইট অ্যাসিস্ট ব্যর্থ হয়েছে।');
        } finally {
            setAiGenerating(false);
        }
    };

    // Section mutations
    const addSection = () => {
        const newSecId = `new-${Date.now()}`;
        const sectionHtml = `<h3 class="lecture-section-header" data-section-id="${newSecId}">নতুন সেকশন</h3><p>এখানে বিস্তারিত লিখুন...</p>`;
        
        if (editor) {
            editor.chain().focus().insertContent(sectionHtml).run();
        } else {
            setRawContent(prev => prev + sectionHtml);
        }

        setActiveSectionId(newSecId);
        setSelection({ type: 'section', id: newSecId });
    };

    const removeSection = (secId) => {
        if (lecture.sections.length === 1) return;
        const remaining = lecture.sections.filter(s => s.id !== secId);
        
        const newHtml = generateInitialHtml(remaining);
        if (editor) {
            editor.commands.setContent(newHtml);
        }
        setRawContent(newHtml);
        setLecture(prev => ({ ...prev, sections: remaining }));
        if (activeSectionId === secId) {
            setActiveSectionId(remaining[0].id);
        }
    };

    const updateSectionContent = (secId, content) => {
        setLecture(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === secId ? { ...s, content } : s)
        }));
    };

    const updateSectionTitle = (secId, title) => {
        setLecture(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === secId ? { ...s, sectionTitle: title } : s)
        }));

        if (editor) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(editor.getHTML(), 'text/html');
            const h3 = doc.querySelector(`h3[data-section-id="${secId}"]`);
            if (h3) {
                h3.textContent = title;
                const newHtml = doc.body.innerHTML;
                editor.commands.setContent(newHtml);
                setRawContent(newHtml);
            }
        }
    };

    const moveSection = (idx, direction) => {
        const list = [...lecture.sections];
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= list.length) return;
        
        [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
        
        const newHtml = generateInitialHtml(list);
        if (editor) {
            editor.commands.setContent(newHtml);
        }
        setRawContent(newHtml);
        setLecture(prev => ({ ...prev, sections: list }));
    };

    // Question mutations inside sections
    const handleMoveQuestion = (sectionId, questionId, direction) => {
        const updatedSections = lecture.sections.map(sec => {
            if (sec.id !== sectionId) return sec;
            const qList = [...(sec.questions || [])];
            const index = qList.findIndex(q => (q.questionId || q.id) === questionId);
            if (index === -1) return sec;

            if (direction === 'up' && index > 0) {
                [qList[index], qList[index - 1]] = [qList[index - 1], qList[index]];
            } else if (direction === 'down' && index < qList.length - 1) {
                [qList[index], qList[index + 1]] = [qList[index + 1], qList[index]];
            }
            return { ...sec, questions: qList };
        });

        const newHtml = generateInitialHtml(updatedSections);
        if (editor) {
            editor.commands.setContent(newHtml);
        }
        setRawContent(newHtml);
        setLecture(prev => ({ ...prev, sections: updatedSections }));
    };

    const handleRemoveQuestion = (sectionId, questionId) => {
        const updatedSections = lecture.sections.map(sec => {
            if (sec.id !== sectionId) return sec;
            return {
                ...sec,
                questions: (sec.questions || []).filter(q => (q.questionId || q.id) !== questionId)
            };
        });

        const newHtml = generateInitialHtml(updatedSections);
        if (editor) {
            editor.commands.setContent(newHtml);
        }
        setRawContent(newHtml);
        setLecture(prev => ({ ...prev, sections: updatedSections }));
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-outfit">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-extrabold text-xs tracking-widest uppercase">Opening Lecture Sheet...</p>
        </div>
    );

    const marginCSSValues = {
        'narrow': '0.5in',
        'moderate': '0.75in',
        'normal': '1.0in',
        'wide': '1.5in'
    };

    return (
        <div id="lecture-editor-root" className="flex flex-col h-full bg-[#e5e7eb] font-outfit overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 print:overflow-visible print:block print:h-auto print:static print:min-h-0">
            <style>{`
                @media print {
                    @page { 
                        size: ${config.paperSize === 'Legal' ? 'legal' : config.paperSize === 'Letter' ? 'letter' : 'A4'} ${config.orientation === 'landscape' ? 'landscape' : 'portrait'}; 
                        margin: ${marginCSSValues[config.margins] || '1.0in'} !important; 
                    }
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background: #fff !important; 
                        overflow: visible !important; 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* STRICT PRINT ISOLATION: Hide all elements that are not ancestors or descendants of the active editor */
                    body :not(:has(#lecture-editor-root)):not(#lecture-editor-root):not(#lecture-editor-root *) {
                        display: none !important;
                    }
                    #lecture-editor-root > :not(#lecture-editor-body) {
                        display: none !important;
                    }
                    #lecture-editor-body > :not(main) {
                        display: none !important;
                    }
                    
                    /* Hide explicitly marked non-printable elements inside the active tree */
                    .no-print,
                    .print\\:hidden,
                    button,
                    input[type="range"] {
                        display: none !important;
                    }
                    
                    /* Reset visibility and style layout ancestors of the canvas */
                    html,
                    body, 
                    body :has(#lecture-editor-root),
                    #lecture-editor-root, 
                    #lecture-editor-body, 
                    main {
                        display: block !important;
                        visibility: visible !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        min-height: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        transform: none !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    #lecture-paper-canvas {
                        display: block !important;
                        visibility: visible !important;
                        position: relative !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        min-height: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        transform: none !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    #lecture-paper-canvas * {
                        visibility: visible !important;
                    }
                    
                    /* Show background pages wrapper in print, align page by page */
                    #lecture-paper-canvas > div.pointer-events-none {
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        z-index: 0 !important;
                    }
                    .paper-page-background {
                        height: 100vh !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        box-sizing: border-box !important;
                        position: relative !important;
                    }
                    
                    /* Cover Page Print Layout: use block to avoid flexbox print bugs in Chromium */
                    .lecture-cover-page {
                        display: block !important;
                        position: relative !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 98vh !important;
                        min-height: 98vh !important;
                        max-height: 98vh !important;
                        box-sizing: border-box !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        margin: 0 !important;
                        padding: 1.0in 0.5in !important;
                        background-color: #ffffff !important;
                        z-index: 2000 !important;
                    }
                    .lecture-cover-border {
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                    }
                    .lecture-cover-minimal-line {
                        top: 0 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                    }
                    .lecture-cover-modern-banner {
                        left: 0 !important;
                        right: 0 !important;
                        margin-top: -1.0in !important; /* Offset cover page top padding in print */
                    }
                    
                    /* Layout spacing for cover template elements in print */
                    .lecture-cover-page > div.z-10 {
                        display: block !important;
                        width: 100% !important;
                        margin-left: auto !important;
                        margin-right: auto !important;
                    }
                    .lecture-cover-page > div.z-10:nth-of-type(1) {
                        margin-bottom: 1.2in !important;
                    }
                    .lecture-cover-page > div.z-10:nth-of-type(2) {
                        margin-bottom: 1.5in !important;
                    }

                    /* Content Canvas Print Layout */
                    .lecture-content-canvas {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: 0 !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        page-break-before: always !important;
                        break-before: page !important;
                    }
                    
                    /* Reset inline spacing of ProseMirror children to prevent vertical gaps in print */
                    .ProseMirror > * {
                        margin-top: 0 !important;
                        padding-top: 2px !important;
                    }

                    .ProseMirror img, 
                    .ProseMirror [data-type="question-block"],
                    .ProseMirror table,
                    .ProseMirror p,
                    .ProseMirror li {
                        break-inside: avoid-column !important;
                        page-break-inside: avoid !important;
                        max-width: 100% !important;
                    }

                    .view-continuous, .view-paginated { 
                        transform: none !important; 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        width: 100% !important; 
                        height: auto !important; 
                    }
                }
            `}</style>
            
            {/* Top Toolbar */}
            <LectureToolbar
                title={lecture.title}
                setTitle={(val) => setLecture(prev => ({ ...prev, title: val }))}
                difficulty={lecture.difficultyLevel}
                setDifficulty={(val) => setLecture(prev => ({ ...prev, difficultyLevel: val }))}
                language={lecture.language}
                setLanguage={(val) => setLecture(prev => ({ ...prev, language: val }))}
                activeTab={activeTab}
                handleTabClick={handleTabClick}
                saving={saving}
                handleSaveDraft={handleSaveDraft}
                generatingExam={generatingExam}
                handleCreateExam={handleCreateExam}
                pdfLoading={pdfLoading}
                handleDownloadPDF={handleDownloadPDF}
                handleStartPresentation={() => setIsPresentationOpen(true)}
                showAttachments={showAttachments}
                setShowAttachments={setShowAttachments}
                navigate={navigate}
                addSection={addSection}
                activeSectionId={activeSectionId}
                handleAIAssist={() => handleAIAssist()}
                aiGenerating={aiGenerating}
                config={config}
                setConfig={setConfig}
                applyCommand={applyCommand}
                handleFontFamilyChange={handleFontFamilyChange}
                handleFontSizeChange={handleFontSizeChange}
                addQuestion={addQuestion}
                fileInputRef={fileInputRef}
                handleImageSelect={handleImageSelect}
                setEquationModalOpen={setEquationModalOpen}
                showInstructions={showInstructions}
                setShowInstructions={setShowInstructions}
                setRightPanelOpen={setRightPanelOpen}
                setHighlightedSection={setHighlightedSection}
                editorStyles={editorStyles}
                getFontFamilyClass={getFontFamilyClass}
                editor={editor}
                handleOpenImportModal={() => setImportModalOpen(true)}
            />

            {/* Main Editor Body */}
            <div id="lecture-editor-body" className="flex-1 flex overflow-hidden relative">
                
                {/* Left Outline Panel */}
                <LectureLeftNavigator
                    lecture={lecture}
                    leftPanelOpen={leftPanelOpen}
                    activeSectionId={activeSectionId}
                    setActiveSectionId={(val) => {
                        setActiveSectionId(val);
                        setSelection({ type: 'section', id: val });
                    }}
                    moveSection={moveSection}
                    isBengaliFont={config.fontFamily.includes('tiro') || config.fontFamily.includes('hind') || config.fontFamily.includes('noto')}
                    toBengaliNumeral={toBengaliNumeral}
                />

                {/* Left Toggle */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30">
                    <button
                        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                        className={`bg-white text-slate-600 hover:text-indigo-600 border border-slate-300 rounded-r-lg p-2 shadow-md transition-all ${leftPanelOpen ? 'translate-x-[256px] border-l-0' : 'translate-x-0'}`}
                    >
                        {leftPanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                    </button>
                </div>

                {/* Center Canvas */}
                <LecturePaperCanvas
                    lecture={lecture}
                    setLecture={setLecture}
                    config={config}
                    zoom={zoom}
                    setZoom={setZoom}
                    selection={selection}
                    setSelection={setSelection}
                    setRightPanelOpen={setRightPanelOpen}
                    isBengaliFont={config.fontFamily.includes('tiro') || config.fontFamily.includes('hind') || config.fontFamily.includes('noto')}
                    toBengaliNumeral={toBengaliNumeral}
                    updateSectionContent={updateSectionContent}
                    updateSectionTitle={updateSectionTitle}
                    removeSection={removeSection}
                    handleMoveQuestion={handleMoveQuestion}
                    handleRemoveQuestion={handleRemoveQuestion}
                    rightPanelOpen={rightPanelOpen}
                    getOptionLabel={getOptionLabel}
                    rawContent={rawContent}
                    onEditorChange={handleEditorChange}
                    setEditor={setEditor}
                />

                {/* Right Toggle */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30">
                    <button
                        onClick={() => setRightPanelOpen(!rightPanelOpen)}
                        className={`bg-white text-slate-600 hover:text-indigo-600 border border-slate-300 rounded-l-lg p-2 shadow-md transition-all ${rightPanelOpen ? '-translate-x-[288px] border-r-0' : 'translate-x-0'}`}
                    >
                        {rightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                    </button>
                </div>

            {/* Right Properties Panel */}
                <LectureRightProperties
                    rightPanelOpen={rightPanelOpen}
                    activeTab={activeTab}
                    selection={selection}
                    setSelection={setSelection}
                    lecture={lecture}
                    setLecture={setLecture}
                    config={config}
                    setConfig={setConfig}
                    handleFontFamilyChange={handleFontFamilyChange}
                    handleFontSizeChange={handleFontSizeChange}
                    removeSection={removeSection}
                    handleAIAssist={handleAIAssist}
                    aiGenerating={aiGenerating}
                    handleRemoveQuestion={handleRemoveQuestion}
                    showInstructions={showInstructions}
                    setShowInstructions={setShowInstructions}
                    highlightedSection={highlightedSection}
                    applyCommand={applyCommand}
                    editorStyles={editorStyles}
                    getFontFamilyClass={getFontFamilyClass}
                    editor={editor}
                />
            </div>

            {/* Attachment Sidebar Panel */}
            {showAttachments && lecture.id && (
                <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[100] border-l border-slate-200 animate-in slide-in-from-right duration-300 flex flex-col">
                    <AttachmentPanel 
                        lectureId={lecture.id} 
                        isOpen={true}
                        onClose={() => setShowAttachments(false)} 
                    />
                </div>
            )}

            {/* Notification message */}
            {message && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-lg shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-5 ${
                    message.type === 'success' ? 'bg-slate-800 text-white' : 'bg-rose-600 text-white'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertTriangle size={20} />}
                    <span className="text-xs font-black">{message.text}</span>
                </div>
            )}

            <EquationEditorModal
                isOpen={equationModalOpen}
                onClose={() => setEquationModalOpen(false)}
                onInsert={handleEquationInsert}
            />
            
            <ImageEditorModal
                file={pendingImageFile}
                isOpen={imageModalOpen}
                onClose={() => setImageModalOpen(false)}
                onSave={handleImageSave}
                maxSizeKB={300}
                aspectRatio={null}
            />

            <PresentationWizard
                isOpen={isPresentationOpen}
                onClose={() => setIsPresentationOpen(false)}
                htmlContent={rawContent}
                title={lecture.title}
            />

            <ImportKnowledgeHubModal
                isOpen={importModalOpen}
                closeModal={() => setImportModalOpen(false)}
                hierarchy={hierarchy}
                subjectLanguageMap={subjectLanguageMap}
                onImportSuccess={handleImportSuccess}
            />

            {/* Global Loader for PDF Export */}
            <AnimatePresence>
                {pdfLoading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-6 no-print"
                    >
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full flex flex-col items-center gap-6 shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                {/* Double spinning ring */}
                                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-t-rose-500 border-r-indigo-500 animate-spin"></div>
                                <FileDown className="text-rose-400 animate-bounce" size={32} />
                            </div>
                            
                            <div className="text-center w-full">
                                <h3 className="text-lg font-black text-white font-outfit">পিডিএফ ফাইল তৈরি হচ্ছে</h3>
                                <p className="text-xs text-slate-400 mt-1">{pdfStatus}</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                <motion.div 
                                    className="bg-gradient-to-r from-rose-500 to-indigo-500 h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pdfProgress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            <div className="text-xs font-mono text-rose-400 font-bold">
                                {pdfProgress}% সম্পন্ন
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LectureEditor;
