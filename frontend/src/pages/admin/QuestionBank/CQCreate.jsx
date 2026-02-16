import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Check, AlertTriangle, Image as ImageIcon, Book, FileText } from 'lucide-react';
import academicService from '../../../services/academicService';
import questionService from '../../../services/questionService';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CQCreate = () => {
    // Academic Data
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        academicClassId: '',
        subjectId: '',
        chapterId: '',
        topicId: '',
        stem: '', // The common scenario
        subQuestions: [
            { label: 'a', text: '', marks: 1 },
            { label: 'b', text: '', marks: 2 },
            { label: 'c', text: '', marks: 3 },
            { label: 'd', text: '', marks: 4 }
        ],
        difficulty: 'MEDIUM',
        language: 'Bangla',
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        const data = await academicService.getAllClasses();
        setClasses(data);
    };

    const handleClassChange = async (e) => {
        const classId = e.target.value;
        setFormData({ ...formData, academicClassId: classId, subjectId: '', chapterId: '', topicId: '' });
        setSubjects([]); setChapters([]); setTopics([]);
        if (classId) {
            const data = await academicService.getSubjectsByClass(classId);
            setSubjects(data);
        }
    };

    const handleSubjectChange = async (e) => {
        const subjectId = e.target.value;
        setFormData({ ...formData, subjectId, chapterId: '', topicId: '' });
        setChapters([]); setTopics([]);
        if (subjectId) {
            const data = await academicService.getChaptersBySubject(subjectId);
            setChapters(data);
        }
    };

    const handleChapterChange = async (e) => {
        const chapterId = e.target.value;
        setFormData({ ...formData, chapterId, topicId: '' });
        setTopics([]);
        if (chapterId) {
            const data = await academicService.getTopicsByChapter(chapterId);
            setTopics(data);
        }
    };

    const handleSubQuestionChange = (index, value) => {
        const newSubs = [...formData.subQuestions];
        newSubs[index].text = value;
        setFormData({ ...formData, subQuestions: newSubs });
    };

    const handleSubQuestionMarksChange = (index, value) => {
        const newSubs = [...formData.subQuestions];
        newSubs[index].marks = parseFloat(value);
        setFormData({ ...formData, subQuestions: newSubs });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (!formData.stem || !formData.academicClassId || !formData.subjectId || !formData.chapterId) {
            setMessage({ type: 'error', text: 'Please fill all required fields (Class, Subject, Chapter, Stem).' });
            return;
        }

        if (formData.subQuestions.some(sq => !sq.text.trim())) {
            setMessage({ type: 'error', text: 'Please fill all 4 sub-questions.' });
            return;
        }

        setLoading(true);
        try {
            // Combine Stem and Sub-questions into one HTML blob for storage
            // This is a pragmatic approach since we don't have hierarchical entities yet.
            let combinedHtml = `<div class="cq-stem">${formData.stem}</div>`;
            combinedHtml += `<div class="cq-questions"><ol type="a">`;
            formData.subQuestions.forEach(sq => {
                combinedHtml += `<li data-marks="${sq.marks}"><span class="cq-text">${sq.text}</span> <span class="cq-marks">(${sq.marks})</span></li>`;
            });
            combinedHtml += `</ol></div>`;

            const totalMarks = formData.subQuestions.reduce((sum, sq) => sum + sq.marks, 0);

            const payload = {
                questionText: combinedHtml,
                marks: totalMarks,
                difficulty: formData.difficulty,
                language: formData.language,
                academicClass: { id: formData.academicClassId },
                subject: { id: formData.subjectId },
                chapter: { id: formData.chapterId },
                topic: formData.topicId ? { id: formData.topicId } : null
            };

            await questionService.createCQ(payload);
            setMessage({ type: 'success', text: 'Creative Question created successfully!' });
            // Optionally reset form
        } catch (error) {
            console.error("Failed to create question", error);
            setMessage({ type: 'error', text: 'Failed to create question.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Create Creative Question (CQ)</h1>

            {message && (
                <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Academic Mapping */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Book size={18} className="text-blue-500" /> Academic Mapping</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Class *</label>
                            <select value={formData.academicClassId} onChange={handleClassChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Select Class</option>
                                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                            <select value={formData.subjectId} onChange={handleSubjectChange} disabled={!formData.academicClassId} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
                                <option value="">Select Subject</option>
                                {subjects.map(subj => <option key={subj.id} value={subj.id}>{subj.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Chapter *</label>
                            <select value={formData.chapterId} onChange={handleChapterChange} disabled={!formData.subjectId} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
                                <option value="">Select Chapter</option>
                                {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                            <select value={formData.topicId} onChange={(e) => setFormData({ ...formData, topicId: e.target.value })} disabled={!formData.chapterId} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
                                <option value="">Select Topic</option>
                                {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Question Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><FileText size={18} className="text-purple-500" /> Stimulus & Questions</h2>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Stimulus (Stem) *</label>
                        <ReactQuill theme="snow" value={formData.stem} onChange={(val) => setFormData({ ...formData, stem: val })} className="h-24 mb-12" placeholder="Enter the scenario or passage..." />
                    </div>

                    <div className="space-y-6 mt-12">
                        {formData.subQuestions.map((sq, index) => (
                            <div key={index} className="flex gap-4 items-start">
                                <div className="w-8 pt-3 text-center font-bold text-slate-500 uppercase">{sq.label})</div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                                        Question ({sq.label === 'a' ? 'Knowledge' : sq.label === 'b' ? 'Comprehension' : sq.label === 'c' ? 'Application' : 'Higher Order'})
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={sq.text}
                                        onChange={(e) => handleSubQuestionChange(index, e.target.value)}
                                        placeholder={`Enter question ${sq.label}...`}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Marks</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border border-slate-300 rounded-lg text-center"
                                        value={sq.marks}
                                        onChange={(e) => handleSubQuestionMarksChange(index, e.target.value)}
                                        min="1"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                            <select value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg">
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                            <select value={formData.language} onChange={(e) => setFormData({ ...formData, language: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg">
                                <option value="Bangla">Bangla</option>
                                <option value="English">English</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <button type="button" className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Save as Draft</button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70"
                    >
                        {loading ? 'Saving...' : <><Save size={18} /> Create CQ</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CQCreate;
