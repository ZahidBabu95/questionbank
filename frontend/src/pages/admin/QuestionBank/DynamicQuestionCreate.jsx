import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, Book, Tag, Box, Loader2, Eye } from 'lucide-react';
import questionTypeService from '../../../services/questionTypeService';
import questionService from '../../../services/questionService';
import useAcademicHierarchy from '../../../hooks/useAcademicHierarchy';
import QuestionSourceTagger from './components/QuestionSourceTagger';
import QuestionFormEngine from './components/QuestionFormEngine';
import DynamicQuestionPreview from './components/DynamicQuestionPreview';

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

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        setLoadingTypes(true);
        try {
            const data = await questionTypeService.getAllQuestionTypes();
            // Show both legacy defaults and custom dynamic types
            setTypes(data);
            if (data.length > 0) {
                // Default to MCQ if present, otherwise first type
                const mcqType = data.find(t => t.code === 'MCQ' || t.code === 'MULTIPLE_CHOICE');
                handleTypeSelect(mcqType ? mcqType.code : data[0].code, data);
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

        // If the schema is empty (default legacy types), load standard NCTB schema models
        if ((!schemaObj || !schemaObj.fields || schemaObj.fields.length === 0) && 
            (code === 'MCQ' || code === 'CQ' || code === 'SHORT' || code === 'SHORT_ANSWER' || code === 'MULTIPLE_CHOICE' || code === 'CREATIVE')) {
            if (code === 'MCQ' || code === 'MULTIPLE_CHOICE') {
                schemaObj = {
                    fields: [
                        { name: "stimulus", label: "উদ্দীপক (ঐচ্ছিক)", type: "richtext", required: false, description: "দৃশ্যকল্প, অনুচ্ছেদ বা চিত্র" },
                        { name: "questionText", label: "প্রশ্ন", type: "richtext", required: true },
                        { name: "mcqType", label: "প্রশ্নের ধরন", type: "dropdown", options: ["SIMPLE", "MULTIPLE_COMPLETION", "SITUATION_SET"], required: true },
                        { name: "options", label: "বিকল্পসমূহ (ক, খ, গ, ঘ)", type: "dynamic_list", required: true, itemSchema: [
                            { name: "text", label: "বিকল্প টেক্সট", type: "text", required: true },
                            { name: "isCorrect", label: "সঠিক উত্তর?", type: "dropdown", options: ["true", "false"], required: true }
                        ]},
                        { name: "explanation", label: "ব্যাখ্যা (ঐচ্ছিক)", type: "textarea", required: false }
                    ]
                };
            } else if (code === 'CQ' || code === 'CREATIVE') {
                schemaObj = {
                    fields: [
                        { name: "stimulus", label: "উদ্দীপক (Stem)", type: "richtext", required: true },
                        { name: "subQuestions", label: "উপ-প্রশ্নসমূহ (ক, খ, গ, ঘ)", type: "dynamic_list", required: true, itemSchema: [
                            { name: "label", label: "চিহ্ন (ক/খ/গ/ঘ)", type: "text", required: true },
                            { name: "text", label: "উপ-প্রশ্ন টেক্সট", type: "text", required: true },
                            { name: "marks", label: "নম্বর", type: "text", required: true }
                        ]}
                    ]
                };
            } else if (code === 'SHORT' || code === 'SHORT_ANSWER') {
                schemaObj = {
                    fields: [
                        { name: "stimulus", label: "উদ্দীপক (ঐচ্ছিক)", type: "richtext", required: false },
                        { name: "questionText", label: "প্রশ্ন", type: "richtext", required: true },
                        { name: "correctAnswer", label: "সঠিক উত্তর", type: "textarea", required: true },
                        { name: "explanation", label: "ব্যাখ্যা/সংকেত", type: "textarea", required: false }
                    ]
                };
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
        
        // Auto-update marks based on type defaults
        if (code === 'CQ' || code === 'CREATIVE') {
            setCommonData(prev => ({ ...prev, marks: 10 }));
        } else {
            setCommonData(prev => ({ ...prev, marks: 1 }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (!classId || !subjectId || !chapterId) {
            setMessage({ type: 'error', text: 'দয়া করে ক্লাস, বিষয় এবং অধ্যায় সিলেক্ট করুন।' });
            return;
        }

        setSaving(true);
        try {
            const classObj = classes.find(c => c.id === classId);
            const subjectObj = subjects.find(s => s.classSubjectId === subjectId || s.id === subjectId);
            const chapterObj = chapters.find(c => c.id === chapterId);
            const topicObj = topics.find(t => t.id === topicId);

            // Generate fallback questionText for table list view
            let textSnippet = dynamicData.questionText || dynamicData.stimulus || `Dynamic Question: ${selectedType?.name}`;
            if (typeof textSnippet === 'string' && textSnippet.length > 100) {
                textSnippet = textSnippet.substring(0, 97) + '...';
            }

            const payload = {
                questionText: textSnippet,
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
            setMessage({ type: 'success', text: `"${selectedType?.name}" প্রশ্নটি সফলভাবে তৈরি ও সেভ হয়েছে!` });
            
            // Reset form
            handleTypeSelect(selectedTypeCode);
            setExamSources([]);

        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'প্রশ্ন সেভ করতে ব্যর্থ হয়েছে।' });
        } finally {
            setSaving(false);
        }
    };

    // Compile active schema to pass to QuestionFormEngine
    const activeSchema = React.useMemo(() => {
        if (!selectedType) return { fields: [] };
        let schemaObj = selectedType.schemaTemplate;
        if (typeof schemaObj === 'string') {
            try {
                schemaObj = JSON.parse(schemaObj);
            } catch (e) {
                schemaObj = { fields: [] };
            }
        }
        
        // Inject legacy schemas if database template is empty
        if ((!schemaObj || !schemaObj.fields || schemaObj.fields.length === 0) && 
            (selectedTypeCode === 'MCQ' || selectedTypeCode === 'CQ' || selectedTypeCode === 'SHORT' || selectedTypeCode === 'SHORT_ANSWER' || selectedTypeCode === 'MULTIPLE_CHOICE' || selectedTypeCode === 'CREATIVE')) {
            if (selectedTypeCode === 'MCQ' || selectedTypeCode === 'MULTIPLE_CHOICE') {
                return {
                    fields: [
                        { name: "stimulus", label: "উদ্দীপক (ঐচ্ছিক)", type: "richtext", required: false, description: "দৃশ্যকল্প, অনুচ্ছেদ বা চিত্র" },
                        { name: "questionText", label: "প্রশ্ন", type: "richtext", required: true },
                        { name: "mcqType", label: "প্রশ্নের ধরন", type: "dropdown", options: ["SIMPLE", "MULTIPLE_COMPLETION", "SITUATION_SET"], required: true },
                        { name: "options", label: "বিকল্পসমূহ (ক, খ, গ, ঘ)", type: "dynamic_list", required: true, itemSchema: [
                            { name: "text", label: "বিকল্প টেক্সট", type: "text", required: true },
                            { name: "isCorrect", label: "সঠিক উত্তর?", type: "dropdown", options: ["true", "false"], required: true }
                        ]},
                        { name: "explanation", label: "ব্যাখ্যা (ঐচ্ছিক)", type: "textarea", required: false }
                    ]
                };
            } else if (selectedTypeCode === 'CQ' || selectedTypeCode === 'CREATIVE') {
                return {
                    fields: [
                        { name: "stimulus", label: "উদ্দীপক (Stem)", type: "richtext", required: true },
                        { name: "subQuestions", label: "উপ-প্রশ্নসমূহ (ক, খ, গ, ঘ)", type: "dynamic_list", required: true, itemSchema: [
                            { name: "label", label: "চিহ্ন (ক/খ/গ/ঘ)", type: "text", required: true },
                            { name: "text", label: "উপ-প্রশ্ন টেক্সট", type: "text", required: true },
                            { name: "marks", label: "নম্বর", type: "text", required: true }
                        ]}
                    ]
                };
            } else if (selectedTypeCode === 'SHORT' || selectedTypeCode === 'SHORT_ANSWER') {
                return {
                    fields: [
                        { name: "stimulus", label: "উদ্দীপক (ঐচ্ছিক)", type: "richtext", required: false },
                        { name: "questionText", label: "প্রশ্ন", type: "richtext", required: true },
                        { name: "correctAnswer", label: "সঠিক উত্তর", type: "textarea", required: true },
                        { name: "explanation", label: "ব্যাখ্যা/সংকেত", type: "textarea", required: false }
                    ]
                };
            }
        }
        return schemaObj || { fields: [] };
    }, [selectedType, selectedTypeCode]);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Unified Question Workspace</h1>
                    <p className="text-xs text-slate-500 mt-0.5">সব ধরনের প্রশ্ন তৈরির ডাইনামিক ও লাইভ স্প্লিট-স্ক্রিন প্রিভিউ সিস্টেম।</p>
                </div>
            </div>

            {message && (
                <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    <AlertTriangle size={16} /> {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col lg:flex-row gap-5">
                    
                    {/* 1. Dynamic Form Engine (Left) */}
                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <Box size={16} className="text-indigo-500" /> Question Form
                                </h2>
                                {loadingTypes ? (
                                    <Loader2 className="animate-spin text-slate-400" size={16} />
                                ) : (
                                    <select 
                                        value={selectedTypeCode} 
                                        onChange={e => handleTypeSelect(e.target.value)}
                                        className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none font-bold text-indigo-700 bg-indigo-50 cursor-pointer"
                                    >
                                        {types.map(t => (
                                            <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            
                            <div className="p-5 max-h-[70vh] overflow-y-auto">
                                {selectedType ? (
                                    <QuestionFormEngine 
                                        schema={activeSchema} 
                                        value={dynamicData} 
                                        onChange={setDynamicData} 
                                    />
                                ) : (
                                    <div className="text-center py-10 text-slate-400">
                                        কোনো প্রশ্ন টাইপ পাওয়া যায়নি। Settings এ গিয়ে তৈরি করুন।
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Live Paper Preview (Center Split Screen) */}
                    <div className="flex-1 min-w-0 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-slate-700">
                                <Eye size={16} className="text-emerald-500" />
                                <h2 className="text-sm font-bold">Live Exam Paper Preview</h2>
                            </div>
                            <div className="p-5 max-h-[70vh] overflow-y-auto">
                                <DynamicQuestionPreview 
                                    type={selectedTypeCode} 
                                    data={dynamicData} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Academic Mapping & Config (Right Panel) */}
                    <div className="w-full lg:w-[300px] shrink-0 space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wide flex items-center gap-1.5">
                                <Book size={14} className="text-blue-500" /> Academic Mapping
                            </h2>
                            <div className="space-y-2">
                                <select value={levelId} onChange={e => setLevelId(e.target.value)} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 cursor-pointer">
                                    <option value="">Select Level *</option>
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <select value={streamId} onChange={e => setStreamId(e.target.value)} disabled={!levelId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50 cursor-pointer">
                                    <option value="">Select Stream *</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <select value={classId} onChange={e => setClassId(e.target.value)} disabled={!streamId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50 cursor-pointer">
                                    <option value="">Select Class *</option>
                                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!classId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50 cursor-pointer">
                                    <option value="">Select Subject *</option>
                                    {subjects.map(subj => <option key={subj.classSubjectId} value={subj.classSubjectId}>{subj.subjectName}</option>)}
                                </select>
                                <select value={chapterId} onChange={e => setChapterId(e.target.value)} disabled={!subjectId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50 cursor-pointer">
                                    <option value="">Select Chapter *</option>
                                    {chapters.map(chap => <option key={chap.id} value={chap.id}>{chap.name}</option>)}
                                </select>
                                <select value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!chapterId} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 disabled:opacity-50 cursor-pointer">
                                    <option value="">Select Topic (Optional)</option>
                                    {topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Marks</label>
                                    <input type="number" value={commonData.marks} onChange={(e) => setCommonData({ ...commonData, marks: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 font-bold" min="0.5" step="0.5" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Difficulty</label>
                                    <select value={commonData.difficulty} onChange={(e) => setCommonData({ ...commonData, difficulty: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 cursor-pointer">
                                        <option value="EASY">Easy</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HARD">Hard</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-2.5">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Language (ভাষা)</label>
                                <select value={commonData.language} onChange={(e) => setCommonData({ ...commonData, language: e.target.value })} className="w-full p-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-slate-50 cursor-pointer">
                                    <option value="Bangla">Bangla (বাংলা)</option>
                                    <option value="English">English (ইংরেজি)</option>
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
