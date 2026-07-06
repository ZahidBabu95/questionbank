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

import EditorToolbar from './components/EditorToolbar';
import LeftNavigator from './components/LeftNavigator';
import RightProperties from './components/RightProperties';
import PaperCanvas from './components/PaperCanvas';

const generateUUID = () => {
    if (window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

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
            id: generateUUID(),
            originalQuestionId: null,
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
            id: generateUUID(),
            originalQuestionId: q.id,
            order: (exam.questions?.length || 0) + 1
        };
        setExam(prev => ({ ...prev, questions: [...prev.questions, newQ] }));
        setMessage({ type: 'success', text: 'Question added to paper!' });
        setTimeout(() => setMessage(null), 2000);
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
        setRightPanelOpen(true);
        if (tabId === 'layout' || tabId === 'design' || tabId === 'metadata' || tabId === 'home') {
            setSelection({ type: 'page', id: null });
        }
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
            <EditorToolbar
                activeTab={activeTab}
                handleTabClick={handleTabClick}
                navigate={navigate}
                saving={saving}
                handleDownload={handleDownload}
                handleUpdate={handleUpdate}
                applyCommand={applyCommand}
                config={config}
                setConfig={setConfig}
                setExam={setExam}
                BLANK_EXAM={BLANK_EXAM}
                addQuestion={addQuestion}
                setIsBankOpen={setIsBankOpen}
                fileInputRef={fileInputRef}
                handleImageSelect={handleImageSelect}
                setEquationModalOpen={setEquationModalOpen}
            />

            {/* 2. MAIN WORKSPACE */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Left Panel - Navigator */}
                <LeftNavigator
                    id={id}
                    exam={exam}
                    leftPanelOpen={leftPanelOpen}
                    selectedQuestionId={selectedQuestionId}
                    setSelectedQuestionId={setSelectedQuestionId}
                    isBengaliFont={isBengaliFont}
                    toBengaliNumeral={toBengaliNumeral}
                    moveQuestion={moveQuestion}
                    navigate={navigate}
                />

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
                <PaperCanvas
                    id={id}
                    exam={exam}
                    setExam={setExam}
                    config={config}
                    zoom={zoom}
                    setZoom={setZoom}
                    selection={selection}
                    setSelection={setSelection}
                    setRightPanelOpen={setRightPanelOpen}
                    isBengaliFont={isBengaliFont}
                    toBengaliNumeral={toBengaliNumeral}
                    selectedQuestionId={selectedQuestionId}
                    updateQuestion={updateQuestion}
                    updateOption={updateOption}
                    removeOption={removeOption}
                    addOption={addOption}
                    getOptionLabel={getOptionLabel}
                    navigate={navigate}
                    rightPanelOpen={rightPanelOpen}
                />

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
                <RightProperties
                    rightPanelOpen={rightPanelOpen}
                    activeTab={activeTab}
                    selection={selection}
                    setSelection={setSelection}
                    exam={exam}
                    setExam={setExam}
                    config={config}
                    setConfig={setConfig}
                    updateQuestion={updateQuestion}
                    deleteQuestion={deleteQuestion}
                    MATH_SSC_TEMPLATE={MATH_SSC_TEMPLATE}
                />
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
