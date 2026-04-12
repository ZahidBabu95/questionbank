import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Palette, LayoutGrid, Search, X, Filter, BookOpen,
    Maximize2, Minimize2, Columns, Scissors, Scaling, 
    ArrowRightCircle, Layout, Move, Square, FileStack,
    FileText, Save, Download, Plus, List, AlignLeft, AlignCenter, AlignRight,
    ZoomIn, ZoomOut, RotateCcw, RotateCw, Strikethrough, Superscript, Subscript,
    Indent, Outdent, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
    Trash2, Edit3, Settings, CheckCircle2, AlertTriangle, Bold, Italic, Underline,
    Home as HomeIcon, Image as ImageIcon, Minus, Sigma
} from 'lucide-react';
import examService from '../../../services/examService';
import questionService from '../../../services/questionService';
import EquationEditorModal from '../../../components/EquationEditorModal';
import ImageEditorModal from '../../../components/ImageEditorModal';

const ExamEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [zoom, setZoom] = useState(100);
    const [selectedQuestionId, setSelectedQuestionId] = useState(null);
    const [isBankOpen, setIsBankOpen] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState('properties');

    // Media Modal States
    const [equationModalOpen, setEquationModalOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [pendingImageFile, setPendingImageFile] = useState(null);
    const fileInputRef = React.useRef(null);

    // UI Layout state
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    // Editor configuration
    const [config, setConfig] = useState({
        columns: 2,
        showMarks: true,
        showTags: false,
        showQuestionNumbers: true,
        headerStyle: 'standard', // 'standard', 'boxed', 'legal'
        headerLayout: 'centered', // 'centered', 'spread'
        fontFamily: 'font-tiro text-lg',
        fontSize: 11,
        instituteFontSize: 24,
        titleFontSize: 18,
        metaFontSize: 11,
        instructionFontSize: 10,
        showInstituteName: true,
        showTitle: true,
        showInstructions: true,
        showStudentInfo: true,
        paperSize: 'A4',
        orientation: 'portrait',
        watermark: false,
        watermarkText: 'Q-Editor Pro',
        watermarkOpacity: 10,
        optionStyle: 'circle',
        optionLabel: 'a, b, c',
        optionCols: 2,
        lineSpacing: 1.5,
        letterSpacing: 0,
        questionGap: 1.5,
        columnLayout: 'vertical',
        margins: 'narrow', // Set narrow as default to reduce empty space
        customMargins: { top: 1, bottom: 1, left: 1, right: 1 },
        showPageNumbers: true,
        showColumnDivider: true,
        showPageBorder: false,
        includeAnswers: false,
        includeAnswerSheet: false,
        shuffleQuestions: false,
        shuffleOptions: false,
        paperColor: '#ffffff',
        pageView: 'paginated', // Default to paginated A4 pages
    });

    const [selection, setSelection] = useState({ type: 'page', id: null });

    const BLANK_EXAM = {
        instituteName: '',
        title: '',
        className: '',
        subjectName: '',
        durationMinutes: 60,
        totalMarks: 100,
        questions: [],
        instructions: 'সঠিক উত্তরের বৃত্ত বল পয়েন্ট কলম দ্বারা সম্পূর্ণ ভরাট কর।',
        setName: '',
        chapterName: '',
        headerText: '',
        footerText: ''
    };

    useEffect(() => {
        if (!id) {
            setExam(BLANK_EXAM);
            setLoading(false);
            return;
        }
        const fetchExam = async () => {
            try {
                const res = await examService.getExam(id);
                if (res.success) {
                    setExam(res.data);
                }
            } catch (err) {
                console.error("Failed to load exam", err);
                setMessage({ type: 'error', text: 'Failed to load exam details.' });
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id]);

    const handleUpdate = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const updatedQuestions = exam.questions.map((q, idx) => ({
                ...q,
                order: idx + 1
            }));
            const payload = { ...exam, questions: updatedQuestions };

            let res;
            if (id) {
                res = await examService.updateExam(id, payload);
            } else {
                res = await examService.createExam(payload);
                if (res.success) {
                    navigate(`/exams/generate/editor/${res.data.id}`, { replace: true });
                }
            }

            if (res.success) {
                setExam(res.data);
                setMessage({ type: 'success', text: 'Changes saved successfully.' });
                setTimeout(() => setMessage(null), 3000);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save changes.' });
        } finally {
            setSaving(false);
        }
    };

    const MATH_SSC_TEMPLATE = {
        instituteName: "অধ্যায় ভিত্তিক",
        title: "এস এস সি মডেল টেস্ট",
        className: "SSC",
        subjectName: "গণিত",
        durationMinutes: 40,
        totalMarks: 40,
        instructions: "বি:দ্র: সঠিক উত্তরের বৃত্ত বল পয়েন্ট কলম দ্বারা সম্পূর্ণ ভরাট কর। প্রতিটি প্রশ্নের মান-১",
        setName: "আঁখি",
        chapterName: "৯.১",
        questions: [
            {
                id: 'temp-1',
                type: 'MCQ',
                questionText: 'ত্রিকোণমিতি <b>(Trignometric)</b> শব্দটি-',
                marks: 1,
                order: 1,
                options: [
                    { optionText: 'ইংরেজি শব্দ', isCorrect: false },
                    { optionText: 'পর্তুগীজ শব্দ', isCorrect: false },
                    { optionText: 'গ্রিক শব্দ', isCorrect: false },
                    { optionText: 'হিন্দি শব্দ', isCorrect: false }
                ]
            },
            {
                id: 'temp-2',
                type: 'MCQ',
                questionText: 'সমকোণী ত্রিভুজের বৃহত্তম বাহু বা সমকোণের বিপরীত বাহুকে কী বলে?',
                marks: 1,
                order: 2,
                options: [
                    { optionText: 'বিপরীত বাহু', isCorrect: false },
                    { optionText: 'অতিভুজ', isCorrect: false },
                    { optionText: 'সন্নিহিত বাহু', isCorrect: false },
                    { optionText: 'কর্ণ', isCorrect: false }
                ]
            }
        ]
    };

    const handleEquationInsert = (html, latex) => {
        document.execCommand('insertHTML', false, html);
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
        const reader = new FileReader();
        reader.onloadend = () => {
            const imgHtml = `<img src="${reader.result}" alt="inserted image" style="max-width: 100%; max-height: 250px; display: block; margin: 8px 0; border-radius: 4px;" />`;
            document.execCommand('insertHTML', false, imgHtml);
        };
        reader.readAsDataURL(finalFile);
    };

    const applyCommand = (e, command, value = null) => {
        e.preventDefault(); // Prevent button from stealing focus
        document.execCommand(command, false, value);
    };

    const isBengaliFont = config.fontFamily.includes('hind') || config.fontFamily.includes('noto') || config.fontFamily.includes('tiro');

    const toBengaliNumeral = (num) => {
        const banglaDigits = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        return String(num).replace(/[0-9]/g, x => banglaDigits[x]);
    };

    const getOptionLabel = (index) => {
        if (isBengaliFont) {
            const banglaChars = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ'];
            return banglaChars[index] || banglaChars[0];
        }
        return String.fromCharCode(97 + index);
    };

    const handleDownload = (format) => {
        const params = {
            includeAnswers: config.includeAnswers,
            includeAnswerSheet: config.includeAnswerSheet,
            includeWatermark: config.watermark,
            shuffleQuestions: config.shuffleQuestions,
            shuffleOptions: config.shuffleOptions,
            paperSize: config.paperSize,
            fontSize: config.fontSize,
            template: config.headerStyle,
            columns: config.columns
        };
        if (format === 'pdf') examService.downloadPdf(id, params);
        else examService.downloadWord(id, params);
    };

    const updateQuestion = (qId, field, value) => {
        setExam(prev => ({
            ...prev,
            questions: prev.questions.map(q => q.id === qId ? { ...q, [field]: value } : q)
        }));
    };

    const updateOption = (qId, oIdx, value) => {
        setExam(prev => ({
            ...prev,
            questions: prev.questions.map(q => {
                if (q.id === qId) {
                    const newOpts = [...q.options];
                    newOpts[oIdx] = { ...newOpts[oIdx], optionText: value };
                    return { ...q, options: newOpts };
                }
                return q;
            })
        }));
    };

    const addOption = (qId) => {
        setExam(prev => ({
            ...prev,
            questions: prev.questions.map(q => {
                if (q.id === qId) {
                    const label = String.fromCharCode(65 + q.options.length);
                    return {
                        ...q,
                        options: [...q.options, { optionText: `Option ${label}`, isCorrect: false }]
                    };
                }
                return q;
            })
        }));
    };

    const removeOption = (qId, oIdx) => {
        setExam(prev => ({
            ...prev,
            questions: prev.questions.map(q => {
                if (q.id === qId) {
                    return {
                        ...q,
                        options: q.options.filter((_, idx) => idx !== oIdx)
                    };
                }
                return q;
            })
        }));
    };

    const deleteQuestion = (qId) => {
        setExam(prev => ({
            ...prev,
            questions: prev.questions.filter(q => q.id !== qId)
        }));
        if (selectedQuestionId === qId) setSelectedQuestionId(null);
    };

    const moveQuestion = (index, direction) => {
        if (!exam || !exam.questions) return;
        const newQuestions = [...exam.questions];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newQuestions.length) return;

        // Swap
        [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];

        // Update orders
        const orderedQuestions = newQuestions.map((q, idx) => ({ ...q, order: idx + 1 }));
        setExam({ ...exam, questions: orderedQuestions });
    };

    const addQuestion = (type) => {
        const cqTemplate = isBengaliFont 
            ? '<p>উদ্দীপকটি এখানে লিখুন...</p><br/><div style="margin-top: 8px;"><p>(ক) ...</p><p>(খ) ...</p><p>(গ) ...</p><p>(ঘ) ...</p></div>' 
            : '<p>Enter stem...</p><br/><div style="margin-top: 8px;"><p>(a) ...</p><p>(b) ...</p><p>(c) ...</p><p>(d) ...</p></div>';
            
        const newQ = {
            id: `new-${Date.now()}`,
            questionText: type === 'CQ' ? cqTemplate : (isBengaliFont ? 'নতুন প্রশ্ন...' : 'Type your question here...'),
            type: type,
            marks: type === 'MCQ' ? 1 : 10,
            options: type === 'MCQ' ? [
                { optionText: 'Option A', isCorrect: false },
                { optionText: 'Option B', isCorrect: false },
                { optionText: 'Option C', isCorrect: false },
                { optionText: 'Option D', isCorrect: false }
            ] : []
        };
        setExam(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
        setSelectedQuestionId(newQ.id);
    };

    const importQuestion = (q) => {
        const newQ = {
            ...q,
            id: `imported-${Date.now()}-${q.id}`,
            order: (exam.questions?.length || 0) + 1
        };
        setExam(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
        setMessage({ type: 'success', text: 'Question added to paper!' });
        setTimeout(() => setMessage(null), 2000);
    };

    const RibbonTab = ({ id, label, icon: Icon, active, onClick }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-5 py-2 text-[12px] font-bold transition-all relative rounded-t-lg mx-0.5 ${active ? 'text-indigo-700 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.02)]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
        >
            <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} /> {label}
            {active && <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-600 rounded-t-full"></div>}
        </button>
    );

    const ToolbarGroup = ({ label, children }) => (
        <div className="flex items-center px-3 self-stretch relative group border-r border-slate-200/60 last:border-0 my-1 py-1 flex-col justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 h-full">{children}</div>
            <span className="text-[10px] font-medium text-slate-400 mt-auto">{label}</span>
        </div>
    );

    const ToolButton = ({ icon: Icon, onClick, onMouseDown, active, label, disabled }) => (
        <button
            onClick={onClick}
            onMouseDown={onMouseDown}
            disabled={disabled}
            title={label}
            className={`p-1.5 rounded transition-all flex items-center justify-center disabled:opacity-30 ${active ? 'bg-indigo-100 text-indigo-700' :
                'hover:bg-white text-slate-700 active:scale-95'
                }`}
        >
            <Icon size={14} />
        </button>
    );

    const marginPixels = {
        'narrow': '48px', // 0.5in
        'moderate': '72px', // 0.75in
        'normal': '96px', // 1.0in
        'wide': '144px'   // 1.5in
    };

    const paperDimensions = {
        'A4': { portrait: { w: 794, h: 1123 }, landscape: { w: 1123, h: 794 } },
        'Legal': { portrait: { w: 816, h: 1344 }, landscape: { w: 1344, h: 816 } },
        'Letter': { portrait: { w: 816, h: 1056 }, landscape: { w: 1056, h: 816 } },
        'A3': { portrait: { w: 1123, h: 1587 }, landscape: { w: 1587, h: 1123 } }
    };

    // Helper to calculate total pages (approximate)
    // In a real editor, this would be computed by measuring the DOM
    const getPageStyle = () => {
        const { w, h } = paperDimensions[config.paperSize][config.orientation];
        return {
            width: `${w}px`,
            minHeight: `${h}px`,
            padding: marginPixels[config.margins],
            backgroundColor: config.paperColor,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: config.showPageBorder 
                ? '0 0 0 1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1), inset 0 0 0 2px #334155, inset 0 0 0 5px white, inset 0 0 0 6px #334155' 
                : '0 0 0 1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            position: 'relative',
            zIndex: 10,
        };
    };

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        setRightPanelTab('properties');
        setRightPanelOpen(true);
        if (tabId === 'layout' || tabId === 'design') setSelection({ type: 'page', id: null });
        if (tabId === 'bank') setSelection({ type: 'page', id: null });
        if (tabId === 'home') setSelection({ type: 'page', id: null });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-bold text-sm">Opening Document...</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#e5e7eb] font-outfit overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">

            {/* 1. TOP RIBBON / TOOLBAR (Modern Office Style) */}
            <header className="bg-slate-50 border-b border-slate-300 z-50 shrink-0 shadow-sm flex flex-col pt-1">
                {/* Ribbon Tabs Row */}
                <div className="flex items-end px-3 gap-1">
                    <div className="w-10 h-10 flex items-center justify-center mb-1 mr-2 bg-indigo-600 rounded-lg text-white shadow-sm cursor-pointer hover:bg-indigo-700 transition-colors" onClick={() => navigate('/exams/generate/saved')}>
                        <FileText size={20} />
                    </div>
                    <RibbonTab id="home" label="Home" icon={HomeIcon} active={activeTab === 'home'} onClick={() => handleTabClick('home')} />
                    <RibbonTab id="insert" label="Insert" icon={Plus} active={activeTab === 'insert'} onClick={() => handleTabClick('insert')} />
                    <RibbonTab id="layout" label="Layout" icon={LayoutGrid} active={activeTab === 'layout'} onClick={() => handleTabClick('layout')} />
                    <RibbonTab id="bank" label="Pro Settings" icon={Settings} active={activeTab === 'bank'} onClick={() => handleTabClick('bank')} />
                    <RibbonTab id="design" label="Design" icon={Palette} active={activeTab === 'design'} onClick={() => handleTabClick('design')} />

                    <div className="ml-auto flex items-center gap-3 pr-4 mb-2">
                        <span className="text-xs text-slate-400 font-medium mr-2">{saving ? 'Saving...' : 'All changes saved'}</span>
                        <div className="flex bg-white rounded-md border border-slate-200 p-0.5 shadow-sm">
                            <button onClick={() => handleDownload('docx')} className="p-1.5 hover:bg-slate-50 text-slate-600 rounded transition-all" title="Download Word">
                                <FileText size={14} />
                            </button>
                            <button onClick={() => handleDownload('pdf')} className="p-1.5 hover:bg-slate-50 text-indigo-600 rounded transition-all font-bold text-[10px]" title="Export PDF">
                                PDF
                            </button>
                        </div>
                        <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-all shadow-md disabled:opacity-50 active:scale-95">
                            <Save size={14} /> Save Changes
                        </button>
                    </div>
                </div>

                {/* Sub-Toolbar (Active Tab Controls) */}
                <div className="bg-white flex flex-wrap items-stretch shadow-md px-2 py-1.5 gap-y-1 w-full relative z-10 border-b border-slate-200">

                    {activeTab === 'home' && (
                        <>
                            <ToolbarGroup label="Undo/Redo">
                                <ToolButton icon={RotateCcw} label="Undo" onMouseDown={(e) => applyCommand(e, 'undo')} />
                                <ToolButton icon={RotateCw} label="Redo" onMouseDown={(e) => applyCommand(e, 'redo')} />
                            </ToolbarGroup>
                            <ToolbarGroup label="Font">
                                <div className="flex flex-col gap-1.5 justify-center h-full">
                                    {/* Row 1 */}
                                    <div className="flex items-center gap-1">
                                        <select
                                            value={config.fontFamily}
                                            onChange={e => setConfig({ ...config, fontFamily: e.target.value })}
                                            className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2 py-1 text-[11px] font-semibold outline-none focus:border-indigo-500 w-32"
                                        >
                                            <option value="font-serif">Classic Serif</option>
                                            <option value="font-sans">Modern Sans</option>
                                            <option value="font-hind text-lg">Hind (Unicode)</option>
                                            <option value="font-noto text-lg">Noto (Unicode)</option>
                                            <option value="font-tiro text-lg">Tiro (Unicode)</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={config.fontSize}
                                            onChange={e => setConfig({ ...config, fontSize: parseInt(e.target.value) })}
                                            className="w-12 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[11px] font-semibold outline-none px-1 py-1 text-center"
                                        />
                                        <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                                        <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded p-[2px]">
                                            <button title="Highlight Yellow" onMouseDown={(e) => applyCommand(e, 'hiliteColor', '#fef08a')} className="p-1 rounded transition-all hover:bg-white"><div className="w-3.5 h-3.5 bg-yellow-300 rounded-sm"></div></button>
                                            <button title="Text Color Red" onMouseDown={(e) => applyCommand(e, 'foreColor', '#ef4444')} className="p-1 rounded transition-all hover:bg-white flex items-center justify-center font-bold text-[9px] text-red-500 border-b-[1.5px] border-red-500 leading-none pb-[2px]">A</button>
                                        </div>
                                    </div>
                                    {/* Row 2 */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-0.5 bg-slate-50 border border-slate-200 rounded p-[2px]">
                                            <ToolButton icon={Bold} label="Bold" onMouseDown={(e) => applyCommand(e, 'bold')} />
                                            <ToolButton icon={Italic} label="Italic" onMouseDown={(e) => applyCommand(e, 'italic')} />
                                            <ToolButton icon={Underline} label="Underline" onMouseDown={(e) => applyCommand(e, 'underline')} />
                                            <ToolButton icon={Strikethrough} label="Strikethrough" onMouseDown={(e) => applyCommand(e, 'strikethrough')} />
                                        </div>
                                        <div className="flex gap-0.5 bg-slate-50 border border-slate-200 rounded p-[2px]">
                                            <ToolButton icon={Subscript} label="Subscript" onMouseDown={(e) => applyCommand(e, 'subscript')} />
                                            <ToolButton icon={Superscript} label="Superscript" onMouseDown={(e) => applyCommand(e, 'superscript')} />
                                        </div>
                                    </div>
                                </div>
                            </ToolbarGroup>
                            <ToolbarGroup label="Paragraph">
                                <div className="flex flex-col gap-1.5 justify-center h-full">
                                    <div className="flex gap-0.5 bg-slate-50 border border-slate-200 rounded p-[2px]">
                                        <ToolButton icon={AlignLeft} label="Left Align" onMouseDown={(e) => applyCommand(e, 'justifyLeft')} />
                                        <ToolButton icon={AlignCenter} label="Center Align" onMouseDown={(e) => applyCommand(e, 'justifyCenter')} />
                                        <ToolButton icon={AlignRight} label="Right Align" onMouseDown={(e) => applyCommand(e, 'justifyRight')} />
                                    </div>
                                    <div className="flex gap-0.5 bg-slate-50 border border-slate-200 rounded p-[2px]">
                                        <ToolButton icon={Outdent} label="Decrease Indent" onMouseDown={(e) => applyCommand(e, 'outdent')} />
                                        <ToolButton icon={Indent} label="Increase Indent" onMouseDown={(e) => applyCommand(e, 'indent')} />
                                    </div>
                                </div>
                            </ToolbarGroup>
                            <ToolbarGroup label="Spacing">
                                <div className="flex flex-col gap-1.5 justify-center h-full">
                                    <div className="flex items-center gap-1.5 px-1">
                                        <span className="text-[10px] font-semibold text-slate-500 w-[55px]">Line Gap</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={config.lineSpacing}
                                            onChange={e => setConfig({ ...config, lineSpacing: parseFloat(e.target.value) })}
                                            className="w-[50px] bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[11px] font-semibold outline-none px-1 py-0.5 text-center"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-1">
                                        <span className="text-[10px] font-semibold text-slate-500 w-[55px]">Char Gap</span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={config.letterSpacing}
                                            onChange={e => setConfig({ ...config, letterSpacing: parseFloat(e.target.value) })}
                                            className="w-[50px] bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[11px] font-semibold outline-none px-1 py-0.5 text-center"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-1">
                                        <span className="text-[10px] font-semibold text-slate-500 w-[55px]">Q Gap</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={config.questionGap}
                                            onChange={e => setConfig({ ...config, questionGap: parseFloat(e.target.value) })}
                                            className="w-[50px] bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[11px] font-semibold outline-none px-1 py-0.5 text-center"
                                        />
                                    </div>
                                </div>
                            </ToolbarGroup>
                            <ToolbarGroup label="Reset">
                                <button onClick={() => setExam(BLANK_EXAM)} className="flex flex-col items-center justify-center gap-1.5 px-3 h-full hover:bg-rose-50 rounded transition-colors group border border-transparent hover:border-rose-200">
                                    <RotateCcw size={18} className="text-rose-500 group-hover:rotate-[-45deg] transition-all" />
                                    <span className="text-[10px] font-bold text-rose-600">Clear All</span>
                                </button>
                            </ToolbarGroup>
                        </>
                    )}

                    {activeTab === 'insert' && (
                        <>
                            <ToolbarGroup label="Questions">
                                <button onClick={() => addQuestion('MCQ')} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                    <List size={22} className="text-indigo-600" />
                                    <span className="text-[11px] font-medium text-slate-700">MCQ</span>
                                </button>
                                <button onClick={() => addQuestion('CQ')} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                    <Edit3 size={22} className="text-emerald-600" />
                                    <span className="text-[11px] font-medium text-slate-700">Written</span>
                                </button>
                                <button onClick={() => setIsBankOpen(true)} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                    <BookOpen size={22} className="text-amber-500" />
                                    <span className="text-[11px] font-medium text-slate-700">Bank</span>
                                </button>
                            </ToolbarGroup>
                            <ToolbarGroup label="Media">
                                <button onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                    <ImageIcon size={22} className="text-slate-600" />
                                    <span className="text-[11px] font-medium text-slate-700">Image</span>
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />

                                <button onMouseDown={(e) => { e.preventDefault(); setEquationModalOpen(true); }} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                    <Sigma size={22} className="text-blue-600" />
                                    <span className="text-[11px] font-medium text-slate-700">Math</span>
                                </button>
                            </ToolbarGroup>
                        </>
                    )}

                    {activeTab === 'layout' && (
                        <>
                            <ToolbarGroup label="Page Setup">
                                <div className="flex flex-col gap-1.5 justify-center h-full">
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center">
                                            <button 
                                                onClick={() => setConfig({...config, orientation: 'portrait'})}
                                                className={`p-1 rounded ${config.orientation === 'portrait' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
                                                title="Portrait Orientation"
                                            >
                                                <Square size={20} className="rotate-0" />
                                            </button>
                                            <span className="text-[9px] font-bold text-slate-500">Portrait</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <button 
                                                onClick={() => setConfig({...config, orientation: 'landscape'})}
                                                className={`p-1 rounded ${config.orientation === 'landscape' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
                                                title="Landscape Orientation"
                                            >
                                                <Square size={20} className="rotate-90" />
                                            </button>
                                            <span className="text-[9px] font-bold text-slate-500">Landscape</span>
                                        </div>
                                        <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Scaling size={14} className="text-slate-400" />
                                                <select
                                                    value={config.paperSize}
                                                    onChange={e => setConfig({ ...config, paperSize: e.target.value })}
                                                    className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-bold outline-none focus:border-indigo-500 w-24"
                                                >
                                                    <option value="A4">A4 (21 x 29.7cm)</option>
                                                    <option value="Legal">Legal (21.6 x 35.6cm)</option>
                                                    <option value="Letter">Letter (21.6 x 27.9cm)</option>
                                                    <option value="A3">A3 (29.7 x 42cm)</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Layout size={14} className="text-slate-400" />
                                                <select
                                                    value={config.margins}
                                                    onChange={e => setConfig({ ...config, margins: e.target.value })}
                                                    className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-bold outline-none focus:border-indigo-500 w-24"
                                                >
                                                    <option value="narrow">Narrow (0.5")</option>
                                                    <option value="moderate">Moderate (0.75")</option>
                                                    <option value="normal">Normal (1.0")</option>
                                                    <option value="wide">Wide (1.5")</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ToolbarGroup>
                            
                            <ToolbarGroup label="Columns">
                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded p-1">
                                    <button 
                                        onClick={() => setConfig({...config, columns: 1})}
                                        className={`px-3 py-1 rounded text-[11px] font-bold flex flex-col items-center gap-1 ${config.columns === 1 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}
                                    >
                                        <div className="w-4 h-5 border border-current opacity-40"></div>
                                        One
                                    </button>
                                    <button 
                                        onClick={() => setConfig({...config, columns: 2})}
                                        className={`px-3 py-1 rounded text-[11px] font-bold flex flex-col items-center gap-1 ${config.columns === 2 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}
                                    >
                                        <div className="w-4 h-5 border-x border-current opacity-40 flex"><div className="w-1/2 border-r border-current"></div></div>
                                        Two
                                    </button>
                                    <button 
                                        onClick={() => setConfig({...config, columns: 3})}
                                        className={`px-3 py-1 rounded text-[11px] font-bold flex flex-col items-center gap-1 ${config.columns === 3 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}
                                    >
                                        <div className="w-4 h-5 border-x border-current opacity-40 flex"><div className="w-1/3 border-r border-current"></div><div className="w-1/3 border-r border-current"></div></div>
                                        Three
                                    </button>
                                </div>
                            </ToolbarGroup>

                            <ToolbarGroup label="Breaks & Flow">
                                <div className="flex flex-col gap-1.5 justify-center h-full">
                                    <button className="flex items-center gap-2 px-3 py-1 hover:bg-slate-100 rounded text-[11px] font-bold text-slate-700 transition-colors">
                                        <Scissors size={14} className="text-rose-500" />
                                        <span>Page Break</span>
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <ArrowRightCircle size={14} className="text-indigo-500" />
                                        <select
                                            value={config.columnLayout}
                                            onChange={e => setConfig({ ...config, columnLayout: e.target.value })}
                                            className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-bold outline-none focus:border-indigo-500"
                                        >
                                            <option value="vertical">Column Flow</option>
                                            <option value="horizontal">Zigzag Flow</option>
                                        </select>
                                    </div>
                                </div>
                            </ToolbarGroup>

                            <ToolbarGroup label="View Mode">
                                <div className="flex flex-col gap-1.5 justify-center h-full">
                                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded p-[2px]">
                                        <button 
                                            onClick={() => setConfig({...config, pageView: 'paginated'})}
                                            className={`p-1.5 rounded transition-all flex flex-col items-center ${config.pageView === 'paginated' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Page Layout"
                                        >
                                            <FileStack size={16} />
                                        </button>
                                        <button 
                                            onClick={() => setConfig({...config, pageView: 'continuous'})}
                                            className={`p-1.5 rounded transition-all flex flex-col items-center ${config.pageView === 'continuous' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Continuous Scroll"
                                        >
                                            <Move size={16} />
                                        </button>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500 text-center uppercase">{config.pageView}</span>
                                </div>
                            </ToolbarGroup>
                        </>
                    )}

                    {activeTab === 'bank' && (
                        <>
                            <ToolbarGroup label="Question Visibility">
                                <div className="flex flex-col gap-2 justify-center h-full px-2">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={config.showQuestionNumbers} onChange={e => setConfig({ ...config, showQuestionNumbers: e.target.checked })} id="show-qn" className="accent-indigo-600" />
                                        <label htmlFor="show-qn" className="text-[11px] font-bold text-slate-700 cursor-pointer">Show Q. Numbers</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={config.showMarks} onChange={e => setConfig({ ...config, showMarks: e.target.checked })} id="show-marks" className="accent-indigo-600" />
                                        <label htmlFor="show-marks" className="text-[11px] font-bold text-slate-700 cursor-pointer">Show Marks</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={config.includeAnswers} onChange={e => setConfig({ ...config, includeAnswers: e.target.checked })} id="show-ans" className="accent-indigo-600" />
                                        <label htmlFor="show-ans" className="text-[11px] font-bold text-emerald-600 cursor-pointer">Highlight Answers</label>
                                    </div>
                                </div>
                            </ToolbarGroup>
                            <ToolbarGroup label="Option Layout">
                                <div className="flex flex-col gap-1.5 px-3 justify-center h-full">
                                    <span className="text-[11px] font-bold text-slate-600 mb-1">MCQ Options Layout:</span>
                                    <select
                                        value={config.optionCols}
                                        onChange={e => setConfig({ ...config, optionCols: parseInt(e.target.value) })}
                                        className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-[11px] font-bold outline-none text-slate-800"
                                    >
                                        <option value={1}>Vertical (Up & Down)</option>
                                        <option value={2}>Grid (Side by Side - 2)</option>
                                        <option value={4}>Horizontal (Side by Side - 4)</option>
                                    </select>
                                </div>
                            </ToolbarGroup>
                        </>
                    )}

                    {activeTab === 'design' && (
                        <>
                            <ToolbarGroup label="Watermark">
                                <div className="flex items-center gap-2 px-2">
                                    <input type="checkbox" checked={config.watermark} onChange={e => setConfig({ ...config, watermark: e.target.checked })} id="wm-toggle" />
                                    <label htmlFor="wm-toggle" className="text-xs text-slate-700 font-medium">Enable Watermark</label>
                                </div>
                                {config.watermark && (
                                    <input
                                        type="text"
                                        value={config.watermarkText}
                                        onChange={e => setConfig({ ...config, watermarkText: e.target.value })}
                                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none w-32 mt-1"
                                        placeholder="Text"
                                    />
                                )}
                            </ToolbarGroup>
                        </>
                    )}
                </div>
            </header>

            {/* 2. MAIN WORKSPACE */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Left Panel - Navigator */}
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

                {/* Left Panel Toggle Button */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-30 transform transition-transform">
                    <button
                        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                        className={`bg-white text-slate-600 hover:text-indigo-600 border border-slate-300 rounded-r-lg p-2 shadow-md transition-all ${leftPanelOpen ? 'translate-x-[256px] border-l-0' : 'translate-x-0'}`}
                        title={leftPanelOpen ? "Close Navigator" : "Open Navigator"}
                    >
                        {leftPanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                    </button>
                </div>

                {/* 3. CANVAS / PAPER AREA */}
                <main className="flex-1 overflow-auto relative custom-scrollbar scroll-smooth bg-slate-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]">

                    {/* Centering Wrapper for Paper */}
                    <div className={`flex flex-col items-center py-12 min-h-full ${config.pageView === 'paginated' ? 'gap-12' : ''}`}>

                        {/* THE PAPER */}
                        <div
                            className={`bg-white rounded-[1px] relative group/paper ${config.fontFamily} transition-all`}
                            style={{
                                ...getPageStyle(),
                                height: 'auto', // Allow it to grow, we'll mark page breaks visually
                                fontSize: `${config.fontSize}pt`,
                                lineHeight: config.lineSpacing,
                                letterSpacing: `${config.letterSpacing}px`,
                                // Visual Page Breaks Overlay (CSS Trick)
                                backgroundImage: config.pageView === 'paginated' 
                                    ? `repeating-linear-gradient(transparent, transparent ${paperDimensions[config.paperSize][config.orientation].h - 2}px, #cbd5e1 ${paperDimensions[config.paperSize][config.orientation].h - 2}px, #cbd5e1 ${paperDimensions[config.paperSize][config.orientation].h}px, transparent ${paperDimensions[config.paperSize][config.orientation].h}px)`
                                    : 'none'
                            }}
                        >
                            <div className="relative">

                                {/* Watermark */}
                                {config.watermark && (
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none" style={{ opacity: config.watermarkOpacity / 100 }}>
                                        <h1 className="text-8xl font-black text-slate-800 -rotate-45 whitespace-nowrap uppercase tracking-widest">{config.watermarkText}</h1>
                                    </div>
                                )}

                                {/* Header Section */}
                                {(!id || !exam) ? (
                                    <div className="flex flex-col items-center justify-center py-40 border-b border-slate-100">
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
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); setSelection({ type: 'header', id: null }); setRightPanelOpen(true); }}
                                        className={`border-b-[1.5px] border-slate-800 pb-4 mb-6 relative z-10 transition-all rounded-lg p-3 -mx-2 group/header ${selection.type === 'header' ? 'bg-indigo-50/50 ring-1 ring-indigo-200 shadow-sm' : 'hover:bg-slate-50/50'}`}
                                    >
                                        {/* Top Meta Info (Set, Chapter, etc) */}
                                        <div className="flex justify-between items-start mb-2 text-[0.85em] font-bold text-slate-800" style={{ fontSize: `${config.metaFontSize}pt` }}>
                                            <div className="flex flex-col gap-1 items-start">
                                                <span
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => setExam({ ...exam, setName: e.target.innerText })}
                                                    className="outline-none min-w-[80px]"
                                                >
                                                    {exam?.setName ? `সেট: ${exam.setName}` : "সেট: ________"}
                                                </span>
                                                <span className="font-bold">সময়: {exam?.durationMinutes} মিনিট</span>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end">
                                                <span
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => setExam({ ...exam, chapterName: e.target.innerText })}
                                                    className="outline-none min-w-[80px] text-right"
                                                >
                                                    {exam?.chapterName ? `অধ্যায়: ${exam.chapterName}` : "অধ্যায়: ________"}
                                                </span>
                                                <span className="font-bold">পূর্ণমান: {exam?.totalMarks}</span>
                                            </div>
                                        </div>

                                        {/* Main Center Header */}
                                        <div className="text-center mb-4">
                                            {config.showInstituteName && (
                                                <h1
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => setExam({ ...exam, instituteName: e.target.innerText })}
                                                    className="font-black uppercase tracking-wider text-slate-900 mb-1 outline-none text-center cursor-text"
                                                    style={{ fontSize: `${config.instituteFontSize}pt` }}
                                                >
                                                    {exam?.instituteName || "INSTITUTION NAME"}
                                                </h1>
                                            )}
                                            {config.showTitle && (
                                                <h2
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => setExam({ ...exam, title: e.target.innerText })}
                                                    className="text-slate-800 font-bold uppercase tracking-wider outline-none text-center cursor-text"
                                                    style={{ fontSize: `${config.titleFontSize}pt` }}
                                                >
                                                    {exam?.title || "EXAMINATION TITLE"}
                                                </h2>
                                            )}
                                            <div className="flex justify-center gap-3 text-slate-800 font-bold mt-1" style={{ fontSize: `${config.metaFontSize}pt` }}>
                                                <span
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => setExam({ ...exam, subjectName: e.target.innerText })}
                                                    className="outline-none"
                                                >
                                                    বিষয়: {exam?.subjectName || "__________"}
                                                </span>
                                                <span>|</span>
                                                <span
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => setExam({ ...exam, className: e.target.innerText })}
                                                    className="outline-none"
                                                >
                                                    শ্রেণী: {exam?.className || "__________"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Name & Roll Block */}
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

                                        {/* Instructions Block */}
                                        {config.showInstructions && (
                                            <div
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(e) => setExam({ ...exam, instructions: e.target.innerText })}
                                                className="font-bold text-slate-900 text-center italic bg-slate-50/50 p-1.5 rounded outline-none"
                                                style={{ fontSize: `${config.instructionFontSize}pt` }}
                                            >
                                                {exam?.instructions || "[বি:দ্র: প্রতিটি প্রশ্নের মান সমান]"}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Questions Area */}
                                <div
                                    className={`relative z-10 ${config.columnLayout === 'horizontal'
                                        ? `grid ${config.columns === 1 ? 'grid-cols-1' : config.columns === 2 ? 'grid-cols-2 gap-x-12' : 'grid-cols-3 gap-x-8'}`
                                        : `${config.columns === 1 ? 'columns-1' : config.columns === 2 ? 'columns-2 gap-12' : 'columns-3 gap-8'}`
                                        }`}
                                    style={{
                                        columnRule: (config.columns > 1 && config.showColumnDivider && config.columnLayout === 'vertical') ? '1px solid #cbd5e1' : 'none'
                                    }}
                                >
                                    {exam?.questions?.map((q, idx) => (
                                        <div
                                            key={q.id}
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
                                                        {isBengaliFont ? toBengaliNumeral(q.order || idx + 1) : (q.order || idx + 1)}.
                                                    </span>
                                                )}
                                                <div className="flex-1 min-w-0 text-[1em]">

                                                    {/* Question Text Edge-to-edge */}
                                                    <div
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        onBlur={(e) => updateQuestion(q.id, 'questionText', e.target.innerHTML)}
                                                        className="outline-none text-slate-900 leading-[1.6] mb-3 min-h-[1.5em] cursor-text"
                                                        dangerouslySetInnerHTML={{ __html: q.questionText }}
                                                    />

                                                    {/* Options with optimized spacing */}
                                                    {q.type === 'MCQ' && (
                                                        <div className="space-y-1.5">
                                                            <div className={`grid gap-x-3 gap-y-1.5 ${config.optionCols === 1 ? 'grid-cols-1' : config.optionCols === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                                                                {q.options?.map((opt, oIdx) => (
                                                                    <div key={oIdx} className="flex gap-1.5 items-start group/opt">
                                                                        <span className={`text-[0.9em] font-medium pt-[2px] shrink-0 ${(config.includeAnswers && opt.isCorrect) ? 'text-emerald-600 font-bold' : 'text-slate-700'}`}>
                                                                            {getOptionLabel(oIdx)})
                                                                        </span>
                                                                        <div
                                                                            contentEditable
                                                                            suppressContentEditableWarning
                                                                            onBlur={(e) => updateOption(q.id, oIdx, e.target.innerHTML)}
                                                                            className={`bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-0.5 text-[0.95em] outline-none w-full min-h-[1.5em] ${(config.includeAnswers && opt.isCorrect) ? 'text-emerald-700 font-bold bg-emerald-50/30' : 'text-slate-900 border-b-slate-100 border-dotted cursor-text'}`}
                                                                            dangerouslySetInnerHTML={{ __html: opt.optionText || '' }}
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

                                                    {/* CQ Options no longer need fake blocks, everything is managed within questionText! */}
                                                </div>

                                                {/* Marks Wrapper */}
                                                {config.showMarks && (
                                                    <div className="shrink-0 flex items-start pl-1 text-[0.85em] font-bold text-slate-500 pt-[2px]">
                                                        [{q.marks}]
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Footer Area */}
                                {id && exam && (
                                    <div className="mt-8 pt-4 border-t-[1.5px] border-slate-800 text-center relative group/footer break-inside-avoid">
                                        {config.showPageNumbers && (
                                            <div className="absolute top-4 right-0 text-[0.8em] font-medium text-slate-500">Page Number</div>
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

                            </div>
                        </div>
                    </div>

                    {/* Zoom & View Controls Floating Bottom Right */}
                    <div className={`fixed bottom-6 transition-all duration-300 z-[60] bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-4 ${rightPanelOpen ? 'right-72' : 'right-6'} mr-6 border-b-4 border-b-indigo-500`}>
                        <div className="flex items-center gap-2 group">
                            <button 
                                onClick={() => setZoom(Math.max(25, zoom - 10))} 
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                <Minus size={16} />
                            </button>
                            
                            <div className="relative flex items-center w-32 h-6">
                                <input
                                    type="range"
                                    min="25"
                                    max="200"
                                    value={zoom}
                                    onChange={e => setZoom(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>

                            <button 
                                onClick={() => setZoom(Math.min(200, zoom + 10))} 
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div className="w-[1px] h-6 bg-slate-200"></div>

                        <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-slate-700 w-10 text-center select-none">{zoom}%</span>
                            <button 
                                onClick={() => setZoom(100)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600"
                                title="Reset Zoom"
                            >
                                <RotateCcw size={12} />
                            </button>
                        </div>
                    </div>
                </main>

                {/* Right Panel Toggle Button */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 z-30 transform transition-transform">
                    <button
                        onClick={() => setRightPanelOpen(!rightPanelOpen)}
                        className={`bg-white text-slate-600 hover:text-indigo-600 border border-slate-300 rounded-l-lg p-2 shadow-md transition-all ${rightPanelOpen ? '-translate-x-[288px] border-r-0' : 'translate-x-0'}`}
                        title={rightPanelOpen ? "Close Properties" : "Open Properties"}
                    >
                        {rightPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                    </button>
                </div>

                {/* 4. RIGHT SIDEBAR (Properties & Templates) */}
                <aside className={`${rightPanelOpen ? 'w-80' : 'w-0'} bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.05)] flex flex-col h-full z-20 shrink-0 transition-all duration-300 overflow-hidden`}>
                    <div className="flex bg-slate-100/80 p-1 m-2 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setRightPanelTab('properties')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all ${rightPanelTab === 'properties' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <Settings size={14} /> Properties
                        </button>
                        <button
                            onClick={() => setRightPanelTab('templates')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all ${rightPanelTab === 'templates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                        >
                            <LayoutGrid size={14} /> Templates
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {rightPanelTab === 'properties' ? (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Context Selection Header */}
                                <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 shrink-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="p-1.5 bg-indigo-600 rounded text-white shadow-sm">
                                            {selection.type === 'question' ? <List size={14} /> : selection.type === 'header' ? <LayoutGrid size={14} /> : <FileText size={14} />}
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                                            {selection.type === 'question' ? `Question Context` : selection.type === 'header' ? 'Header Settings' : 'Document Setup'}
                                        </span>
                                    </div>
                                    <h2 className="text-[14px] font-bold text-slate-800 truncate">
                                        {selection.type === 'question' ? `Editing Question #${exam.questions.findIndex(q => q.id === selection.id) + 1}` : selection.type === 'header' ? exam.instituteName || 'Header Editor' : 'Page Layout & Styles'}
                                    </h2>
                                    {selection.type !== 'page' && (
                                        <button 
                                            onClick={() => setSelection({ type: 'page', id: null })}
                                            className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            <RotateCcw size={10} /> Reset Selection
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-20">
                                    {/* 1. QUESTION PROPERTIES */}
                                    {selection.type === 'question' && (
                                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[11px] font-bold text-slate-500 mb-2 block flex justify-between">
                                                        <span>Point Weight (Marks)</span>
                                                        <span className="text-indigo-600 font-black">{exam.questions.find(q => q.id === selection.id)?.marks || 0} pts</span>
                                                    </label>
                                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                                                        <button onClick={() => updateQuestion(selection.id, 'marks', Math.max(0, (exam.questions.find(q => q.id === selection.id)?.marks || 0) - 1))} className="px-3 py-3 text-slate-400 hover:text-indigo-600 transition-colors"><Minus size={16}/></button>
                                                        <input
                                                            type="number"
                                                            value={exam.questions.find(q => q.id === selection.id)?.marks || 0}
                                                            onChange={(e) => updateQuestion(selection.id, 'marks', parseInt(e.target.value))}
                                                            className="flex-1 bg-transparent text-center text-sm font-bold text-slate-800 outline-none"
                                                        />
                                                        <button onClick={() => updateQuestion(selection.id, 'marks', (exam.questions.find(q => q.id === selection.id)?.marks || 0) + 1)} className="px-3 py-3 text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={16}/></button>
                                                    </div>
                                                </div>

                                                {exam.questions.find(q => q.id === selection.id)?.type === 'MCQ' && (
                                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">MCQ Options</label>
                                                        <button 
                                                            onClick={() => updateQuestion(selection.id, 'shuffleOptions', !exam.questions.find(q => q.id === selection.id)?.shuffleOptions)}
                                                            className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${exam.questions.find(q => q.id === selection.id)?.shuffleOptions ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                                        >
                                                            <RotateCw size={14} /> {exam.questions.find(q => q.id === selection.id)?.shuffleOptions ? 'Options Randomizing' : 'Order Locked'}
                                                        </button>
                                                    </div>
                                                )}

                                                <button 
                                                    onClick={() => deleteQuestion(selection.id)} 
                                                    className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[12px] font-bold transition-all border border-rose-100"
                                                >
                                                    <Trash2 size={16} /> Remove Question
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {selection.type === 'header' && (
                                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Visibility Settings</label>
                                                <div className="space-y-3">
                                                    {[
                                                        { key: 'showInstituteName', label: 'Institution Name' },
                                                        { key: 'showTitle', label: 'Exam Title' },
                                                        { key: 'showStudentInfo', label: 'Student Roll Area' },
                                                        { key: 'showInstructions', label: 'Instructions Text' }
                                                    ].map(item => (
                                                        <div key={item.key} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                                            <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                                                            <button 
                                                                onClick={() => setConfig({...config, [item.key]: !config[item.key]})}
                                                                className={`w-9 h-5 rounded-full relative transition-all ${config[item.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                                            >
                                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config[item.key] ? 'left-5' : 'left-1'}`}></div>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Font Scaling (Points)</label>
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between text-[10px] font-bold text-indigo-900 mb-1">
                                                            <span>Institute Size</span>
                                                            <span>{config.instituteFontSize}pt</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="14" max="42" value={config.instituteFontSize} 
                                                            onChange={e => setConfig({...config, instituteFontSize: parseInt(e.target.value)})}
                                                            className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between text-[10px] font-bold text-indigo-900 mb-1">
                                                            <span>Title Size</span>
                                                            <span>{config.titleFontSize}pt</span>
                                                        </div>
                                                        <input 
                                                            type="range" min="12" max="32" value={config.titleFontSize} 
                                                            onChange={e => setConfig({...config, titleFontSize: parseInt(e.target.value)})}
                                                            className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selection.type === 'page' && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                        {/* Paper & Layout Header */}
                                        <div className="px-1">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] mb-4 flex items-center gap-2">
                                                <Layout size={14} /> Document Setup
                                            </h3>
                                            
                                            <div className="grid grid-cols-2 gap-3 mb-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-500 px-1">Paper Size</label>
                                                    <select
                                                        value={config.paperSize}
                                                        onChange={e => setConfig({ ...config, paperSize: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                                                    >
                                                        <option value="A4">A4 Standard</option>
                                                        <option value="Legal">Legal</option>
                                                        <option value="Letter">Letter</option>
                                                        <option value="A3">A3 Large</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-500 px-1">Orientation</label>
                                                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                                        <button 
                                                            onClick={() => setConfig({...config, orientation: 'portrait'})}
                                                            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${config.orientation === 'portrait' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                            title="Portrait"
                                                        >
                                                            <Square size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => setConfig({...config, orientation: 'landscape'})}
                                                            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${config.orientation === 'landscape' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                            title="Landscape"
                                                        >
                                                            <Square size={14} className="rotate-90" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Margins & Columns</label>
                                                    
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[11px] font-bold text-slate-600">Margins</span>
                                                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">{config.margins}</span>
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {['narrow', 'moderate', 'normal', 'wide'].map(m => (
                                                                    <button
                                                                        key={m}
                                                                        onClick={() => setConfig({...config, margins: m})}
                                                                        className={`py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${config.margins === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-200'}`}
                                                                    >
                                                                        {m.substring(0, 3)}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-[11px] font-bold text-slate-600">Columns</span>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => setConfig({...config, showColumnDivider: !config.showColumnDivider})}
                                                                        className={`text-[9px] font-bold px-2 py-0.5 rounded ${config.showColumnDivider ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                                                                    >
                                                                        Divider
                                                                    </button>
                                                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{config.columns}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                                                {[1, 2, 3].map(c => (
                                                                    <button
                                                                        key={c}
                                                                        onClick={() => setConfig({...config, columns: c})}
                                                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.columns === c ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                                                    >
                                                                        {c} Col
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="pt-2">
                                                            <button 
                                                                onClick={() => setConfig({...config, showPageBorder: !config.showPageBorder})}
                                                                className={`w-full py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-2 ${config.showPageBorder ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'}`}
                                                            >
                                                                <Square size={12} className={config.showPageBorder ? "fill-white/20" : ""} /> {config.showPageBorder ? 'Remove Page Border' : 'Add Page Border'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 block font-outfit">Typography (Global)</label>
                                                    <div className="space-y-3">
                                                        <select
                                                            value={config.fontFamily}
                                                            onChange={e => setConfig({ ...config, fontFamily: e.target.value })}
                                                            className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                        >
                                                            <option value="font-serif">Classic Serif (English)</option>
                                                            <option value="font-sans">Modern Sans (English)</option>
                                                            <option value="font-tiro text-lg">Tiro Bangla (Unicode)</option>
                                                            <option value="font-hind text-lg">Hind Siliguri (Unicode)</option>
                                                            <option value="font-noto text-lg">Noto Sans Bengali</option>
                                                        </select>
                                                        
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 space-y-1">
                                                                <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">Base Size</p>
                                                                <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                                                    <button onClick={() => setConfig({...config, fontSize: Math.max(8, config.fontSize - 1)})} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12}/></button>
                                                                    <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.fontSize}pt</span>
                                                                    <button onClick={() => setConfig({...config, fontSize: Math.min(24, config.fontSize + 1)})} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12}/></button>
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 space-y-1">
                                                                <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">Spacing</p>
                                                                <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                                                    <button onClick={() => setConfig({...config, lineSpacing: Math.max(1, config.lineSpacing - 0.1)})} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12}/></button>
                                                                    <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.lineSpacing.toFixed(1)}</span>
                                                                    <button onClick={() => setConfig({...config, lineSpacing: Math.min(3, config.lineSpacing + 0.1)})} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12}/></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Watermark</label>
                                                        <button 
                                                            onClick={() => setConfig({...config, watermark: !config.watermark})}
                                                            className={`w-10 h-5 rounded-full relative transition-all ${config.watermark ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                        >
                                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.watermark ? 'left-6' : 'left-1'}`}></div>
                                                        </button>
                                                    </div>
                                                    
                                                    {config.watermark && (
                                                        <div className="space-y-3 animate-in fade-in zoom-in-95">
                                                            <input
                                                                type="text"
                                                                value={config.watermarkText}
                                                                onChange={e => setConfig({ ...config, watermarkText: e.target.value })}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                                                placeholder="Enter watermark text..."
                                                            />
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                                                    <span>Opacity</span>
                                                                    <span>{config.watermarkOpacity}%</span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="5"
                                                                    max="100"
                                                                    value={config.watermarkOpacity}
                                                                    onChange={e => setConfig({ ...config, watermarkOpacity: parseInt(e.target.value) })}
                                                                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-1 text-center">
                                            <p className="text-[10px] text-slate-400 font-medium italic">Changes are applied immediately to the canvas. Standard paper rules are enforced for professional printing.</p>
                                        </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 space-y-4">
                                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-4">Sample Layouts</span>

                                <div
                                    onClick={() => setExam(MATH_SSC_TEMPLATE)}
                                    className="group cursor-pointer border border-slate-200 hover:border-indigo-400 rounded-xl overflow-hidden transition-all hover:shadow-lg bg-slate-50"
                                >
                                    <div className="bg-white m-2 p-3 aspect-[3/4] shadow-sm flex flex-col items-center gap-2 overflow-hidden relative">
                                        <div className="w-full h-1 bg-slate-200 rounded"></div>
                                        <div className="w-20 h-1 bg-slate-100 rounded"></div>
                                        <div className="flex gap-2 w-full mt-2">
                                            <div className="flex-1 space-y-1">
                                                <div className="w-full h-1 bg-slate-100 rounded"></div>
                                                <div className="w-full h-1 bg-slate-100 rounded"></div>
                                                <div className="w-4 h-1 bg-slate-100 rounded"></div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="w-full h-1 bg-slate-100 rounded"></div>
                                                <div className="w-full h-1 bg-slate-100 rounded"></div>
                                                <div className="w-4 h-1 bg-slate-100 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-all flex items-center justify-center">
                                            <Plus size={24} className="text-indigo-600 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-110 transition-all duration-300" />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white border-t border-slate-100 group-hover:bg-indigo-50 transition-colors">
                                        <h4 className="text-[12px] font-black text-slate-800">SSC Math Mock (Bangla)</h4>
                                        <p className="text-[10px] text-slate-500 font-medium">Standard 2-column layout with Unicode support</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium italic">
                                        <b>Tip:</b> Selecting a template will overwrite current content. Save your work before switching!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Notification Toast */}
            {message && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-lg shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] animate-in slide-in-from-bottom-5 ${message.type === 'success' ? 'bg-slate-800 text-white' : 'bg-rose-600 text-white'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} className="text-emerald-400" /> : <AlertTriangle size={20} />}
                    <span className="text-sm font-medium">{message.text}</span>
                </div>
            )}

            {/* Question Bank Modal */}
            <QuestionBankModal
                isOpen={isBankOpen}
                onClose={() => setIsBankOpen(false)}
                onAdd={importQuestion}
            />

            {/* Editor Support Modals */}
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
        </div>
    );
};

const QuestionBankModal = ({ isOpen, onClose, onAdd }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        if (!isOpen) return;
        const fetchQuestions = async () => {
            setLoading(true);
            try {
                const res = await questionService.getQuestions({
                    search: searchTerm,
                    type: filterType !== 'ALL' ? filterType : ''
                });
                if (res.success) setQuestions(res.data.content || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [isOpen, searchTerm, filterType]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen className="text-indigo-600" /> Question Bank
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Search and add questions to your paper</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Filters Row */}
                <div className="p-4 border-b border-slate-100 flex gap-4 items-center bg-white">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by contents..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                        <button onClick={() => setFilterType('ALL')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ALL</button>
                        <button onClick={() => setFilterType('MCQ')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'MCQ' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>MCQ</button>
                        <button onClick={() => setFilterType('CQ')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'CQ' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>WRITTEN</button>
                    </div>
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-slate-500">Searching Bank...</p>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                <Search size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700">No questions found</h3>
                            <p className="text-sm text-slate-400 max-w-xs mt-1">Try adjusting your search terms or filters to find what you're looking for.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {questions.map(q => (
                                <div key={q.id} className="bg-white border border-slate-200 p-4 rounded-2xl hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/5 transition-all group relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${q.type === 'MCQ' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {q.type}
                                        </span>
                                        <button
                                            onClick={() => onAdd(q)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg shadow-md hover:scale-105 transition-all active:scale-95"
                                            title="Add to paper"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="text-[13px] text-slate-700 line-clamp-3 font-medium leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: q.questionText }}></div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold">
                                        <span className="flex items-center gap-1"><BookOpen size={12} /> {q.subjectName}</span>
                                        <span>•</span>
                                        <span>{q.marks} Marks</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all">
                        Finish Adding
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamEditor;
