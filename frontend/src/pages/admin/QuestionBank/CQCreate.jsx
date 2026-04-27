import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Save, Check, AlertTriangle, Info, Book, FileText, FileSpreadsheet, Upload, X, Loader2, Tag } from 'lucide-react';
import academicService from '../../../services/academicService';
import questionService from '../../../services/questionService';
import QuestionSourceTagger from './components/QuestionSourceTagger';
import RichTextEditor from '../../../components/RichTextEditor';
import ImageEditorModal from '../../../components/ImageEditorModal';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';

// ═══ Two CQ Structures (Bangladesh NCTB) ═══
const CQ_STRUCTURES = {
    STANDARD: {
        label: 'সাধারণ (৪ অংশ)',
        subtitle: 'বাংলা, ইংরেজি, বিজ্ঞান, সামাজিক বিজ্ঞান',
        totalMarks: 10,
        parts: [
            { label: 'ক', marks: 1, level: 'জ্ঞান', color: 'border-blue-300 bg-blue-50', iconBg: 'bg-blue-500', placeholder: 'জ্ঞানমূলক — সংজ্ঞা, তথ্য, সরাসরি উত্তর' },
            { label: 'খ', marks: 2, level: 'অনুধাবন', color: 'border-emerald-300 bg-emerald-50', iconBg: 'bg-emerald-500', placeholder: 'অনুধাবনমূলক — ব্যাখ্যা, বর্ণনা, পার্থক্য' },
            { label: 'গ', marks: 3, level: 'প্রয়োগ', color: 'border-amber-300 bg-amber-50', iconBg: 'bg-amber-500', placeholder: 'প্রয়োগমূলক — উদ্দীপকের আলোকে প্রয়োগ' },
            { label: 'ঘ', marks: 4, level: 'উচ্চতর দক্ষতা', color: 'border-rose-300 bg-rose-50', iconBg: 'bg-rose-500', placeholder: 'উচ্চতর দক্ষতা — বিশ্লেষণ, মূল্যায়ন, যুক্তি' },
        ]
    },
    MATH: {
        label: 'গণিত (৩ অংশ)',
        subtitle: 'উচ্চতর গণিত, গণিত, পদার্থবিজ্ঞান',
        totalMarks: 10,
        parts: [
            { label: 'ক', marks: 2, level: 'জ্ঞান/অনুধাবন', color: 'border-blue-300 bg-blue-50', iconBg: 'bg-blue-500', placeholder: 'সংজ্ঞা, সূত্র, নির্ণয়, সমীকরণ — সরাসরি' },
            { label: 'খ', marks: 4, level: 'প্রয়োগ', color: 'border-amber-300 bg-amber-50', iconBg: 'bg-amber-500', placeholder: 'সমস্যা সমাধান, প্রমাণ, নির্ণয় — উদ্দীপক ভিত্তিক' },
            { label: 'গ', marks: 4, level: 'উচ্চতর দক্ষতা', color: 'border-rose-300 bg-rose-50', iconBg: 'bg-rose-500', placeholder: 'বিশ্লেষণ, প্রমাণ, যাচাই — উদ্দীপক ভিত্তিক' },
        ]
    }
};

const CQCreate = () => {
    const {
        levels, streams, classes, subjects, chapters, topics,
        levelId, streamId, classId, subjectId, chapterId, topicId,
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
    } = useAcademicHierarchy();

    const [cqType, setCqType] = useState('STANDARD');
    const activeStructure = CQ_STRUCTURES[cqType];

    const [formData, setFormData] = useState({
        academicClassId: '', subjectId: '', chapterId: '', topicId: '',
        stem: '', difficulty: 'MEDIUM', language: 'Bangla',
    });

    const [subQuestions, setSubQuestions] = useState(
        CQ_STRUCTURES.STANDARD.parts.map(p => ({ label: p.label, text: '', marks: p.marks }))
    );

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [stimulusImages, setStimulusImages] = useState([]);
    const [imageUploading, setImageUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [examSources, setExamSources] = useState([]);

    const totalMarks = activeStructure.totalMarks;

    const handleCqTypeChange = (type) => {
        setCqType(type);
        setSubQuestions(CQ_STRUCTURES[type].parts.map(p => ({ label: p.label, text: '', marks: p.marks })));
    };

    // Sync hook IDs into formData for submit payload
    useEffect(() => { setFormData(prev => ({ ...prev, academicClassId: classId })); }, [classId]);
    useEffect(() => { setFormData(prev => ({ ...prev, subjectId })); }, [subjectId]);
    useEffect(() => { setFormData(prev => ({ ...prev, chapterId })); }, [chapterId]);
    useEffect(() => { setFormData(prev => ({ ...prev, topicId })); }, [topicId]);

    // Image editor state
    const [editingImageFile, setEditingImageFile] = useState(null);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [pendingImageFiles, setPendingImageFiles] = useState([]);

    const handleFilesSelected = (files) => {
        if (files.length === 0) return;
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
        } finally { setImageUploading(false); }
        const remaining = pendingImageFiles.slice(1);
        setPendingImageFiles(remaining);
        if (remaining.length > 0) { setEditingImageFile(remaining[0]); setShowImageEditor(true); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setMessage(null);
        if (!formData.stem || formData.stem === '<p><br></p>') {
            if (stimulusImages.length === 0) { setMessage({ type: 'error', text: 'উদ্দীপক (টেক্সট বা ছবি) আবশ্যক।' }); return; }
        }
        if (!formData.academicClassId || !formData.subjectId || !formData.chapterId) {
            setMessage({ type: 'error', text: 'ক্লাস, বিষয় ও অধ্যায় নির্বাচন করুন।' }); return;
        }
        if (subQuestions.some(sq => !sq.text.trim())) {
            setMessage({ type: 'error', text: `সকল ${subQuestions.length} টি উপ-প্রশ্ন পূরণ করুন।` }); return;
        }

        setLoading(true);
        try {
            let stemHtml = formData.stem || '';
            if (stimulusImages.length > 0) {
                stemHtml += '<div class="stimulus-images" style="margin-top:8px;">';
                stimulusImages.forEach(img => { stemHtml += `<img src="${img.url}" alt="${img.name}" style="max-width:100%;margin:4px 0;border-radius:8px;" />`; });
                stemHtml += '</div>';
            }
            let combinedHtml = `<div class=\"cq-stem\">${stemHtml}</div><div class=\"cq-questions\"><ol type=\"a\">`;
            let answersHtml = '<div class=\"cq-answers\">';
            let explanationsHtml = '<div class=\"cq-explanations\">';

            subQuestions.forEach(sq => {
                combinedHtml += `<li data-marks=\"${sq.marks}\"><span class=\"cq-text\">${sq.text}</span> <span class=\"cq-marks\">(${sq.marks})</span></li>`;
                if (sq.answer) {
                    answersHtml += `<div class=\"cq-ans-part\" data-label=\"${sq.label}\" style=\"margin-bottom:8px;\"><strong>${sq.label}) উত্তর:</strong> <span class=\"cq-ans-content\">${sq.answer}</span></div>`;
                }
                if (sq.explanation) {
                    explanationsHtml += `<div class=\"cq-exp-part\" data-label=\"${sq.label}\" style=\"margin-bottom:8px;\"><strong>${sq.label}) ব্যাখ্যা:</strong> <span class=\"cq-exp-content\">${sq.explanation}</span></div>`;
                }
            });
            
            combinedHtml += '</ol></div>';
            answersHtml += '</div>';
            explanationsHtml += '</div>';

            const payload = {
                questionText: combinedHtml, 
                stimulus: stemHtml, 
                marks: totalMarks,
                correctAnswer: answersHtml === '<div class=\"cq-answers\"></div>' ? null : answersHtml,
                explanation: explanationsHtml === '<div class=\"cq-explanations\"></div>' ? null : explanationsHtml,
                difficulty: formData.difficulty, 
                language: formData.language,
                academicClass: { id: formData.academicClassId }, 
                classSubject: { id: formData.subjectId },
                chapter: { id: formData.chapterId }, 
                topic: formData.topicId ? { id: formData.topicId } : null,
                sourceReference: examSources.length > 0 ? JSON.stringify(examSources) : null
            };

            const savedQuestion = await questionService.createCQ(payload);
            if (examSources.length > 0 && savedQuestion?.id) {
                for (const src of examSources) await questionService.addQuestionSource(savedQuestion.id, src);
            }
            setMessage({ type: 'success', text: 'সৃজনশীল প্রশ্ন সফলভাবে তৈরি হয়েছে!' });
            setFormData(prev => ({ ...prev, stem: '' }));
            setSubQuestions(activeStructure.parts.map(p => ({ label: p.label, text: '', answer: '', explanation: '', marks: p.marks })));
            setStimulusImages([]); setExamSources([]);
        } catch (error) {
            console.error("Failed to create question", error);
            setMessage({ type: 'error', text: 'প্রশ্ন তৈরি করতে ব্যর্থ হয়েছে।' });
        } finally { setLoading(false); }
    };

    return (
        <div className="w-full">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">সৃজনশীল প্রশ্ন তৈরি</h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        CQ — {activeStructure.label} • {activeStructure.parts.map(p => `${p.label}(${p.marks})`).join(' + ')} = {totalMarks}
                    </p>
                </div>
                <Link to="/questions/import/excel?type=CQ" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all">
                    <FileSpreadsheet size={14} /> Bulk Import
                </Link>
            </div>

            {message && (
                <div className={`mb-4 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>

                {/* ═══ TOOLBAR STRIP — CQ Type + Marks Distribution + Difficulty ═══ */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-4">
                    <div className="flex flex-wrap items-start gap-4">

                        {/* CQ Type */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">প্রশ্নের ধরন</label>
                            <div className="flex gap-1.5">
                                {Object.entries(CQ_STRUCTURES).map(([key, struct]) => (
                                    <button key={key} type="button" onClick={() => handleCqTypeChange(key)}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${cqType === key
                                            ? 'bg-indigo-500 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}>
                                        {struct.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{activeStructure.subtitle}</p>
                        </div>

                        {/* Marks Distribution Visual */}
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">নম্বর বিন্যাস</label>
                            <div className="flex items-center gap-1.5">
                                {activeStructure.parts.map((p, i) => (
                                    <div key={i} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold ${p.color}`}>
                                        <span className={`w-5 h-5 rounded ${p.iconBg} text-white flex items-center justify-center text-[10px]`}>{p.label}</span>
                                        <span>{p.marks}</span>
                                    </div>
                                ))}
                                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">= {totalMarks}</span>
                            </div>
                            <div className="flex gap-0.5 rounded overflow-hidden h-1.5 mt-1.5">
                                {activeStructure.parts.map((p, i) => {
                                    const colors = ['bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400'];
                                    return <div key={i} className={`${colors[i]} transition-all`} style={{ flex: p.marks }} />;
                                })}
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

                        {/* Stimulus / উদ্দীপক */}
                        <div className="bg-white rounded-xl shadow-sm border-2 border-purple-200 overflow-hidden">
                            <div className="px-5 py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                                    <FileText size={15} /> উদ্দীপক *
                                </h2>
                                <span className="text-[10px] text-purple-400 font-medium">টেক্সট, সমীকরণ, চিত্র, গ্রাফ, সারণি</span>
                            </div>
                            <div className="p-5">
                                <RichTextEditor value={formData.stem}
                                    onChange={(val) => setFormData({ ...formData, stem: val })}
                                    height="h-28"
                                    placeholder="উদ্দীপক লিখুন — সমীকরণ, তথ্য, পরিস্থিতি..." />

                                {/* Image Upload */}
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
                                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-purple-400', 'bg-purple-50/50'); }}
                                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-purple-400', 'bg-purple-50/50'); }}
                                        onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-purple-400', 'bg-purple-50/50'); handleFilesSelected(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))); }}
                                        className={`border-2 border-dashed rounded-lg p-3 flex items-center justify-center gap-3 cursor-pointer transition-all hover:border-purple-300 ${imageUploading ? 'border-purple-300 bg-purple-50/50 pointer-events-none' : 'border-slate-200'}`}>
                                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                                            onChange={(e) => { handleFilesSelected(Array.from(e.target.files)); e.target.value = ''; }} />
                                        {imageUploading
                                            ? <><Loader2 size={16} className="text-purple-500 animate-spin" /><span className="text-sm text-purple-600">আপলোড হচ্ছে...</span></>
                                            : <><Upload size={14} className="text-slate-400" /><span className="text-sm text-slate-500">চিত্র/গ্রাফ/ডায়াগ্রাম যোগ করুন</span></>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sub-Questions / উপ-প্রশ্ন */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Book size={15} /> উপ-প্রশ্ন
                                </h2>
                                <div className="flex items-center gap-1">
                                    {activeStructure.parts.map(p => (
                                        <span key={p.label} className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                            {p.label}={p.marks}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-5 space-y-3">
                                {subQuestions.map((sq, index) => {
                                    const part = activeStructure.parts[index];
                                    return (
                                        <div key={index} className={`flex items-start gap-3 p-3 rounded-xl border-2 ${part.color} transition-all`}>
                                            <div className="shrink-0 flex flex-col items-center gap-0.5">
                                                <span className={`w-9 h-9 rounded-lg ${part.iconBg} text-white flex items-center justify-center font-bold text-base shadow-sm`}>
                                                    {part.label}
                                                </span>
                                                <span className="text-[10px] font-black opacity-70">{part.marks}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">{part.level}</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <textarea rows={2}
                                                        className="w-full p-2.5 text-sm border border-white/60 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-white/90 transition-all resize-none leading-relaxed"
                                                        value={sq.text || ''}
                                                        onChange={(e) => { const n = [...subQuestions]; n[index].text = e.target.value; setSubQuestions(n); }}
                                                        placeholder={part.placeholder} />
                                                    <textarea rows={2}
                                                        className="w-full p-2.5 text-sm border border-emerald-200/60 rounded-lg focus:ring-2 focus:ring-emerald-500/20 outline-none bg-emerald-50/50 hover:bg-emerald-50 transition-all resize-none leading-relaxed"
                                                        value={sq.answer || ''}
                                                        onChange={(e) => { const n = [...subQuestions]; n[index].answer = e.target.value; setSubQuestions(n); }}
                                                        placeholder={`${part.label} অংশের উত্তর লিখুন (ঐচ্ছিক)...`} />
                                                    <textarea rows={2}
                                                        className="w-full p-2.5 text-sm border border-amber-200/60 rounded-lg focus:ring-2 focus:ring-amber-500/20 outline-none bg-amber-50/50 hover:bg-amber-50 transition-all resize-none leading-relaxed"
                                                        value={sq.explanation || ''}
                                                        onChange={(e) => { const n = [...subQuestions]; n[index].explanation = e.target.value; setSubQuestions(n); }}
                                                        placeholder={`${part.label} অংশের ব্যাখ্যা লিখুন (ঐচ্ছিক)...`} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ─── RIGHT: Settings Sidebar ─── */}
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

                        {/* Language */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ভাষা</label>
                            <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none bg-slate-50/50">
                                <option value="Bangla">Bangla</option>
                                <option value="English">English</option>
                                <option value="Bilingual">Bilingual</option>
                            </select>
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

                        {/* Quick Guide */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <Info size={11} /> লক্ষণীয়
                            </h3>
                            <ul className="text-[11px] text-slate-500 space-y-0.5 leading-relaxed">
                                {cqType === 'MATH' ? (
                                    <>
                                        <li>• উদ্দীপকে সমীকরণ/গ্রাফ/চিত্র থাকবে</li>
                                        <li>• ক অংশে সংজ্ঞা/সূত্র/সরাসরি নির্ণয়</li>
                                        <li>• খ ও গ অংশ উদ্দীপক ভিত্তিক</li>
                                        <li>• গাণিতিক চিহ্নের জন্য ছবি আপলোড করুন</li>
                                    </>
                                ) : (
                                    <>
                                        <li>• ক ও খ অংশ উদ্দীপক ছাড়াও উত্তর করা যেতে পারে</li>
                                        <li>• গ ও ঘ অবশ্যই উদ্দীপক ভিত্তিক</li>
                                        <li>• ভগ্নাংশ নম্বর দেওয়া যাবে না</li>
                                        <li>• উদ্দীপকে উত্তর থাকবে না</li>
                                    </>
                                )}
                            </ul>
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

export default CQCreate;
