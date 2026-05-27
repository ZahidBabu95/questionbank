import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, Book, Tag, Box, Loader2 } from 'lucide-react';
import questionTypeService from '../../../services/questionTypeService';
import questionService from '../../../services/questionService';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';
import QuestionSourceTagger from './components/QuestionSourceTagger';
import QuestionFormEngine from './components/QuestionFormEngine';

const DynamicQuestionCreate = () => {
    const {
        levels, streams, classes, subjects, chapters, topics,
        levelId, streamId, classId, subjectId, chapterId, topicId,
        setLevelId, setStreamId, setClassId, setSubjectId, setChapterId, setTopicId,
    } = useAcademicHierarchy();

    const [types, setTypes] = useState([]);
    const [selectedTypeCode, setSelectedTypeCode] = useState('');
    const [selectedType, setSelectedType] = useState(null);
    const [loadingTypes, setLoadingTypes] = useState(false);

    const [dynamicData, setDynamicData] = useState({});
    const [examSources, setExamSources] = useState([]);
    const [commonData, setCommonData] = useState({ marks: 1, difficulty: 'MEDIUM', language: 'Bangla' });

    // Reverted frontend auto-filtering logic per user request to allow simple database-driven dropdown mapping

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        setLoadingTypes(true);
        try {
            const data = await questionTypeService.getAllQuestionTypes();
            const dynamicTypes = data.filter(t => !t.isSystemDefault);
            setTypes(dynamicTypes);
            if (dynamicTypes.length > 0) {
                handleTypeSelect(dynamicTypes[0].code, dynamicTypes);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load question types.' });
        } finally {
            setLoadingTypes(false);
        }
    };

    const handleTypeSelect = (code, typeList = types) => {
        setSelectedTypeCode(code);
        const typeObj = typeList.find(t => t.code === code);
        setSelectedType(typeObj);
        
        let schemaObj = typeObj?.schemaTemplate;
        if (typeof schemaObj === 'string') {
            try {
                schemaObj = JSON.parse(schemaObj);
            } catch (e) {
                console.error("Failed to parse schema", e);
                schemaObj = { fields: [] };
            }
        }

        // Init default data based on schema
        const initData = {};
        if (schemaObj && schemaObj.fields) {
            schemaObj.fields.forEach(f => {
                initData[f.name] = f.type === 'dynamic_list' ? [] : '';
            });
        }
        setDynamicData(initData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (!classId || !subjectId || !chapterId) {
            setMessage({ type: 'error', text: 'Please select class, subject, and chapter.' });
            return;
        }

        setSaving(true);
        try {
            // Re-using the Short Question endpoint or creating a generic one.
            // Since we need to save `dynamicData` and `type` (as String), we will use an existing endpoint or standard Question create endpoint.
            // We use standard create (assuming a standard create endpoint handles dynamic fields).
            // For now, let's post it as a Short Question but with the modified dynamic fields. 
            // The backend for createShortQuestion expects: questionText, marks, difficulty, type, dynamicData, etc.

            const classObj = classes.find(c => c.id === classId);
            const subjectObj = subjects.find(s => s.classSubjectId === subjectId || s.id === subjectId);
            const chapterObj = chapters.find(c => c.id === chapterId);
            const topicObj = topics.find(t => t.id === topicId);

            const payload = {
                questionText: `Dynamic Question: ${selectedType?.name}`, // Fallback text
                type: selectedTypeCode,
                dynamicData: JSON.stringify(dynamicData),
                marks: parseFloat(commonData.marks),
                difficulty: commonData.difficulty,
                language: commonData.language,
                academicClass: classObj ? { id: classId, version: classObj.version || 0 } : { id: classId },
                classSubject: subjectObj ? { id: subjectId, version: subjectObj.version || 0 } : { id: subjectId },
                chapter: chapterObj ? { id: chapterId, version: chapterObj.version || 0 } : { id: chapterId },
                topic: topicObj ? { id: topicId, version: topicObj.version || 0 } : null,
                sources: examSources
            };

            await questionService.createShortQuestion(payload);
            setMessage({ type: 'success', text: `${selectedType?.name} question created successfully!` });
            
            // Reset form
            handleTypeSelect(selectedTypeCode);
            setExamSources([]);

        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create question.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Create Dynamic Question</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Create schema-driven polymorphic questions.</p>
                </div>
            </div>

            {message && (
                <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    <AlertTriangle size={16} /> {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col lg:flex-row gap-5">
                    
                    {/* Left: Dynamic Form Engine */}
                    <div className="flex-1 min-w-0 space-y-5">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Box size={16} className="text-indigo-500" /> Question Template
                                </h2>
                                {loadingTypes ? (
                                    <Loader2 className="animate-spin text-slate-400" size={16} />
                                ) : (
                                    <select 
                                        value={selectedTypeCode} 
                                        onChange={e => handleTypeSelect(e.target.value)}
                                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-indigo-700 bg-indigo-50"
                                    >
                                        {types.map(t => (
                                            <option key={t.code} value={t.code}>{t.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            
                            <div className="p-5">
                                {selectedType ? (
                                    <QuestionFormEngine 
                                        schema={typeof selectedType.schemaTemplate === 'string' ? JSON.parse(selectedType.schemaTemplate) : selectedType.schemaTemplate} 
                                        value={dynamicData} 
                                        onChange={setDynamicData} 
                                    />
                                ) : (
                                    <div className="text-center py-10 text-slate-400">
                                        No dynamic types found. Please configure them in Settings.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Academic Settings */}
                    <div className="w-full lg:w-[330px] shrink-0 space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wide flex items-center gap-1.5">
                                <Book size={14} className="text-blue-500" /> Academic Mapping
                            </h2>
                            <div className="space-y-2">
                                <select value={levelId} onChange={e => setLevelId(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50">
                                    <option value="">Select Level *</option>
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50">
                                    <option value="">Select Stream *</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50">
                                    <option value="">Select Class *</option>
                                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50">
                                    <option value="">Select Subject *</option>
                                    {subjects.map(subj => <option key={subj.classSubjectId} value={subj.classSubjectId}>{subj.subjectName}</option>)}
                                </select>
                                <select value={chapterId} onChange={e => setChapterId(e.target.value)} disabled={!subjectId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50">
                                    <option value="">Select Chapter *</option>
                                    {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.name}</option>)}
                                </select>
                                <select value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!chapterId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50">
                                    <option value="">Select Topic (Optional)</option>
                                    {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marks</label>
                                    <input type="number" value={commonData.marks} onChange={(e) => setCommonData({ ...commonData, marks: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50" min="0.5" step="0.5" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Difficulty</label>
                                    <select value={commonData.difficulty} onChange={(e) => setCommonData({ ...commonData, difficulty: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50">
                                        <option value="EASY">Easy</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HARD">Hard</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-2.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Language (ভাষা)</label>
                                <select value={commonData.language} onChange={(e) => setCommonData({ ...commonData, language: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50">
                                    <option value="Bangla">Bangla (বাংলা ভার্সন)</option>
                                    <option value="English">English (ইংলিশ ভার্সন)</option>
                                    <option value="Bilingual">Bilingual (উভয়)</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wide flex items-center gap-1.5">
                                <Tag size={14} className="text-orange-500" /> Exam Sources
                            </h2>
                            <QuestionSourceTagger sources={examSources} onChange={setExamSources} />
                        </div>

                        <button 
                            type="submit" 
                            disabled={saving || !selectedType}
                            className="w-full px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Save Question
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default DynamicQuestionCreate;
