import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter, Settings, X, Calendar, Edit2, Check } from 'lucide-react';
import academicService from '../../../services/academicService';
import settingsService from '../../../services/settingsService';
import axios from '../../../utils/axios';

const ChapterList = () => {
    const [chapters, setChapters] = useState([]);

    // Dropdown Data
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [categories, setCategories] = useState(['গদ্য', 'পদ্য', 'উপন্যাস', 'নাটক', 'আনন্দপাঠ']); // default list

    // Filter/Selection State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedSession, setSelectedSession] = useState('');

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null); // { oldName: '...', newName: '...' }
    const [changedCategories, setChangedCategories] = useState({}); // { chId: categoryName }

    // Form Data
    const [formData, setFormData] = useState({ name: '', chapterNumber: '', academicClassId: '', subjectId: '', categoryName: '' });

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchClasses(),
                    fetchSessions(),
                    fetchCategories()
                ]);
                await fetchChapters();
            } catch (err) {
                console.error("Initialization failed", err);
                setLoading(false);
            }
        };
        init();
    }, []);

    // Filter Logic
    useEffect(() => {
        if (selectedClass) {
            fetchSubjects(selectedClass, selectedSession);
        } else {
            setSubjects([]);
            setSelectedSubject('');
        }
    }, [selectedClass, selectedSession]);

    useEffect(() => {
        if (selectedSubject) {
            fetchChaptersBySubject(selectedSubject);
        } else {
            setChapters([]);
        }
    }, [selectedSubject]);

    // Modal Logic (Cascading)
    useEffect(() => {
        if (formData.academicClassId) {
            fetchSubjects(formData.academicClassId, selectedSession);
        }
    }, [formData.academicClassId, selectedSession]);


    const fetchClasses = async () => {
        try {
            const data = await academicService.getAllClasses();
            setClasses(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const fetchSubjects = async (classId, sessionId = null) => {
        try {
            const data = await academicService.getSubjectsByClass(classId, null, sessionId);
            setSubjects(data);
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await axios.get('/v1/academic/sessions');
            setSessions(res.data);
            
            // Get active session
            const activeRes = await axios.get('/v1/academic/sessions/active');
            if (activeRes.data) {
                setSelectedSession(activeRes.data.id);
            } else if (res.data.length > 0) {
                setSelectedSession(res.data[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch academic sessions", error);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await settingsService.getInstituteSettings('GENERAL');
            if (data && data.chapter_categories) {
                const cats = data.chapter_categories.split(',').map(c => c.trim()).filter(Boolean);
                if (cats.length > 0) {
                    setCategories(cats);
                }
            }
        } catch (error) {
            console.error("Failed to fetch chapter categories", error);
        }
    };

    const handleSaveCategories = async (updatedCats) => {
        try {
            const catString = updatedCats.join(',');
            await settingsService.updateInstituteSettings('GENERAL', { chapter_categories: catString });
            setCategories(updatedCats);
        } catch (error) {
            console.error("Failed to save categories", error);
            alert("ক্যাটাগরি সংরক্ষণ করতে ব্যর্থ হয়েছে।");
        }
    };

    const handleAddCategory = async () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;
        if (categories.includes(trimmed)) {
            alert("এই ক্যাটাগরি ইতিমধ্যে রয়েছে।");
            return;
        }
        const updated = [...categories, trimmed];
        await handleSaveCategories(updated);
        setNewCategoryName('');
    };

    const handleDeleteCategory = async (catToDelete) => {
        if (!window.confirm(`আপনি কি "${catToDelete}" ক্যাটাগরিটি ডিলিট করতে চান?`)) return;
        const updated = categories.filter(c => c !== catToDelete);
        await handleSaveCategories(updated);
    };

    const handleStartEditCategory = (cat) => {
        setEditingCategory({ oldName: cat, newName: cat });
    };

    const handleSaveEditCategory = async () => {
        if (!editingCategory) return;
        const oldName = editingCategory.oldName;
        const newName = editingCategory.newName.trim();
        if (!newName) return;
        if (oldName === newName) {
            setEditingCategory(null);
            return;
        }
        if (categories.includes(newName)) {
            alert("এই ক্যাটাগরি ইতিমধ্যে রয়েছে।");
            return;
        }

        const updated = categories.map(c => c === oldName ? newName : c);
        await handleSaveCategories(updated);

        // Update chapters using the old name
        const chaptersToUpdate = chapters.filter(ch => ch.categoryName === oldName);
        if (chaptersToUpdate.length > 0) {
            try {
                await Promise.all(chaptersToUpdate.map(ch => 
                    academicService.updateChapter(ch.id, { categoryName: newName })
                ));
                setChapters(prev => prev.map(ch => ch.categoryName === oldName ? { ...ch, categoryName: newName } : ch));
            } catch (err) {
                console.error("Failed to update renamed category for chapters", err);
            }
        }

        setEditingCategory(null);
    };

    const fetchChapters = async () => {
        setChapters([]);
        setLoading(false);
    };

    const fetchChaptersBySubject = async (classSubjectId) => {
        setLoading(true);
        try {
            const data = await academicService.getChaptersByClassSubject(classSubjectId, false);
            const sorted = data.sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));
            setChapters(sorted);
        } catch (error) {
            console.error("Failed to fetch chapters by subject", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryChange = async (id, categoryName) => {
        try {
            await academicService.updateChapter(id, { categoryName: categoryName || '' });
            setChapters(prev => prev.map(c => c.id === id ? { ...c, categoryName } : c));
        } catch (error) {
            console.error("Failed to update category", error);
            alert("ক্যাটাগরি আপডেট করতে ব্যর্থ হয়েছে।");
        }
    };

    const handleStatusToggle = async (id, isActive) => {
        try {
            await academicService.updateChapter(id, { isActive });
            setChapters(prev => prev.map(c => c.id === id ? { ...c, isActive } : c));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("অবস্থা আপডেট করতে ব্যর্থ হয়েছে।");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const targetSubjectId = formData.subjectId; // Store before clearing
            await academicService.createChapter(targetSubjectId, {
                name: formData.name,
                chapterNumber: formData.chapterNumber,
                categoryName: formData.categoryName || null,
                isActive: true
            });

            setShowModal(false);
            setFormData({ name: '', chapterNumber: '', academicClassId: '', subjectId: '', categoryName: '' });

            // Refresh list
            if (selectedSubject === targetSubjectId || !selectedSubject) {
                if (selectedSubject) fetchChaptersBySubject(selectedSubject);
                else fetchChapters();
            }
        } catch (error) {
            console.error("Failed to save chapter", error);
            alert("Failed to save chapter. Check if chapter number already exists for this subject.");
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
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCatModal(true)}
                        className="bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm font-medium"
                    >
                        <Settings size={18} className="text-slate-500" /> Manage Categories
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 flex items-center gap-2 transition-all active:scale-95 shadow-sm font-medium"
                    >
                        <Plus size={18} /> Add Chapter
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Filter:</span>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
                    <Calendar size={16} className="text-slate-500" />
                    <select
                        className="bg-transparent text-slate-900 text-sm outline-none cursor-pointer py-1"
                        value={selectedSession}
                        onChange={(e) => { setSelectedSession(e.target.value); setSelectedClass(''); setSelectedSubject(''); }}
                    >
                        <option value="">Select Session</option>
                        {sessions.map(sess => (
                            <option key={sess.id} value={sess.id}>{sess.name} {sess.isActive ? '(Active)' : ''}</option>
                        ))}
                    </select>
                </div>

                <select
                    className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                    value={selectedClass}
                    onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject(''); }}
                    disabled={!selectedSession}
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
                        <option key={sub.classSubjectId} value={sub.classSubjectId}>{sub.subjectName} ({sub.subjectCode})</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-600">#</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Chapter Name</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Category</th>
                            <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                            <th className="px-6 py-4 text-right font-semibold text-slate-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading...</td></tr>
                        ) : chapters.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-slate-500">No chapters found. Please select a class and subject above.</td></tr>
                        ) : (
                            chapters.map(chap => (
                                <tr key={chap.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-slate-500">{chap.chapterNumber}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{chap.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <select
                                                value={changedCategories[chap.id] !== undefined ? changedCategories[chap.id] : (chap.categoryName || '')}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setChangedCategories(prev => ({ ...prev, [chap.id]: val }));
                                                }}
                                                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg p-1.5 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            >
                                                <option value="">-- No Category --</option>
                                                {Array.from(new Set([...categories, changedCategories[chap.id] !== undefined ? changedCategories[chap.id] : chap.categoryName].filter(Boolean))).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            {changedCategories[chap.id] !== undefined && changedCategories[chap.id] !== (chap.categoryName || '') && (
                                                <button
                                                    onClick={async () => {
                                                        const newCat = changedCategories[chap.id];
                                                        await handleCategoryChange(chap.id, newCat);
                                                        setChangedCategories(prev => {
                                                            const updated = { ...prev };
                                                            delete updated[chap.id];
                                                            return updated;
                                                        });
                                                    }}
                                                    className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                                    title="Save Category"
                                                >
                                                    <Check size={12} /> Save
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={chap.isActive !== false}
                                                onChange={(e) => handleStatusToggle(chap.id, e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="relative w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            <span className="ml-2 text-xs font-medium text-slate-600">
                                                {chap.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </label>
                                    </td>
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
                                        <option key={sub.classSubjectId} value={sub.classSubjectId}>{sub.subjectName}</option>
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
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Category (Optional)</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.categoryName}
                                    onChange={e => setFormData({ ...formData, categoryName: e.target.value })}
                                >
                                    <option value="">-- No Category --</option>
                                    {Array.from(new Set([...categories, formData.categoryName].filter(Boolean))).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
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
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Chapter
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {showCatModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={20} className="text-indigo-600 animate-spin-slow" /> ক্যাটাগরি ম্যানেজ করুন
                            </h2>
                            <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="নতুন ক্যাটাগরির নাম লিখুন (যেমন: গদ্য)"
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
                                />
                                <button
                                    onClick={handleAddCategory}
                                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold transition-all active:scale-95"
                                >
                                    যোগ করুন
                                </button>
                            </div>
                            
                            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100 bg-slate-50">
                                {categories.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500 text-sm">কোনো ক্যাটাগরি নেই। একটি যোগ করুন।</div>
                                ) : (
                                    categories.map(cat => {
                                        const isEditing = editingCategory && editingCategory.oldName === cat;
                                        return (
                                            <div key={cat} className="flex justify-between items-center p-3 bg-white">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <input
                                                            type="text"
                                                            className="flex-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-100 outline-none text-sm"
                                                            value={editingCategory.newName}
                                                            onChange={e => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEditCategory(); }}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleSaveEditCategory}
                                                            className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition"
                                                            title="সংরক্ষণ করুন"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingCategory(null)}
                                                            className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition"
                                                            title="বাতিল করুন"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-slate-800 text-sm font-medium">{cat}</span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleStartEditCategory(cat)}
                                                                className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-slate-50 transition"
                                                                title="সম্পাদনা করুন"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(cat)}
                                                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                                                                title="ডিলিট করুন"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChapterList;
