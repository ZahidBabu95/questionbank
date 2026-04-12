import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Upload, FileSpreadsheet, Download, CheckCircle,
    FileText, Book, ArrowLeft, Info, Loader2, Table,
    AlertTriangle, Check, Calculator, Plus, ChevronRight,
    ChevronDown, BookOpen, Layers
} from 'lucide-react';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import ExcelJS from 'exceljs';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';

// ═══ Question Type Config ═══
const QUESTION_TYPES = {
    MCQ: { label: 'বহুনির্বাচনি (MCQ)', icon: '🅰', color: 'border-blue-300 bg-blue-50 text-blue-700', activeColor: 'border-blue-500 bg-blue-500 text-white', description: '৪টি বিকল্প' },
    CQ:  { label: 'সৃজনশীল (CQ)',       icon: '📝', color: 'border-purple-300 bg-purple-50 text-purple-700', activeColor: 'border-purple-500 bg-purple-500 text-white', description: 'উদ্দীপক + উপ-প্রশ্ন' },
    SHORT: { label: 'সংক্ষিপ্ত প্রশ্ন', icon: '✍️', color: 'border-emerald-300 bg-emerald-50 text-emerald-700', activeColor: 'border-emerald-500 bg-emerald-500 text-white', description: 'সংক্ষিপ্ত প্রশ্ন' },
};
const DROPDOWNS = {
    difficulty: ['EASY', 'MEDIUM', 'HARD'],
    bloomLevel: ['KNOWLEDGE', 'COMPREHENSION', 'APPLICATION', 'HIGHER_ORDER'],
    mcqType: ['GENERAL', 'MULTIPLE_COMPLETION', 'PASSAGE_BASED'],
    correctAnswer: ['A', 'B', 'C', 'D'],
    language: ['Bangla', 'English'],
    sourceType: ['BOARD_EXAM', 'UNIVERSITY_ADMISSION', 'INSTITUTION_TEST', 'JOB_EXAM', 'MODEL_TEST', 'OTHER'],
    cqType: ['STANDARD', 'MATH'],
};

// ═══ Template Generator ═══
const generateTemplate = async (type, cqVariant = 'STANDARD', mcqVariant = 'GENERAL') => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'QuestionShaper';
    const ws = wb.addWorksheet('Questions');
    let cols = [], sampleData = [];
    const baseMcq = [
        { header: 'Stimulus', key: 'stim', width: 40, required: false },
        { header: 'Question Text', key: 'q', width: 45, required: true },
        { header: 'Option A', key: 'a', width: 25, required: true },
        { header: 'Option B', key: 'b', width: 25, required: true },
        { header: 'Option C', key: 'c', width: 25, required: true },
        { header: 'Option D', key: 'd', width: 25, required: true },
        { header: 'Correct Answer', key: 'ans', width: 28, required: true },
        { header: 'MCQ Type', key: 'mtype', width: 22, required: false, dropdown: DROPDOWNS.mcqType },
        { header: 'Bloom Level', key: 'bloom', width: 18, required: false, dropdown: DROPDOWNS.bloomLevel },
        { header: 'Difficulty', key: 'diff', width: 14, required: false, dropdown: DROPDOWNS.difficulty },
        { header: 'Marks', key: 'marks', width: 8, required: false },
        { header: 'Language', key: 'lang', width: 12, required: false, dropdown: DROPDOWNS.language },
        { header: 'Explanation', key: 'exp', width: 35, required: false },
        { header: 'Source Type', key: 'stype', width: 22, required: false, dropdown: DROPDOWNS.sourceType },
        { header: 'Source Name', key: 'sname', width: 20, required: false },
        { header: 'Source Year', key: 'syear', width: 12, required: false },
    ];
    if (type === 'MCQ') {
        cols = baseMcq;
        sampleData = [{ stim: '', q: 'বাংলাদেশের রাজধানী কোনটি?', a: 'ঢাকা', b: 'সিলেট', c: 'খুলনা', d: 'রাজশাহী', ans: 'ঢাকা', mtype: 'GENERAL', bloom: 'KNOWLEDGE', diff: 'EASY', marks: 1, lang: 'Bangla', exp: '', stype: 'BOARD_EXAM', sname: 'ঢাকা বোর্ড', syear: '2024' }];
    } else if (type === 'CQ') {
        cols = [
            { header: 'Stimulus', key: 'stim', width: 45, required: true },
            { header: 'Question A (জ্ঞান)', key: 'qa', width: 30, required: true },
            { header: 'Question B (অনুধাবন)', key: 'qb', width: 30, required: true },
            { header: 'Question C (প্রয়োগ)', key: 'qc', width: 30, required: true },
            ...(cqVariant === 'STANDARD' ? [{ header: 'Question D (উচ্চতর)', key: 'qd', width: 30, required: true }] : []),
            { header: 'Marks A', key: 'ma', width: 10, required: false },
            { header: 'Marks B', key: 'mb', width: 10, required: false },
            { header: 'Marks C', key: 'mc', width: 10, required: false },
            ...(cqVariant === 'STANDARD' ? [{ header: 'Marks D', key: 'md', width: 10, required: false }] : []),
            { header: 'CQ Type', key: 'ctype', width: 14, required: false, dropdown: DROPDOWNS.cqType },
            { header: 'Difficulty', key: 'diff', width: 14, required: false, dropdown: DROPDOWNS.difficulty },
            { header: 'Language', key: 'lang', width: 12, required: false, dropdown: DROPDOWNS.language },
            { header: 'Source Type', key: 'stype', width: 22, required: false, dropdown: DROPDOWNS.sourceType },
            { header: 'Source Name', key: 'sname', width: 20, required: false },
            { header: 'Source Year', key: 'syear', width: 12, required: false },
        ];
        sampleData = [{ stim: 'রহিম সাহেব একজন সচেতন নাগরিক...', qa: 'নাগরিকত্ব কী?', qb: 'দ্বিনাগরিকত্ব বলতে কী বোঝ?', qc: 'রহিমের নাগরিক গুণাবলি ব্যাখ্যা কর।', qd: 'দেশের উন্নয়নে রহিমের ভূমিকা মূল্যায়ন কর।', ma: 1, mb: 2, mc: 3, md: 4, ctype: cqVariant, diff: 'MEDIUM', lang: 'Bangla', stype: '', sname: '', syear: '' }];
    } else {
        cols = [
            { header: 'Stimulus', key: 'stim', width: 35, required: false },
            { header: 'Question Text', key: 'q', width: 45, required: true },
            { header: 'Answer / Keywords', key: 'ans', width: 35, required: false },
            { header: 'Bloom Level', key: 'bloom', width: 18, required: false, dropdown: DROPDOWNS.bloomLevel },
            { header: 'Difficulty', key: 'diff', width: 14, required: false, dropdown: DROPDOWNS.difficulty },
            { header: 'Marks', key: 'marks', width: 8, required: false },
            { header: 'Language', key: 'lang', width: 12, required: false, dropdown: DROPDOWNS.language },
            { header: 'Explanation', key: 'exp', width: 35, required: false },
            { header: 'Source Type', key: 'stype', width: 22, required: false, dropdown: DROPDOWNS.sourceType },
            { header: 'Source Name', key: 'sname', width: 20, required: false },
            { header: 'Source Year', key: 'syear', width: 12, required: false },
        ];
        sampleData = [{ q: 'সালোকসংশ্লেষণ কাকে বলে?', stim: '', ans: 'সবুজ উদ্ভিদ সূর্যালোকে খাদ্য তৈরি করে।', bloom: 'KNOWLEDGE', diff: 'EASY', marks: 2, lang: 'Bangla', exp: '', stype: 'BOARD_EXAM', sname: 'রাজশাহী বোর্ড', syear: '2022' }];
    }
    ws.columns = cols.map(c => ({ header: c.header + (c.required ? ' *' : ''), key: c.key, width: c.width }));
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell, colNum) => {
        const isReq = cols[colNum - 1]?.required;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isReq ? 'FF2563EB' : 'FF94A3B8' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    sampleData.forEach(row => ws.addRow(row));
    cols.forEach((col, idx) => {
        if (!col.dropdown) return;
        const colLetter = String.fromCharCode(65 + idx);
        for (let r = 2; r <= 1001; r++) {
            ws.getCell(`${colLetter}${r}`).dataValidation = {
                type: 'list', allowBlank: true,
                formulae: [`"${col.dropdown.join(',')}"`],
                showDropDown: true,
            };
        }
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `template_${type.toLowerCase()}.xlsx`;
    link.click();
};

// ═══ Step Indicator ═══
const StepIndicator = ({ current }) => {
    const steps = [
        { n: 1, label: 'মেটাডেটা নির্বাচন', icon: <BookOpen size={14} /> },
        { n: 2, label: 'ফাইল আপলোড',        icon: <Upload size={14} /> },
    ];
    return (
        <div className="flex items-center gap-0 mb-6">
            {steps.map((s, i) => (
                <React.Fragment key={s.n}>
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${current === s.n ? 'bg-primary text-white shadow-lg shadow-primary/30' : current > s.n ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {current > s.n ? <Check size={14} /> : s.icon}
                        <span>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <ChevronRight size={18} className={`mx-1 ${current > s.n + 0 ? 'text-emerald-400' : 'text-slate-300'}`} />}
                </React.Fragment>
            ))}
        </div>
    );
};

// ═══ Main Component ═══
const ImportExcel = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const initialType = new URLSearchParams(location.search).get('type') || 'MCQ';

    const [step, setStep] = useState(1);
    const [questionType, setQuestionType] = useState(initialType);
    const [cqVariant, setCqVariant] = useState('STANDARD');
    const [mcqVariant, setMcqVariant] = useState('GENERAL');

    // ── Hierarchy Hook ──
    const {
        levels, streams, classes, subjects, chapters, topics,
        levelId, streamId, classId, subjectId, chapterId, topicId,
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
    } = useAcademicHierarchy();

    // ── New Chapter / Topic creation ──
    const [newChapterName, setNewChapterName] = useState('');
    const [newChapterOrder, setNewChapterOrder] = useState('');
    const [creatingChapter, setCreatingChapter] = useState(false);
    const [showNewChapter, setShowNewChapter] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicOrder, setNewTopicOrder] = useState('');
    const [creatingTopic, setCreatingTopic] = useState(false);
    const [showNewTopic, setShowNewTopic] = useState(false);
    const [chapterList, setChapterList] = useState([]);
    const [topicList, setTopicList] = useState([]);

    // Sync chapters/topics from hook into local lists so new entries appear immediately
    useEffect(() => { setChapterList(chapters); }, [chapters]);
    useEffect(() => { setTopicList(topics); }, [topics]);

    // ── File Upload State ──
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [importResult, setImportResult] = useState(null);

    // ── Create Chapter inline ──
    const handleCreateChapter = async () => {
        if (!newChapterName.trim() || !subjectId) return;
        setCreatingChapter(true);
        try {
            const created = await academicService.createChapter(subjectId, {
                name: newChapterName.trim(),
                order: parseInt(newChapterOrder) || chapterList.length + 1,
            });
            const updated = [...chapterList, created];
            setChapterList(updated);
            setChapterId(created.id);
            setNewChapterName(''); setNewChapterOrder('');
            setShowNewChapter(false);
            setMessage({ type: 'success', text: `অধ্যায় "${created.name}" তৈরি হয়েছে।` });
        } catch {
            setMessage({ type: 'error', text: 'অধ্যায় তৈরি করা যায়নি।' });
        } finally {
            setCreatingChapter(false);
        }
    };

    // ── Create Topic inline ──
    const handleCreateTopic = async () => {
        if (!newTopicName.trim() || !chapterId) return;
        setCreatingTopic(true);
        try {
            const created = await academicService.createTopic(chapterId, {
                name: newTopicName.trim(),
                order: parseInt(newTopicOrder) || topicList.length + 1,
            });
            const updated = [...topicList, created];
            setTopicList(updated);
            setTopicId(created.id);
            setNewTopicName(''); setNewTopicOrder('');
            setShowNewTopic(false);
            setMessage({ type: 'success', text: `টপিক "${created.name}" তৈরি হয়েছে।` });
        } catch {
            setMessage({ type: 'error', text: 'টপিক তৈরি করা যায়নি।' });
        } finally {
            setCreatingTopic(false);
        }
    };

    // ── Metadata valid when at least Level→Stream→Class→Subject selected ──
    const metaReady = levelId && streamId && classId && subjectId;

    const proceedToUpload = () => {
        if (!metaReady) {
            setMessage({ type: 'error', text: 'অনুগ্রহ করে শিক্ষাস্তর, বিভাগ/ধারা, শ্রেণি এবং বিষয় নির্বাচন করুন।' });
            return;
        }
        setMessage(null);
        setStep(2);
    };

    // ── File Handling ──
    const validateAndSetFile = (f) => {
        if (!f) return;
        if (['.xlsx', '.xls', '.csv'].some(ext => f.name.toLowerCase().endsWith(ext))) {
            setFile(f); setMessage(null); setImportResult(null);
        } else {
            setMessage({ type: 'error', text: 'শুধুমাত্র Excel (.xlsx, .xls) বা CSV ফাইল গ্রহণযোগ্য।' });
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true); setMessage(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', questionType);
        formData.append('classId', classId);
        formData.append('classSubjectId', subjectId);
        if (chapterId) formData.append('chapterId', chapterId);
        if (topicId)   formData.append('topicId', topicId);
        try {
            const res = await axios.post('/v1/questions/import/excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImportResult(res.data);
            setMessage({ type: 'success', text: `সফলভাবে ${res.data.count || 0} টি ${questionType} প্রশ্ন ইম্পোর্ট হয়েছে!` });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'আপলোডে সমস্যা হয়েছে।' });
        } finally {
            setUploading(false);
        }
    };

    const resetAll = () => { setFile(null); setMessage(null); setImportResult(null); };

    // ── Shared select class ──
    const sel = "w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50";
    const selDisabled = `${sel} disabled:bg-slate-100 disabled:cursor-not-allowed`;

    const typeConfig = QUESTION_TYPES[questionType];

    return (
        <div className="w-full">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="flex items-center gap-1 text-slate-400 hover:text-primary text-xs mb-1 transition-colors">
                        <ArrowLeft size={12} /> {step === 2 ? 'মেটাডেটা পরিবর্তন করুন' : 'পেছনে যান'}
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">বাল্ক প্রশ্ন ইম্পোর্ট</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Excel/CSV ফাইল থেকে শত শত প্রশ্ন একসাথে যোগ করুন</p>
                </div>
            </div>

            {/* STEP INDICATOR */}
            <StepIndicator current={step} />

            {/* ════════════════════════════════════════ STEP 1 ════ */}
            {step === 1 && (
                <div className="flex flex-col lg:flex-row gap-5">
                    {/* LEFT — metadata form */}
                    <div className="flex-1 min-w-0 space-y-4">

                        {/* Question Type & Variant */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">প্রশ্নের ধরন নির্বাচন করুন</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {Object.entries(QUESTION_TYPES).map(([key, cfg]) => (
                                    <button key={key} type="button"
                                        onClick={() => setQuestionType(key)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${questionType === key ? cfg.activeColor : cfg.color}`}>
                                        <span>{cfg.icon}</span> {cfg.label}
                                    </button>
                                ))}
                            </div>
                            {questionType === 'CQ' && (
                                <div className="flex gap-2">
                                    {[{ key: 'STANDARD', label: 'সাধারণ ৪ অংশ' }, { key: 'MATH', label: 'গণিত ৩ অংশ' }].map(v => (
                                        <button key={v.key} onClick={() => setCqVariant(v.key)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${cqVariant === v.key ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {questionType === 'MCQ' && (
                                <div className="flex gap-2">
                                    {[{ key: 'GENERAL', label: 'সাধারণ' }, { key: 'PASSAGE_BASED', label: 'অভিন্ন তথ্যভিত্তিক' }].map(v => (
                                        <button key={v.key} onClick={() => setMcqVariant(v.key)}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${mcqVariant === v.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hierarchy Selects */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Layers size={13} className="text-blue-400" /> শিক্ষাস্তর থেকে বিষয় নির্বাচন
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Level */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">শিক্ষাস্তর <span className="text-rose-500">*</span></label>
                                    <select value={levelId} onChange={e => setLevelId(e.target.value)} className={sel}>
                                        <option value="">নির্বাচন করুন</option>
                                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                {/* Stream */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">বিভাগ/ধারা <span className="text-rose-500">*</span></label>
                                    <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className={selDisabled}>
                                        <option value="">নির্বাচন করুন</option>
                                        {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                {/* Class */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">শ্রেণি <span className="text-rose-500">*</span></label>
                                    <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className={selDisabled}>
                                        <option value="">নির্বাচন করুন</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                {/* Subject */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">বিষয় <span className="text-rose-500">*</span></label>
                                    <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className={selDisabled}>
                                        <option value="">নির্বাচন করুন</option>
                                        {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Chapter */}
                        {subjectId && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Book size={13} className="text-amber-400" /> অধ্যায় নির্বাচন / তৈরি
                                </p>
                                <div className="flex gap-2">
                                    <select value={chapterId} onChange={e => { setChapterId(e.target.value); setShowNewChapter(false); }} className={`${sel} flex-1`}>
                                        <option value="">অধ্যায় নির্বাচন করুন (ঐচ্ছিক)</option>
                                        {chapterList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <button onClick={() => setShowNewChapter(v => !v)}
                                        className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors shrink-0">
                                        <Plus size={13} /> নতুন অধ্যায়
                                    </button>
                                </div>
                                {showNewChapter && (
                                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                                        <p className="text-xs font-bold text-amber-700">নতুন অধ্যায় যোগ করুন</p>
                                        <div className="flex gap-2">
                                            <input value={newChapterName} onChange={e => setNewChapterName(e.target.value)}
                                                placeholder="অধ্যায়ের নাম *"
                                                className="flex-1 p-2 text-sm border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
                                            <input value={newChapterOrder} onChange={e => setNewChapterOrder(e.target.value)}
                                                placeholder="ক্রম"
                                                type="number" min="1"
                                                className="w-20 p-2 text-sm border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleCreateChapter} disabled={creatingChapter || !newChapterName.trim()}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-xs hover:bg-amber-600 disabled:opacity-50 transition-colors">
                                                {creatingChapter ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                অধ্যায় সংরক্ষণ
                                            </button>
                                            <button onClick={() => setShowNewChapter(false)}
                                                className="px-3 py-1.5 bg-white text-slate-500 border border-slate-200 font-bold rounded-lg text-xs hover:bg-slate-50">
                                                বাতিল
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Topic */}
                        {chapterId && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <BookOpen size={13} className="text-indigo-400" /> টপিক নির্বাচন / তৈরি
                                </p>
                                <div className="flex gap-2">
                                    <select value={topicId} onChange={e => { setTopicId(e.target.value); setShowNewTopic(false); }} className={`${sel} flex-1`}>
                                        <option value="">টপিক নির্বাচন করুন (ঐচ্ছিক)</option>
                                        {topicList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <button onClick={() => setShowNewTopic(v => !v)}
                                        className="flex items-center gap-1 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors shrink-0">
                                        <Plus size={13} /> নতুন টপিক
                                    </button>
                                </div>
                                {showNewTopic && (
                                    <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                                        <p className="text-xs font-bold text-indigo-700">নতুন টপিক যোগ করুন</p>
                                        <div className="flex gap-2">
                                            <input value={newTopicName} onChange={e => setNewTopicName(e.target.value)}
                                                placeholder="টপিকের নাম *"
                                                className="flex-1 p-2 text-sm border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                                            <input value={newTopicOrder} onChange={e => setNewTopicOrder(e.target.value)}
                                                placeholder="ক্রম"
                                                type="number" min="1"
                                                className="w-20 p-2 text-sm border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleCreateTopic} disabled={creatingTopic || !newTopicName.trim()}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 text-white font-bold rounded-lg text-xs hover:bg-indigo-600 disabled:opacity-50 transition-colors">
                                                {creatingTopic ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                টপিক সংরক্ষণ
                                            </button>
                                            <button onClick={() => setShowNewTopic(false)}
                                                className="px-3 py-1.5 bg-white text-slate-500 border border-slate-200 font-bold rounded-lg text-xs hover:bg-slate-50">
                                                বাতিল
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error/success message */}
                        {message && (
                            <div className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                {message.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
                                {message.text}
                            </div>
                        )}

                        {/* Proceed Button */}
                        <button onClick={proceedToUpload}
                            disabled={!metaReady}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]">
                            <ChevronRight size={18} /> ফাইল আপলোডে যান
                        </button>
                    </div>

                    {/* RIGHT — sidebar info */}
                    <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h2 className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                <Info size={14} /> ধাপ ১ নির্দেশনা
                            </h2>
                            <ul className="text-[11px] text-blue-700 space-y-1.5">
                                <li>• প্রথমে প্রশ্নের ধরন বেছে নিন</li>
                                <li>• শিক্ষাস্তর → ধারা → শ্রেণি → বিষয় নির্বাচন করুন <strong>(আবশ্যক)</strong></li>
                                <li>• অধ্যায় এবং টপিক ঐচ্ছিক</li>
                                <li>• নতুন অধ্যায়/টপিক না থাকলে এখানেই তৈরি করুন</li>
                                <li>• সব নির্বাচন করলে "ফাইল আপলোডে যান" বাটন সক্রিয় হবে</li>
                            </ul>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <h2 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                <Download size={14} className="text-indigo-500" /> স্যাম্পল টেমপ্লেট
                            </h2>
                            <p className="text-[11px] text-slate-500 mb-3">Excel টেমপ্লেট ডাউনলোড করে সঠিক ফরম্যাটে প্রশ্ন লিখুন। Class/Subject/Chapter কলাম নেই — মেটাডেটা এখানেই সেট হবে।</p>
                            <button onClick={() => generateTemplate(questionType, cqVariant, mcqVariant)}
                                className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 border border-indigo-200">
                                <Download size={13} /> {typeConfig.label} টেমপ্লেট
                            </button>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <h2 className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                <AlertTriangle size={14} /> গুরুত্বপূর্ণ
                            </h2>
                            <ul className="text-[11px] text-amber-700 space-y-1">
                                <li>• <strong>*</strong> চিহ্নিত ঘর ফাঁকা রাখা যাবে না</li>
                                <li>• সর্বোচ্চ ১০০০ প্রশ্ন প্রতি ফাইল</li>
                                <li>• .xlsx বা .csv ফাইল ব্যবহার করুন</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════ STEP 2 ════ */}
            {step === 2 && (
                <div className="flex flex-col lg:flex-row gap-5">
                    {/* LEFT — upload area */}
                    <div className="flex-1 min-w-0">

                        {/* Selected Metadata Banner */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-[11px] text-emerald-700 font-medium flex flex-wrap gap-2 items-center">
                            <Check size={14} className="text-emerald-500 shrink-0" />
                            <span className="font-bold">নির্বাচিত:</span>
                            {[
                                levels.find(l => l.id === levelId)?.name,
                                streams.find(s => s.id === streamId)?.name,
                                classes.find(c => c.id === classId)?.name,
                                subjects.find(s => s.classSubjectId === subjectId)?.subjectName,
                                chapterList.find(c => c.id === chapterId)?.name,
                                topicList.find(t => t.id === topicId)?.name,
                            ].filter(Boolean).map((n, i) => (
                                <span key={i} className="px-2 py-0.5 bg-white border border-emerald-200 rounded-full font-bold">{n}</span>
                            ))}
                        </div>

                        {!importResult ? (
                            <div
                                className={`bg-white rounded-xl shadow-sm border-2 border-dashed transition-all p-8 min-h-[300px] flex flex-col items-center justify-center text-center ${dragging ? 'border-primary bg-primary/5 scale-[0.99]' : file ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'}`}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(e) => { e.preventDefault(); setDragging(false); validateAndSetFile(e.dataTransfer.files[0]); }}>
                                {!file ? (
                                    <>
                                        <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
                                            <FileSpreadsheet size={36} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">Excel ফাইল আপলোড করুন</h3>
                                        <p className="text-sm text-slate-400 mb-6 max-w-sm">.xlsx, .xls বা .csv ফাইল ড্র্যাগ করুন অথবা ব্রাউজ করুন</p>
                                        <input type="file" id="bulk-input" className="hidden" accept=".xlsx,.xls,.csv"
                                            onChange={(e) => validateAndSetFile(e.target.files[0])} />
                                        <label htmlFor="bulk-input"
                                            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 cursor-pointer flex items-center gap-2 active:scale-95">
                                            <Upload size={18} /> ফাইল নির্বাচন করুন
                                        </label>
                                        <p className="text-[10px] text-slate-300 mt-4">সর্বোচ্চ ফাইল সাইজ: 50MB</p>
                                    </>
                                ) : (
                                    <div className="w-full max-w-md space-y-4">
                                        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 relative">
                                            <button onClick={resetAll}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors text-xs">✕</button>
                                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                                                <FileSpreadsheet size={24} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                                                <p className="text-[11px] text-slate-400">{(file.size / 1024).toFixed(1)} KB • প্রক্রিয়াকরণের জন্য প্রস্তুত</p>
                                            </div>
                                        </div>
                                        <button onClick={handleUpload} disabled={uploading}
                                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
                                            {uploading
                                                ? <><Loader2 size={18} className="animate-spin" /> প্রক্রিয়াকরণ হচ্ছে...</>
                                                : <><Upload size={18} /> ইম্পোর্ট শুরু করুন</>
                                            }
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-emerald-200 overflow-hidden">
                                <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center"><CheckCircle size={22} /></div>
                                    <div>
                                        <h3 className="text-base font-bold text-emerald-800">ইম্পোর্ট সম্পন্ন!</h3>
                                        <p className="text-[11px] text-emerald-600">{importResult.count || 0} টি প্রশ্ন সফলভাবে যোগ হয়েছে</p>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                                            <p className="text-2xl font-black text-emerald-600">{importResult.count || 0}</p>
                                            <p className="text-[10px] font-bold text-emerald-500 uppercase">মোট প্রশ্ন</p>
                                        </div>
                                        <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                                            <p className="text-2xl font-black text-blue-600">{importResult.success || importResult.count || 0}</p>
                                            <p className="text-[10px] font-bold text-blue-500 uppercase">সফল</p>
                                        </div>
                                        <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                                            <p className="text-2xl font-black text-rose-600">{importResult.errors || 0}</p>
                                            <p className="text-[10px] font-bold text-rose-500 uppercase">ত্রুটি</p>
                                        </div>
                                    </div>
                                    {importResult.errorDetails?.length > 0 && (
                                        <div className="mb-4 bg-rose-50 rounded-xl p-3 border border-rose-100 max-h-40 overflow-y-auto">
                                            <p className="text-[10px] font-bold text-rose-500 uppercase mb-1.5">ত্রুটির বিবরণ</p>
                                            {importResult.errorDetails.map((err, i) => (
                                                <p key={i} className="text-[11px] text-rose-600 py-0.5">• সারি {err.row}: {err.message}</p>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button onClick={() => navigate('/questions/list')}
                                            className="flex-1 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all text-sm">
                                            প্রশ্ন ব্যাংকে যান
                                        </button>
                                        <button onClick={() => { resetAll(); setStep(1); }}
                                            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm">
                                            নতুন ইম্পোর্ট
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* message */}
                        {message && !importResult && (
                            <div className={`mt-4 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                {message.type === 'error' ? <AlertTriangle size={16} /> : <Check size={16} />}
                                {message.text}
                            </div>
                        )}
                    </div>

                    {/* RIGHT — sidebar */}
                    <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <h2 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                <FileText size={14} className="text-indigo-500" /> ফাইল ফরম্যাট নির্দেশনা
                            </h2>
                            <ul className="text-[11px] text-slate-600 space-y-1.5">
                                <li>• টেমপ্লেট ডাউনলোড করুন ও পূরণ করুন</li>
                                <li>• নীল হেডার = আবশ্যক, ধূসর = ঐচ্ছিক</li>
                                <li>• Class/Subject/Chapter কলাম নেই — মেটাডেটা ধাপ ১-এ সেট হয়েছে</li>
                                <li>• সর্বোচ্চ ১০০০ সারি একবারে</li>
                            </ul>
                            <button onClick={() => generateTemplate(questionType, cqVariant, mcqVariant)}
                                className="w-full mt-3 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 border border-indigo-200">
                                <Download size={13} /> {typeConfig.label} টেমপ্লেট
                            </button>
                        </div>
                        <div className="bg-grad-to-br from-cyan-50 to-blue-50 bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                            <h2 className="text-xs font-bold text-cyan-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                <Calculator size={14} /> গাণিতিক চিহ্ন
                            </h2>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                                {[['x²', 'বর্গ'], ['√x', 'বর্গমূল'], ['≤ ≥ ≠', 'তুলনা'], ['α β π', 'গ্রিক'], ['∫ Σ ∞', 'ক্যালকুলাস'], ['H₂O CO₂', 'সাবস্ক্রিপ্ট']].map(([s, d], i) => (
                                    <div key={i} className="bg-white/80 rounded px-1.5 py-1 border border-cyan-100">
                                        <span className="font-bold text-cyan-800">{s}</span>
                                        <span className="text-cyan-500 ml-1">{d}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportExcel;
