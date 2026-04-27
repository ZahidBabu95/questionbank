import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layers, FileText, Settings, Settings2, ShieldCheck, Unlock, Loader2, Globe, LayoutTemplate, Type, Hash, Eye, Palette } from 'lucide-react';
import PaperCanvasV2 from './components/PaperCanvasV2';
import examService from '../../../../services/examService';
import questionService from '../../../../services/questionService';
import axios from '../../../../utils/axios';

const NexusEditor = () => {
    const { id } = useParams();
    const [editorMode, setEditorMode] = useState('STRICT_LINKED');
    const [rawContent, setRawContent] = useState('');
    
    // Document Settings
    const [paperSize, setPaperSize] = useState('A4');
    const [orientation, setOrientation] = useState('Portrait');
    const [margins, setMargins] = useState('Normal');
    const [columns, setColumns] = useState(1);
    const [fontFamily, setFontFamily] = useState('Outfit');
    const [fontSize, setFontSize] = useState('15px');
    const [zoom, setZoom] = useState(125);
    
    // Header/Footer State
    const [headerText, setHeaderText] = useState('');
    const [footerText, setFooterText] = useState('');
    const [showPageNumbers, setShowPageNumbers] = useState(true);
    
    // UI State
    const [activeTab, setActiveTab] = useState('document'); // document, templates, settings
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isSavingDocument, setIsSavingDocument] = useState(false);
    const [bankQuestions, setBankQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [examData, setExamData] = useState(null);
    
    // Super Dynamic Schema Config
    const [editorConfig, setEditorConfig] = useState(null);
    const [generationBlueprint, setGenerationBlueprint] = useState(null);

    // Fetch existing exam if ID is present
    useEffect(() => {
        if (!id) return;
        const fetchExam = async () => {
            try {
                const res = await examService.getExam(id);
                if (res?.data) {
                    setExamData(res.data);
                    // Map questions to HTML
                    const questionsHtml = (res.data.questions || []).map(q => {
                        const optionsJson = q.options ? JSON.stringify(q.options).replace(/'/g, "&#39;") : "[]";
                        const questionTextEscaped = q.questionText ? q.questionText.replace(/"/g, "&quot;") : "";
                        return `
            <div data-type="question-block" 
                 type="${q.type || 'MCQ'}" 
                 questiontext="${questionTextEscaped}" 
                 chaptername="${q.chapterName || q.subjectName || 'General'}" 
                 marks="${q.marks || 1}" 
                 data-options='${optionsJson}'>
            </div>`;
                    }).join('');
                    
                    const headerHtml = `
                        <h1 style="text-align: center">${res.data.instituteName || 'Your Institute'}</h1>
                        <h3 style="text-align: center">${res.data.className || ''} | ${res.data.subjectName || ''} | ${res.data.title || 'Exam'}</h3>
                        <p style="text-align: center">Time: ${res.data.durationMinutes || 60} Mins &nbsp; | &nbsp; Full Marks: ${res.data.totalMarks || 100}</p>
                        <hr />
                        <br/>
                    `;
                    
                    
                    setRawContent(headerHtml + questionsHtml);

                    // Fetch Subject specific curriculum schema
                    if (res.data.subjectName) {
                        try {
                            const subTag = 'RULE_FOR_' + res.data.subjectName.replace(/\s/g, '');
                            const altTag = res.data.subjectName;
                            
                            const kbRes = await axios.get('/v1/support/knowledge');
                            let rules = kbRes.data.filter(k => 
                                k.tags && (k.tags.includes(subTag) || k.tags.includes(altTag))
                            );

                            if (rules.length === 0) {
                                rules = kbRes.data.filter(k => k.content && k.content.includes(res.data.subjectName));
                            }

                            if (rules.length > 0) {
                                // Prefer the rule that also matches class, if any
                                const matchedRule = rules.find(r => r.tags && r.tags.includes(res.data.className)) || rules[0];
                                const schemaObj = JSON.parse(matchedRule.content);
                                
                                let editorConf = null;
                                let genBlueprint = null;

                                if (Array.isArray(schemaObj)) {
                                    // Legacy fallback
                                    editorConf = {
                                        allowed_blocks: ["MCQ", "CQ", "SHORT"],
                                        toolbar_features: ["math_formula", "draw_canvas", "table"]
                                    };
                                } else {
                                    editorConf = schemaObj.editor_config;
                                    genBlueprint = schemaObj.generation_blueprint;
                                }

                                if (editorConf) setEditorConfig(editorConf);
                                if (genBlueprint) setGenerationBlueprint(genBlueprint);
                            }
                        } catch (schemaErr) {
                            console.error("Failed to load dynamic schema for subject:", schemaErr);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load exam:", err);
            }
        };
        fetchExam();
    }, [id]);

    useEffect(() => {
        const fetchTemplates = async () => {
            setLoadingTemplates(true);
            try {
                const res = await examService.getTemplates();
                if (res?.data) {
                    setTemplates(res.data);
                }
            } catch (err) {
                console.error("Failed to load templates:", err);
            } finally {
                setLoadingTemplates(false);
            }
        };
        fetchTemplates();
    }, []);

    // Fetch real questions for Question Bank
    useEffect(() => {
        const fetchQuestions = async () => {
            setLoadingQuestions(true);
            try {
                // Fetch paginated approved questions
                const res = await questionService.getAllQuestionsPaginated({ 
                    page: 0, 
                    size: 15, 
                    search: searchQuery,
                    filterStatus: 'APPROVED'
                });
                if (res?.data?.content) {
                    setBankQuestions(res.data.content);
                }
            } catch (err) {
                console.error("Failed to load bank questions:", err);
            } finally {
                setLoadingQuestions(false);
            }
        };
        const timer = setTimeout(() => fetchQuestions(), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const applyTemplate = (template) => {
        if (template.structureJson) {
            setRawContent(template.structureJson);
        } else {
            setRawContent(`
                <h1 style="text-align: center">${template.templateName}</h1>
                <p style="text-align: center">Start writing your ${template.templateName} content here...</p>
            `);
        }
    };

    const handleSaveTemplate = async () => {
        const templateName = window.prompt("Enter a name for this new template:\n(e.g., 'Weekly Class Test Format')");
        if (!templateName || templateName.trim() === '') return;
        
        setIsSavingTemplate(true);
        try {
            const payload = {
                templateName: templateName.trim(),
                isGlobal: false,
                structureJson: rawContent
            };
            const res = await examService.createTemplate(payload);
            if (res?.data) {
                setTemplates(prev => [...prev, res.data]);
            }
        } catch (err) {
            console.error("Failed to save template:", err);
            alert("Error saving template. Please try again.");
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleDragStart = (e, q) => {
        // We pack the question data into the drag event payload
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'questionBlock',
            attrs: {
                type: q.type || 'MCQ',
                questionText: q.questionText,
                chapterName: q.chapterName || q.subjectName || 'General',
                marks: q.marks || 1,
                options: q.options || []
            }
        }));
    };

    const handleSaveDocument = async () => {
        const title = window.prompt("Enter a title for this document/exam:");
        if (!title || title.trim() === '') return;

        setIsSavingDocument(true);
        try {
            const payload = {
                title: title.trim(),
                examCode: "NEXUS-" + Math.floor(Math.random() * 10000), // Simple mock code
                editorMode: editorMode,
                rawContent: rawContent,
                isAutoGenerated: false,
                status: 'DRAFT'
            };
            const res = await examService.createManualExam(payload);
            if (res?.data) {
                alert("Document saved successfully as an Exam!");
            }
        } catch (err) {
            console.error("Failed to save document:", err);
            alert("Error saving document. Please try again.");
        } finally {
            setIsSavingDocument(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-outfit overflow-hidden">
            {/* Header / Ribbon Mockup */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                        <Layers size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 leading-none">Nexus Paper Engine</h1>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest mt-1">Enterprise V2 Builder</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button 
                            onClick={() => setEditorMode('STRICT_LINKED')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${editorMode === 'STRICT_LINKED' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ShieldCheck size={14} /> Strict Analytics Mode
                        </button>
                        <button 
                            onClick={() => setEditorMode('DISCONNECTED_FREE_EDIT')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${editorMode === 'DISCONNECTED_FREE_EDIT' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Unlock size={14} /> Free-Edit Mode
                        </button>
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                        <button 
                            onClick={handleSaveTemplate}
                            disabled={isSavingTemplate}
                            className={`px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isSavingTemplate ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-slate-300'}`}
                        >
                            {isSavingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} />}
                            {isSavingTemplate ? 'Saving...' : 'Save as Template'}
                        </button>
                        <button 
                            onClick={handleSaveDocument}
                            disabled={isSavingDocument}
                            className={`px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSavingDocument ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            {isSavingDocument ? 'Saving...' : 'Save Document'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Question Bank */}
                <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Layers size={14} className="text-indigo-500" /> Question Bank
                        </h2>
                        <input 
                            type="text" 
                            placeholder="Search questions..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50">
                        {loadingQuestions ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
                        ) : bankQuestions.length > 0 ? (
                            bankQuestions.map(q => {
                                const allowedBlocks = editorConfig?.allowed_blocks || ["MCQ", "CQ", "SHORT"];
                                const isAllowed = allowedBlocks.includes(q.type) || !q.type;
                                
                                return (
                                <div 
                                    key={q.id} 
                                    draggable={isAllowed} 
                                    onDragStart={(e) => isAllowed ? handleDragStart(e, q) : e.preventDefault()}
                                    className={`bg-white p-3 rounded-xl border shadow-sm transition-all group select-none ${isAllowed ? 'border-slate-200 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md' : 'border-red-100 opacity-50 cursor-not-allowed bg-red-50/30'}`}
                                    title={isAllowed ? "Drag me to the canvas!" : "This question type is not allowed for this subject's curriculum"}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${q.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {q.type || 'Q'}
                                            </span>
                                            {q.status !== 'APPROVED' && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">
                                                    {q.status || 'DRAFT'}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">{q.chapterName || q.subjectName || 'General'}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 font-medium line-clamp-2" dangerouslySetInnerHTML={{__html: q.questionText}}></p>
                                    {!isAllowed && (
                                        <p className="text-[9px] font-bold text-red-500 mt-2">❌ Type Restricted by Curriculum</p>
                                    )}
                                </div>
                            )})
                        ) : (
                            <div className="text-center p-4 text-xs text-slate-400 font-medium">No questions found in bank.</div>
                        )}
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 overflow-auto p-4 custom-scrollbar relative bg-slate-200/60">
                    <div className="w-max min-w-full flex justify-center min-h-full pb-32 mx-auto">
                        {/* Tiptap Editor Canvas */}
                        <PaperCanvasV2 
                            editorMode={editorMode} 
                            rawContent={rawContent}
                            setRawContent={setRawContent}
                            paperSize={paperSize}
                            orientation={orientation}
                            margins={margins}
                            columns={columns}
                            fontFamily={fontFamily}
                            fontSize={fontSize}
                            zoom={zoom}
                            headerText={headerText}
                            footerText={footerText}
                            editorConfig={editorConfig}
                        />
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-72 bg-white border-l border-slate-200 p-4 shrink-0 flex flex-col">
                    <div className="flex border-b border-slate-200 mb-4">
                        <button 
                            onClick={() => setActiveTab('document')}
                            className={`flex-1 pb-2 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 flex justify-center gap-1.5 items-center ${activeTab === 'document' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <FileText size={14} /> Doc
                        </button>
                        <button 
                            onClick={() => setActiveTab('templates')}
                            className={`flex-1 pb-2 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 flex justify-center gap-1.5 items-center ${activeTab === 'templates' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutTemplate size={14} /> Tmplt
                        </button>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            className={`flex-1 pb-2 text-[11px] font-bold uppercase tracking-wider transition-all border-b-2 flex justify-center gap-1.5 items-center ${activeTab === 'settings' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            <Settings2 size={14} /> Adv.
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {/* Tab 1: Document Settings */}
                        {activeTab === 'document' && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <LayoutTemplate size={14} className="text-indigo-500" /> Page Setup
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Paper Size</label>
                                            <div className="flex gap-2 mb-2">
                                                <button 
                                                    onClick={() => setOrientation('Portrait')}
                                                    className={`flex-1 py-1 text-xs font-bold rounded border ${orientation === 'Portrait' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                                >
                                                    Portrait
                                                </button>
                                                <button 
                                                    onClick={() => setOrientation('Landscape')}
                                                    className={`flex-1 py-1 text-xs font-bold rounded border ${orientation === 'Landscape' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                                >
                                                    Landscape
                                                </button>
                                            </div>
                                            <select 
                                                value={paperSize} 
                                                onChange={e => setPaperSize(e.target.value)}
                                                className="w-full text-sm font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 mb-3"
                                            >
                                                <option value="A4">A4 (210 x 297mm)</option>
                                                <option value="A5">A5 (148 x 210mm)</option>
                                                <option value="Legal">Legal (8.5 x 14in)</option>
                                                <option value="Letter">Letter (8.5 x 11in)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Margins & Columns</label>
                                            <div className="flex gap-2">
                                                <select 
                                                    value={margins} 
                                                    onChange={e => setMargins(e.target.value)}
                                                    className="w-full text-sm font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
                                                >
                                                    <option value="Normal">Normal (1")</option>
                                                    <option value="Narrow">Narrow (0.5")</option>
                                                    <option value="Wide">Wide (1.5")</option>
                                                </select>
                                                <select 
                                                    value={columns} 
                                                    onChange={e => setColumns(Number(e.target.value))}
                                                    className="w-full text-sm font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
                                                >
                                                    <option value={1}>1 Column</option>
                                                    <option value={2}>2 Columns</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <Type size={14} className="text-indigo-500" /> Typography
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Font Family</label>
                                            <select 
                                                value={fontFamily} 
                                                onChange={e => setFontFamily(e.target.value)}
                                                className="w-full text-sm font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
                                            >
                                                <option value="Outfit">Outfit (Modern)</option>
                                                <option value="Inter">Inter (Clean)</option>
                                                <option value="Tiro Bangla">Tiro Bangla (Serif)</option>
                                                <option value="Kalpurush">Kalpurush (Classic)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Base Font Size</label>
                                            <select 
                                                value={fontSize} 
                                                onChange={e => setFontSize(e.target.value)}
                                                className="w-full text-sm font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
                                            >
                                                <option value="12px">Small (12px)</option>
                                                <option value="14px">Medium (14px)</option>
                                                <option value="15px">Default (15px)</option>
                                                <option value="16px">Large (16px)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Templates */}
                        {activeTab === 'templates' && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Globe size={14} className="text-blue-500" /> Available Templates
                            </h3>
                            
                            {loadingTemplates ? (
                                <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                    <Loader2 className="animate-spin mb-2" size={24} />
                                    <span className="text-xs font-medium uppercase tracking-widest">Loading...</span>
                                </div>
                            ) : templates.length > 0 ? (
                                <div className="space-y-2">
                                    {templates.map(tpl => (
                                        <button 
                                            key={tpl.id}
                                            onClick={() => applyTemplate(tpl)}
                                            className="w-full flex flex-col text-left px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all group"
                                        >
                                            <span className="text-sm text-slate-700 font-bold group-hover:text-indigo-600 transition-colors">
                                                {tpl.templateName}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">
                                                {tpl.global ? 'Global Template' : 'Institute Custom'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-xs text-slate-500 font-medium">No templates found.<br/>Create one from settings.</p>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Tab 3: Advanced Settings */}
                        {activeTab === 'settings' && (
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <Eye size={14} className="text-emerald-500" /> Display Elements
                                    </h3>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={showPageNumbers}
                                                onChange={e => setShowPageNumbers(e.target.checked)}
                                                className="w-4 h-4 rounded text-emerald-500 border-slate-300 focus:ring-emerald-500"
                                            />
                                            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">Show Page Numbers</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                defaultChecked={true}
                                                className="w-4 h-4 rounded text-emerald-500 border-slate-300 focus:ring-emerald-500"
                                            />
                                            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">Show Watermark</span>
                                        </label>
                                        <hr className="border-slate-200 my-2" />
                                        <label className="flex items-center justify-between group">
                                            <span className="text-xs font-bold text-slate-600">Canvas Zoom</span>
                                            <select 
                                                value={zoom}
                                                onChange={e => setZoom(Number(e.target.value))}
                                                className="text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1 outline-none text-emerald-600 focus:border-emerald-400"
                                            >
                                                <option value={200}>200%</option>
                                                <option value={150}>150%</option>
                                                <option value={125}>125%</option>
                                                <option value={100}>100%</option>
                                                <option value={80}>80%</option>
                                                <option value={60}>60%</option>
                                                <option value={50}>50%</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                        <Hash size={14} className="text-amber-500" /> Header & Footer
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Top Header</label>
                                            <input 
                                                type="text" 
                                                value={headerText}
                                                onChange={e => setHeaderText(e.target.value)}
                                                placeholder="e.g. Institute Name"
                                                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bottom Footer</label>
                                            <input 
                                                type="text" 
                                                value={footerText}
                                                onChange={e => setFooterText(e.target.value)}
                                                placeholder="e.g. Confidential Exam"
                                                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NexusEditor;
