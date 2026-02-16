import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter } from 'lucide-react';
import academicService from '../../../services/academicService';

const TopicList = () => {
    const [topics, setTopics] = useState([]);

    // Dropdown Data
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);

    // Filter/Selection State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedChapter, setSelectedChapter] = useState('');

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({ name: '', academicClassId: '', subjectId: '', chapterId: '' });

    useEffect(() => {
        fetchClasses();
        fetchTopics();
    }, []);

    // Filter Logic
    useEffect(() => {
        if (selectedClass) {
            fetchSubjects(selectedClass);
        } else {
            setSubjects([]);
            setSelectedSubject('');
            setChapters([]);
            setSelectedChapter('');
        }
    }, [selectedClass]);

    useEffect(() => {
        if (selectedSubject) {
            fetchChaptersBySubject(selectedSubject);
        } else {
            setChapters([]);
            setSelectedChapter('');
        }
    }, [selectedSubject]);

    useEffect(() => {
        if (selectedChapter) {
            fetchTopicsByChapter(selectedChapter);
        } else {
            if (!selectedChapter) fetchTopics();
        }
    }, [selectedChapter]);

    // Modal Logic (Cascading)
    useEffect(() => {
        if (formData.academicClassId) {
            fetchSubjects(formData.academicClassId);
        }
    }, [formData.academicClassId]);

    useEffect(() => {
        if (formData.subjectId) {
            fetchChaptersBySubject(formData.subjectId);
        }
    }, [formData.subjectId]);


    const fetchClasses = async () => {
        try {
            const data = await academicService.getAllClasses();
            setClasses(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const fetchSubjects = async (classId) => {
        try {
            const data = await academicService.getSubjectsByClass(classId);
            setSubjects(data);
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        }
    };

    const fetchChaptersBySubject = async (subjectId) => {
        try {
            const data = await academicService.getChaptersBySubject(subjectId);
            setChapters(data);
        } catch (error) {
            console.error("Failed to fetch chapters", error);
        }
    };

    const fetchTopics = async () => {
        setLoading(true);
        try {
            const data = await academicService.getAllTopics();
            setTopics(data);
        } catch (error) {
            console.error("Failed to fetch topics", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTopicsByChapter = async (chapterId) => {
        setLoading(true);
        try {
            const data = await academicService.getTopicsByChapter(chapterId);
            setTopics(data);
        } catch (error) {
            console.error("Failed to fetch topics by chapter", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await academicService.createTopic(formData.chapterId, {
                name: formData.name
            });

            setShowModal(false);
            setFormData({ name: '', academicClassId: '', subjectId: '', chapterId: '' });

            // Refresh list
            if (selectedChapter === formData.chapterId || !selectedChapter) {
                if (selectedChapter) fetchTopicsByChapter(selectedChapter);
                else fetchTopics();
            }
        } catch (error) {
            console.error("Failed to save topic", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this topic?")) return;
        try {
            await academicService.deleteTopic(id);
            if (selectedChapter) fetchTopicsByChapter(selectedChapter);
            else fetchTopics();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Topics</h1>
                    <p className="text-slate-500">Manage topics within chapters.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={18} /> Add Topic
                </button>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Filter:</span>
                </div>
                <select
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                    value={selectedClass}
                    onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(''); setSelectedChapter(''); }}
                >
                    <option value="">All Classes</option>
                    {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                </select>

                <select
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none min-w-[150px]"
                    value={selectedSubject}
                    onChange={(e) => { setSelectedSubject(e.target.value); setSelectedChapter(''); }}
                    disabled={!selectedClass}
                >
                    <option value="">All Subjects</option>
                    {subjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                </select>

                <select
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none min-w-[150px]"
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    disabled={!selectedSubject}
                >
                    <option value="">All Chapters</option>
                    {chapters.map(chap => (
                        <option key={chap.id} value={chap.id}>{chap.name}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600">Topic Name</th>
                            <th className="px-6 py-4 text-right font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="2" className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : topics.length === 0 ? (
                            <tr><td colSpan="2" className="p-8 text-center text-slate-500">No topics found.</td></tr>
                        ) : (
                            topics.map(topic => (
                                <tr key={topic.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-800">{topic.name}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => handleDelete(topic.id)}
                                            className="text-slate-400 hover:text-rose-600"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Topic</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.academicClassId}
                                    onChange={e => setFormData({ ...formData, academicClassId: e.target.value, subjectId: '', chapterId: '' })}
                                >
                                    <option value="">-- Select Class --</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Subject</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.subjectId}
                                    onChange={e => setFormData({ ...formData, subjectId: e.target.value, chapterId: '' })}
                                    disabled={!formData.academicClassId}
                                >
                                    <option value="">-- Select Subject --</option>
                                    {subjects.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Chapter</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.chapterId}
                                    onChange={e => setFormData({ ...formData, chapterId: e.target.value })}
                                    disabled={!formData.subjectId}
                                >
                                    <option value="">-- Select Chapter --</option>
                                    {chapters.map(chap => (
                                        <option key={chap.id} value={chap.id}>{chap.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Topic Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Velocity Formula"
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Topic
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicList;
