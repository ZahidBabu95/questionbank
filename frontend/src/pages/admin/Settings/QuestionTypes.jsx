import React, { useState, useEffect } from 'react';
import { Plus, Settings, Check, X, Shield, Edit2, Trash2, Box, Eye, Save, Code, RefreshCw } from 'lucide-react';
import questionTypeService from '../../../services/questionTypeService';

const QuestionTypes = () => {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800">
                                {currentType.id ? 'Edit Question Type' : 'Create Question Type'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type Name</label>
                                    <input 
                                        type="text" 
                                        value={currentType.name}
                                        onChange={(e) => setCurrentType({...currentType, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="e.g. Matching, Fill in the Blanks"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Unique Code</label>
                                    <input 
                                        type="text" 
                                        value={currentType.code}
                                        disabled={currentType.isSystemDefault}
                                        onChange={(e) => setCurrentType({...currentType, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 uppercase font-mono text-sm"
                                        placeholder="e.g. MATCHING, FILL_BLANKS"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">AI Prompt Template</label>
                                    <textarea 
                                        value={currentType.aiPromptTemplate}
                                        onChange={(e) => setCurrentType({...currentType, aiPromptTemplate: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-32"
                                        placeholder="Instructions for the AI on how to generate questions of this type..."
                                    />
                                </div>
                                
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <input 
                                        type="checkbox" 
                                        id="isSystemDefault"
                                        checked={currentType.isSystemDefault}
                                        disabled={true}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="isSystemDefault" className="text-sm font-medium text-slate-700">System Default (Cannot be deleted)</label>
                                </div>
                            </div>
                            
                            <div className="flex flex-col h-full">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                                    <Code size={16} /> JSON Schema Template
                                </label>
                                <textarea 
                                    value={currentType.schemaTemplate}
                                    onChange={(e) => setCurrentType({...currentType, schemaTemplate: e.target.value})}
                                    className="w-full flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs bg-slate-900 text-emerald-400 min-h-[300px]"
                                    placeholder='{"fields": []}'
                                />
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
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
