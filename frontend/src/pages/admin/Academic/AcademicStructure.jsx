import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, Folder, FolderOpen, Book, Layers, FileText, Link as LinkIcon, AlertCircle } from 'lucide-react';
import academicService from '../../../services/academicService';

const AcademicStructure = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [topics, setTopics] = useState([]);

    const [loading, setLoading] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [showMapModal, setShowMapModal] = useState(false);
    const [globalSubjects, setGlobalSubjects] = useState([]);
    const [selectedGlobalSubjectId, setSelectedGlobalSubjectId] = useState('');
    const [activeSession, setActiveSession] = useState(null);

    useEffect(() => {
        fetchClasses();
        fetchActiveSession();
    }, []);

    const fetchActiveSession = async () => {
        try {
            const data = await academicService.getActiveSession();
            setActiveSession(data);
        } catch (error) {
            console.error("Failed to fetch active session", error);
        }
    };

    const fetchClasses = async () => {
        const data = await academicService.getAllClasses();
        setClasses(data);
    };

    const handleMapSelect = async () => {
        if (!selectedClass) return;
        try {
            const data = await academicService.getAllSubjects();
            setGlobalSubjects(data.sort((a, b) => a.name.localeCompare(b.name)));
            setShowMapModal(true);
        } catch (error) {
            console.error("Failed to fetch global subjects", error);
        }
    };

    const handleMapSubject = async (e) => {
        e.preventDefault();
        if (!selectedGlobalSubjectId || !activeSession || !selectedClass) return;

        try {
            await academicService.assignSubjectToClass(selectedClass.id, selectedGlobalSubjectId, activeSession.id);
            setShowMapModal(false);
            fetchSubjects(selectedClass.id);
        } catch (error) {
            console.error("Failed to map subject", error);
            alert("Failed to map subject. It might already be assigned.");
        }
    };

    const fetchSubjects = async (classId) => {
        setLoading(true);
        const data = await academicService.getSubjectsByClass(classId);
        setSubjects(data);
        setLoading(false);
    };

    const fetchChapters = async (classSubjectId) => {
        setLoading(true);
        const data = await academicService.getChaptersByClassSubject(classSubjectId);
        setChapters(data);
        setLoading(false);
    };

    const fetchTopics = async (chapterId) => {
        setLoading(true);
        const data = await academicService.getTopicsByChapter(chapterId);
        setTopics(data);
        setLoading(false);
    };

    // ...

    const handleClassSelect = (cls) => {
        setSelectedClass(cls);
        setSelectedSubject(null);
        setSelectedChapter(null);
        setSubjects([]);
        setChapters([]);
        setTopics([]);
        fetchSubjects(cls.id);
    };

    const handleSubjectSelect = (subj) => {
        setSelectedSubject(subj);
        setSelectedChapter(null);
        setChapters([]);
        setTopics([]);
        fetchChapters(subj.classSubjectId);
    };

    const handleChapterSelect = (chap) => {
        setSelectedChapter(chap);
        setTopics([]);
        fetchTopics(chap.id);
    };

    // ...

    const handleAdd = async (type) => {
        if (!newItemName.trim()) return;
        try {
            if (type === 'CLASS') {
                await academicService.createClass({ name: newItemName });
                fetchClasses();
            } else if (type === 'SUBJECT' && selectedClass) {
                // Ensure unique code generation or ask user
                const code = newItemName.substring(0, 3).toUpperCase() + '-' + Date.now().toString().substring(8);
                await academicService.createClassSubject(selectedClass.id, { name: newItemName, code: code });
                fetchSubjects(selectedClass.id);
            } else if (type === 'CHAPTER' && selectedSubject) {
                await academicService.createChapter(selectedSubject.classSubjectId, { name: newItemName, chapterNumber: chapters.length + 1 });
                fetchChapters(selectedSubject.classSubjectId);
            } else if (type === 'TOPIC' && selectedChapter) {
                await academicService.createTopic(selectedChapter.id, { name: newItemName });
                fetchTopics(selectedChapter.id);
            }
            setNewItemName('');
        } catch (error) {
            console.error("Failed to add Item", error);
            alert("Failed to add item");
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm("Delete this item?")) return;
        try {
            if (type === 'CLASS') {
                await academicService.deleteClass(id);
                fetchClasses();
                setSelectedClass(null);
            } else if (type === 'SUBJECT') {
                // id passed here should be classSubjectId
                await academicService.deleteClassSubject(id);
                fetchSubjects(selectedClass.id);
                setSelectedSubject(null);
            } else if (type === 'CHAPTER') {
                await academicService.deleteChapter(id);
                fetchChapters(selectedSubject.classSubjectId);
                setSelectedChapter(null);
            } else if (type === 'TOPIC') {
                await academicService.deleteTopic(id);
                fetchTopics(selectedChapter.id);
            }
        } catch (error) {
            console.error("Failed to delete", error);
            alert("Failed to delete item. It may have dependent items.");
        }
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Academic Structure Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">

                {/* Classes Column */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-700">
                        <Folder className="text-blue-500" size={18} /> Classes
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {classes.map(cls => (
                            <div
                                key={cls.id}
                                onClick={() => handleClassSelect(cls)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedClass?.id === cls.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                            >
                                <span className="font-medium">{cls.name}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete('CLASS', cls.id); }} className="p-1 text-slate-300 hover:text-rose-500 rounded"><Trash2 size={14} /></button>
                                    <ChevronRight size={14} className={selectedClass?.id === cls.id ? 'text-blue-500' : 'text-slate-300'} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-slate-100 bg-slate-50">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="New Class..."
                                className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                value={selectedClass ? '' : newItemName}
                                onChange={(e) => !selectedClass && setNewItemName(e.target.value)}
                                onFocus={() => { setSelectedClass(null); setSelectedSubject(null); setSelectedChapter(null); }}
                            />
                            <button
                                onClick={() => handleAdd('CLASS')}
                                disabled={!!selectedClass} // Only add class if nothing selected logic is tricky here, simplified for MVP
                                className="bg-blue-600 text-white p-1.5 rounded disabled:opacity-50"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Subjects Column */}
                <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${!selectedClass ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-700">
                        <Book className="text-emerald-500" size={18} /> Subjects
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {subjects.map(subj => (
                            <div
                                key={subj.classSubjectId}
                                onClick={() => handleSubjectSelect(subj)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedSubject?.classSubjectId === subj.classSubjectId ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}`}
                            >
                                <span className="font-medium">{subj.subjectName}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete('SUBJECT', subj.classSubjectId); }} className="p-1 text-slate-300 hover:text-rose-500 rounded"><Trash2 size={14} /></button>
                                    <ChevronRight size={14} className={selectedSubject?.classSubjectId === subj.classSubjectId ? 'text-emerald-500' : 'text-slate-300'} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-slate-100 bg-slate-50">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="New Subject..."
                                className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-emerald-500"
                                value={selectedClass && !selectedSubject ? newItemName : ''}
                                onChange={(e) => selectedClass && !selectedSubject && setNewItemName(e.target.value)}
                                onFocus={() => { setSelectedSubject(null); setSelectedChapter(null); }}
                            />
                            <button
                                onClick={() => handleAdd('SUBJECT')}
                                disabled={!selectedClass || !!selectedSubject}
                                className="bg-emerald-600 text-white p-1.5 rounded disabled:opacity-50"
                                title="Create & Assign New Subject"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                onClick={handleMapSelect}
                                className="bg-white text-emerald-600 border border-emerald-200 p-1.5 rounded hover:bg-emerald-50"
                                title="Map Existing Global Subject"
                            >
                                <LinkIcon size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Chapters Column */}
                <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${!selectedSubject ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-700">
                        <Layers className="text-amber-500" size={18} /> Chapters
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {chapters.map(chap => (
                            <div
                                key={chap.id}
                                onClick={() => handleChapterSelect(chap)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedChapter?.id === chap.id ? 'bg-amber-50 text-amber-700' : 'hover:bg-slate-50 text-slate-600'}`}
                            >
                                <span className="font-medium">{chap.name}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete('CHAPTER', chap.id); }} className="p-1 text-slate-300 hover:text-rose-500 rounded"><Trash2 size={14} /></button>
                                    <ChevronRight size={14} className={selectedChapter?.id === chap.id ? 'text-amber-500' : 'text-slate-300'} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-slate-100 bg-slate-50">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="New Chapter..."
                                className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-amber-500"
                                value={selectedSubject && !selectedChapter ? newItemName : ''}
                                onChange={(e) => selectedSubject && !selectedChapter && setNewItemName(e.target.value)}
                                onFocus={() => setSelectedChapter(null)}
                            />
                            <button
                                onClick={() => handleAdd('CHAPTER')}
                                disabled={!selectedSubject || !!selectedChapter}
                                className="bg-amber-600 text-white p-1.5 rounded disabled:opacity-50"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Topics Column */}
                <div className={`bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col ${!selectedChapter ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2 font-semibold text-slate-700">
                        <FileText className="text-purple-500" size={18} /> Topics
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {topics.map(topic => (
                            <div
                                key={topic.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 text-slate-600"
                            >
                                <span className="font-medium">{topic.name}</span>
                                <button onClick={() => handleDelete('TOPIC', topic.id)} className="p-1 text-slate-300 hover:text-rose-500 rounded"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-slate-100 bg-slate-50">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="New Topic..."
                                className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-purple-500"
                                value={selectedChapter ? newItemName : ''}
                                onChange={(e) => selectedChapter && setNewItemName(e.target.value)}
                            />
                            <button
                                onClick={() => handleAdd('TOPIC')}
                                disabled={!selectedChapter}
                                className="bg-purple-600 text-white p-1.5 rounded disabled:opacity-50"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 text-sm text-slate-500 bg-white p-4 rounded-lg border border-slate-200 flex items-center gap-2">
                <FolderOpen size={16} /> Select an item from left to right to build the hierarchy. Add items using the input fields at the bottom of each column.
            </div>

            {/* Map Subject Modal */}
            {showMapModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">Map Existing Subject</h2>
                            <button onClick={() => setShowMapModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleMapSubject} className="space-y-4">
                            <div className="text-sm text-slate-600 mb-4">
                                Select a subject from the Global Library to assign to <strong>{selectedClass?.name}</strong> for the session <strong>{activeSession?.name}</strong>.
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Subject</label>
                                <select
                                    required
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedGlobalSubjectId}
                                    onChange={e => setSelectedGlobalSubjectId(e.target.value)}
                                >
                                    <option value="">-- Choose Subject --</option>
                                    {globalSubjects
                                        .filter(sub => !subjects.some(existing => existing.subjectId === sub.id))
                                        .map(sub => (
                                            <option key={sub.id} value={sub.id}>
                                                {sub.code} - {sub.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowMapModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition-colors"
                                    disabled={!activeSession}
                                >
                                    Map Subject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AcademicStructure;
