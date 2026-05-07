import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Save, Plus, Trash2, Check, AlertTriangle, Info, Book, FileText, FileSpreadsheet, Layers, Image as ImageIcon, Upload, X, Loader2, Tag } from 'lucide-react';
import academicService from '../../../services/academicService';
import questionService from '../../../services/questionService';
import QuestionSourceTagger from './components/QuestionSourceTagger';
import RichTextEditor from '../../../components/RichTextEditor';
import ImageEditorModal from '../../../components/ImageEditorModal';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';
import useAutoSave from '../../../hooks/useAutoSave';

// ═══ Bloom's Taxonomy MCQ Framework (Bangladesh NCTB) ═══
const BLOOM_LEVELS = {
    KNOWLEDGE: {
        label: 'Knowledge (জ্ঞান)', bn: 'জ্ঞানমূলক',
        color: 'bg-blue-50 text-blue-700 border-blue-200', activeColor: 'bg-blue-500 text-white',
        percentage: '40%', description: 'স্মৃতি থেকে তথ্য সনাক্ত ও উল্লেখ করা — সরাসরি পাঠ্যপুস্তক থেকে', stimulusRequired: false,
    },
    COMPREHENSION: {
        label: 'Comprehension (অনুধাবন)', bn: 'অনুধাবনমূলক',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', activeColor: 'bg-emerald-500 text-white',
        percentage: '30%', description: 'ব্যাখ্যা, বর্ণনা, পার্থক্য করা', stimulusRequired: false,
    },
    APPLICATION: {
        label: 'Application (প্রয়োগ)', bn: 'প্রয়োগমূলক',
        color: 'bg-amber-50 text-amber-700 border-amber-200', activeColor: 'bg-amber-500 text-white',
        percentage: '20%', description: 'নতুন পরিস্থিতিতে তথ্য, নিয়ম, সূত্র ব্যবহার', stimulusRequired: true,
    },
    HIGHER_ORDER: {
        label: 'Higher Order (উচ্চতর দক্ষতা)', bn: 'উচ্চতর দক্ষতা',
        color: 'bg-rose-50 text-rose-700 border-rose-200', activeColor: 'bg-rose-500 text-white',
        percentage: '10%', description: 'বিশ্লেষণ, সংশ্লেষণ, মূল্যায়ন', stimulusRequired: true,
    }
};

const MCQ_TYPES = {
    SIMPLE: { label: 'সাধারন বহুনির্বাচনি', maxPercent: '30-40%', description: 'একটি প্রশ্ন + ৪টি বিকল্প উত্তর।' },
    MULTIPLE_COMPLETION: { label: 'বহুপদী সমাপ্তিসূচক', maxPercent: 'সর্বোচ্চ 20%', description: '৩টি তথ্য/বিবৃতি থেকে সমন্বয় করে ৪টি বিকল্প।' },
    SITUATION_SET: { label: 'অভিন্ন তথ্যভিত্তিক', maxPercent: 'সর্বোচ্চ 10%', description: 'উদ্দীপক দিয়ে একাধিক প্রশ্ন।' }
};

const MCQCreate = () => {
    const {
        levels, streams, classes, subjects, chapters, topics,
        levelId, streamId, classId, subjectId, chapterId, topicId,
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
    } = useAcademicHierarchy();

    const [formData, setFormData] = useState({
        academicClassId: '', subjectId: '', chapterId: '', topicId: '',
        questionText: '', stimulus: '', bloomLevel: 'KNOWLEDGE', mcqType: 'SIMPLE',
        marks: 1, difficulty: 'MEDIUM', language: 'Bangla', explanation: ''
    });

    const [options, setOptions] = useState([
        { optionLabel: 'ক', optionText: '', isCorrect: false },
        { optionLabel: 'খ', optionText: '', isCorrect: false },
        { optionLabel: 'গ', optionText: '', isCorrect: false },
        { optionLabel: 'ঘ', optionText: '', isCorrect: false }
    ]);

    const [statements, setStatements] = useState([
        { label: 'i', text: '' }, { label: 'ii', text: '' }, { label: 'iii', text: '' }
    ]);

    // Multi-question for SITUATION_SET (অভিন্ন তথ্যভিত্তিক)
    const defaultQSet = () => ({
        questionText: '',
        explanation: '',
        options: [
            { optionLabel: 'ক', optionText: '', isCorrect: false },
            { optionLabel: 'খ', optionText: '', isCorrect: false },
            { optionLabel: 'গ', optionText: '', isCorrect: false },
            { optionLabel: 'ঘ', optionText: '', isCorrect: false }
        ]
    });
    const [questionSets, setQuestionSets] = useState([defaultQSet()]);

    const addQuestionSet = () => setQuestionSets(prev => [...prev, defaultQSet()]);
    const removeQuestionSet = (idx) => { if (questionSets.length > 1) setQuestionSets(prev => prev.filter((_, i) => i !== idx)); };
    const updateQSetText = (idx, val) => { const s = [...questionSets]; s[idx].questionText = val; setQuestionSets(s); };
    const updateQSetExplanation = (idx, val) => { const s = [...questionSets]; s[idx].explanation = val; setQuestionSets(s); };
    const updateQSetOption = (qIdx, oIdx, field, val) => { const s = [...questionSets]; s[qIdx].options[oIdx][field] = val; setQuestionSets(s); };
    const setQSetCorrect = (qIdx, oIdx) => { const s = [...questionSets]; s[qIdx].options = s[qIdx].options.map((o, i) => ({ ...o, isCorrect: i === oIdx })); setQuestionSets(s); };

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [stimulusImages, setStimulusImages] = useState([]);
    const [imageUploading, setImageUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [examSources, setExamSources] = useState([]);

    const currentBloom = BLOOM_LEVELS[formData.bloomLevel];
    const currentMcqType = MCQ_TYPES[formData.mcqType];
    const stimulusRequired = currentBloom.stimulusRequired;

    useEffect(() => {
        setFormData(prev => ({ ...prev, academicClassId: classId }));
    }, [classId]);
    useEffect(() => {
        setFormData(prev => ({ ...prev, subjectId }));
    }, [subjectId]);
    useEffect(() => {
        setFormData(prev => ({ ...prev, chapterId }));
    }, [chapterId]);
    useEffect(() => {
        setFormData(prev => ({ ...prev, topicId }));
    }, [topicId]);

    const handleOptionChange = (index, field, value) => { const n = [...options]; n[index][field] = value; setOptions(n); };
    const handleCorrectOption = (index) => { setOptions(options.map((opt, i) => ({ ...opt, isCorrect: i === index }))); };
    const addOption = () => {
        const labels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
        if (options.length >= 6) return;
        setOptions([...options, { optionLabel: labels[options.length], optionText: '', isCorrect: false }]);
    };
    const removeOption = (index) => {
        if (options.length <= 2) return;
        const labels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
        setOptions(options.filter((_, i) => i !== index).map((opt, i) => ({ ...opt, optionLabel: labels[i] })));
    };
    const handleMcqTypeChange = (type) => {
        setFormData({ ...formData, mcqType: type });
        if (type === 'MULTIPLE_COMPLETION') {
            setOptions([
                { optionLabel: 'ক', optionText: 'i ও ii', isCorrect: false },
                { optionLabel: 'খ', optionText: 'i ও iii', isCorrect: false },
                { optionLabel: 'গ', optionText: 'ii ও iii', isCorrect: false },
                { optionLabel: 'ঘ', optionText: 'i, ii ও iii', isCorrect: false }
            ]);
        } else if (type === 'SITUATION_SET') {
            setQuestionSets([defaultQSet()]);
        } else {
            setOptions([
                { optionLabel: 'ক', optionText: '', isCorrect: false }, { optionLabel: 'খ', optionText: '', isCorrect: false },
                { optionLabel: 'গ', optionText: '', isCorrect: false }, { optionLabel: 'ঘ', optionText: '', isCorrect: false }
            ]);
        }
    };

    // Image editor state
    const [editingImageFile, setEditingImageFile] = useState(null);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [pendingImageFiles, setPendingImageFiles] = useState([]);

    const handleFilesSelected = (files) => {
        if (files.length === 0) return;
        // Queue files and open editor for the first one
        setPendingImageFiles(Array.from(files));
        setEditingImageFile(files[0]);
        setShowImageEditor(true);
    };

    const handleImageEditorSave = async (processedFile, previewUrl) => {
        setImageUploading(true);
        try {
            const r = await questionService.uploadStimulusImage(processedFile);
            if (r.url) setStimulusImages(prev => [...prev, { url: r.url, name: processedFile.name }]);
        } catch (err) {
            setMessage({ type: 'error', text: 'ছবি আপলোড ব্যর্থ: ' + (err.response?.data?.error || err.message) });
        } finally {
            setImageUploading(false);
        }

        // Process next pending file if any
        const remaining = pendingImageFiles.slice(1);
        setPendingImageFiles(remaining);
        if (remaining.length > 0) {
            setEditingImageFile(remaining[0]);
            setShowImageEditor(true);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setMessage(null);

        // Build stimulus HTML
        let stimulusHtml = formData.stimulus || '';
        if (stimulusImages.length > 0) {
            stimulusHtml += '<div class="stimulus-images" style="margin-top:8px;">';
            stimulusImages.forEach(img => { stimulusHtml += `<img src="${img.url}" alt="${img.name}" style="max-width:100%;margin:4px 0;border-radius:8px;" />`; });
            stimulusHtml += '</div>';
        }

        // SITUATION_SET: multiple questions under one stimulus
        if (formData.mcqType === 'SITUATION_SET') {
            if (!formData.academicClassId || !formData.subjectId || !formData.chapterId) {
                setMessage({ type: 'error', text: 'ক্লাস, বিষয় ও অধ্যায় নির্বাচন করুন।' }); return;
            }
            if (!formData.stimulus || formData.stimulus === '<p><br></p>') {
                setMessage({ type: 'error', text: 'অভিন্ন তথ্যভিত্তিক প্রশ্নে উদ্দীপক আবশ্যক!' }); return;
            }
            for (let i = 0; i < questionSets.length; i++) {
                const qs = questionSets[i];
                if (!qs.questionText || qs.questionText === '<p><br></p>') { setMessage({ type: 'error', text: `প্রশ্ন ${i + 1} এর টেক্সট দিন।` }); return; }
                if (!qs.options.some(o => o.isCorrect)) { setMessage({ type: 'error', text: `প্রশ্ন ${i + 1} এ সঠিক উত্তর নির্বাচন করুন।` }); return; }
                if (qs.options.some(o => !o.optionText.trim())) { setMessage({ type: 'error', text: `প্রশ্ন ${i + 1} এর সকল বিকল্পে টেক্সট দিন।` }); return; }
            }
            setLoading(true);
            try {
                let savedCount = 0;
                for (const qs of questionSets) {
                    const payload = {
                        question: {
                            questionText: qs.questionText, marks: formData.marks, difficulty: formData.difficulty,
                            language: formData.language, explanation: qs.explanation || '', bloomLevel: formData.bloomLevel,
                            stimulus: stimulusHtml,
                            academicClass: { id: formData.academicClassId }, classSubject: { id: formData.subjectId },
                            chapter: { id: formData.chapterId }, topic: formData.topicId ? { id: formData.topicId } : null,
                            sources: examSources.length > 0 ? examSources : []
                        },
                        options: qs.options
                    };
                    const saved = await questionService.createMCQ(payload.question, payload.options);
                    savedCount++;
                }
                setMessage({ type: 'success', text: `${savedCount} টি অভিন্ন তথ্যভিত্তিক প্রশ্ন সফলভাবে তৈরি হয়েছে!` });
                setExamSources([]);
            } catch (error) {
                console.error('Failed to create questions', error);
                setMessage({ type: 'error', text: 'প্রশ্ন তৈরি করতে ব্যর্থ হয়েছে।' });
            } finally { setLoading(false); }
            return;
        }

        // Standard / Multiple Completion
        if (!formData.questionText || !formData.academicClassId || !formData.subjectId || !formData.chapterId) {
            setMessage({ type: 'error', text: 'সকল আবশ্যক (*) ফিল্ড পূরণ করুন।' }); return;
        }
        if (stimulusRequired && (!formData.stimulus || formData.stimulus === '<p><br></p>')) {
            setMessage({ type: 'error', text: 'প্রয়োগ ও উচ্চতর দক্ষতা স্তরে উদ্দীপক আবশ্যক!' }); return;
        }
        if (!options.some(opt => opt.isCorrect)) { setMessage({ type: 'error', text: 'একটি সঠিক উত্তর (Key) নির্বাচন করুন।' }); return; }
        if (options.some(opt => !opt.optionText.trim())) { setMessage({ type: 'error', text: 'সকল বিকল্প উত্তরে টেক্সট দিন।' }); return; }

        setLoading(true);
        try {
            const payload = {
                question: {
                    questionText: formData.questionText, marks: formData.marks, difficulty: formData.difficulty,
                    language: formData.language, explanation: formData.explanation, bloomLevel: formData.bloomLevel,
                    stimulus: stimulusHtml,
                    mcqType: formData.mcqType,
                    statements: formData.mcqType === 'MULTIPLE_COMPLETION' ? statements.map(s => `${s.label}. ${s.text}`) : [],
                    academicClass: { id: formData.academicClassId }, classSubject: { id: formData.subjectId },
                    chapter: { id: formData.chapterId }, topic: formData.topicId ? { id: formData.topicId } : null,
                    sources: examSources.length > 0 ? examSources : []
                },
                options: options
            };
            const savedQuestion = await questionService.createMCQ(payload.question, payload.options);
            setMessage({ type: 'success', text: 'বহুনির্বাচনি প্রশ্ন সফলভাবে তৈরি হয়েছে!' });
            setExamSources([]);
        } catch (error) {
            console.error('Failed to create question', error);
            setMessage({ type: 'error', text: 'প্রশ্ন তৈরি করতে ব্যর্থ হয়েছে।' });
        } finally { setLoading(false); }
    };

    const { restoreData, clearSavedData, hasSavedData, lastSavedTime } = useAutoSave('qst_mcq_draft_v1', {
        formData, options, statements, questionSets, examSources,
        classId, subjectId, chapterId, topicId
    });

    const handleRestoreDraft = () => {
        const saved = restoreData();
        if (saved) {
            setFormData(saved.formData);
            setOptions(saved.options);
            setStatements(saved.statements);
            setQuestionSets(saved.questionSets || [defaultQSet()]);
            setExamSources(saved.examSources || []);
            if (saved.classId) setClassId(saved.classId);
            if (saved.subjectId) setSubjectId(saved.subjectId);
            if (saved.chapterId) setChapterId(saved.chapterId);
            if (saved.topicId) setTopicId(saved.topicId);
            setMessage({ type: 'success', text: 'অটো-সেভ করা ডেটা সফলভাবে রিস্টোর হয়েছে!' });
        }
    };

    return (
        <div className="w-full">
            {/* ═══ AUTO-SAVE BANNER ═══ */}
            {hasSavedData && (
                <div className="bg-amber-50 border border-amber-200 p-3 mb-4 rounded-xl flex flex-wrap items-center justify-between shadow-sm gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="text-amber-500" size={20} /></div>
                        <div>
                            <p className="text-sm font-bold text-amber-800">অসম্পূর্ণ কাজের ড্রাফট পাওয়া গেছে!</p>
                            <p className="text-xs text-amber-700">লোডশেডিং বা ট্যাব বন্ধ হওয়ার আগের ডেটা। সর্বশেষ সেভ: {lastSavedTime ? lastSavedTime.toLocaleTimeString() : 'কিছুক্ষণ আগে'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleRestoreDraft} className="px-3 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-amber-600 transition-colors">ডেটা রিকভার করুন</button>
                        <button type="button" onClick={clearSavedData} className="px-3 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">ড্রাফট মুছুন</button>
                    </div>
                </div>
            )}

            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">বহুনির্বাচনি প্রশ্ন তৈরি</h1>
                    <p className="text-xs text-slate-400 mt-0.5">MCQ — {currentBloom.bn} • {currentMcqType.label}</p>
                </div>
                <div className="flex items-center gap-2">
                    {lastSavedTime && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Check size={12}/> Auto-saved {lastSavedTime.toLocaleTimeString()}</span>}
                    <Link to="/questions/import/excel?type=MCQ" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all">
                        <FileSpreadsheet size={14} /> Bulk Import
                    </Link>
                </div>
            </div>

            {message && (
                <div className={`mb-4 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>

                {/* ═══ TOOLBAR STRIP ═══ */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-4">
                    <div className="flex flex-wrap items-start gap-4">
                        {/* MCQ Type */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">প্রশ্নের ধরন</label>
                            <div className="flex gap-1">
                                {Object.entries(MCQ_TYPES).map(([key, type]) => (
                                    <button key={key} type="button" onClick={() => handleMcqTypeChange(key)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${formData.mcqType === key ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                            {formData.mcqType !== 'SIMPLE' && <p className="text-[10px] text-indigo-500 mt-1 font-medium">{currentMcqType.description}</p>}
                        </div>

                        {/* Bloom Level */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">চিন্তন দক্ষতা (Bloom)</label>
                            <div className="flex gap-1">
                                {Object.entries(BLOOM_LEVELS).map(([key, level]) => (
                                    <button key={key} type="button" onClick={() => setFormData({ ...formData, bloomLevel: key })}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${formData.bloomLevel === key ? level.activeColor + ' shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {level.bn} {level.stimulusRequired && '📌'}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-0.5 rounded overflow-hidden h-1.5 mt-1.5">
                                <div className="bg-blue-400 flex-[40]" /><div className="bg-emerald-400 flex-[30]" />
                                <div className="bg-amber-400 flex-[20]" /><div className="bg-rose-400 flex-[10]" />
                            </div>
                        </div>

                        {/* Difficulty */}
                        <div className="shrink-0">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">কঠিন্য</label>
                            <div className="flex gap-1">
                                {['EASY', 'MEDIUM', 'HARD'].map((level) => (
                                    <button key={level} type="button" onClick={() => setFormData({ ...formData, difficulty: level })}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${formData.difficulty === level
                                            ? level === 'EASY' ? 'bg-emerald-500 text-white' : level === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {level === 'EASY' ? '🟢 সহজ' : level === 'MEDIUM' ? '🟡 মধ্যম' : '🔴 কঠিন'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ TWO-COLUMN LAYOUT ═══ */}
                <div className="flex flex-col lg:flex-row gap-5">

                    {/* ─── LEFT: Main Content ─── */}
                    <div className="flex-1 min-w-0 space-y-5">

                        {/* Stimulus */}
                        <div className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 transition-all ${stimulusRequired ? 'border-amber-300' : 'border-slate-200'}`}>
                            <div className={`px-5 py-2.5 flex items-center justify-between ${stimulusRequired ? 'bg-amber-50 border-b border-amber-200' : 'bg-slate-50 border-b border-slate-100'}`}>
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Book size={15} className={stimulusRequired ? 'text-amber-500' : 'text-slate-400'} />
                                    উদ্দীপক {stimulusRequired ? <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">আবশ্যক</span> : <span className="text-[10px] text-slate-400">(ঐচ্ছিক)</span>}
                                </h2>
                            </div>
                            <div className="p-5">
                                {stimulusRequired && (
                                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 flex items-center gap-1.5">
                                        <Info size={12} className="shrink-0" /> উদ্দীপক মৌলিক হতে হবে, পাঠ্যপুস্তক থেকে সরাসরি নেওয়া যাবে না।
                                    </div>
                                )}
                                <RichTextEditor value={formData.stimulus}
                                    onChange={(val) => setFormData({ ...formData, stimulus: val })}
                                    height="h-24" placeholder="উদ্দীপক লিখুন — দৃশ্যকল্প, অনুচ্ছেদ, সারণি, সমীকরণ..." />

                                {/* Images */}
                                <div className="mt-2">
                                    {stimulusImages.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {stimulusImages.map((img, idx) => (
                                                <div key={idx} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                                    <img src={img.url} alt={`img-${idx}`} className="w-full h-full object-contain" />
                                                    <button type="button" onClick={() => setStimulusImages(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X size={10} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div onClick={() => !imageUploading && fileInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50/50'); }}
                                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50'); }}
                                        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/50'); handleFilesSelected(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))); }}
                                        className={`border-2 border-dashed rounded-lg p-3 flex items-center justify-center gap-3 cursor-pointer transition-all hover:border-blue-300 ${imageUploading ? 'border-blue-300 bg-blue-50/50 pointer-events-none' : 'border-slate-200'}`}>
                                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                                            onChange={(e) => { handleFilesSelected(Array.from(e.target.files)); e.target.value = ''; }} />
                                        {imageUploading
                                            ? <><Loader2 size={16} className="text-blue-500 animate-spin" /><span className="text-sm text-blue-600">আপলোড হচ্ছে...</span></>
                                            : <><Upload size={14} className="text-slate-400" /><span className="text-sm text-slate-500">চিত্র/গ্রাফ/ডায়াগ্রাম যোগ করুন</span></>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ══ SITUATION_SET: Multi-Question UI ══ */}
                        {formData.mcqType === 'SITUATION_SET' ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Layers size={15} className="text-orange-500" /> প্রশ্নসমূহ ({questionSets.length} টি)
                                    </h2>
                                    <button type="button" onClick={addQuestionSet}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all">
                                        <Plus size={14} /> নতুন প্রশ্ন যোগ
                                    </button>
                                </div>
                                {questionSets.map((qs, qIdx) => (
                                    <div key={qIdx} className="bg-white rounded-xl shadow-sm border-2 border-orange-200 overflow-hidden">
                                        <div className="px-5 py-2 bg-orange-50 border-b border-orange-200 flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                                                <FileText size={13} /> প্রশ্ন {qIdx + 1}
                                            </h3>
                                            {questionSets.length > 1 && (
                                                <button type="button" onClick={() => removeQuestionSet(qIdx)}
                                                    className="text-rose-400 hover:text-rose-600 p-0.5"><Trash2 size={13} /></button>
                                            )}
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <RichTextEditor value={qs.questionText}
                                                onChange={(val) => updateQSetText(qIdx, val)}
                                                height="h-16" placeholder={`প্রশ্ন ${qIdx + 1} লিখুন...`} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {qs.options.map((opt, oIdx) => (
                                                    <div key={oIdx}
                                                        className={`flex items-start gap-2 p-2.5 rounded-lg border-2 transition-all cursor-pointer ${opt.isCorrect
                                                            ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'}`}
                                                        onClick={() => setQSetCorrect(qIdx, oIdx)}>
                                                        <div className="pt-0.5 shrink-0">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${opt.isCorrect
                                                                ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>
                                                                {opt.isCorrect ? <Check size={10} strokeWidth={3} /> : opt.optionLabel}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                                                            <RichTextEditor theme="bubble" value={opt.optionText}
                                                                onChange={(val) => updateQSetOption(qIdx, oIdx, 'optionText', val)}
                                                                placeholder="বিকল্প..."
                                                                minimal showEquation={true}
                                                                height="[&_.ql-editor]:min-h-[28px] [&_.ql-editor]:py-1 [&_.ql-editor]:px-2 [&_.ql-editor]:text-sm"
                                                                className="bg-white border border-slate-200 rounded-lg" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Per-question explanation */}
                                            <div className="mt-2 pt-2 border-t border-orange-100">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ব্যাখ্যা (ঐচ্ছিক)</label>
                                                <RichTextEditor theme="bubble" value={qs.explanation}
                                                    onChange={(val) => updateQSetExplanation(qIdx, val)}
                                                    placeholder="এই প্রশ্নের ব্যাখ্যা..."
                                                    minimal
                                                    height="[&_.ql-editor]:min-h-[32px] [&_.ql-editor]:py-1.5 [&_.ql-editor]:px-2.5 [&_.ql-editor]:text-sm"
                                                    className="bg-slate-50 border border-slate-200 rounded-lg" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addQuestionSet}
                                    className="w-full py-2.5 border-2 border-dashed border-orange-200 text-orange-500 text-sm font-bold rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center gap-1.5">
                                    <Plus size={16} /> আরো প্রশ্ন যোগ করুন
                                </button>
                            </div>
                        ) : (
                            <>
                        {/* Question Text */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <FileText size={15} className="text-purple-500" /> প্রশ্ন / নির্দেশনা *
                                </h2>
                            </div>
                            <div className="p-5">
                                <RichTextEditor value={formData.questionText}
                                    onChange={(val) => setFormData({ ...formData, questionText: val })}
                                    height="h-24" placeholder="প্রশ্ন বা অসম্পূর্ণ বাক্য লিখুন..." />
                            </div>
                        </div>

                        {/* বহুপদী Statements */}
                        {formData.mcqType === 'MULTIPLE_COMPLETION' && (
                            <div className="bg-white rounded-xl shadow-sm border-2 border-indigo-200 overflow-hidden">
                                <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-200">
                                    <h2 className="text-sm font-bold text-indigo-700 flex items-center gap-2"><Layers size={15} /> তথ্য / বিবৃতি</h2>
                                </div>
                                <div className="p-5 space-y-2.5">
                                    {statements.map((stmt, index) => (
                                        <div key={index} className="flex items-center gap-2.5">
                                            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">{stmt.label}</span>
                                            <input type="text" value={stmt.text}
                                                onChange={(e) => { const s = [...statements]; s[index].text = e.target.value; setStatements(s); }}
                                                className="flex-1 p-2.5 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
                                                placeholder={`বিবৃতি ${stmt.label} লিখুন...`} />
                                        </div>
                                    ))}
                                    <p className="text-[11px] text-indigo-500 flex items-center gap-1"><Info size={11} /> নিচে সমন্বয় দিন: &quot;i ও ii&quot;, &quot;i ও iii&quot; ইত্যাদি</p>
                                </div>
                            </div>
                        )}

                        {/* Answer Options */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Check size={15} className="text-emerald-500" /> বিকল্প উত্তর
                                </h2>
                                {formData.mcqType !== 'MULTIPLE_COMPLETION' && (
                                    <button type="button" onClick={addOption} disabled={options.length >= 6}
                                        className="text-xs text-primary hover:text-blue-700 font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
                                        <Plus size={14} /> Add
                                    </button>
                                )}
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {options.map((option, index) => (
                                        <div key={index}
                                            className={`flex items-start gap-2.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${option.isCorrect
                                                ? 'bg-emerald-50/60 border-emerald-300 shadow-sm shadow-emerald-100'
                                                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                                            }`}
                                            onClick={() => handleCorrectOption(index)}>
                                            <div className="pt-1 shrink-0">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${option.isCorrect
                                                    ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-slate-400'}`}>
                                                    {option.isCorrect ? <Check size={12} strokeWidth={3} /> : option.optionLabel}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-[10px] font-bold uppercase ${option.isCorrect ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {option.optionLabel}) {option.isCorrect && '✓ Key'}
                                                    </span>
                                                    {options.length > 2 && formData.mcqType !== 'MULTIPLE_COMPLETION' && (
                                                        <button type="button" onClick={() => removeOption(index)} className="text-rose-400 hover:text-rose-600 p-0.5"><Trash2 size={12} /></button>
                                                    )}
                                                </div>
                                                {formData.mcqType === 'MULTIPLE_COMPLETION' ? (
                                                    <input type="text" value={option.optionText}
                                                        onChange={(e) => handleOptionChange(index, 'optionText', e.target.value)}
                                                        className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-white" placeholder="Combination..." />
                                                ) : (
                                                    <RichTextEditor theme="bubble" value={option.optionText}
                                                        onChange={(val) => handleOptionChange(index, 'optionText', val)}
                                                        placeholder="বিকল্প উত্তর..."
                                                        minimal showEquation={true}
                                                        height="[&_.ql-editor]:min-h-[32px] [&_.ql-editor]:py-1.5 [&_.ql-editor]:px-2.5 [&_.ql-editor]:text-sm"
                                                        className="bg-white border border-slate-200 rounded-lg" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-2.5 text-[11px] text-slate-400 flex items-center gap-1">
                                    <Info size={11} /> প্রতিটি বিক্ষেপক কমপক্ষে ৫% পরীক্ষার্থী পছন্দ করবে এমনভাবে প্রণয়ন করুন।
                                </p>
                            </div>
                        </div>
                            </>
                        )}

                        {/* Explanation */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Book size={15} className="text-amber-500" /> ব্যাখ্যা <span className="text-[10px] text-slate-400 font-normal">(ঐচ্ছিক)</span>
                                </h2>
                            </div>
                            <div className="p-5">
                                <RichTextEditor value={formData.explanation}
                                    onChange={(val) => setFormData({ ...formData, explanation: val })}
                                    height="h-20" placeholder="সঠিক উত্তরের ব্যাখ্যা (ঐচ্ছিক)..." />
                            </div>
                        </div>
                    </div>

                    {/* ─── RIGHT: Settings ─── */}
                    <div className="w-full lg:w-[300px] xl:w-[330px] shrink-0 space-y-4">

                        {/* Academic Mapping */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wide flex items-center gap-1.5">
                                <Book size={14} className="text-blue-500" /> শিক্ষাস্তর থেকে টপিক
                            </h2>
                            <div className="space-y-2">
                                <select value={levelId} onChange={e => setLevelId(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50">
                                    <option value="">শিক্ষাস্তর নির্বাচন *</option>
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed">
                                    <option value="">বিভাগ/ধারা নির্বাচন *</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed">
                                    <option value="">শ্রেণি নির্বাচন *</option>
                                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed">
                                    <option value="">বিষয় নির্বাচন *</option>
                                    {subjects.map(subj => <option key={subj.classSubjectId} value={subj.classSubjectId}>{subj.subjectName}</option>)}
                                </select>
                                <select value={chapterId} onChange={e => setChapterId(e.target.value)} disabled={!subjectId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed">
                                    <option value="">অধ্যায় নির্বাচন *</option>
                                    {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.name}</option>)}
                                </select>
                                <select value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!chapterId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed">
                                    <option value="">টপিক (ঐচ্ছিক)</option>
                                    {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Marks & Language */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">নম্বর</label>
                                    <input type="number" value={formData.marks} onChange={(e) => setFormData({ ...formData, marks: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50" min="0.5" step="0.5" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ভাষা</label>
                                    <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50">
                                        <option value="Bangla">Bangla</option>
                                        <option value="English">English</option>
                                        <option value="Bilingual">Bilingual</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Exam Sources */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wide flex items-center gap-1.5">
                                <Tag size={14} className="text-orange-500" /> পরীক্ষার উৎস
                            </h2>
                            <QuestionSourceTagger sources={examSources} onChange={setExamSources} />
                        </div>

                        {/* Submit */}
                        <div className="space-y-2 sticky bottom-4">
                            <button type="submit" disabled={loading}
                                className="w-full px-5 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98]">
                                {loading ? 'সংরক্ষণ হচ্ছে...' : <><Save size={18} /> প্রশ্ন সংরক্ষণ করুন</>}
                            </button>
                            <button type="button" className="w-full px-5 py-2 text-slate-500 font-medium hover:bg-slate-50 rounded-xl border border-slate-200 text-sm">
                                খসড়া সংরক্ষণ
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Image Editor Modal */}
            <ImageEditorModal
                file={editingImageFile}
                isOpen={showImageEditor}
                onClose={() => { setShowImageEditor(false); setEditingImageFile(null); setPendingImageFiles([]); }}
                onSave={handleImageEditorSave}
                maxSizeKB={500}
            />
        </div>
    );
};

export default MCQCreate;
