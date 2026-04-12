import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Save, BookOpen, Layers, Search, Plus, Trash2, CheckCircle2, Loader2, Target, Check, LayoutGrid, ChevronRight, Calculator } from 'lucide-react';
import academicService from '../../../services/academicService';
import examService from '../../../services/examService';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';

const ManualExamBuilder = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [examId, setExamId] = useState(null);

    const {
        levels, streams, classes, subjects, chapters: subjectChapters,
        levelId, streamId, classId, subjectId,
        setLevelId, setStreamId, setClassId, setSubjectId,
    } = useAcademicHierarchy();

    const [examInfo, setExamInfo] = useState({
        title: '',
        durationMinutes: 120,
        totalMarks: 100,
        totalQuestions: 50,
        language: 'Bangla',
        examType: 'MODEL_TEST'
    });

    // Builder States
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);
    const [filters, setFilters] = useState({
        chapterId: '',
        topicId: '',
        type: '',
        difficulty: '',
        keyword: ''
    });

    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [addLoading, setAddLoading] = useState(null); // questionId

    const [cart, setCart] = useState([]); // Array of questions in exam
    const currentMarks = cart.reduce((sum, q) => sum + (q.marks || 0), 0);

    // Default marks for quick add
    const defaultMarksMap = {
        'MCQ': 1,
        'CQ': 10,
        'SHORT': 2
    };

    // When entering step 2, load chapters for the filter panel from the subject
    useEffect(() => {
        if (subjectId && step === 2) {
            setChapters(subjectChapters);
        }
    }, [subjectId, step, subjectChapters]);

    // Chapter → Topics for filter panel
    useEffect(() => {
        if (filters.chapterId) {
            academicService.getTopicsByChapter(filters.chapterId).then(setTopics).catch(console.error);
        } else {
            setTopics([]);
        }
    }, [filters.chapterId]);

    // Step 1 → Step 2
    const handleCreateDraft = async () => {
        if (!examInfo.title || !subjectId || !examInfo.totalMarks || !examInfo.totalQuestions) {
            return alert("Please fill all required fields correctly.");
        }

        setLoading(true);
        try {
            const res = await examService.createManualExam({
                title: examInfo.title,
                examType: examInfo.examType,
                classSubjectId: subjectId,
                totalMarks: parseFloat(examInfo.totalMarks),
                totalQuestions: parseInt(examInfo.totalQuestions),
                durationMinutes: parseInt(examInfo.durationMinutes),
                language: examInfo.language,
                instructions: "",
                instituteName: "",
                headerText: "",
                shuffleQuestions: false,
                shuffleOptions: false,
                sections: []
            });
            if (res.success) {
                setExamId(res.data.id);
                setCart(res.data.questions || []);
                setStep(2);
                searchQuestions(); // Initial search
            }
        } catch (e) {
            console.error(e);
            alert("Error creating exam draft");
        } finally {
            setLoading(false);
        }
    };

    // Search Questions
    const searchQuestions = async (e) => {
        if (e) e.preventDefault();
        setSearching(true);
        try {
            const params = {
                classSubjectId: subjectId,
                ...filters,
                size: 50
            };
            const res = await examService.searchQuestionsForManualExam(params);
            if (res.success) {
                setSearchResults(res.data.content);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    // Add Question
    const handleAddQuestion = async (q, marks) => {
        if (cart.length >= examInfo.totalQuestions) {
            return alert("Maximum question limit reached for this exam!");
        }
        setAddLoading(q.id);
        try {
            const payload = {
                questionId: q.id,
                marks: marks || defaultMarksMap[q.type] || 1,
                sectionId: null
            };
            const res = await examService.addQuestionToManualExam(examId, payload);
            if (res.success) {
                setCart(res.data.questions);
            }
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.message || "Error adding question");
        } finally {
            setAddLoading(null);
        }
    };

    // Remove Question
    const handleRemoveQuestion = async (questionId) => {
        try {
            const res = await examService.removeQuestionFromManualExam(examId, questionId);
            if (res.success) {
                setCart(res.data.questions);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Publish
    const handlePublish = async () => {
        if (cart.length === 0) return alert("Select at least one question to publish.");
        try {
            setLoading(true);
            const res = await examService.publishManualExam(examId);
            if (res.success) {
                navigate(`/exams/generate/editor/${examId}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to publish exam.");
        } finally {
            setLoading(false);
        }
    };

    const isInCart = (id) => cart.some(eq => eq.originalQuestionId === id);

    const selectCls = "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed";

    // --- RENDERS ---

    if (step === 1) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-outfit text-slate-800 pb-20">
                <div className="max-w-2xl mx-auto mt-10">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                        <div className="mb-8 border-b border-slate-100 pb-6 text-center">
                            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <LayoutGrid size={28} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                                Manual Exam Builder
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">Create a custom paper by picking exactly which questions you want.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            {/* Exam Title */}
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Exam Title (পরীক্ষার নাম)</label>
                                <input
                                    type="text"
                                    value={examInfo.title}
                                    onChange={(e) => setExamInfo({ ...examInfo, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="e.g. Weekly Test - Physics"
                                />
                            </div>

                            {/* Level */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">স্তর (Level)</label>
                                <select value={levelId} onChange={e => setLevelId(e.target.value)} className={selectCls}>
                                    <option value="">স্তর বাছুন</option>
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>

                            {/* Stream */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">বিভাগ/ধারা (Stream)</label>
                                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className={selectCls}>
                                    <option value="">বিভাগ বাছুন</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            {/* Class */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">শ্রেণি (Class)</label>
                                <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className={selectCls}>
                                    <option value="">শ্রেণি বাছুন</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">বিষয় (Subject)</label>
                                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className={selectCls}>
                                    <option value="">বিষয় বাছুন</option>
                                    {subjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                </select>
                            </div>

                            {/* Total Marks */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Total Marks</label>
                                <input
                                    type="number"
                                    value={examInfo.totalMarks}
                                    onChange={(e) => setExamInfo({ ...examInfo, totalMarks: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                            </div>

                            {/* Total Questions */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target No. of Questions</label>
                                <input
                                    type="number"
                                    value={examInfo.totalQuestions}
                                    onChange={(e) => setExamInfo({ ...examInfo, totalQuestions: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                            </div>

                            {/* Language */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Language</label>
                                <select value={examInfo.language} onChange={(e) => setExamInfo({ ...examInfo, language: e.target.value })} className={selectCls}>
                                    <option value="Bangla">Bangla</option>
                                    <option value="English">English</option>
                                </select>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Duration (Min)</label>
                                <input
                                    type="number"
                                    value={examInfo.durationMinutes}
                                    onChange={(e) => setExamInfo({ ...examInfo, durationMinutes: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleCreateDraft}
                            disabled={loading || !subjectId || !examInfo.title}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:shadow-none"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <span>Start Selecting Questions</span>}
                            {!loading && <ChevronRight size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-2 md:p-6 font-outfit text-slate-800 flex flex-col h-screen overflow-hidden">
            {/* Top Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <LayoutGrid className="text-indigo-600" size={24} /> {examInfo.title}
                    </h1>
                    <span className="text-sm font-medium text-slate-500 pl-8">Drafting Mode • Pick your questions</span>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1">
                    <div className="px-4 py-1.5 rounded-md bg-white shadow-sm font-bold text-sm text-slate-700">Target: {examInfo.totalQuestions} Q</div>
                    <div className="px-4 py-1.5 font-bold text-sm text-slate-500">{examInfo.totalMarks} Marks</div>
                </div>
            </div>

            {/* Builder Container */}
            <div className="flex-1 flex gap-4 overflow-hidden relative">

                {/* LEFT: Search Panel */}
                <div className="w-80 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h2 className="font-bold flex items-center gap-2"><Search size={18} /> Question Bank</h2>
                    </div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                        <form onSubmit={searchQuestions} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Chapter</label>
                                <select value={filters.chapterId} onChange={(e) => setFilters({ ...filters, chapterId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-indigo-500 outline-none">
                                    <option value="">All Chapters</option>
                                    {chapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Topic</label>
                                <select value={filters.topicId} onChange={(e) => setFilters({ ...filters, topicId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-medium focus:border-indigo-500 outline-none">
                                    <option value="">All Topics</option>
                                    {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Type</label>
                                    <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none shrink-0">
                                        <option value="">All Types</option>
                                        <option value="MCQ">MCQ</option>
                                        <option value="CQ">CQ</option>
                                        <option value="SHORT">Short</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Difficulty</label>
                                    <select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none">
                                        <option value="">Any</option>
                                        <option value="EASY">Easy</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HARD">Hard</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Keyword</label>
                                <input type="text" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm font-medium outline-none" placeholder="Search..." />
                            </div>

                            <button type="submit" disabled={searching} className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50">
                                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
                            </button>
                        </form>
                    </div>
                </div>

                {/* MIDDLE: Search Results */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-w-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                        <h2 className="font-bold flex items-center gap-2"><Target size={18} className="text-indigo-500" /> Results</h2>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{searchResults.length} found</span>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/30">
                        {searching ? (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <Loader2 size={32} className="animate-spin" />
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Search size={48} className="text-slate-200 mb-4" />
                                <p>No questions found. Try removing filters.</p>
                            </div>
                        ) : (
                            searchResults.map(q => {
                                const inCart = isInCart(q.id);
                                return (
                                    <div key={q.id} className={`p-4 rounded-xl border transition-all flex gap-4 ${inCart ? 'border-indigo-300 bg-indigo-50/30 opacity-70' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex gap-2 mb-2">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-600">{q.type}</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-100 text-slate-600">{q.difficulty}</span>
                                                {q.bloomLevel && <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200 text-slate-400">{q.bloomLevel}</span>}
                                            </div>
                                            <div
                                                className="text-sm font-medium text-slate-800 line-clamp-3 leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: q.questionText }}
                                            />
                                        </div>
                                        <div className="w-24 shrink-0 flex flex-col items-end justify-between">
                                            <div className="text-xs font-bold text-slate-400 text-right">{defaultMarksMap[q.type]} Marks</div>
                                            <button
                                                onClick={() => handleAddQuestion(q)}
                                                disabled={inCart || addLoading === q.id || cart.length >= examInfo.totalQuestions}
                                                className={`w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                                    inCart ? 'bg-indigo-100 text-indigo-600 cursor-not-allowed' :
                                                    'bg-white border text-slate-700 hover:bg-slate-50 border-slate-200 active:scale-95'
                                                }`}
                                            >
                                                {addLoading === q.id ? <Loader2 size={14} className="animate-spin" /> :
                                                 inCart ? <><Check size={14} /> Added</> : <><Plus size={14} /> Add</>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT: Blueprint Cart */}
                <div className="w-80 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col shrink-0 overflow-hidden relative">
                    <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                    <div className="p-4 border-b border-slate-100 bg-emerald-50/30">
                        <h2 className="font-bold flex items-center justify-between text-slate-800">
                            <span className="flex items-center gap-2"><BookOpen size={18} className="text-emerald-600" /> Assessment Cart</span>
                        </h2>

                        {/* Progress Bar */}
                        <div className="mt-4">
                            <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                                <span className={currentMarks > examInfo.totalMarks ? 'text-rose-500' : 'text-slate-500'}>Score: {currentMarks}</span>
                                <span className="text-emerald-600">Max: {examInfo.totalMarks}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${currentMarks > examInfo.totalMarks ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min((currentMarks / examInfo.totalMarks) * 100, 100)}%` }}
                                ></div>
                            </div>
                            <div className="text-[10px] font-black uppercase mt-1 text-slate-400 text-right space-x-2">
                                <span>{cart.length} / {examInfo.totalQuestions}</span>
                                <span>Questions Items</span>
                            </div>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/50">
                        {cart.length === 0 ? (
                            <div className="text-center p-6 text-slate-400 text-xs font-bold uppercase tracking-wider pt-20 flex flex-col items-center">
                                <BookOpen size={32} className="mb-2 text-slate-300" />
                                Cart is empty
                            </div>
                        ) : (
                            cart.map((q, idx) => (
                                <div key={q.id} className="p-3 bg-white border border-slate-200 hover:border-emerald-200 rounded-xl flex items-center justify-between group">
                                    <div className="w-6 h-6 rounded bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0 px-3">
                                        <div className="text-xs font-bold text-slate-700 truncate" dangerouslySetInnerHTML={{ __html: q.questionText?.substring(0, 40) + '...' }} />
                                        <div className="text-[10px] font-medium text-slate-400">{q.type} • {q.marks} Marks</div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveQuestion(q.originalQuestionId)}
                                        className="w-7 h-7 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                        <button
                            onClick={handlePublish}
                            disabled={loading || cart.length === 0}
                            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                                cart.length > 0 && !loading
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {loading ? 'Publishing...' : 'Publish & Edit Paper'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ManualExamBuilder;
