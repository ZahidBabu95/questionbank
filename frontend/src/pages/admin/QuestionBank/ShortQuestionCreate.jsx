import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Save, Check, AlertTriangle, Book, FileText, FileSpreadsheet, Tag } from 'lucide-react';
import academicService from '../../../services/academicService';
import questionService from '../../../services/questionService';
import QuestionSourceTagger from './components/QuestionSourceTagger';
import RichTextEditor from '../../../components/RichTextEditor';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';

const BLOOM_LEVELS = {
    KNOWLEDGE: { bn: 'জ্ঞানমূলক', activeColor: 'bg-blue-500 text-white' },
    COMPREHENSION: { bn: 'অনুধাবনমূলক', activeColor: 'bg-emerald-500 text-white' },
    APPLICATION: { bn: 'প্রয়োগমূলক', activeColor: 'bg-amber-500 text-white' },
    HIGHER_ORDER: { bn: 'উচ্চতর দক্ষতা', activeColor: 'bg-rose-500 text-white' },
};

const ShortQuestionCreate = () => {
    const {
        levels, streams, classes, subjects, chapters, topics,
        levelId, streamId, classId, subjectId, chapterId, topicId,
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
    } = useAcademicHierarchy();

    const [formData, setFormData] = useState({
        academicClassId: '', subjectId: '', chapterId: '', topicId: '',
        questionText: '', stimulus: '', bloomLevel: 'KNOWLEDGE',
        marks: 2, difficulty: 'MEDIUM', language: 'Bangla', explanation: ''
    });

    // Reverted frontend auto-filtering logic per user request to allow simple database-driven dropdown mapping

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [examSources, setExamSources] = useState([]);

    // Sync hook IDs into formData for submit payload
    useEffect(() => { setFormData(prev => ({ ...prev, academicClassId: classId })); }, [classId]);
    useEffect(() => { setFormData(prev => ({ ...prev, subjectId })); }, [subjectId]);
    useEffect(() => { setFormData(prev => ({ ...prev, chapterId })); }, [chapterId]);
    useEffect(() => { setFormData(prev => ({ ...prev, topicId })); }, [topicId]);

    const handleSubmit = async (e) => {
        e.preventDefault(); setMessage(null);
        if (!formData.questionText || !formData.academicClassId || !formData.subjectId || !formData.chapterId) {
            setMessage({ type: 'error', text: 'সকল আবশ্যক (*) ফিল্ড পূরণ করুন।' }); return;
        }
        setLoading(true);
        try {
            const payload = {
                questionText: formData.questionText, marks: formData.marks, difficulty: formData.difficulty,
                language: formData.language, explanation: formData.explanation, bloomLevel: formData.bloomLevel,
                stimulus: formData.stimulus,
                academicClass: { id: formData.academicClassId }, classSubject: { id: formData.subjectId },
                chapter: { id: formData.chapterId }, topic: formData.topicId ? { id: formData.topicId } : null,
                sources: examSources.length > 0 ? examSources : []
            };
            const savedQuestion = await questionService.createShortQuestion(payload);
            setMessage({ type: 'success', text: 'সংক্ষিপ্ত প্রশ্ন সফলভাবে তৈরি হয়েছে!' });
            setExamSources([]);
        } catch (error) {
            console.error("Failed to create question", error);
            setMessage({ type: 'error', text: 'প্রশ্ন তৈরি করতে ব্যর্থ হয়েছে।' });
        } finally { setLoading(false); }
    };

    const currentBloom = BLOOM_LEVELS[formData.bloomLevel];

    return (
        <div className="w-full">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">সংক্ষিপ্ত প্রশ্ন তৈরি</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Short Question — {currentBloom.bn} • {formData.marks} নম্বর</p>
                </div>
                <Link to="/questions/import/excel?type=SHORT" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all">
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

                {/* ═══ TOOLBAR STRIP — Bloom Level + Difficulty + Marks ═══ */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-4">
                    <div className="flex flex-wrap items-start gap-4">

                        {/* Bloom Level */}
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">চিন্তন দক্ষতা (Bloom)</label>
                            <div className="flex gap-1">
                                {Object.entries(BLOOM_LEVELS).map(([key, level]) => (
                                    <button key={key} type="button" onClick={() => setFormData({ ...formData, bloomLevel: key })}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${formData.bloomLevel === key
                                            ? level.activeColor + ' shadow-sm'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}>
                                        {level.bn}
                                    </button>
                                ))}
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

                        {/* Marks */}
                        <div className="shrink-0">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">নম্বর</label>
                            <div className="flex items-center gap-1.5">
                                {[1, 2, 3, 4, 5].map(m => (
                                    <button key={m} type="button" onClick={() => setFormData({ ...formData, marks: m })}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${formData.marks == m
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                        {m}
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

                        {/* Question Text */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <FileText size={15} className="text-purple-500" /> প্রশ্ন *
                                </h2>
                            </div>
                            <div className="p-5">
                                <RichTextEditor value={formData.questionText}
                                    onChange={(val) => setFormData({ ...formData, questionText: val })}
                                    height="h-36"
                                    placeholder="প্রশ্নটি এখানে লিখুন..." />
                            </div>
                        </div>

                        {/* Stimulus (Optional) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Book size={15} className="text-emerald-500" /> উদ্দীপক <span className="text-[10px] text-slate-400 font-normal">(ঐচ্ছিক)</span>
                                </h2>
                            </div>
                            <div className="p-5">
                                <RichTextEditor value={formData.stimulus}
                                    onChange={(val) => setFormData({ ...formData, stimulus: val })}
                                    height="h-20"
                                    placeholder="উদ্দীপক থাকলে লিখুন..." />
                            </div>
                        </div>

                        {/* Sample Answer */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Check size={15} className="text-emerald-500" /> নমুনা উত্তর <span className="text-[10px] text-slate-400 font-normal">(ঐচ্ছিক)</span>
                                </h2>
                            </div>
                            <div className="p-5">
                                <RichTextEditor value={formData.explanation}
                                    onChange={(val) => setFormData({ ...formData, explanation: val })}
                                    height="h-28"
                                    placeholder="উত্তরের মূল পয়েন্ট বা নমুনা উত্তর..." />
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
                        <div className="space-y-2">
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
        </div>
    );
};

export default ShortQuestionCreate;
