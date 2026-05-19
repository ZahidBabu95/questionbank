import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Book, FileText, Component as ComponentIcon, Folder, Database, Search, Target, CheckCircle2, Save, FileJson, Loader2, ArrowRightCircle, Check, ChevronRight, Eye, ExternalLink, Code, Pencil, Sparkles, AlertTriangle, Zap } from 'lucide-react';
import axios from '../../../utils/axios';
import academicService from '../../../services/academicService';
import { Link } from 'react-router-dom';

const CurriculumRules = () => {
    // --- Unified Multi-Select State ---
    const [ruleTarget, setRuleTarget] = useState({
        educationLevel: '', tags: '', className: '', subjectName: ''
    });

    const [academicLevels, setAcademicLevels] = useState([]);
    const [globalStreams, setGlobalStreams] = useState([]);
    const [globalClasses, setGlobalClasses] = useState([]);
    const [globalSubjects, setGlobalSubjects] = useState([]);

    const [filteredStreams, setFilteredStreams] = useState([]);
    const [filteredClasses, setFilteredClasses] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);

    const [showLevelDropdown, setShowLevelDropdown] = useState(false);
    const [showStreamDropdown, setShowStreamDropdown] = useState(false);
    const [showClassDropdown, setShowClassDropdown] = useState(false);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

    // Refs for outside-click detection (keeps dropdowns open during multi-select)
    const levelRef   = useRef(null);
    const streamRef  = useRef(null);
    const classRef   = useRef(null);
    const subjectRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (levelRef.current   && !levelRef.current.contains(e.target))   setShowLevelDropdown(false);
            if (streamRef.current  && !streamRef.current.contains(e.target))  setShowStreamDropdown(false);
            if (classRef.current   && !classRef.current.contains(e.target))   setShowClassDropdown(false);
            if (subjectRef.current && !subjectRef.current.contains(e.target)) setShowSubjectDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const [loadingHierarchy, setLoadingHierarchy] = useState(false);

    // --- Mapped Data State ---
    const [mappedDocuments, setMappedDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [selectedDocId, setSelectedDocId] = useState(null);

    const [jsonRuleId, setJsonRuleId] = useState(null);
    const [jsonSchema, setJsonSchema] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [schemaViewMode, setSchemaViewMode] = useState('edit'); // 'edit' | 'preview'
    const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);

    // --- Text Input Mode ---
    const [showTextInput, setShowTextInput] = useState(false);
    const [sampleText, setSampleText] = useState('');
    const [userPrompt, setUserPrompt] = useState('');
    const [isGeneratingFromText, setIsGeneratingFromText] = useState(false);

    // Initial Load
    const [dynamicTypes, setDynamicTypes] = useState([]);
    
    useEffect(() => {
        fetchAcademicStructure();
        fetchDynamicTypes();
    }, []);

    const fetchDynamicTypes = async () => {
        try {
            const { data } = await axios.get('/v1/question-types');
            setDynamicTypes(data);
        } catch (err) {
            console.error('Failed to fetch dynamic types', err);
        }
    };

    const fetchAcademicStructure = async () => {
        setLoadingHierarchy(true);
        try {
            // Single API call replaces 20+ individual calls (prevents thread pool exhaustion)
            const hierarchy = await academicService.getHierarchy();
            
            setAcademicLevels(hierarchy.levels || []);
            setGlobalStreams(hierarchy.streams || []);
            setGlobalClasses(hierarchy.classes || []);
            setGlobalSubjects(hierarchy.subjects || []);
            
            setFilteredStreams(hierarchy.streams || []);
            setFilteredClasses(hierarchy.classes || []);
            setFilteredSubjects(hierarchy.subjects || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingHierarchy(false);
        }
    };

    // --- Cascading Logic (CurriculumLibrary-proven pattern) ---
    // Single useEffect for Level → Stream → Class cascading (all in-memory, no API calls)
    useEffect(() => {
        // 1. Filter Streams by chosen Level(s)
        const chosenLevels = ruleTarget.educationLevel ? ruleTarget.educationLevel.split(',').map(s => s.trim()).filter(Boolean) : [];
        const validStreams = chosenLevels.length > 0 
            ? globalStreams.filter(s => chosenLevels.includes(s._levelName))
            : globalStreams; 
        setFilteredStreams(validStreams);
        
        // 2. Filter Classes by chosen Stream(s) — only those belonging to valid (selected-level) streams
        const rawChosenStreamNames = ruleTarget.tags ? ruleTarget.tags.split(',').filter(t => t.includes('Stream:')).map(t => t.replace('Stream:', '').trim()) : [];
        const validChosenStreams = validStreams.filter(vs => rawChosenStreamNames.includes(vs.name));
        const validStreamIds = validChosenStreams.map(vs => vs.id);
        
        let validClasses;
        if (validStreamIds.length > 0) {
            // Stream selected → show classes under those streams
            validClasses = globalClasses.filter(c => validStreamIds.includes(c._streamId));
        } else if (chosenLevels.length > 0) {
            // Level selected but no Stream → show classes under all streams of that level
            const allValidStreamIds = validStreams.map(vs => vs.id);
            validClasses = globalClasses.filter(c => allValidStreamIds.includes(c._streamId));
        } else {
            validClasses = globalClasses;
        }
        setFilteredClasses(validClasses);
        
    }, [ruleTarget.educationLevel, ruleTarget.tags, globalStreams, globalClasses]);

    // Subject filtering: fetch from API ONLY when Class is selected (matches CurriculumLibrary pattern)
    useEffect(() => {
        const fetchLinkedSubjects = async () => {
            const classNames = ruleTarget.className ? ruleTarget.className.split(',').map(s => s.trim()).filter(Boolean) : [];
            const matchedClasses = filteredClasses.filter(fc => classNames.includes(fc.name));
            
            if (matchedClasses.length === 0) {
                // No class selected → show all global subjects (or empty if level/stream is selected)
                if (!ruleTarget.educationLevel && !ruleTarget.tags) {
                    setFilteredSubjects(globalSubjects);
                } else {
                    setFilteredSubjects([]);
                }
                return;
            }
            
            try {
                let linkedSubjs = [];
                const resPromises = matchedClasses.map(cls => academicService.getSubjectsByClass(cls.id));
                const results = await Promise.all(resPromises);
                
                results.forEach(res => {
                    if (res) {
                        res.forEach(item => {
                            const subjObject = {
                                id: item.subjectId || item.id,
                                subjectName: item.subjectName || item.name || (item.subject && item.subject.name)
                            };
                            
                            if (subjObject.subjectName && !linkedSubjs.find(s => s.subjectName === subjObject.subjectName)) {
                                linkedSubjs.push(subjObject);
                            }
                        });
                    }
                });
                
                setFilteredSubjects(linkedSubjs);
            } catch (err) {
                console.error("Failed merging class subjects", err);
                setFilteredSubjects([]);
            }
        };
        fetchLinkedSubjects();
    }, [ruleTarget.className, filteredClasses, globalSubjects, ruleTarget.educationLevel, ruleTarget.tags]);

    // When a Subject is selected, fetch associated documents and JSON rules
    // When Subject changes, fetch associated documents and JSON rules
    useEffect(() => {
        if (!ruleTarget.subjectName) {
            setMappedDocuments([]);
            setJsonSchema('');
            setJsonRuleId(null);
            return;
        }
        fetchSubjectContext();
    }, [ruleTarget.subjectName]);

    const fetchSubjectContext = async () => {
        setLoadingDocs(true);
        try {
            // 1. Fetch Documents from Curriculum
            const { data: allDocs } = await axios.get('/v1/curriculum');
            
            const targetClasses = ruleTarget.className ? ruleTarget.className.split(',').map(c => c.trim()) : [];
            const targetSubjects = ruleTarget.subjectName.split(',').map(s => s.trim());

            // Filter
            let filteredDocs = allDocs.filter(doc => {
                const hasClassMatch = targetClasses.length === 0 || targetClasses.some(tc => doc.className && doc.className.includes(tc));
                const hasSubjectMatch = targetSubjects.some(ts => doc.subjectName && doc.subjectName.includes(ts));
                return hasClassMatch && hasSubjectMatch;
            });

            // Sorting by Priority
            const priorityMap = {
                'SAMPLE_PAPER': 1, 'QUESTION_GUIDELINE': 2, 'SYLLABUS': 3,
                'CURRICULUM': 4, 'TEXTBOOK': 5, 'OTHER': 99
            };

            filteredDocs.sort((a, b) => (priorityMap[a.docType] || 99) - (priorityMap[b.docType] || 99));
            setMappedDocuments(filteredDocs.slice(0, 5));

            // 2. Fetch Saved JSON Rule (graceful — if API fails, use default schema)
            try {
                const { data: kbData } = await axios.get('/v1/support/knowledge');
                const targetTag = `RULE_FOR_${ruleTarget.subjectName.replace(/\s/g, '')}`;
                const existingRule = kbData.find(kb => kb.tags && kb.tags.includes(targetTag));
                
                if (existingRule) {
                    setJsonRuleId(existingRule.id);
                    setJsonSchema(existingRule.content);
                } else {
                    setJsonRuleId(null);
                    setJsonSchema(generateDefaultMockSchema(ruleTarget.subjectName, ruleTarget.className || 'Any Class', filteredDocs.slice(0, 5)));
                }
            } catch (kbError) {
                console.warn('Knowledge base API unavailable, using default schema:', kbError?.response?.status);
                setJsonRuleId(null);
                setJsonSchema(generateDefaultMockSchema(ruleTarget.subjectName, ruleTarget.className || 'Any Class', filteredDocs.slice(0, 5)));
            }
        } catch (error) {
            console.error('Failed to fetch subject context:', error);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleSaveRule = async () => {
        if (!ruleTarget.subjectName) return;
        setIsSaving(true);
        try {
            const clsString = ruleTarget.className || 'Any Class';
            const subString = ruleTarget.subjectName;
            
            // Map each selected subject to its own RULE_FOR_ tag
            const subjectTags = subString.split(',').map(s => `RULE_FOR_${s.trim().replace(/\s/g, '')}`).join(', ');

            const fullTitle = `Scraping Rule for ${subString} (${clsString})`;
            const payload = {
                title: fullTitle.length > 250 ? fullTitle.substring(0, 247) + '...' : fullTitle,
                content: jsonSchema,
                tags: `${subjectTags}, SCRAPING_JSON, ${clsString}, TARGET_RULE`,
                isActive: true
            };

            if (jsonRuleId) {
                await axios.put(`/v1/support/knowledge/${jsonRuleId}`, payload);
            } else {
                const { data } = await axios.post('/v1/support/knowledge', payload);
                setJsonRuleId(data.id);
            }
            alert('JSON Scraping Rule mapped and saved to AiKnowledgeBase successfully!');
        } catch (error) {
            console.error('Failed to save rule', error);
            alert('Failed to save rule');
        } finally {
            setIsSaving(false);
        }
    };

    const generateDefaultMockSchema = (subName, className, docs = []) => {
        // Build a document-type-aware default schema
        const docTypes = docs.map(d => d.docType);
        const scraping_rules = [];

        if (docTypes.includes('SAMPLE_PAPER') || docTypes.includes('QUESTION_GUIDELINE') || docs.length === 0) {
            scraping_rules.push({
                questionType: 'MULTIPLE_CHOICE',
                questionText: '(AI will extract real questions from the PDFs)',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                answer: '',
                marks: 1,
                totalQuestions: 0,
                instructions: 'Click "🤖 AI Generate" to analyze documents and auto-fill this schema',
                className,
                subjectName: subName,
                bloomLevel: 'REMEMBERING',
                difficulty: 'EASY'
            });
            scraping_rules.push({
                questionType: 'SHORT_ANSWER',
                questionText: '(AI will detect short answer patterns from the PDFs)',
                options: [],
                answer: '',
                marks: 2,
                totalQuestions: 0,
                instructions: 'Auto-detected from document analysis',
                className,
                subjectName: subName,
                bloomLevel: 'UNDERSTANDING',
                difficulty: 'MEDIUM'
            });
            scraping_rules.push({
                questionType: 'CREATIVE',
                questionText: '(AI will map creative/structured question patterns)',
                options: [],
                answer: '',
                marks: 10,
                totalQuestions: 0,
                instructions: 'Structured question with sub-parts (a, b, c, d)',
                className,
                subjectName: subName,
                bloomLevel: 'ANALYZING',
                difficulty: 'HARD'
            });
        }

        if (docTypes.includes('SYLLABUS') || docTypes.includes('CURRICULUM')) {
            scraping_rules.push({
                questionType: 'ESSAY',
                questionText: '(Syllabus-based essay question pattern)',
                options: [],
                answer: '',
                marks: 10,
                totalQuestions: 0,
                instructions: 'Based on curriculum guidelines',
                className,
                subjectName: subName,
                bloomLevel: 'EVALUATING',
                difficulty: 'HARD'
            });
        }

        if (scraping_rules.length === 0) {
            scraping_rules.push({
                questionType: 'MULTIPLE_CHOICE',
                questionText: 'Click "🤖 AI Generate" to analyze documents and build schema',
                options: [],
                answer: '',
                marks: 1,
                className,
                subjectName: subName
            });
        }

        const schema = {
            subject: subName,
            scraping_rules: scraping_rules,
            editor_config: {
                allowed_blocks: ["MCQ", "CQ", "SHORT", "EQUATION", "DIAGRAM"],
                toolbar_features: ["math_formula", "draw_canvas", "table", "image_upload"],
                validation_rules: {
                    CQ_TOTAL_MARKS: 10,
                    MCQ_TOTAL_MARKS: 1,
                    CQ_MAX_SUBPARTS: 4
                }
            },
            generation_blueprint: {
                mandatory_sections: [
                    { name: "বহুনির্বাচনি প্রশ্ন (MCQ)", type: "MCQ", target_ratio: "30%" },
                    { name: "সৃজনশীল প্রশ্ন (CQ)", type: "CQ", target_ratio: "70%" }
                ],
                bloom_target: {
                    KNOWLEDGE: 30,
                    COMPREHENSION: 30,
                    APPLICATION: 20,
                    HIGHER_ORDER: 20
                },
                custom_prompts: {
                    generation: "Select target documents to let AI auto-configure this section."
                }
            }
        };

        return JSON.stringify(schema, null, 4);
    };

    // AI-powered Schema Generation from Priority Stack documents
    const handleGenerateSchemaFromAI = async () => {
        if (mappedDocuments.length === 0) {
            alert('No documents in the Priority Stack. Please select a subject with mapped documents first.');
            return;
        }

        setIsGeneratingSchema(true);
        try {
            const docIds = mappedDocuments.map(d => d.id);
            const { data: result } = await axios.post('/v1/curriculum/generate-schema', {
                documentIds: docIds,
                subjectName: ruleTarget.subjectName || 'Unknown',
                className: ruleTarget.className || 'Unknown'
            });

            if (result.error === 'NO_CHUNKS') {
                alert('⚠️ Documents have no AI-processed chunks yet. Please process them in Curriculum Library first.');
                return;
            }

            if (result.error) {
                alert('Error: ' + result.error);
                return;
            }

            try {
                const parsed = JSON.parse(result.schema);
                setJsonSchema(JSON.stringify(parsed, null, 4));
            } catch {
                setJsonSchema(result.schema);
            }
            setSchemaViewMode('preview');
        } catch (error) {
            console.error('AI Schema Generation failed:', error);
            alert('AI Schema Generation failed. Check if AI API keys are configured.');
        } finally {
            setIsGeneratingSchema(false);
        }
    };

    // AI-powered Schema Generation from pasted sample text
    const handleGenerateSchemaFromText = async () => {
        if (!sampleText.trim()) {
            alert('দয়া করে sample প্রশ্নের টেক্সট paste করুন।');
            return;
        }
        if (!ruleTarget.subjectName) {
            alert('Please select a subject first.');
            return;
        }
        setIsGeneratingFromText(true);
        try {
            const { data: result } = await axios.post('/v1/curriculum/generate-schema-from-text', {
                sampleText,
                userPrompt,
                subjectName: ruleTarget.subjectName || 'Unknown',
                className: ruleTarget.className || 'Unknown'
            });
            if (result.error) { alert('Error: ' + result.error); return; }
            try {
                const parsed = JSON.parse(result.schema);
                setJsonSchema(JSON.stringify(parsed, null, 4));
            } catch {
                setJsonSchema(result.schema);
            }
            setSchemaViewMode('preview');
            setShowTextInput(false);
        } catch (error) {
            console.error('Text schema generation failed:', error);
            alert('Schema generation failed.');
        } finally {
            setIsGeneratingFromText(false);
        }
    };

    const getTypeColor = (type) => {
        switch(type) {
            case 'SAMPLE_PAPER': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'QUESTION_GUIDELINE': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'SYLLABUS': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'CURRICULUM': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
            {/* LEFT PANE: Premium Step-by-Step Target Mapping Wizard */}
            <div className="w-full lg:w-80 xl:w-72 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
                {/* Pane Header */}
                <div className="p-5 bg-gradient-to-br from-indigo-600 to-violet-700 text-white">
                    <div className="flex items-center gap-2.5 mb-2">
                        <div className="p-1.5 bg-white/20 rounded-lg"><Target size={18} className="text-white"/></div>
                        <h3 className="font-extrabold text-lg tracking-tight">Target Mapping</h3>
                    </div>
                    <p className="text-indigo-200 text-xs leading-relaxed">
                        Select an academic path to configure its scraping rule schema.
                    </p>
                    {/* Active Selection Summary */}
                    {(ruleTarget.educationLevel || ruleTarget.className || ruleTarget.subjectName) && (
                        <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap gap-1.5">
                            {ruleTarget.educationLevel && [...new Set(ruleTarget.educationLevel.split(',').map(s=>s.trim()).filter(Boolean))].map((l, i) => (
                                <span key={`lvl-${i}-${l}`} className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">{l}</span>
                            ))}
                            {ruleTarget.className && [...new Set(ruleTarget.className.split(',').map(s=>s.trim()).filter(Boolean))].map((c, i) => (
                                <span key={`cls-${i}-${c}`} className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30">{c}</span>
                            ))}
                            {ruleTarget.subjectName && (
                                <span className="text-[10px] font-bold bg-emerald-400/40 text-white px-2 py-0.5 rounded-full border border-emerald-300/40">
                                    🎯 {ruleTarget.subjectName.substring(0, 20)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {loadingHierarchy ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 gap-3">
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                        <p className="text-xs text-slate-400 font-medium">Loading academic structure...</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">

                        {/* STEP 1: Level */}
                        <div className="space-y-1.5 relative" ref={levelRef}>
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[8px] font-black">1</span>
                                    Academic Level
                                </label>
                                {ruleTarget.educationLevel && (
                                    <button onClick={() => setRuleTarget({ educationLevel: '', tags: '', className: '', subjectName: '' })}
                                        className="text-[9px] text-slate-400 hover:text-rose-500 font-bold transition-colors">✕ Clear</button>
                                )}
                            </div>
                            <div
                                onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                                className={`w-full text-sm rounded-xl px-3 py-2.5 cursor-pointer font-medium shadow-sm select-none flex items-center justify-between transition-all ${
                                    ruleTarget.educationLevel
                                        ? 'bg-indigo-50 border-2 border-indigo-300 text-indigo-800'
                                        : 'bg-slate-50 border border-slate-200 text-slate-400 hover:border-indigo-300'
                                }`}
                            >
                                <span className="truncate text-sm">
                                    {ruleTarget.educationLevel || 'Select Level(s)'}
                                </span>
                                <ChevronRight size={14} className={`shrink-0 transition-transform ${showLevelDropdown ? 'rotate-90' : ''}`}/>
                            </div>
                            {showLevelDropdown && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                                    <div className="p-1.5 space-y-0.5">
                                        {Array.from(new Map(academicLevels.map(l => [l.name.trim(), l])).values()).map(lvl => {
                                            const lvlName = lvl.name.trim();
                                            const isSelected = ruleTarget.educationLevel && ruleTarget.educationLevel.split(',').map(s=>s.trim()).includes(lvlName);
                                            return (
                                                <label key={lvl.id}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                                    onMouseDown={e => e.preventDefault()}
                                                >
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                        {isSelected && <Check size={10} className="text-white" strokeWidth={3}/>}
                                                    </div>
                                                     <input type="checkbox" className="sr-only" checked={!!isSelected}
                                                        onChange={() => {
                                                            let arr = [...new Set(ruleTarget.educationLevel ? ruleTarget.educationLevel.split(',').map(i=>i.trim()).filter(Boolean) : [])];
                                                            if (arr.includes(lvlName)) arr = arr.filter(i => i !== lvlName);
                                                            else arr.push(lvlName);
                                                            setRuleTarget({ educationLevel: arr.join(', '), tags: '', className: '', subjectName: '' });
                                                        }}
                                                    />
                                                    {lvlName}
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div className="sticky bottom-0 bg-white border-t border-slate-100 p-2">
                                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowLevelDropdown(false)}
                                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                                            <Check size={12} strokeWidth={3}/> Confirm ({ruleTarget.educationLevel ? [...new Set(ruleTarget.educationLevel.split(',').map(s=>s.trim()).filter(Boolean))].length : 0})
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Connector line */}
                        <div className="flex items-center justify-center py-0.5">
                            <div className={`h-4 w-0.5 rounded-full transition-colors ${ruleTarget.educationLevel ? 'bg-indigo-300' : 'bg-slate-200'}`}></div>
                        </div>

                        {/* STEP 2: Stream */}
                        <div className={`space-y-1.5 relative transition-opacity ${!ruleTarget.educationLevel ? 'opacity-40 pointer-events-none' : ''}`} ref={streamRef}>
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[8px] font-black">2</span>
                                    Stream
                                </label>
                            </div>
                            <div
                                onClick={() => ruleTarget.educationLevel && setShowStreamDropdown(!showStreamDropdown)}
                                className={`w-full text-sm rounded-xl px-3 py-2.5 cursor-pointer font-medium shadow-sm select-none flex items-center justify-between transition-all ${
                                    ruleTarget.tags && ruleTarget.tags.includes('Stream:')
                                        ? 'bg-indigo-50 border-2 border-indigo-300 text-indigo-800'
                                        : 'bg-slate-50 border border-slate-200 text-slate-400 hover:border-indigo-300'
                                }`}
                            >
                                <span className="truncate text-sm">
                                    {ruleTarget.tags && ruleTarget.tags.includes('Stream:')
                                        ? ruleTarget.tags.split(',').filter(t=>t.includes('Stream:')).map(t=>t.replace('Stream:','').trim()).join(', ')
                                        : 'Select Stream(s)'}
                                </span>
                                <ChevronRight size={14} className={`shrink-0 transition-transform ${showStreamDropdown ? 'rotate-90' : ''}`}/>
                            </div>
                            {showStreamDropdown && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                                    <div className="p-1.5 space-y-0.5">
                                        {Array.from(new Map(filteredStreams.map(s=>[s.name,s])).values()).map(str => {
                                            const tagVal = `Stream:${str.name}`;
                                            const isSelected = ruleTarget.tags && ruleTarget.tags.includes(tagVal);
                                            return (
                                                <label key={str.name}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                                    onMouseDown={e => e.preventDefault()}
                                                >
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                        {isSelected && <Check size={10} className="text-white" strokeWidth={3}/>}
                                                    </div>
                                                    <input type="checkbox" className="sr-only" checked={!!isSelected}
                                                        onChange={() => {
                                                            let arr = ruleTarget.tags ? ruleTarget.tags.split(',').map(i=>i.trim()).filter(Boolean) : [];
                                                            if (arr.includes(tagVal)) arr = arr.filter(i => i !== tagVal);
                                                            else arr.push(tagVal);
                                                            setRuleTarget({...ruleTarget, tags: arr.join(', '), className: '', subjectName: ''});
                                                        }}
                                                    />
                                                    {str.name}
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div className="sticky bottom-0 bg-white border-t border-slate-100 p-2">
                                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowStreamDropdown(false)}
                                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                                            <Check size={12} strokeWidth={3}/> Confirm
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center py-0.5">
                            <div className={`h-4 w-0.5 rounded-full transition-colors ${ruleTarget.educationLevel ? 'bg-indigo-300' : 'bg-slate-200'}`}></div>
                        </div>

                        {/* STEP 3: Class */}
                        <div className={`space-y-1.5 relative transition-opacity ${!ruleTarget.educationLevel ? 'opacity-40 pointer-events-none' : ''}`} ref={classRef}>
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[8px] font-black">3</span>
                                    Class
                                </label>
                            </div>
                            <div
                                onClick={() => ruleTarget.educationLevel && setShowClassDropdown(!showClassDropdown)}
                                className={`w-full text-sm rounded-xl px-3 py-2.5 cursor-pointer font-medium shadow-sm select-none flex items-center justify-between transition-all ${
                                    ruleTarget.className
                                        ? 'bg-indigo-50 border-2 border-indigo-300 text-indigo-800'
                                        : 'bg-slate-50 border border-slate-200 text-slate-400 hover:border-indigo-300'
                                }`}
                            >
                                <span className="truncate text-sm">{ruleTarget.className || 'Select Class(es)'}</span>
                                <ChevronRight size={14} className={`shrink-0 transition-transform ${showClassDropdown ? 'rotate-90' : ''}`}/>
                            </div>
                            {showClassDropdown && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                                    <div className="p-1.5 space-y-0.5">
                                        {Array.from(new Map(filteredClasses.map(c => [c.name.trim(), c])).values()).map(cls => {
                                            const clsName = cls.name.trim();
                                            const isSelected = ruleTarget.className && ruleTarget.className.split(',').map(s=>s.trim()).includes(clsName);
                                            return (
                                                <label key={cls.name}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                                    onMouseDown={e => e.preventDefault()}
                                                >
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                                        {isSelected && <Check size={10} className="text-white" strokeWidth={3}/>}
                                                    </div>
                                                    <input type="checkbox" className="sr-only" checked={!!isSelected}
                                                        onChange={() => {
                                                            let arr = [...new Set(ruleTarget.className ? ruleTarget.className.split(',').map(i=>i.trim()).filter(Boolean) : [])];
                                                            if (arr.includes(clsName)) arr = arr.filter(i => i !== clsName);
                                                            else arr.push(clsName);
                                                            setRuleTarget({...ruleTarget, className: arr.join(', '), subjectName: ''});
                                                        }}
                                                    />
                                                    {clsName}
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <div className="sticky bottom-0 bg-white border-t border-slate-100 p-2">
                                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowClassDropdown(false)}
                                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                                            <Check size={12} strokeWidth={3}/> Confirm ({ruleTarget.className ? [...new Set(ruleTarget.className.split(',').map(s=>s.trim()).filter(Boolean))].length : 0})
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center py-0.5">
                            <div className={`h-4 w-0.5 rounded-full transition-colors ${ruleTarget.className ? 'bg-violet-300' : 'bg-slate-200'}`}></div>
                        </div>

                        {/* STEP 4: Group Filter (NEW!) */}
                        <div className={`space-y-1.5 transition-opacity ${!ruleTarget.className ? 'opacity-40 pointer-events-none' : ''}`}>
                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[8px] font-black">4</span>
                                Group Filter <span className="text-slate-300 font-normal normal-case">(Optional)</span>
                            </label>
                            <select
                                className="w-full text-sm bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-violet-400 text-violet-800 font-medium cursor-pointer"
                                value={ruleTarget.groupId || ''}
                                onChange={e => setRuleTarget({...ruleTarget, groupId: e.target.value, subjectName: ''})}
                            >
                                <option value="">-- All Groups --</option>
                                {/* Populated from Academic Groups list -- same pattern as academicLevels */}
                            </select>
                        </div>

                        <div className="flex items-center justify-center py-0.5">
                            <div className={`h-4 w-0.5 rounded-full transition-colors ${ruleTarget.className ? 'bg-violet-300' : 'bg-slate-200'}`}></div>
                        </div>

                        {/* STEP 5: Subject — most important, highlighted */}
                        <div className={`space-y-1.5 relative transition-opacity ${!ruleTarget.className ? 'opacity-40 pointer-events-none' : ''}`} ref={subjectRef}>
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-extrabold text-violet-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-violet-500 text-white flex items-center justify-center text-[8px] font-black">5</span>
                                    🎯 Target Subject
                                </label>
                                {ruleTarget.subjectName && (
                                    <button onClick={() => setRuleTarget({...ruleTarget, subjectName: ''})}
                                        className="text-[9px] text-slate-400 hover:text-rose-500 font-bold transition-colors">✕ Clear</button>
                                )}
                            </div>
                            <div
                                onClick={() => ruleTarget.className && setShowSubjectDropdown(!showSubjectDropdown)}
                                className={`w-full text-sm rounded-xl px-3 py-2.5 cursor-pointer font-medium shadow-sm select-none flex items-center justify-between transition-all ${
                                    ruleTarget.subjectName
                                        ? 'bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-400 text-violet-900'
                                        : 'bg-violet-50/50 border border-violet-200 text-violet-400 hover:border-violet-400'
                                }`}
                            >
                                <span className="truncate text-sm font-semibold">
                                    {ruleTarget.subjectName || 'Select Target Subject(s)'}
                                </span>
                                <ChevronRight size={14} className={`shrink-0 transition-transform ${showSubjectDropdown ? 'rotate-90' : ''}`}/>
                            </div>
                            {showSubjectDropdown && (
                                <div className="absolute z-30 w-full mt-1 bg-white border border-violet-200 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                                    {filteredSubjects.length === 0 ? (
                                        <div className="p-6 text-center">
                                            <p className="text-xs text-slate-400 font-medium">No subjects found.</p>
                                            <p className="text-[10px] text-slate-300 mt-1">Select a class first to load its subjects.</p>
                                        </div>
                                    ) : (
                                        <div className="p-1.5 space-y-0.5">
                                            {filteredSubjects.map(sub => {
                                                const isSelected = ruleTarget.subjectName && ruleTarget.subjectName.split(',').map(s=>s.trim()).includes(sub.subjectName);
                                                return (
                                                    <label key={sub.subjectName}
                                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium ${isSelected ? 'bg-violet-50 text-violet-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                                        onMouseDown={e => e.preventDefault()}
                                                    >
                                                        <div className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
                                                            {isSelected && <Check size={10} className="text-white" strokeWidth={3}/>}
                                                        </div>
                                                        <input type="checkbox" className="sr-only" checked={!!isSelected}
                                                            onChange={() => {
                                                                let arr = ruleTarget.subjectName ? ruleTarget.subjectName.split(',').map(i=>i.trim()).filter(Boolean) : [];
                                                                if (arr.includes(sub.subjectName)) arr = arr.filter(i => i !== sub.subjectName);
                                                                else arr.push(sub.subjectName);
                                                                setRuleTarget({...ruleTarget, subjectName: arr.join(', ')});
                                                            }}
                                                        />
                                                        {sub.subjectName}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div className="sticky bottom-0 bg-white border-t border-violet-100 p-2">
                                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setShowSubjectDropdown(false)}
                                            className="w-full py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1">
                                            <Check size={12} strokeWidth={3}/> Apply Target ({ruleTarget.subjectName ? ruleTarget.subjectName.split(',').filter(Boolean).length : 0})
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reset All Button */}
                        {(ruleTarget.educationLevel || ruleTarget.className || ruleTarget.subjectName) && (
                            <div className="pt-3 border-t border-slate-100 mt-3">
                                <button
                                    onClick={() => setRuleTarget({ educationLevel: '', tags: '', className: '', subjectName: '' })}
                                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-200 transition-all"
                                >
                                    ↺ Reset All Selections
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* RIGHT PANE: Rule Definition */}
            <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {ruleTarget.subjectName ? (
                    loadingDocs ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="animate-spin mb-4" size={48} />
                            <p>Analyzing curriculum connections...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                                <div className="max-w-[60%]">
                                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 truncate">
                                        Schema: <span className="text-indigo-600 truncate" title={ruleTarget.subjectName}>{ruleTarget.subjectName}</span>
                                    </h2>
                                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider truncate" title={ruleTarget.className}>{ruleTarget.className || 'For All Classes'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Link to={`/questions/import/ai`} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl shadow-md transition-all">
                                        Import Scraper <ArrowRightCircle size={16}/>
                                    </Link>
                                    <button 
                                        onClick={handleSaveRule} disabled={isSaving}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-indigo-500/30 shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Scheme
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Auto-Mapped Priority Stack */}
                                <div className="space-y-4">
                                    <div className="border-b border-slate-100 pb-3 flex justify-between items-end">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <Database size={18} className="text-indigo-500"/> Scraper Priority Stack
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">AI consumes knowledge in this strict order.</p>
                                        </div>
                                        <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100">Live Context</span>
                                    </div>

                                    {mappedDocuments.length === 0 ? (
                                        <div className="p-6 border-2 border-dashed border-rose-200 bg-rose-50/50 rounded-2xl text-center">
                                            <p className="text-sm font-bold text-rose-700">No linked documents found!</p>
                                            <p className="text-xs text-rose-500 mt-1">Upload Sample Papers or Guidelines for this subject in the Curriculum Library to initialize priority context.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {mappedDocuments.map((doc, idx) => {
                                                const isDocSelected = selectedDocId === doc.id;
                                                const pdfUrl = doc.filePath 
                                                    ? (doc.filePath.startsWith('http') ? doc.filePath : `/api/v1/public/files/${doc.filePath}`) 
                                                    : null;
                                                return (
                                                    <div 
                                                        key={doc.id} 
                                                        onClick={() => setSelectedDocId(isDocSelected ? null : doc.id)}
                                                        className={`p-4 border rounded-2xl flex gap-4 items-center shadow-sm relative overflow-hidden group cursor-pointer transition-all duration-200 ${
                                                            isDocSelected 
                                                                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' 
                                                                : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {/* Priority Badge Indicator */}
                                                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                                                        
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-sm border-2 ${idx === 0 ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                                                            #{idx + 1}
                                                        </div>
                                                        
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-bold text-slate-800 truncate">{doc.title}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-block uppercase border ${getTypeColor(doc.docType)}`}>
                                                                    {doc.docType.replace('_', ' ')}
                                                                </span>
                                                                {doc.processingStatus === 'COMPLETED' && (
                                                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">AI ✓</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {pdfUrl && (
                                                                <a 
                                                                    href={pdfUrl} 
                                                                    target="_blank" 
                                                                    rel="noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                                                                    title="Open PDF in new tab"
                                                                >
                                                                    <ExternalLink size={14} />
                                                                </a>
                                                            )}
                                                            {isDocSelected && <CheckCircle2 size={16} className="text-indigo-600" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Custom JSON Editor with Preview */}
                                <div className="space-y-4 flex flex-col h-full">
                                    <div className="border-b border-slate-100 pb-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                <FileJson size={18} className="text-indigo-500"/> Parsing JSON Schema
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {/* Dynamic Type Selector */}
                                                <select
                                                    onChange={(e) => {
                                                        if (!e.target.value) return;
                                                        const type = dynamicTypes.find(t => t.code === e.target.value);
                                                        if (!type) return;
                                                        
                                                        let insertedSchema = {};
                                                        try { insertedSchema = JSON.parse(type.schemaTemplate || '{}'); } catch(e){}
                                                        
                                                        const schemaObj = {
                                                            questionType: type.code,
                                                            questionText: '(AI will generate question text here)',
                                                            instructions: type.description || '',
                                                            ...insertedSchema
                                                        };
                                                        
                                                        try {
                                                            let currentSchema = JSON.parse(jsonSchema);
                                                            if (!currentSchema.scraping_rules) currentSchema.scraping_rules = [];
                                                            currentSchema.scraping_rules.push(schemaObj);
                                                            setJsonSchema(JSON.stringify(currentSchema, null, 4));
                                                        } catch (err) {
                                                            const newSchema = { subject: ruleTarget.subjectName || 'Unknown', scraping_rules: [schemaObj] };
                                                            setJsonSchema(JSON.stringify(newSchema, null, 4));
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl border bg-indigo-50 text-indigo-700 border-indigo-200 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-300"
                                                >
                                                    <option value="">➕ Add Question Type</option>
                                                    {dynamicTypes.map(dt => <option key={dt.code} value={dt.code}>{dt.name}</option>)}
                                                </select>
                                                
                                                {/* Text Input Toggle */}
                                                <button
                                                    onClick={() => setShowTextInput(v => !v)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                                        showTextInput
                                                            ? 'bg-amber-100 text-amber-700 border-amber-300'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
                                                    }`}
                                                >
                                                    ✏️ Sample Text
                                                </button>
                                                {/* AI Generate from Docs */}
                                                <button
                                                    onClick={handleGenerateSchemaFromAI}
                                                    disabled={isGeneratingSchema || mappedDocuments.length === 0}
                                                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                                                        isGeneratingSchema
                                                            ? 'bg-purple-200 text-purple-500 cursor-wait'
                                                            : mappedDocuments.length === 0
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 hover:shadow-md'
                                                    }`}
                                                    title="Priority Stack docs থেকে schema generate করুন"
                                                >
                                                    {isGeneratingSchema ? (
                                                        <><Loader2 size={14} className="animate-spin"/> ফরমেট শিখছে...</>
                                                    ) : (
                                                        <><Sparkles size={14}/> 🤖 AI Generate</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* ── Text Input + Prompt Panel ── */}
                                        {showTextInput && (
                                            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                                                        ✏️ Sample প্রশ্ন Paste করুন (PDF ছাড়াও কাজ করবে)
                                                    </p>
                                                    <button onClick={() => setShowTextInput(false)} className="text-amber-500 hover:text-amber-700 text-xs">✕ বন্ধ</button>
                                                </div>
                                                <textarea
                                                    value={sampleText}
                                                    onChange={e => setSampleText(e.target.value)}
                                                    rows={6}
                                                    placeholder="এখানে sample প্রশ্নের টেক্সট paste করুন...&#10;&#10;উদাহরণ:&#10;১. নিচের কোনটি সঠিক?&#10;ক) ক     খ) খ     গ) গ     ঘ) ঘ&#10;&#10;উদ্দীপকটি পড়ো এবং প্রশ্নের উত্তর দাও:..."
                                                    className="w-full text-xs font-mono border border-amber-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-amber-300 bg-white resize-none text-slate-700"
                                                />
                                                <div>
                                                    <label className="text-[10px] font-extrabold text-amber-700 uppercase mb-1 block">🎯 Custom Prompt (ঐচ্ছিক — AI-কে বিশেষ নির্দেশনা)</label>
                                                    <input
                                                        value={userPrompt}
                                                        onChange={e => setUserPrompt(e.target.value)}
                                                        placeholder="যেমন: এই বিষয়ে সৃজনশীল প্রশ্নে ৪টি অংশ থাকে (ক=১, খ=২, গ=৩, ঘ=৪ নম্বর)..."
                                                        className="w-full text-xs border border-amber-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-300 bg-white text-slate-700"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleGenerateSchemaFromText}
                                                    disabled={isGeneratingFromText || !sampleText.trim()}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-xl shadow-md hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isGeneratingFromText ? (
                                                        <><Loader2 size={14} className="animate-spin"/> AI Schema তৈরি হচ্ছে...</>
                                                    ) : (
                                                        <><Sparkles size={14}/> Text থেকে Schema Generate করুন</>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-end">
                                            <p className="text-xs text-slate-500">
                                                {mappedDocuments.length > 0 
                                                    ? `${mappedDocuments.length}টি ডকুমেন্ট থেকে প্রশ্নের ফরমেট শেখার জন্য প্রস্তুত। AI Generate ক্লিক করুন।`
                                                    : 'বিষয় সিলেক্ট করুন, তারপর ফরমেট জেনারেট করুন।'}
                                            </p>
                                            <div className="flex bg-slate-100 rounded-lg p-0.5">
                                                <button 
                                                    onClick={() => setSchemaViewMode('edit')}
                                                    className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                                                        schemaViewMode === 'edit' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                                >
                                                    <Pencil size={12} /> Edit
                                                </button>
                                                <button 
                                                    onClick={() => setSchemaViewMode('preview')}
                                                    className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
                                                        schemaViewMode === 'preview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                                >
                                                    <Eye size={12} /> Preview
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 relative flex flex-col bg-[#1e1e24] rounded-2xl overflow-hidden shadow-inner border border-slate-800">
                                        <div className="flex justify-between items-center px-4 py-2 bg-[#2d2d34] border-b border-[#3d3d44]">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {jsonRuleId && <span className="text-[10px] font-bold text-emerald-400">Custom Schema Saved ✅</span>}
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{schemaViewMode === 'edit' ? 'JSON Editor' : 'Formatted Preview'}</span>
                                            </div>
                                        </div>

                                        {schemaViewMode === 'edit' ? (
                                            <textarea 
                                                value={jsonSchema}
                                                onChange={e => setJsonSchema(e.target.value)}
                                                className="w-full flex-1 bg-transparent text-emerald-300 font-mono text-sm p-4 outline-none resize-none leading-relaxed"
                                                spellCheck="false"
                                                placeholder='[\n  {\n    "questionType": "MULTIPLE_CHOICE",\n    ...\n  }\n]'
                                            />
                                        ) : (
                                            <div className="w-full flex-1 overflow-y-auto p-4">
                                                {(() => {
                                                    try {
                                                        const parsed = JSON.parse(jsonSchema);
                                                        const items = Array.isArray(parsed) ? parsed : [parsed];
                                                        return (
                                                            <div className="space-y-3">
                                                                {items.map((item, i) => {
                                                                    const difficultyColors = { 'EASY': 'text-emerald-400', 'MEDIUM': 'text-amber-400', 'HARD': 'text-rose-400' };
                                                                    return (
                                                                        <div key={i} className="bg-[#2a2a32] rounded-xl p-4 border border-[#3d3d44]">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">#{i + 1}</span>
                                                                                    <span className="text-xs font-bold text-amber-300">{item.questionType || 'Unknown Type'}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {item.marks && <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">{item.marks} marks</span>}
                                                                                    {item.difficulty && <span className={`text-[10px] font-bold ${difficultyColors[item.difficulty] || 'text-slate-400'}`}>{item.difficulty}</span>}
                                                                                    {item.bloomLevel && <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">{item.bloomLevel}</span>}
                                                                                </div>
                                                                            </div>
                                                                            {item.questionText && (
                                                                                <p className="text-emerald-300 text-xs leading-relaxed mb-2 bg-[#1e1e24] p-2 rounded-lg">{item.questionText}</p>
                                                                            )}
                                                                            {Object.entries(item).map(([key, val]) => {
                                                                                if (['questionType', 'questionText', 'marks', 'difficulty', 'bloomLevel'].includes(key)) return null;
                                                                                return (
                                                                                    <div key={key} className="flex gap-2 mb-1.5 text-xs">
                                                                                        <span className="text-purple-400 font-bold shrink-0 min-w-[100px]">{key}:</span>
                                                                                        <span className="text-slate-300 font-mono break-all">
                                                                                            {Array.isArray(val) ? (
                                                                                                <span className="flex flex-wrap gap-1">
                                                                                                    {val.map((v, j) => (
                                                                                                        <span key={j} className="bg-[#3d3d44] px-1.5 py-0.5 rounded text-emerald-300 text-[11px]">{String(v)}</span>
                                                                                                    ))}
                                                                                                </span>
                                                                                            ) : typeof val === 'object' && val !== null ? (
                                                                                                <span className="text-sky-300">{JSON.stringify(val)}</span>
                                                                                            ) : (
                                                                                                <span className="text-emerald-300">{String(val)}</span>
                                                                                            )}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    } catch (e) {
                                                        return (
                                                            <div className="text-center py-10">
                                                                <Code size={24} className="text-rose-400 mx-auto mb-3" />
                                                                <p className="text-rose-400 text-sm font-bold">Invalid JSON Format</p>
                                                                <p className="text-slate-500 text-xs mt-1">Switch to Edit mode to fix the JSON syntax.</p>
                                                            </div>
                                                        );
                                                    }
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Bar: Save & Send to AI Engine */}
                                    {jsonSchema && (
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                            <div className="flex items-center gap-2">
                                                {jsonRuleId && (
                                                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                                                        <CheckCircle2 size={14} /> Schema saved to AI Knowledge Base
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(jsonSchema);
                                                        alert('Schema copied to clipboard!');
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                                                >
                                                    <Code size={14} /> Copy JSON
                                                </button>
                                                <button
                                                    onClick={handleSaveRule}
                                                    disabled={isSaving || !ruleTarget.subjectName || !jsonSchema}
                                                    className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                                                        isSaving
                                                            ? 'bg-indigo-200 text-indigo-400 cursor-wait'
                                                            : !ruleTarget.subjectName || !jsonSchema
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-md'
                                                    }`}
                                                >
                                                    {isSaving ? (
                                                        <><Loader2 size={14} className="animate-spin" /> Saving...</>
                                                    ) : (
                                                        <><Zap size={14} /> 💾 Save & Map to AI Engine</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
                        <div className="w-20 h-20 bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                            <Search size={36} className="text-indigo-200" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Structure Mapping Pending</h3>
                        <p className="text-sm font-medium">Drill down your Academic Structure on the left panel to define rules.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurriculumRules;
