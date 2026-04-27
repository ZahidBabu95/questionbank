import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Save, Upload, BookOpen, Layers, X, Edit, Trash2, Settings, ArrowRight, FileText, CheckCircle, Bot, Paperclip } from 'lucide-react';
import lectureService from '../../../services/lectureService';
import AttachmentPanel from './components/AttachmentPanel';

const LectureBuilder = () => {
    // Top-level lecture data
    const [title, setTitle] = useState('New Concept Lecture');
    const [language, setLanguage] = useState('Bangla');
    const [difficulty, setDifficulty] = useState('EASY');
    const [timeMinutes, setTimeMinutes] = useState(45);

    // UI states
    const [isSaving, setIsSaving] = useState(false);
    const [lectureId, setLectureId] = useState(null);
    const [aiGenerating, setAiGenerating] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);

    const [sections, setSections] = useState([
        { id: Date.now().toString(), title: 'Introduction', content: '' },
    ]);
    const [activeSectionId, setActiveSectionId] = useState(sections[0].id);

    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const id = params.get('id');
        const openAttachments = params.get('attachments') === 'open';

        if (id) {
            setLectureId(id);
            loadLecture(id);
        }

        if (openAttachments) {
            setShowAttachments(true);
        }
    }, [location.search]);

    const loadLecture = async (id) => {
        try {
            const res = await lectureService.getLecture(id);
            const data = res.data;
            setTitle(data.title);
            setLanguage(data.language);
            setDifficulty(data.difficultyLevel);
            setTimeMinutes(data.lectureTimeMinutes);
            if (data.sections && data.sections.length > 0) {
                const mappedSections = data.sections.map(s => ({
                    id: s.id,
                    title: s.sectionTitle,
                    content: s.content
                }));
                setSections(mappedSections);
                setActiveSectionId(mappedSections[0].id);
            }
        } catch (err) {
            console.error('Failed to load lecture:', err);
        }
    };

    // Content of currently selected section
    const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

    const handleAddSection = () => {
        const newSec = { id: Date.now().toString(), title: 'New Section', content: '' };
        setSections([...sections, newSec]);
        setActiveSectionId(newSec.id);
    };

    const handleRemoveSection = (id) => {
        if (sections.length === 1) return; // Prevent removing last section
        const newSecs = sections.filter(s => s.id !== id);
        setSections(newSecs);
        if (activeSectionId === id) setActiveSectionId(newSecs[0].id);
    };

    const updateActiveSectionContent = (content) => {
        setSections(sections.map(s =>
            s.id === activeSectionId ? { ...s, content } : s
        ));
    };

    const updateActiveSectionTitle = (newTitle) => {
        setSections(sections.map(s =>
            s.id === activeSectionId ? { ...s, title: newTitle } : s
        ));
    };

    const handleAIAssist = async () => {
        if (!activeSection.title) return;
        setAiGenerating(true);
        try {
            const res = await lectureService.aiGenerate({
                topic: activeSection.title,
                class: '10', // static demo
                difficulty: difficulty,
                language: language
            });

            if (res.success) {
                // Prepend AI generation to active section content
                const newContent = activeSection.content + "\n\n" + res.data.explanation + "\n\n" + res.data.examples;
                updateActiveSectionContent(newContent);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setAiGenerating(false);
        }
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            const payload = {
                title,
                language,
                difficultyLevel: difficulty,
                lectureTimeMinutes: timeMinutes,
                sections: sections.map((s, idx) => ({
                    sectionTitle: s.title,
                    content: s.content,
                    sectionOrder: idx
                }))
            };

            let res;
            if (lectureId) {
                res = await lectureService.updateLecture(lectureId, payload);
            } else {
                res = await lectureService.createLecture(payload);
                if (res.data?.id) setLectureId(res.data.id);
            }
            alert('Lecture saved successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to save lecture');
        } finally {
            setIsSaving(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDER MAIN LAYOUT
    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="h-[calc(100vh-64px)]flex flex-col bg-slate-50">
            {/* Header / Config Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-secondary">
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="text-xl font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0 p-0 hover:bg-slate-50 rounded"
                            placeholder="Lecture Title..."
                        />
                        <div className="flex gap-4 mt-1">
                            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="text-xs bg-slate-100 border-none rounded p-1 outline-none text-slate-600">
                                <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
                            </select>
                            <select value={language} onChange={e => setLanguage(e.target.value)} className="text-xs bg-slate-100 border-none rounded p-1 outline-none text-slate-600">
                                <option value="Bangla">Bangla</option>
                                <option value="English">English</option>
                                <option value="Bilingual">Bilingual</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAttachments(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-200 transition"
                        title="Resources & Attachments"
                    >
                        <Paperclip size={16} />
                        <span className="hidden sm:inline">Attachments</span>
                    </button>
                    <button onClick={handleSaveDraft} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium text-sm rounded-lg hover:bg-slate-200 transition">
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-white font-medium text-sm rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 transition">
                        <Upload size={16} /> Publish Lecture
                    </button>
                </div>
            </div>

            {/* Main Builder Area: Left Panel (Sections) + Right Panel (Editor) */}
            <div className="flex flex-1 overflow-hidden h-full">

                {/* Left Panel: Sections */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col pt-4 overflow-y-auto">
                    <div className="px-4 pb-2 flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Lecture Outline</span>
                    </div>

                    <div className="flex-1 px-3 space-y-1">
                        {sections.map((sec, idx) => (
                            <div
                                key={sec.id}
                                onClick={() => setActiveSectionId(sec.id)}
                                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${activeSectionId === sec.id ? 'bg-white shadow-sm border border-slate-200 shadow-indigo-100/50 relative' : 'hover:bg-slate-200/50 text-slate-600 border border-transparent'
                                    }`}
                            >
                                {activeSectionId === sec.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r" />}
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${activeSectionId === sec.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {idx + 1}
                                    </div>
                                    <span className="text-sm font-medium truncate">{sec.title || 'Untitled Section'}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveSection(sec.id); }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}

                        <button
                            onClick={handleAddSection}
                            className="w-full flex items-center justify-center gap-2 p-3 mt-4 text-sm font-medium text-secondary border border-dashed border-indigo-200 rounded-lg hover:bg-indigo-50 transition-all"
                        >
                            <Plus size={16} /> Add Section
                        </button>
                    </div>
                </div>

                {/* Right Panel: Content Editor */}
                <div className="flex-1 bg-white flex flex-col overflow-y-auto p-8 lg:p-12 relative">
                    <div className="max-w-4xl mx-auto w-full space-y-8">

                        {/* Section Header */}
                        <div>
                            <input
                                type="text"
                                value={activeSection.title}
                                onChange={e => updateActiveSectionTitle(e.target.value)}
                                className="text-3xl font-bold text-slate-900 w-full outline-none border-b border-transparent focus:border-slate-200 pb-2 transition-all"
                                placeholder="Section Title..."
                            />
                        </div>

                        {/* Toolbar Simulation (since using simple textarea for now) */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="flex gap-2 text-slate-500">
                                <button className="p-1.5 hover:bg-white rounded shadow-sm hover:text-slate-900 transition"><Edit size={16} /></button>
                                <button className="p-1.5 hover:bg-white rounded shadow-sm hover:text-slate-900 transition"><Layers size={16} /></button>
                                <button className="p-1.5 hover:bg-white rounded shadow-sm hover:text-slate-900 transition"><FileText size={16} /></button>

                                <div className="w-px h-6 bg-slate-300 mx-1" />

                                <button
                                    onClick={handleAIAssist}
                                    disabled={aiGenerating}
                                    className="p-1.5 hover:bg-indigo-50 rounded shadow-sm hover:text-secondary text-indigo-500 transition flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Bot size={16} />
                                    <span className="text-xs font-bold">{aiGenerating ? 'Writing...' : 'AI Assist'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Text Area */}
                        <textarea
                            value={activeSection.content}
                            onChange={e => updateActiveSectionContent(e.target.value)}
                            className="w-full h-96 p-4 text-slate-700 bg-transparent border-none outline-none resize-none leading-relaxed text-lg"
                            placeholder="Write your lecture content here. Use AI Assist to generate structured explanations instantly..."
                        />

                    </div>
                </div>
            </div>

            {/* Attachment Side Panel */}
            <AttachmentPanel
                lectureId={lectureId}
                isOpen={showAttachments}
                onClose={() => setShowAttachments(false)}
            />
        </div >
    );
};

export default LectureBuilder;
