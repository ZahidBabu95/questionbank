import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter } from 'lucide-react';
import academicService from '../../../services/academicService';

const ChapterList = () => {
    const [chapters, setChapters] = useState([]);

    // Dropdown Data
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);

    // Filter/Selection State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({ name: '', chapterNumber: '', academicClassId: '', subjectId: '' });

    useEffect(() => {
        fetchClasses();
        fetchChapters();
    }, []);

    // Filter Logic
    useEffect(() => {
        if (selectedClass) {
            fetchSubjects(selectedClass);
        } else {
            setSubjects([]);
            setSelectedSubject('');
        }
    }, [selectedClass]);

    useEffect(() => {
        if (selectedSubject) {
            fetchChaptersBySubject(selectedSubject);
        } else {
            // If checking all, maybe fetch all.
            if (!selectedSubject) fetchChapters();
        }
    }, [selectedSubject]);

    // Modal Logic (Cascading)
    useEffect(() => {
        if (formData.academicClassId) {
            fetchSubjects(formData.academicClassId);
        }
    }, [formData.academicClassId]);


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

    const fetchChapters = async () => {
        setLoading(true);
        try {
            const data = await academicService.getAllChapters();
            const sorted = data.sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
            setChapters(sorted);
        } catch (error) {
            console.error("Failed to fetch chapters", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChaptersBySubject = async (subjectId) => {
        setLoading(true);
        try {
            const data = await academicService.getChaptersBySubject(subjectId);
            const sorted = data.sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
            setChapters(sorted);
        } catch (error) {
            console.error("Failed to fetch chapters by subject", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await academicService.createChapter(formData.subjectId, {
                name: formData.name,
                chapterNumber: formData.chapterNumber
            });

            setShowModal(false);
            setFormData({ name: '', chapterNumber: '', academicClassId: '', subjectId: '' });

            // Refresh list
            if (selectedSubject === formData.subjectId || !selectedSubject) {
                if (selectedSubject) fetchChaptersBySubject(selectedSubject);
                else fetchChapters();
            }
        } catch (error) {
            console.error("Failed to save chapter", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this chapter?")) return;
        try {
            await academicService.deleteChapter(id);
            if (selectedSubject) fetchChaptersBySubject(selectedSubject);
            else fetchChapters();
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Chapters</h1>
                    <p className="text-slate-500">Manage chapters within subjects.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={18} /> Add Chapter
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
                    onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(''); }}
                >
                    <option value="">All Classes</option>
                    {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                </select>

                <select
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none min-w-[150px]"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={!selectedClass}
                >
                    <option value="">All Subjects</option>
                    {subjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600">#</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Chapter Name</th>
                            <th className="px-6 py-4 text-right font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="3" className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : chapters.length === 0 ? (
                            <tr><td colSpan="3" className="p-8 text-center text-slate-500">No chapters found.</td></tr>
                        ) : (
                            chapters.map(chap => (
                                <tr key={chap.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{chap.chapterNumber}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{chap.name}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => handleDelete(chap.id)}
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
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Chapter</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.academicClassId}
                                    onChange={e => setFormData({ ...formData, academicClassId: e.target.value, subjectId: '' })}
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
                                    onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                                    disabled={!formData.academicClassId}
                                >
                                    <option value="">-- Select Subject --</option>
                                    {subjects.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Chapter Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Motion"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Chapter Number</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.chapterNumber}
                                    onChange={e => setFormData({ ...formData, chapterNumber: e.target.value })}
                                    placeholder="e.g. 1"
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
                                    Save Chapter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChapterList;
