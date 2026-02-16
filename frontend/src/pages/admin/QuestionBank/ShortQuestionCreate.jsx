import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Check, AlertTriangle, Image as ImageIcon, Book, FileText } from 'lucide-react';
import academicService from '../../../services/academicService';
import questionService from '../../../services/questionService';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const ShortQuestionCreate = () => {
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
        questionText: '',
        marks: 2,
        difficulty: 'MEDIUM',
        language: 'Bangla',
        explanation: '' // Used for Sample Answer
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        // Validation
        if (!formData.questionText || !formData.academicClassId || !formData.subjectId || !formData.chapterId) {
            setMessage({ type: 'error', text: 'Please fill all required fields.' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                questionText: formData.questionText,
                marks: formData.marks,
                difficulty: formData.difficulty,
                language: formData.language,
                explanation: formData.explanation,
                academicClass: { id: formData.academicClassId },
                subject: { id: formData.subjectId },
                chapter: { id: formData.chapterId },
                topic: formData.topicId ? { id: formData.topicId } : null
            };

            await questionService.createShortQuestion(payload);
            setMessage({ type: 'success', text: 'Short Question created successfully!' });
        } catch (error) {
            console.error("Failed to create question", error);
            setMessage({ type: 'error', text: 'Failed to create question.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Create Short Question</h1>

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
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><FileText size={18} className="text-purple-500" /> Question Details</h2>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Question Text (Rich Text) *</label>
                        <ReactQuill theme="snow" value={formData.questionText} onChange={(val) => setFormData({ ...formData, questionText: val })} className="h-32 mb-12" />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Sample Answer / Key Points</label>
                        <ReactQuill theme="snow" value={formData.explanation} onChange={(val) => setFormData({ ...formData, explanation: val })} className="h-24 mb-12" placeholder="Enter key points or sample answer..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Marks</label>
                            <input type="number" value={formData.marks} onChange={(e) => setFormData({ ...formData, marks: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" min="1" step="0.5" />
                        </div>
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
                        {loading ? 'Saving...' : <><Save size={18} /> Create Short Question</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ShortQuestionCreate;
