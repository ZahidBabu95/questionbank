import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, Folder, FolderOpen, Book, Layers, FileText } from 'lucide-react';
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

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        const data = await academicService.getAllClasses();
        setClasses(data);
    };

    const fetchSubjects = async (classId) => {
        setLoading(true);
        const data = await academicService.getSubjectsByClass(classId);
        setSubjects(data);
        setLoading(false);
    };

    const fetchChapters = async (subjectId) => {
        setLoading(true);
        const data = await academicService.getChaptersBySubject(subjectId);
        setChapters(data);
        setLoading(false);
    };

    const fetchTopics = async (chapterId) => {
        setLoading(true);
        const data = await academicService.getTopicsByChapter(chapterId);
        setTopics(data);
        setLoading(false);
    };

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
        fetchChapters(subj.id);
    };

    const handleChapterSelect = (chap) => {
        setSelectedChapter(chap);
        setTopics([]);
        fetchTopics(chap.id);
    };

    const handleAdd = async (type) => {
        if (!newItemName.trim()) return;
        try {
            if (type === 'CLASS') {
                await academicService.createClass({ name: newItemName });
                fetchClasses();
            } else if (type === 'SUBJECT' && selectedClass) {
                await academicService.createSubject(selectedClass.id, { name: newItemName, code: newItemName.toUpperCase().substring(0, 3) + '-' + Math.floor(Math.random() * 1000) });
                fetchSubjects(selectedClass.id);
            } else if (type === 'CHAPTER' && selectedSubject) {
                await academicService.createChapter(selectedSubject.id, { name: newItemName, chapterNumber: chapters.length + 1 });
                fetchChapters(selectedSubject.id);
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
                await academicService.deleteSubject(id);
                fetchSubjects(selectedClass.id);
                setSelectedSubject(null);
            } else if (type === 'CHAPTER') {
                await academicService.deleteChapter(id);
                fetchChapters(selectedSubject.id);
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
                                key={subj.id}
                                onClick={() => handleSubjectSelect(subj)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedSubject?.id === subj.id ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}`}
                            >
                                <span className="font-medium">{subj.name}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete('SUBJECT', subj.id); }} className="p-1 text-slate-300 hover:text-rose-500 rounded"><Trash2 size={14} /></button>
                                    <ChevronRight size={14} className={selectedSubject?.id === subj.id ? 'text-emerald-500' : 'text-slate-300'} />
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
                            >
                                <Plus size={16} />
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
        </div>
    );
};

export default AcademicStructure;
