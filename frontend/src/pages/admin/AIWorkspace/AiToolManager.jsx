import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Plus, Code, Box, Edit2, Trash2, Info, Eye, ArrowLeft, CheckCircle, Loader2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../utils/axios';
import Editor from '@monaco-editor/react';
import { LiveProvider, LiveError, LivePreview } from 'react-live';
import * as LucideIcons from 'lucide-react';

const scope = {
    React,
    useState: React.useState,
    useEffect: React.useEffect,
    axios,
    ...LucideIcons,
    Map: window.Map,
    Image: window.Image,
    Link: window.Link,
    Option: window.Option,
    // Mock global context for the editor preview
    globalUser: { id: 'mock-user', name: 'Test Teacher' },
    globalSelectedSubject: null // Default to null, the component should handle it gracefully or fetch directly if null
};

const DEFAULT_CODE = `function CustomWidget() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState("");

  const handleAction = () => {
    setLoading(true);
    setTimeout(() => {
      setData("Success!");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-[480px] rounded-2xl border border-slate-200 shadow-sm bg-white mt-3 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-indigo-600 font-bold text-[13px]">
        <CheckCircle size={14} /> My Dynamic Tool
      </div>
      <div className="p-4">
        <p className="text-[13px] text-slate-600 mb-4">Write your custom React logic here!</p>
        
        {data && (
            <div className="mb-3 p-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-200 flex items-center gap-2">
                <CheckCircle size={14}/> {data}
            </div>
        )}

        <button 
          onClick={handleAction}
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-[13px] font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Execute Action
        </button>
      </div>
    </div>
  );
}

render(<CustomWidget />);
`;

const AiToolManager = () => {
    const navigate = useNavigate();
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [formData, setFormData] = useState({ 
        id: null, 
        name: '', 
        displayName: '', 
        description: '', 
        frontendPath: '', 
        schemaJson: DEFAULT_CODE, 
        active: true 
    });
    
    const [customPrompt, setCustomPrompt] = useState('');
    const [sampleJson, setSampleJson] = useState('');
    const [apiTestPath, setApiTestPath] = useState('');
    const [availableEndpoints, setAvailableEndpoints] = useState([]);
    const [isFetchingApi, setIsFetchingApi] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        fetchTools();
    }, []);

    const fetchTools = async () => {
        try {
            const { data } = await axios.get('/v1/ai/tools');
            if (data.success) {
                setTools(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch tools", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSampleApi = async () => {
        if (!apiTestPath) return;
        setIsFetchingApi(true);
        try {
            const { data } = await axios.get(apiTestPath.startsWith('/') ? apiTestPath : `/${apiTestPath}`);
            setSampleJson(JSON.stringify(data, null, 2));
        } catch (error) {
            setSampleJson(`// Error fetching data from ${apiTestPath}\n` + JSON.stringify(error.response?.data || error.message, null, 2));
        } finally {
            setIsFetchingApi(false);
        }
    };

    const handleScanGenerate = async () => {
        if (!formData.frontendPath) {
            alert("Please enter a Frontend Path first.");
            return;
        }
        setIsGenerating(true);
        try {
            const { data } = await axios.post('/v1/ai/tools/scan-generate', {
                frontendPath: formData.frontendPath,
                customPrompt: customPrompt + " \n\nIMPORTANT: Return ONLY raw React JSX code for a component (no markdown wrappers like \`\`\`jsx). The code must end with render(<ComponentName />); Uses Tailwind CSS and lucide-react icons.",
                sampleJson: sampleJson
            });
            if (data.success && data.data) {
                // Strip markdown wrappers if AI still returns them
                let code = data.data;
                code = code.replace(/^\`\`\`jsx?\n/, '').replace(/\n\`\`\`$/, '');
                setFormData(prev => ({...prev, schemaJson: code}));
            }
        } catch (error) {
            console.error("Failed to generate code", error);
            alert("AI Generation failed. Is Gemini API configured?");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const { data } = await axios.post('/v1/ai/tools', formData);
            if (data.success) {
                fetchTools();
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error("Failed to save tool", error);
        }
    };

    const handleEditCode = (value) => {
        setFormData({...formData, schemaJson: value});
    };

    const openNewTool = () => {
        setFormData({ 
            id: null, 
            name: '', 
            displayName: '', 
            description: '', 
            frontendPath: '', 
            schemaJson: DEFAULT_CODE, 
            active: true 
        });
        setIsModalOpen(true);
    };

    if (isModalOpen) {
        return (
            <div className="p-6 w-full h-[calc(100vh-80px)] flex flex-col">
                <div className="flex items-center justify-between mb-6 shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Code className="text-indigo-600" /> React Tool Studio
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            Write or AI-generate live React JSX code to build Chatbot Widgets
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-all"
                    >
                        <ArrowLeft size={16} /> Back to List
                    </button>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-1 overflow-hidden"
                >
                    {/* Left Side: Form & Editor */}
                    <div className="w-1/2 overflow-y-auto border-r border-slate-200 bg-white flex flex-col">
                        <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
                            <form id="toolForm" onSubmit={handleSave} className="space-y-4 max-w-3xl mx-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tool Identifier</label>
                                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. AUTO_EXAM_GENERATOR" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-[13px]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                                        <input required value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="e.g. Magic Exam Generator" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-[13px]" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frontend Path</label>
                                        <input value={formData.frontendPath} onChange={e => setFormData({...formData, frontendPath: e.target.value})} placeholder="e.g. /exams/generate/auto" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-[13px]" />
                                    </div>
                                    <div className="flex flex-col justify-end">
                                        <div className="flex items-center gap-2 pb-2">
                                            <input type="checkbox" id="isActive" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded border-slate-300" />
                                            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">Tool is Active</label>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        {/* Monaco Editor Section */}
                        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
                            <div className="flex bg-[#2d2d2d] px-4 py-2 text-xs text-slate-400 font-mono items-center justify-between border-b border-black/40 shrink-0">
                                <div className="flex gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                </div>
                                <span className="flex items-center gap-1.5"><Code size={12}/> WidgetCode.jsx</span>
                                <div></div>
                            </div>
                            <div className="flex-1 min-h-[300px]">
                                <Editor
                                    height="100%"
                                    defaultLanguage="javascript"
                                    theme="vs-dark"
                                    value={formData.schemaJson}
                                    onChange={handleEditCode}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 13,
                                        wordWrap: "on",
                                        formatOnPaste: true,
                                        scrollBeyondLastLine: false,
                                    }}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                            <button type="submit" form="toolForm" className="px-5 py-2 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2">
                                <Code size={16} /> Save React Tool
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Live Preview & AI */}
                    <div className="w-1/2 bg-[#f8fafc] p-6 overflow-y-auto flex flex-col relative">
                        <div className="flex-1 w-full max-w-lg mx-auto flex flex-col">
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-4 uppercase tracking-wider shrink-0">
                                <Eye size={16} /> Live React Widget Preview
                            </div>
                            
                            <div className="flex-1 border-[3px] border-dashed border-slate-200 rounded-[2rem] bg-white p-6 overflow-y-auto relative min-h-[400px] shadow-sm mb-6">
                                <LiveProvider code={formData.schemaJson || ''} scope={scope} noInline={true}>
                                    <div className="w-full">
                                        <div className="flex gap-2 items-center mb-3 text-sm text-slate-600">
                                            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center"><span className="text-white text-[10px] font-bold">AI</span></div>
                                            Welcome to {formData.displayName || 'Dynamic Tool'}!
                                        </div>
                                        <LivePreview />
                                        <LiveError className="text-red-500 text-[11px] mt-4 bg-red-50 p-3 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap border border-red-100" />
                                    </div>
                                </LiveProvider>
                            </div>
                            
                            {/* AI Copilot Prompt Area */}
                            <div className="shrink-0 bg-white border border-indigo-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 p-2 opacity-[0.03] text-indigo-900 pointer-events-none"><Box size={120}/></div>
                                <div className="flex items-center justify-between mb-3 relative z-10">
                                    <div className="flex items-center gap-2 text-indigo-800 font-bold text-sm">
                                        <span className="flex h-2.5 w-2.5 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                        </span>
                                        AI Code Generator
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <textarea 
                                        value={customPrompt} 
                                        onChange={e => setCustomPrompt(e.target.value)} 
                                        placeholder="Prompt AI to generate React code (e.g. 'Build a beautiful MCQ selection UI using Lucide icons...')" 
                                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none text-[13px] text-slate-700 placeholder:text-slate-400 resize-none h-20 shadow-inner mb-3" 
                                    />
                                    {/* Mini API Explorer */}
                                    <div className="flex gap-2 mb-3">
                                        <div className="flex-1 relative">
                                            <select 
                                                value={apiTestPath}
                                                onChange={e => setApiTestPath(e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/30 outline-none text-[12px] text-slate-700 shadow-sm appearance-none cursor-pointer"
                                            >
                                                <option value="" disabled>Select Backend API to fetch sample data...</option>
                                                {availableEndpoints.map((ep, idx) => (
                                                    <option key={idx} value={ep.path}>
                                                        {ep.method} {ep.path} ({ep.controller.replace('Controller', '')})
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={fetchSampleApi}
                                            disabled={isFetchingApi || !apiTestPath}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                                        >
                                            {isFetchingApi ? 'Fetching...' : 'Fetch JSON'}
                                        </button>
                                    </div>

                                    <textarea 
                                        value={sampleJson} 
                                        onChange={e => setSampleJson(e.target.value)} 
                                        placeholder="[Optional] Paste sample JSON data here for 100% accurate API data mapping..." 
                                        className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-400/40 outline-none text-[12px] font-mono text-slate-600 placeholder:text-indigo-300 resize-none h-24 shadow-inner" 
                                    />
                                    <div className="flex justify-between items-center mt-3">
                                        <div className="text-[11px] text-slate-500 max-w-[60%] leading-tight">
                                            Providing sample JSON guarantees the AI maps API response fields perfectly without guessing.
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={handleScanGenerate}
                                            disabled={isGenerating || !formData.frontendPath}
                                            className={`flex items-center gap-2 text-[13px] text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all ${isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'}`}
                                        >
                                            {isGenerating ? (
                                                <><div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></div> Generating React Code...</>
                                            ) : (
                                                <><Box size={16} /> Auto-Code via AI</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="p-6 w-full mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Code className="text-indigo-600" /> React Tool & Widget Manager
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Write, test, and deploy Live React JSX Components directly inside Chat Widgets.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate('/ai-workspace')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
                    >
                        <ArrowLeft size={16} />
                        Back to Workspace
                    </button>
                    <button 
                        onClick={openNewTool}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
                    >
                        <Plus size={18} />
                        Add React Tool
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[13px] uppercase tracking-wider font-semibold border-b border-slate-200">
                                <th className="p-4 pl-6">Tool Name</th>
                                <th className="p-4">Widget Type</th>
                                <th className="p-4">Frontend Path</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tools.length > 0 ? tools.map(tool => (
                                <tr key={tool.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6">
                                        <div className="font-semibold text-slate-800">{tool.displayName}</div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{tool.name}</div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        <div className="flex items-center gap-1.5"><Code size={14} className="text-indigo-500"/> React JSX</div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 font-mono text-[13px]">
                                        {tool.frontendPath || 'N/A'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${tool.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {tool.active ? 'ACTIVE' : 'DISABLED'}
                                        </span>
                                    </td>
                                    <td className="p-4 pr-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => { setFormData({...tool, schemaJson: tool.schemaJson || DEFAULT_CODE}); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-500">
                                        No dynamic React tools registered yet. 
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AiToolManager;
