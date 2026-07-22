import React, { useState, useEffect } from 'react';
import { Plus, Settings, Check, X, Shield, Edit2, Trash2, Box, Eye, Save, Code, RefreshCw, Copy } from 'lucide-react';
import questionTypeService from '../../../services/questionTypeService';

const VisualSchemaBuilder = ({ value, onChange }) => {
    let parsedSchema = { fields: [] };
    try {
        parsedSchema = typeof value === 'string' ? JSON.parse(value) : (value || { fields: [] });
        if (!parsedSchema || !Array.isArray(parsedSchema.fields)) {
            parsedSchema = { fields: [] };
        }
    } catch (e) {
        parsedSchema = { fields: [] };
    }

    const fields = parsedSchema.fields;

    const updateSchema = (newFields) => {
        onChange(JSON.stringify({ fields: newFields }, null, 2));
    };

    const addField = () => {
        const newFields = [...fields, { name: '', label: '', type: 'text', required: false }];
        updateSchema(newFields);
    };

    const removeField = (index) => {
        const newFields = fields.filter((_, i) => i !== index);
        updateSchema(newFields);
    };

    const updateField = (index, key, val) => {
        const newFields = fields.map((f, i) => {
            if (i === index) {
                const updated = { ...f, [key]: val };
                if (key === 'type' && val !== 'dropdown') delete updated.options;
                if (key === 'type' && val !== 'dynamic_list') delete updated.itemSchema;
                return updated;
            }
            return f;
        });
        updateSchema(newFields);
    };

    const addSubField = (fieldIndex) => {
        const targetField = fields[fieldIndex];
        const subFields = Array.isArray(targetField.itemSchema) ? targetField.itemSchema : [];
        const updatedSubFields = [...subFields, { name: '', label: '', type: 'text', required: false }];
        updateField(fieldIndex, 'itemSchema', updatedSubFields);
    };

    const removeSubField = (fieldIndex, subIndex) => {
        const targetField = fields[fieldIndex];
        const subFields = Array.isArray(targetField.itemSchema) ? targetField.itemSchema : [];
        const updatedSubFields = subFields.filter((_, i) => i !== subIndex);
        updateField(fieldIndex, 'itemSchema', updatedSubFields);
    };

    const updateSubField = (fieldIndex, subIndex, key, val) => {
        const targetField = fields[fieldIndex];
        const subFields = Array.isArray(targetField.itemSchema) ? targetField.itemSchema : [];
        const updatedSubFields = subFields.map((sf, i) => i === subIndex ? { ...sf, [key]: val } : sf);
        updateField(fieldIndex, 'itemSchema', updatedSubFields);
    };

    // Predefined templates for NCTB standard formats
    const presets = {
        mcq: [
            { name: "stimulus", label: "উদ্দীপক (ঐচ্ছিক অনুচ্ছেদ/দৃশ্যকল্প)", type: "richtext", required: false },
            { name: "questionText", label: "প্রশ্ন", type: "richtext", required: true },
            { name: "mcqType", label: "প্রশ্নের ধরন", type: "dropdown", options: ["SIMPLE", "MULTIPLE_COMPLETION", "SITUATION_SET"], required: true },
            { name: "options", label: "বিকল্পসমূহ", type: "dynamic_list", required: true, itemSchema: [
                { name: "text", label: "বিকল্প টেক্সট", type: "text", required: true },
                { name: "isCorrect", label: "সঠিক উত্তর?", type: "dropdown", options: ["true", "false"], required: true }
            ]},
            { name: "explanation", label: "ব্যাখ্যা (ঐচ্ছিক)", type: "textarea", required: false }
        ],
        cq: [
            { name: "stimulus", label: "উদ্দীপক (Stem)", type: "richtext", required: true },
            { name: "subQuestions", label: "উপ-প্রশ্নসমূহ (ক, খ, গ, ঘ)", type: "dynamic_list", required: true, itemSchema: [
                { name: "label", label: "চিহ্ন (ক/খ/গ/ঘ)", type: "text", required: true },
                { name: "text", label: "উপ-প্রশ্ন টেক্সট", type: "text", required: true },
                { name: "marks", label: "নম্বর", type: "text", required: true }
            ]}
        ],
        short: [
            { name: "stimulus", label: "উদ্দীপক (ঐচ্ছিক)", type: "richtext", required: false },
            { name: "questionText", label: "প্রশ্ন", type: "richtext", required: true },
            { name: "correctAnswer", label: "সঠিক উত্তর", type: "textarea", required: true },
            { name: "explanation", label: "ব্যাখ্যা/সংকেত", type: "textarea", required: false }
        ],
        matching: [
            { name: "stimulus", label: "উদ্দীপক (ঐচ্ছিক)", type: "richtext", required: false },
            { name: "questionText", label: "প্রশ্ন নির্দেশিকা", type: "text", required: true },
            { name: "pairs", label: "স্তম্ভ মেলানো (বাম ও ডান)", type: "dynamic_list", required: true, itemSchema: [
                { name: "left_item", label: "বাম স্তম্ভের অংশ", type: "text", required: true },
                { name: "right_item", label: "ডান স্তম্ভের অংশ", type: "text", required: true }
            ]}
        ]
    };

    const loadPreset = (presetKey) => {
        if (window.confirm("আপনি কি নিশ্চিত? এটি আপনার বর্তমান ফিল্ড কনফিগারেশন মুছে ফেলবে।")) {
            updateSchema(presets[presetKey]);
        }
    };

    const getFieldRoleBadge = (field) => {
        const name = (field.name || '').toLowerCase();
        if (name === 'questiontext' || name === 'question_text') {
            return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm">প্রশ্ন (Question Text)</span>;
        }
        if (name === 'stimulus' || name === 'stem') {
            return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm">উদ্দীপক (Stimulus)</span>;
        }
        if (name === 'options' || field.type === 'dynamic_list' || name === 'subquestions' || name === 'sub_questions' || name === 'pairs') {
            return <span className="bg-violet-100 text-violet-800 border border-violet-200 px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm">বিকল্প / উপ-প্রশ্ন তালিকা</span>;
        }
        if (name === 'explanation') {
            return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm">ব্যাখ্যা (Explanation)</span>;
        }
        if (name === 'correctanswer' || name === 'correct_answer') {
            return <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-extrabold shadow-sm">সঠিক উত্তর</span>;
        }
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">কাস্টম ফিল্ড ({field.type})</span>;
    };

    return (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            
            {/* Quick Templates Selector */}
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">টেমপ্লেট অটো-লোড:</span>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => loadPreset('mcq')}
                        className="bg-white hover:bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-emerald-200 shadow-sm transition-all"
                    >
                        MCQ
                    </button>
                    <button
                        type="button"
                        onClick={() => loadPreset('cq')}
                        className="bg-white hover:bg-violet-50 text-violet-700 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-violet-200 shadow-sm transition-all"
                    >
                        CQ (সৃজনশীল)
                    </button>
                    <button
                        type="button"
                        onClick={() => loadPreset('short')}
                        className="bg-white hover:bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-amber-200 shadow-sm transition-all"
                    >
                        Short (সংক্ষিপ্ত)
                    </button>
                    <button
                        type="button"
                        onClick={() => loadPreset('matching')}
                        className="bg-white hover:bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-sky-200 shadow-sm transition-all"
                    >
                        Matching
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">ফিল্ডসমূহ (Fields)</span>
                <button
                    type="button"
                    onClick={addField}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow transition-colors"
                >
                    <Plus size={12} /> Add Field
                </button>
            </div>

            {fields.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    No fields configured yet. Click "Add Field" or load a Preset.
                </div>
            ) : (
                <div className="space-y-3">
                    {fields.map((field, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-250 rounded-xl relative group shadow-sm">
                            
                            {/* Card Header with Badges */}
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2 pr-6">
                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-extrabold">
                                    {idx + 1}
                                </span>
                                {getFieldRoleBadge(field)}
                                <button
                                    type="button"
                                    onClick={() => removeField(idx)}
                                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Column inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Field Label (বাংলা/ইংরেজি)</label>
                                    <input
                                        type="text"
                                        value={field.label || ''}
                                        onChange={(e) => {
                                            const label = e.target.value;
                                            const name = label.toLowerCase()
                                                .replace(/\s+/g, '_')
                                                .replace(/[^a-z0-9_]/g, '');
                                            updateField(idx, 'label', label);
                                            // Only auto-update field name if it hasn't been custom edited yet
                                            if (!field.name || field.name === field.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')) {
                                                updateField(idx, 'name', name);
                                            }
                                        }}
                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                                        placeholder="e.g. উদ্দীপক / প্রশ্ন"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">API Code Name (English only)</label>
                                    <input
                                        type="text"
                                        value={field.name || ''}
                                        onChange={(e) => updateField(idx, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 text-indigo-700 font-bold"
                                        placeholder="e.g. questionText"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Input UI Type</label>
                                    <select
                                        value={field.type || 'text'}
                                        onChange={(e) => updateField(idx, 'type', e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none bg-white font-medium focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="text">Text (Single Line)</option>
                                        <option value="textarea">Text Area</option>
                                        <option value="richtext">Rich Text Editor</option>
                                        <option value="dropdown">Dropdown Selection</option>
                                        <option value="dynamic_list">Dynamic List (Options/Sub-questions)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Required settings */}
                            <div className="flex items-center gap-1.5 mt-2.5">
                                <input
                                    type="checkbox"
                                    id={`req-${idx}`}
                                    checked={!!field.required}
                                    onChange={(e) => updateField(idx, 'required', e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
                                />
                                <label htmlFor={`req-${idx}`} className="text-[10px] font-bold text-slate-600 cursor-pointer">অবশ্যই পূরণ করতে হবে (Required field)</label>
                            </div>

                            {field.type === 'dropdown' && (
                                <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">Dropdown Options (Comma separated)</label>
                                    <input
                                        type="text"
                                        value={Array.isArray(field.options) ? field.options.join(', ') : (field.options || '')}
                                        onChange={(e) => updateField(idx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg outline-none"
                                        placeholder="e.g. Option A, Option B, Option C"
                                    />
                                </div>
                            )}

                            {field.type === 'dynamic_list' && (
                                <div className="mt-2.5 pt-2.5 border-t border-slate-100 bg-slate-50/50 p-2.5 rounded-lg border border-slate-150">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">তালিকার আইটেম স্কিমা (List Item Schema)</span>
                                        <button
                                            type="button"
                                            onClick={() => addSubField(idx)}
                                            className="text-[9px] flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm"
                                        >
                                            <Plus size={10} /> Add Item Field
                                        </button>
                                    </div>
                                    <div className="space-y-1.5">
                                        {(Array.isArray(field.itemSchema) ? field.itemSchema : []).map((subField, sIdx) => (
                                            <div key={sIdx} className="flex items-center gap-1.5 p-1.5 bg-white rounded border border-slate-200 shadow-sm">
                                                <input
                                                    type="text"
                                                    value={subField.label || ''}
                                                    onChange={(e) => {
                                                        const label = e.target.value;
                                                        const name = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                                        updateSubField(idx, sIdx, 'label', label);
                                                        if (!subField.name || subField.name === subField.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')) {
                                                            updateSubField(idx, sIdx, 'name', name);
                                                        }
                                                    }}
                                                    className="px-2 py-1 text-[10px] border border-slate-350 rounded outline-none w-24 focus:ring-1 focus:ring-indigo-500"
                                                    placeholder="Label"
                                                />
                                                <input
                                                    type="text"
                                                    value={subField.name || ''}
                                                    onChange={(e) => updateSubField(idx, sIdx, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                                    className="px-2 py-1 text-[10px] border border-slate-350 rounded font-mono outline-none w-20 text-indigo-600 font-bold"
                                                    placeholder="Name"
                                                />
                                                <select
                                                    value={subField.type || 'text'}
                                                    onChange={(e) => updateSubField(idx, sIdx, 'type', e.target.value)}
                                                    className="px-2 py-1 text-[10px] border border-slate-350 rounded outline-none bg-white w-20"
                                                >
                                                    <option value="text">Text</option>
                                                    <option value="dropdown">Dropdown</option>
                                                </select>
                                                
                                                {subField.type === 'dropdown' && (
                                                    <input
                                                        type="text"
                                                        value={Array.isArray(subField.options) ? subField.options.join(', ') : (subField.options || '')}
                                                        onChange={(e) => updateSubField(idx, sIdx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                                        className="px-2 py-1 text-[10px] border border-slate-350 rounded outline-none w-28"
                                                        placeholder="comma,options"
                                                    />
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => removeSubField(idx, sIdx)}
                                                    className="text-slate-400 hover:text-rose-500 rounded p-1 ml-auto"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const QuestionTypes = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editorMode, setEditorMode] = useState('visual'); // 'visual' | 'json'
    
    const [currentType, setCurrentType] = useState({
        name: '',
        code: '',
        isSystemDefault: false,
        schemaTemplate: '{}',
        aiPromptTemplate: ''
    });
    
    useEffect(() => {
        fetchTypes();
    }, []);
    
    const fetchTypes = async () => {
        setLoading(true);
        try {
            const data = await questionTypeService.getAllQuestionTypes();
            setTypes(data);
        } catch (error) {
            console.error('Error fetching question types', error);
            setMessage({ type: 'error', text: 'Failed to load question types.' });
        } finally {
            setLoading(false);
        }
    };
    
    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            let schemaString = '';
            try {
                // Parse to validate, then stringify to ensure compact valid JSON string
                const schemaJson = JSON.parse(currentType.schemaTemplate);
                schemaString = JSON.stringify(schemaJson);
            } catch (e) {
                setMessage({ type: 'error', text: 'Invalid JSON schema format.' });
                setSaving(false);
                return;
            }
            
            const payload = {
                ...currentType,
                schemaTemplate: schemaString
            };
            
            if (currentType.id) {
                await questionTypeService.updateQuestionType(currentType.id, payload);
                setMessage({ type: 'success', text: 'Question type updated successfully.' });
            } else {
                await questionTypeService.createQuestionType(payload);
                setMessage({ type: 'success', text: 'Question type created successfully.' });
            }
            setShowModal(false);
            fetchTypes();
        } catch (error) {
            console.error('Error saving question type', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save question type.' });
        } finally {
            setSaving(false);
        }
    };
    
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this question type? This may affect existing questions.')) return;
        
        try {
            await questionTypeService.deleteQuestionType(id);
            setMessage({ type: 'success', text: 'Question type deleted successfully.' });
            fetchTypes();
        } catch (error) {
            console.error('Error deleting question type', error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete question type.' });
        }
    };
    
    const openEditModal = (type) => {
        setCurrentType({
            ...type,
            schemaTemplate: typeof type.schemaTemplate === 'string' ? type.schemaTemplate : JSON.stringify(type.schemaTemplate, null, 2)
        });
        setShowModal(true);
    };
    
    const openCreateModal = () => {
        setCurrentType({
            name: '',
            code: '',
            isSystemDefault: false,
            schemaTemplate: '{\n  "fields": []\n}',
            aiPromptTemplate: ''
        });
        setShowModal(true);
    };

    const generateMarkdownPrompt = (type) => {
        let schemaStr = type.schemaTemplate;
        if (typeof schemaStr !== 'string') {
            schemaStr = JSON.stringify(schemaStr, null, 2);
        }
        
        return `# Question Generation Prompt: ${type.name} (${type.code})

I am building dynamic questions for my Question Bank system. Please generate questions for me.

## Guidelines & Instructions
${type.aiPromptTemplate || 'Please follow standard educational guidelines for this question type.'}

## Expected JSON Output Format
You MUST return your output strictly in the following JSON schema format. Ensure it is perfectly valid JSON.

\`\`\`json
${schemaStr}
\`\`\`
`;
    };

    const copyMarkdownPrompt = (type) => {
        const prompt = generateMarkdownPrompt(type);
        navigator.clipboard.writeText(prompt);
        setMessage({ type: 'success', text: 'AI Prompt Markdown copied to clipboard!' });
        setTimeout(() => setMessage(null), 3000);
    };

    const copySchemaHelperPrompt = () => {
        const prompt = `# Help Me Create a Dynamic Question Type

I am creating a new dynamic question type for my Question Bank system (e.g., "Matching Table", "Fill in the Blanks", "True/False").

Please generate two things for me:
1. **JSON Schema Template**: This defines the exact data structure that will store the question data in my system. It should be a valid JSON object, usually containing arrays or nested objects to hold the question, options, and correct answers.
2. **AI Prompt Template**: A set of clear instructions that I will save in my system. Later, I will use these instructions to tell an AI how to generate thousands of questions matching the exact schema you provide.

Please give me your response in the following format:

### JSON Schema
\`\`\`json
{
  // Your schema here
}
\`\`\`

### AI Prompt Template
[Your instructions here...]
`;
        navigator.clipboard.writeText(prompt);
        setMessage({ type: 'success', text: 'Helper Prompt copied! Paste it in ChatGPT/Claude.' });
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Box size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Question Types</h1>
                        <p className="text-slate-500 mt-1">Manage dynamic forms and schemas for question generation.</p>
                    </div>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-md shadow-indigo-200"
                >
                    <Plus size={20} />
                    Add Type
                </button>
            </div>

            {message && (
                <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={18} /> : <Shield size={18} />}
                    {message.text}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20 text-slate-400">
                    <RefreshCw className="animate-spin" size={32} />
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Code</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {types.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="text-center py-10 text-slate-400">No question types found.</td>
                                </tr>
                            ) : (
                                types.map((type) => (
                                    <tr key={type.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-800">{type.name}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{type.code}</td>
                                        <td className="px-6 py-4">
                                            {type.isSystemDefault ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">System Default</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">Dynamic</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => copyMarkdownPrompt(type)}
                                                title="Copy AI Prompt Markdown"
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button 
                                                onClick={() => openEditModal(type)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            {!type.isSystemDefault && (
                                                <button 
                                                    onClick={() => handleDelete(type.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {showModal && (
                <div className="fixed inset-y-0 right-0 z-50 left-0 lg:left-64 bg-slate-900/30 backdrop-blur-xs flex justify-end transition-all duration-300 animate-in fade-in">
                    <div className="bg-slate-50 w-full h-full flex flex-col shadow-2xl relative border-l border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                            <div className="flex items-center gap-4">
                                <h3 className="font-black text-lg text-slate-800 tracking-tight">
                                    {currentType.id ? 'Edit Question Type' : 'Create Question Type'}
                                </h3>
                                <button 
                                    onClick={copySchemaHelperPrompt}
                                    className="text-xs flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-250 transition-colors shadow-sm"
                                    title="Copy a prompt to ask ChatGPT to build the schema for you"
                                >
                                    <Code size={14} /> AI Builder Prompt
                                </button>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-6 bg-[#F8FAFC]">
                            <div className="w-full lg:w-[320px] shrink-0 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">সাধারণ তথ্য (Basic Info)</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Type Name</label>
                                    <input 
                                        type="text" 
                                        value={currentType.name}
                                        onChange={(e) => setCurrentType({...currentType, name: e.target.value})}
                                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-semibold text-slate-800"
                                        placeholder="e.g. Matching, Fill in the Blanks"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Unique Code</label>
                                    <input 
                                        type="text" 
                                        value={currentType.code}
                                        disabled={currentType.isSystemDefault}
                                        onChange={(e) => setCurrentType({...currentType, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 uppercase font-mono text-xs outline-none transition-all font-bold text-slate-800"
                                        placeholder="e.g. MATCHING, FILL_BLANKS"
                                    />
                                </div>
                                
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-xs font-bold text-slate-600">AI Prompt Template</label>
                                        <button 
                                            type="button"
                                            onClick={() => copyMarkdownPrompt(currentType)}
                                            className="text-[10px] flex items-center gap-1 font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-100 transition-all shadow-sm"
                                        >
                                            <Copy size={12} /> Copy Full Prompt
                                        </button>
                                    </div>
                                    <textarea 
                                        value={currentType.aiPromptTemplate}
                                        onChange={(e) => setCurrentType({...currentType, aiPromptTemplate: e.target.value})}
                                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 h-40 text-xs outline-none transition-all text-slate-700 font-sans"
                                        placeholder="Instructions for the AI on how to generate questions of this type..."
                                    />
                                </div>
                                
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <input 
                                        type="checkbox" 
                                        id="isSystemDefault"
                                        checked={currentType.isSystemDefault}
                                        disabled={true}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-not-allowed"
                                    />
                                    <label htmlFor="isSystemDefault" className="text-xs font-bold text-slate-600 cursor-not-allowed">System Default (Cannot be deleted)</label>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
                                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">স্কিমা কনফিগারেশন (Schema Configuration)</h4>
                                    <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-100 p-0.5">
                                        <button 
                                            type="button"
                                            onClick={() => setEditorMode('visual')}
                                            className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${editorMode === 'visual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Visual Builder
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setEditorMode('json')}
                                            className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${editorMode === 'json' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Raw JSON
                                        </button>
                                    </div>
                                </div>
                                {editorMode === 'visual' ? (
                                    <VisualSchemaBuilder 
                                        value={currentType.schemaTemplate}
                                        onChange={(val) => setCurrentType({...currentType, schemaTemplate: val})}
                                    />
                                ) : (
                                    <textarea 
                                        value={currentType.schemaTemplate}
                                        onChange={(e) => setCurrentType({...currentType, schemaTemplate: e.target.value})}
                                        className="w-full flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-mono text-xs bg-slate-900 text-emerald-400 min-h-[350px]"
                                        placeholder='{"fields": []}'
                                    />
                                )}
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all active:scale-[0.97]"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                Save Type
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuestionTypes;
