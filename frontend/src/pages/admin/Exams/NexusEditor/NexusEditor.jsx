import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layers, FileText, Settings, Settings2, ShieldCheck, Unlock, Loader2, Globe, LayoutTemplate, Type, Hash, Eye, Palette, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight, Copy, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import PaperCanvasV2 from './components/PaperCanvasV2';
import examService from '../../../../services/examService';
import questionService from '../../../../services/questionService';
import academicService from '../../../../services/academicService';
import axios from '../../../../utils/axios';
import { DEFAULT_SETTINGS } from './components/DocumentSettings';
import SettingsPanel from './components/SettingsPanel';
import { UI_TEXT } from './components/translations';


const NexusEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [editorMode, setEditorMode] = useState('STRICT_LINKED');
    const [rawContent, setRawContent] = useState('');
    
    // Document Settings
    const [docSettings, setDocSettings] = useState(DEFAULT_SETTINGS);
    const [zoom, setZoom] = useState(100);
    
    // Helper to update individual setting
    const updateSetting = (key, value) => setDocSettings(prev => ({ ...prev, [key]: value }));
    const updateMultiSettings = (obj) => setDocSettings(prev => ({ ...prev, ...obj }));
    
    // Workspace Tools State
    const [workspaceTools, setWorkspaceTools] = useState({
        math: true,
        table: true,
        image: true
    });
    
    // UI State
    const [uiLang, setUiLang] = useState('bn');
    const t = UI_TEXT[uiLang];
    
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const [isDraggingRight, setIsDraggingRight] = useState(false);
    
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [leftPanelWidth, setLeftPanelWidth] = useState(288);
    const [isDraggingLeft, setIsDraggingLeft] = useState(false);
    
    const [activeTab, setActiveTab] = useState('examInfo'); // examInfo, page, margin, font, spacing, design, templates
    const [selectedTemplateId, setSelectedTemplateId] = useState('default');
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
    
    // Page Count tracking for top bar
    const [pageCount, setPageCount] = useState(1);
    
    // Add to Canvas programmatically
    const [pendingInsertQuestion, setPendingInsertQuestion] = useState(null);
    
    // Auto-filter toggle
    const [disableAutoFilter, setDisableAutoFilter] = useState(false);

    // Image properties panel
    const [selectedImageConfig, setSelectedImageConfig] = useState(null);

    useEffect(() => {
        const handleImageSelect = (e) => {
            setSelectedImageConfig(e.detail);
            setActiveTab('imageProps');
            setIsRightPanelOpen(true);
        };
        window.addEventListener('nexusImageSelected', handleImageSelect);
        return () => window.removeEventListener('nexusImageSelected', handleImageSelect);
    }, []);

    // Fetch existing exam if ID is present
    useEffect(() => {
        if (!id) return;
        const fetchExam = async () => {
            try {
                const res = await examService.getExam(id);
                if (res?.data) {
                    setExamData(res.data);
                    if (res.data.editorMode) {
                        setEditorMode(res.data.editorMode);
                    }
                    // Map questions to HTML
                    let finalHtml = res.data.rawContent || '';
                    
                    // If no rawContent exists, generate it based on questions and sections
                    if (!finalHtml && res.data.questions && res.data.questions.length > 0) {
                        const qsByType = { MCQ: [], CQ: [], SHORT: [], OTHER: [] };
                        res.data.questions.forEach(q => {
                            if (q.type === 'MCQ') qsByType.MCQ.push(q);
                            else if (q.type === 'CQ') qsByType.CQ.push(q);
                            else if (q.type === 'SHORT') qsByType.SHORT.push(q);
                            else qsByType.OTHER.push(q);
                        });

                        const getQHtml = (q, sec) => {
                            const optionsJson = q.options ? JSON.stringify(q.options).replace(/'/g, "&#39;") : "[]";
                            const qText = q.questionText ? q.questionText.replace(/"/g, "&quot;") : "";
                            return `
                <div data-type="question-block" 
                     type="${q.type || 'MCQ'}" 
                     questiontext="${qText}" 
                     chaptername="${q.chapterName || q.subjectName || 'General'}" 
                     marks="${q.marks || 1}" 
                     numberingstyle="${sec?.numberingStyle || 'bn'}"
                     marksconfig="${sec?.marksConfig || 'hide'}"
                     optionlayout="${sec?.optionLayout || 'col1'}"
                     optionstyle="${sec?.optionStyle || 'bn'}"
                     optiondecoration="${sec?.optionDecoration || 'rightBracket'}"
                     data-options='${optionsJson}'>
                </div>`;
                        };

                        let dynamicSections = [];
                        const sectionNames = {
                            MCQ: 'বহুনির্বাচনী প্রশ্ন',
                            CQ: 'সৃজনশীল প্রশ্ন',
                            SHORT: 'সংক্ষিপ্ত প্রশ্ন',
                            OTHER: 'অন্যান্য প্রশ্ন'
                        };
                        const sectionPrefixes = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
                        let sectionIndex = 0;

                        const buildSectionConfig = (type) => {
                            const isMCQ = type === 'MCQ';
                            const defaultSec = DEFAULT_SETTINGS.sections.find(s => s.isMCQ === isMCQ && (type === 'MCQ' || type === 'CQ'));
                            
                            if (defaultSec && (type === 'MCQ' || type === 'CQ')) {
                                return { ...defaultSec, id: `sec-${Date.now()}-${sectionIndex}`, name: `${sectionPrefixes[sectionIndex]}-বিভাগ: ${sectionNames[type]}` };
                            }

                            return {
                                id: `sec-${Date.now()}-${sectionIndex}`,
                                name: `${sectionPrefixes[sectionIndex]}-বিভাগ: ${sectionNames[type] || 'প্রশ্নমালা'}`,
                                instructions: "সকল প্রশ্নের উত্তর দাও।",
                                conditions: "",
                                numberingStyle: "bn",
                                marksConfig: "showBracket",
                                optionLayout: "col1",
                                isMCQ: false
                            };
                        };

                        ['MCQ', 'CQ', 'SHORT', 'OTHER'].forEach(type => {
                            const qs = qsByType[type];
                            if (qs && qs.length > 0) {
                                const secConfig = buildSectionConfig(type);
                                dynamicSections.push(secConfig);
                                
                                finalHtml += `
                    <h3 data-section-id="${secConfig.id}" class="section-name" style="font-weight: bold; font-size: 1.1em; text-align: center; margin-bottom: 4px; margin-top: 24px;">${secConfig.name}</h3>
                    ${secConfig.conditions ? `<p data-section-id="${secConfig.id}" class="section-conditions" style="text-align: center; font-weight: bold; margin-bottom: 8px;">[${secConfig.conditions}]</p>` : ''}
                    ${secConfig.instructions ? `<p data-section-id="${secConfig.id}" class="section-instructions" style="font-style: italic; margin-bottom: 12px; text-align: center;">${secConfig.instructions}</p>` : ''}
                `;
                                
                                qs.forEach(q => {
                                    finalHtml += getQHtml(q, secConfig);
                                });
                                
                                sectionIndex++;
                            }
                        });

                        // Set the HTML
                        setRawContent(finalHtml);
                        
                        if (res.data.docSettingsJson) {
                            try {
                                setDocSettings(JSON.parse(res.data.docSettingsJson));
                            } catch (e) {
                                console.error("Failed to parse docSettingsJson", e);
                            }
                        } else {
                            // Update Settings dynamically from the backend Exam Data
                            setDocSettings(prev => ({
                                ...prev,
                                institute: res.data.instituteName || prev.institute,
                                subject: res.data.subjectName || prev.subject,
                                className: res.data.className || prev.className,
                                exam: res.data.title || prev.exam,
                                time: res.data.durationMinutes ? `${res.data.durationMinutes} ${res.data.language === 'ENGLISH' ? 'Minutes' : 'মিনিট'}` : prev.time,
                                totalMarks: res.data.totalMarks || prev.totalMarks,
                                year: new Date().getFullYear().toString(),
                                language: res.data.language || 'BENGALI',
                                sections: dynamicSections.length > 0 ? dynamicSections : prev.sections
                            }));
                        }
                    } else {
                        // Just set HTML if rawContent already existed
                        setRawContent(finalHtml);
                        
                        if (res.data.docSettingsJson) {
                            try {
                                setDocSettings(JSON.parse(res.data.docSettingsJson));
                            } catch (e) {
                                console.error("Failed to parse docSettingsJson", e);
                            }
                        } else {
                            // Update Settings dynamically from the backend Exam Data
                            setDocSettings(prev => ({
                                ...prev,
                                institute: res.data.instituteName || prev.institute,
                                subject: res.data.subjectName || prev.subject,
                                className: res.data.className || prev.className,
                                exam: res.data.title || prev.exam,
                                time: res.data.durationMinutes ? `${res.data.durationMinutes} ${res.data.language === 'ENGLISH' ? 'Minutes' : 'মিনিট'}` : prev.time,
                                totalMarks: res.data.totalMarks || prev.totalMarks,
                                year: new Date().getFullYear().toString(),
                                language: res.data.language || 'BENGALI'
                            }));
                        }
                    }

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

    // Resize Panels Logic
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingLeft) {
                const newWidth = Math.max(200, Math.min(e.clientX, 800)); // Min 200px, Max 800px
                setLeftPanelWidth(newWidth);
            }
            if (isDraggingRight) {
                const newWidth = Math.max(200, Math.min(window.innerWidth - e.clientX, 800)); // Min 200px, Max 800px
                setRightPanelWidth(newWidth);
            }
        };
        const handleMouseUp = () => {
            setIsDraggingLeft(false);
            setIsDraggingRight(false);
            document.body.style.cursor = 'default';
        };

        if (isDraggingLeft || isDraggingRight) {
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingLeft, isDraggingRight]);

    // Left Panel Tabs
    const [leftPanelTab, setLeftPanelTab] = useState('manual'); // 'auto' | 'manual'

    // Hierarchy filter options for Question Bank
    const [levels, setLevels] = useState([]);
    const [streams, setStreams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [topics, setTopics] = useState([]);

    const [selectedLanguage, setSelectedLanguage] = useState('ALL');
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [selectedStreamId, setSelectedStreamId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedChapterId, setSelectedChapterId] = useState('');
    const [selectedTopicId, setSelectedTopicId] = useState('');

    useEffect(() => {
        academicService.getAllLevels().then(setLevels).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedLevelId) academicService.getStreamsByLevel(selectedLevelId).then(setStreams).catch(console.error);
        else setStreams([]);
        setSelectedStreamId(''); setSelectedClassId(''); setSelectedSubjectId('');
        setSelectedChapterId(''); setSelectedTopicId('');
        setClasses([]); setSubjects([]); setChapters([]); setTopics([]);
    }, [selectedLevelId]);

    useEffect(() => {
        if (selectedStreamId) academicService.getClassesByStream(selectedStreamId).then(setClasses).catch(console.error);
        else setClasses([]);
        setSelectedClassId(''); setSelectedSubjectId('');
        setSelectedChapterId(''); setSelectedTopicId('');
        setSubjects([]); setChapters([]); setTopics([]);
    }, [selectedStreamId]);

    useEffect(() => {
        if (selectedClassId) academicService.getSubjectsByClass(selectedClassId).then(setSubjects).catch(console.error);
        else setSubjects([]);
        setSelectedSubjectId(''); setSelectedChapterId(''); setSelectedTopicId('');
        setChapters([]); setTopics([]);
    }, [selectedClassId]);

    useEffect(() => {
        if (selectedSubjectId) academicService.getChaptersByClassSubject(selectedSubjectId).then(setChapters).catch(console.error);
        else setChapters([]);
        setSelectedChapterId(''); setSelectedTopicId(''); setTopics([]);
    }, [selectedSubjectId]);

    useEffect(() => {
        if (selectedChapterId) academicService.getTopicsByChapter(selectedChapterId).then(setTopics).catch(console.error);
        else setTopics([]);
        setSelectedTopicId('');
    }, [selectedChapterId]);

    // Fetch real questions for Question Bank
    useEffect(() => {
        const fetchQuestions = async () => {
            if (leftPanelTab !== 'manual') return;
            setLoadingQuestions(true);
            try {
                // Fetch paginated approved questions with context filters
                const res = await questionService.getAllQuestionsPaginated({ 
                    page: 0, 
                    size: 100, 
                    search: searchQuery,
                    filterStatus: 'APPROVED',
                    language: selectedLanguage === 'ALL' ? '' : selectedLanguage,
                    levelId: selectedLevelId || '',
                    streamId: selectedStreamId || '',
                    classId: selectedClassId || '',
                    subjectId: selectedSubjectId || '',
                    chapterId: selectedChapterId || '',
                    topicId: selectedTopicId || '',
                    // Fallback to name match if no ID is selected yet
                    className: (!selectedLevelId && docSettings?.className && !disableAutoFilter) ? docSettings.className : '',
                    subjectName: (!selectedLevelId && docSettings?.subject && !disableAutoFilter) ? docSettings.subject : ''
                });
                if (res?.content) {
                    setBankQuestions(res.content);
                } else {
                    setBankQuestions([]);
                }
            } catch (err) {
                console.error("Failed to load bank questions:", err);
                setBankQuestions([]);
            } finally {
                setLoadingQuestions(false);
            }
        };
        const timer = setTimeout(() => fetchQuestions(), 300);
        return () => clearTimeout(timer);
    }, [searchQuery, docSettings.className, docSettings.subject, leftPanelTab, selectedLanguage, selectedLevelId, selectedStreamId, selectedClassId, selectedSubjectId, selectedChapterId, selectedTopicId, disableAutoFilter]);

    const applyTemplate = (template) => {
        if (template.docSettingsJson) {
            try {
                const parsedSettings = JSON.parse(template.docSettingsJson);
                
                // Preserve current section IDs by matching isMCQ type
                if (parsedSettings.sections && docSettings.sections) {
                    parsedSettings.sections = docSettings.sections.map(currentSec => {
                        const templateSec = parsedSettings.sections.find(s => s.isMCQ === currentSec.isMCQ);
                        if (templateSec) {
                            return { ...templateSec, id: currentSec.id }; // Keep the current document's section ID
                        }
                        return currentSec;
                    });
                }
                
                // Preserve current content fields so template only applies styles
                parsedSettings.institute = docSettings.institute;
                parsedSettings.subject = docSettings.subject;
                parsedSettings.className = docSettings.className;
                parsedSettings.exam = docSettings.exam;
                parsedSettings.totalMarks = docSettings.totalMarks;
                parsedSettings.time = docSettings.time;
                parsedSettings.year = docSettings.year;
                
                setDocSettings(parsedSettings);
                alert(uiLang === 'bn' ? "টেমপ্লেট স্টাইল সফলভাবে অ্যাপ্লাই হয়েছে!" : "Template styles applied successfully!");
            } catch (e) {
                console.error("Failed to parse template settings:", e);
                alert(uiLang === 'bn' ? "টেমপ্লেট অ্যাপ্লাই করতে সমস্যা হয়েছে।" : "Error applying template.");
            }
        } else {
            alert(uiLang === 'bn' ? "এই টেমপ্লেটে কোনো ডিজাইন সেটিং নেই।" : "No design settings found in this template.");
        }
    };

    const handleSaveTemplate = async () => {
        const templateName = window.prompt(uiLang === 'bn' ? "নতুন টেমপ্লেটের নাম দিন (যেমন: 'সাপ্তাহিক পরীক্ষার ফরম্যাট'):" : "Enter a name for this new template:\n(e.g., 'Weekly Class Test Format')");
        if (!templateName || templateName.trim() === '') return;
        
        const isGlobalConfirm = window.confirm(uiLang === 'bn' 
            ? "আপনি কি এটি গ্লোবাল টেমপ্লেট হিসেবে সেভ করতে চান? (সব ইউজার দেখতে পাবে)\n\n'Cancel' বা 'না' চাপলে এটি শুধু আপনার জন্য সেভ হবে।" 
            : "Do you want to save this as a Global template? (Available to all users)\n\nClick 'Cancel' to save as a Personal template.");
        
        setIsSavingTemplate(true);
        try {
            const payload = {
                templateName: templateName.trim(),
                isGlobal: isGlobalConfirm,
                structureJson: "[]", // Must be valid JSON to satisfy MySQL JSON column type
                docSettingsJson: JSON.stringify(docSettings)
            };
            const res = await examService.createTemplate(payload);
            if (res?.data) {
                setTemplates(prev => [...prev, res.data]);
                alert(uiLang === 'bn' ? "টেমপ্লেট সফলভাবে সেভ হয়েছে!" : "Template saved successfully!");
            }
        } catch (err) {
            console.error("Failed to save template:", err);
            alert(uiLang === 'bn' ? "টেমপ্লেট সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Error saving template. Please try again.");
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleDragStart = (e, q) => {
        // Find the matching section configuration for this question type
        const targetSec = docSettings.sections?.find(s => s.isMCQ === (q.type === 'MCQ')) || {};
        
        // We pack the question data into the drag event payload
        e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'questionBlock',
            attrs: {
                type: q.type || 'MCQ',
                questionText: q.questionText,
                chapterName: q.chapterName || q.subjectName || 'General',
                marks: q.marks || 1,
                numberingStyle: targetSec.numberingStyle || 'bn',
                marksConfig: targetSec.marksConfig || 'hide',
                optionLayout: targetSec.optionLayout || 'col1',
                optionStyle: targetSec.optionStyle || 'bn',
                optionDecoration: targetSec.optionDecoration || 'rightBracket',
                options: q.options ? q.options.map(opt => ({
                    ...opt,
                    optionText: opt.optionText
                })) : []
            }
        }));
    };

    const handleAddToCanvas = (q) => {
        const targetSec = docSettings.sections?.find(s => s.isMCQ === (q.type === 'MCQ')) || {};
        setPendingInsertQuestion({
            type: 'questionBlock',
            attrs: {
                type: q.type || 'MCQ',
                questionText: q.questionText,
                chapterName: q.chapterName || q.subjectName || 'General',
                marks: q.marks || 1,
                numberingStyle: targetSec.numberingStyle || 'bn',
                marksConfig: targetSec.marksConfig || 'hide',
                optionLayout: targetSec.optionLayout || 'col1',
                optionStyle: targetSec.optionStyle || 'bn',
                optionDecoration: targetSec.optionDecoration || 'rightBracket',
                options: q.options ? q.options.map(opt => ({
                    ...opt,
                    optionText: opt.optionText
                })) : []
            }
        });
    };

    const handleSaveDocument = async () => {
        setIsSavingDocument(true);
        try {
            const payload = {
                title: docSettings.exam || "Nexus Exam",
                examCode: "NEXUS-" + Math.floor(Math.random() * 10000), // Simple mock code
                editorMode: editorMode,
                rawContent: rawContent,
                docSettingsJson: JSON.stringify(docSettings),
                isAutoGenerated: !!id,
                status: 'DRAFT'
            };
            
            if (id) {
                // Update existing exam
                await examService.updateExam(id, payload);
                alert(uiLang === 'bn' ? "ডকুমেন্ট সফলভাবে আপডেট হয়েছে!" : "Document updated successfully!");
            } else {
                const title = window.prompt(uiLang === 'bn' ? "এই ডকুমেন্টের একটি নাম দিন:" : "Enter a title for this document/exam:");
                if (!title || title.trim() === '') {
                    setIsSavingDocument(false);
                    return;
                }
                payload.title = title.trim();
                await examService.createManualExam(payload);
                alert(uiLang === 'bn' ? "ডকুমেন্ট সফলভাবে সেভ হয়েছে!" : "Document saved successfully as an Exam!");
            }
        } catch (err) {
            console.error("Failed to save document:", err);
            alert(uiLang === 'bn' ? "সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Error saving document. Please try again.");
        } finally {
            setIsSavingDocument(false);
        }
    };

    const handleSaveAs = async () => {
        const title = window.prompt(uiLang === 'bn' ? "নতুন নাম দিন:" : "Enter a new title for this document/exam:");
        if (!title || title.trim() === '') return;

        setIsSavingDocument(true);
        try {
            const payload = {
                title: title.trim(),
                examCode: "NEXUS-" + Math.floor(Math.random() * 10000),
                editorMode: editorMode,
                rawContent: rawContent,
                docSettingsJson: JSON.stringify(docSettings),
                isAutoGenerated: false,
                status: 'DRAFT'
            };
            await examService.createManualExam(payload);
            alert(uiLang === 'bn' ? "নতুন ডকুমেন্ট হিসেবে সেভ হয়েছে!" : "Saved as a new Document successfully!");
        } catch (err) {
            console.error("Failed to save as:", err);
            alert(uiLang === 'bn' ? "সেভ করতে সমস্যা হয়েছে।" : "Error saving document.");
        } finally {
            setIsSavingDocument(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-outfit overflow-hidden print:overflow-visible">
            {/* Global Print Styles to Override Flex Layouts */}
            <style>{`
                @media print {
                    @page { 
                        size: ${docSettings.pageSize === 'A4' ? 'A4' : docSettings.pageSize === 'Legal' ? 'legal' : 'letter'} ${docSettings.orientation === 'landscape' || docSettings.orientation === 'Landscape' ? 'landscape' : 'portrait'}; 
                        margin: ${docSettings.marginTop || 20}mm ${docSettings.marginRight || 20}mm ${docSettings.marginBottom || 20}mm ${docSettings.marginLeft || 25}mm !important; 
                    }
                    body { margin: 0; padding: 0; background: #fff; overflow: visible !important; }
                    
                    /* Hide EVERYTHING in body by default */
                    body * { visibility: hidden !important; }
                    
                    /* Unhide only the canvas container and its children, and force background colors to print */
                    .paper-canvas-container, .paper-canvas-container * {
                        visibility: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* 
                       Force ALL parents of the canvas to be static blocks so they 
                       don't clip, center, or flex-squish the absolutely positioned canvas 
                    */
                    #root, #root > div, #main-scroll-container, .nexus-editor-root, .print-canvas-wrapper {
                        position: static !important;
                        display: block !important;
                        overflow: visible !important;
                        height: auto !important;
                        width: auto !important;
                        transform: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Position the canvas exactly at the top-left of the physical paper */
                    .paper-canvas-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        transform: none !important; /* Ignore React Zoom */
                        width: 100% !important; /* Adapt to printable area inside @page margins */
                        max-width: 100% !important;
                        height: auto !important; /* Let content dictate height for natural pagination */
                    }

                    /* Remove duplicate padding from the wrapper since @page handles it natively */
                    .paper-content-wrapper {
                        padding: 0 !important;
                    }

                    /* Hide simulated backgrounds during real print since @page handles paper */
                    .paper-canvas-container > div.pointer-events-none {
                        display: none !important;
                    }
                    
                    /* Hide specific Editor UI elements inside the canvas tree */
                    .sticky, .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
            {/* Top Ribbon Header */}
            <header className="bg-white border-b border-slate-200 shrink-0 z-20 shadow-sm flex flex-col justify-between px-4 pt-2 print:hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        {/* Panel Left Toggle */}
                        <button 
                            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)} 
                            className={`p-1.5 rounded-lg border transition-all ${isLeftPanelOpen ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}
                            title={t.questionBank}
                        >
                            <PanelLeft size={16} />
                        </button>

                        {/* Language Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button onClick={() => setUiLang('bn')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${uiLang === 'bn' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>বাংলা</button>
                            <button onClick={() => setUiLang('en')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${uiLang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>English</button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button 
                                onClick={() => setEditorMode('STRICT_LINKED')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${editorMode === 'STRICT_LINKED' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <ShieldCheck size={14} /> {t.strictMode}
                            </button>
                            <button 
                                onClick={() => {
                                    alert(uiLang === 'bn' ? 'ফ্রি এডিট মোড ফিচারটি আন্ডার ডেভেলপমেন্ট।' : 'Free Edit Mode is under development.');
                                }}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1 text-slate-500 hover:text-slate-700`}
                            >
                                <Unlock size={14} /> {t.freeMode}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-medium text-slate-700 mr-2 border border-slate-200 shadow-sm" title="Total Pages">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                {pageCount} {uiLang === 'bn' ? 'পেজ' : 'Pages'}
                            </div>
                            <button 
                                onClick={() => window.print()}
                                className="px-4 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                                title="Print"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                {uiLang === 'bn' ? 'প্রিন্ট' : 'Print'}
                            </button>
                            <button 
                                onClick={() => {
                                    alert(uiLang === 'bn' ? 'অটোমেটিক পিডিএফ ডাউনলোড ফিচারটি আন্ডার ডেভেলপমেন্ট। দয়া করে "প্রিন্ট" বাটনে ক্লিক করে Destination থেকে "Save as PDF" ব্যবহার করুন।' : 'Automatic PDF download is under development. Please click the "Print" button and select "Save as PDF" as destination.');
                                }}
                                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                                title="Download PDF"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                {uiLang === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF'}
                            </button>
                            <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
                            <button 
                                onClick={handleSaveTemplate}
                                disabled={isSavingTemplate}
                                className={`px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isSavingTemplate ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-slate-300'}`}
                            >
                                {isSavingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} />}
                                {isSavingTemplate ? t.loading : t.saveTemplate}
                            </button>
                            <button 
                                onClick={handleSaveDocument}
                                disabled={isSavingDocument}
                                className={`px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSavingDocument ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                {isSavingDocument ? t.loading : t.saveDoc}
                            </button>
                            {id && (
                                <button 
                                    onClick={handleSaveAs}
                                    disabled={isSavingDocument}
                                    className={`px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Copy size={16} />
                                    {t.saveAs}
                                </button>
                            )}
                            
                            {/* Panel Right Toggle */}
                            <button 
                                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} 
                                className={`ml-2 p-1.5 rounded-lg border transition-all ${isRightPanelOpen ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}
                                title={t[activeTab]}
                            >
                                <PanelRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs / Ribbon Menus */}
                <div className="flex items-end gap-1 mt-2 overflow-x-auto custom-scrollbar pb-1">
                    {['questionSetup', 'examInfo', 'pageSetup', 'font', 'design', 'templates'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-[13px] font-bold border-b-2 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                            {t[tab]}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Layout */}
            <div className={`flex-1 flex overflow-hidden print:block print:w-full print:h-auto print:overflow-visible ${(isDraggingLeft || isDraggingRight) ? 'select-none' : ''}`}>
                {/* Left Panel - Question Bank */}
                <div 
                    style={{ width: isLeftPanelOpen ? `${leftPanelWidth}px` : '0px' }}
                    className={`${!isDraggingLeft ? 'transition-all duration-300 ease-in-out' : ''} bg-white border-r border-slate-200 shrink-0 flex flex-col z-10 relative print:hidden`}
                >
                    {/* Resize Handle */}
                    <div 
                        onMouseDown={() => setIsDraggingLeft(true)}
                        className={`absolute top-0 right-[-3px] w-[6px] h-full cursor-col-resize z-40 transition-colors hover:bg-indigo-400 ${isDraggingLeft ? 'bg-indigo-500' : 'bg-transparent'}`}
                    />
                    
                    <div className={`absolute top-0 left-0 h-full flex flex-col bg-white ${!isLeftPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${!isDraggingLeft ? 'transition-opacity duration-300' : ''}`} style={{ width: `${leftPanelWidth}px` }}>
                        <div className="p-4 border-b border-slate-100 shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button 
                                        onClick={() => setLeftPanelTab('auto')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${leftPanelTab === 'auto' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Auto Generator
                                    </button>
                                    <button 
                                        onClick={() => setLeftPanelTab('manual')}
                                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${leftPanelTab === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Manual
                                    </button>
                                </div>
                                <button onClick={() => setIsLeftPanelOpen(false)} className="text-slate-400 hover:text-slate-700 rounded p-1 hover:bg-slate-100 transition-colors" title="Close Panel">
                                    <PanelLeftClose size={14}/>
                                </button>
                            </div>
                            
                            {leftPanelTab === 'manual' && (
                                <div className="space-y-2 mt-1">
                                    <input 
                                        type="text" 
                                        placeholder={t.searchQ} 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                                    />
                                    
                                    {(!selectedLevelId && (docSettings.className || docSettings.subject) && !disableAutoFilter) && (
                                        <div className="mt-2 text-[10px] bg-blue-50 text-blue-700 px-2 py-1.5 rounded flex justify-between items-center font-medium border border-blue-100">
                                            <span className="truncate pr-2">
                                                Auto-filtered: <b>{docSettings.className}</b> {docSettings.subject && `| ${docSettings.subject}`}
                                            </span>
                                            <button 
                                                onClick={() => setDisableAutoFilter(true)} 
                                                className="text-blue-600 hover:text-blue-800 font-bold"
                                                title="Clear filter and show all questions"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <select 
                                            value={selectedLanguage} 
                                            onChange={(e) => setSelectedLanguage(e.target.value)}
                                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 col-span-2"
                                        >
                                            <option value="ALL">{uiLang === 'bn' ? 'সব ভার্সন' : 'All Versions'}</option>
                                            <option value="Bangla">Bangla</option>
                                            <option value="English">English</option>
                                            <option value="Bilingual">Bilingual</option>
                                        </select>
                                        
                                        <select 
                                            value={selectedLevelId} 
                                            onChange={(e) => setSelectedLevelId(e.target.value)}
                                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700"
                                        >
                                            <option value="">{uiLang === 'bn' ? 'সকল স্তর' : 'All Levels'}</option>
                                            {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>

                                        <select 
                                            value={selectedStreamId} 
                                            onChange={(e) => setSelectedStreamId(e.target.value)}
                                            disabled={!selectedLevelId}
                                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50"
                                        >
                                            <option value="">{uiLang === 'bn' ? 'সকল শাখা' : 'All Streams'}</option>
                                            {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        
                                        <select 
                                            value={selectedClassId} 
                                            onChange={(e) => setSelectedClassId(e.target.value)}
                                            disabled={!selectedStreamId && streams.length > 0}
                                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50"
                                        >
                                            <option value="">{uiLang === 'bn' ? 'সকল শ্রেণি' : 'All Classes'}</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>

                                        <select 
                                            value={selectedSubjectId} 
                                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                                            disabled={!selectedClassId}
                                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50"
                                        >
                                            <option value="">{uiLang === 'bn' ? 'সকল বিষয়' : 'All Subjects'}</option>
                                            {subjects.map(s => <option key={s.classSubjectId || s.id} value={s.classSubjectId || s.id}>{s.subjectName || s.subject?.name}</option>)}
                                        </select>

                                        <select 
                                            value={selectedChapterId} 
                                            onChange={(e) => setSelectedChapterId(e.target.value)}
                                            disabled={!selectedSubjectId}
                                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50"
                                        >
                                            <option value="">{uiLang === 'bn' ? 'সকল অধ্যায়' : 'All Chapters'}</option>
                                            {chapters.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                                        </select>

                                        <select 
                                            value={selectedTopicId} 
                                            onChange={(e) => setSelectedTopicId(e.target.value)}
                                            disabled={!selectedChapterId}
                                            className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400 font-medium text-slate-700 disabled:opacity-50"
                                        >
                                            <option value="">{uiLang === 'bn' ? 'সকল টপিক' : 'All Topics'}</option>
                                            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50">
                            {leftPanelTab === 'auto' ? (
                                <div className="p-4 bg-white border border-slate-200 rounded-xl text-center space-y-3 shadow-sm">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <Layers size={24} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800">AI Exam Generator</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Click the button below to automatically generate questions based on the selected curriculum rules.
                                    </p>
                                    <button 
                                        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg shadow transition-colors flex justify-center items-center gap-2"
                                        onClick={() => navigate('/exams/generate/auto')}
                                    >
                                        <Layers size={14} /> Go to AI Generator Wizard
                                    </button>
                                </div>
                            ) : loadingQuestions ? (
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
                                            <p className="text-[9px] font-bold text-red-500 mt-2">❌ {t.typeRestricted}</p>
                                        )}

                                        {/* Add manually button */}
                                        {isAllowed && (
                                            <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded"
                                                    onClick={() => handleAddToCanvas(q)}
                                                >
                                                    + Add to Canvas
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })
                            ) : (
                                <div className="text-center p-4 text-xs text-slate-400 font-medium">{t.noQ}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 overflow-auto p-4 custom-scrollbar relative bg-slate-200/60 print:block print:w-full print:h-auto print:overflow-visible print:m-0 print:p-0">
                    <div className="w-max min-w-full flex justify-center min-h-full pb-32 mx-auto print:block print:w-full print:m-0 print:p-0 print:h-auto">
                        {/* Tiptap Editor Canvas */}
                        <PaperCanvasV2 
                            editorMode={editorMode} 
                            rawContent={rawContent}
                            setRawContent={setRawContent}
                            docSettings={docSettings}
                            zoom={zoom}
                            workspaceTools={workspaceTools}
                            editorConfig={editorConfig}
                            onPageCountChange={setPageCount}
                            pendingInsertQuestion={pendingInsertQuestion}
                            onQuestionInserted={() => setPendingInsertQuestion(null)}
                        />
                    </div>
                    
                    {/* Floating Zoom Controls (Bottom Right of Canvas Viewport) */}
                    <div className="fixed bottom-6 right-6 z-[100] bg-white border border-slate-200 shadow-xl rounded-full p-1.5 flex items-center gap-1 opacity-90 hover:opacity-100 transition-all print:hidden" style={{right: isRightPanelOpen ? `calc(1.5rem + ${rightPanelWidth}px)` : '1.5rem'}}>
                        <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors font-bold" title="Zoom Out">
                            -
                        </button>
                        <span className="text-[11px] font-black text-slate-600 w-12 text-center select-none">{zoom}%</span>
                        <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors font-bold" title="Zoom In">
                            +
                        </button>
                    </div>
                </div>

                {/* Right Panel Properties */}
                <div 
                    style={{ width: isRightPanelOpen ? `${rightPanelWidth}px` : '0px' }}
                    className={`${!isDraggingRight ? 'transition-all duration-300 ease-in-out' : ''} border-l border-slate-200 shrink-0 flex flex-col z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] relative print:hidden`}
                >
                    {/* Resize Handle */}
                    <div 
                        onMouseDown={() => setIsDraggingRight(true)}
                        className={`absolute top-0 left-[-3px] w-[6px] h-full cursor-col-resize z-40 transition-colors hover:bg-indigo-400 ${isDraggingRight ? 'bg-indigo-500' : 'bg-transparent'}`}
                    />

                    <div className={`absolute top-0 right-0 h-full flex flex-col bg-white ${!isRightPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${!isDraggingRight ? 'transition-opacity duration-300' : ''}`} style={{ width: `${rightPanelWidth}px` }}>
                        <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Settings2 size={16} className="text-indigo-500"/> {t[activeTab]}
                            </h2>
                            <button onClick={() => setIsRightPanelOpen(false)} className="text-slate-400 hover:text-slate-700 rounded p-1 hover:bg-slate-200 transition-colors">
                                <PanelRightClose size={14}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {activeTab !== 'templates' && activeTab !== 'imageProps' && (
                                <SettingsPanel s={docSettings} u={updateSetting} uMulti={updateMultiSettings} activeTab={activeTab} uiLang={uiLang} />
                            )}

                            {activeTab === 'imageProps' && selectedImageConfig && (
                                <div className="p-4 space-y-6">
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                                        <h3 className="text-[13px] font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                            <ImageIcon size={14} /> Image Properties
                                        </h3>
                                        <p className="text-[11px] text-indigo-600/80 leading-relaxed font-medium">
                                            Adjust the dimensions and alignment of the selected image. Changes will apply immediately.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Width (Size)</label>
                                        <div className="flex flex-col gap-2">
                                            <input 
                                                type="text" 
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium rounded-md px-3 py-2 outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                                                value={selectedImageConfig.width}
                                                onChange={(e) => setSelectedImageConfig({...selectedImageConfig, width: e.target.value})}
                                                onBlur={(e) => selectedImageConfig.onUpdate(selectedImageConfig.align, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        selectedImageConfig.onUpdate(selectedImageConfig.align, e.target.value);
                                                    }
                                                }}
                                            />
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {['auto', '30%', '50%', '75%', '100%'].map(w => (
                                                    <button 
                                                        key={w}
                                                        onClick={() => {
                                                            setSelectedImageConfig({...selectedImageConfig, width: w});
                                                            selectedImageConfig.onUpdate(selectedImageConfig.align, w);
                                                        }}
                                                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${selectedImageConfig.width === w ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                    >
                                                        {w.replace('%', ' %')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Alignment</label>
                                        <div className="flex bg-slate-100 p-1 rounded-lg">
                                            {['left', 'center', 'right'].map(align => (
                                                <button
                                                    key={align}
                                                    onClick={() => {
                                                        setSelectedImageConfig({...selectedImageConfig, align});
                                                        selectedImageConfig.onUpdate(align, selectedImageConfig.width);
                                                    }}
                                                    className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${selectedImageConfig.align === align ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    {align === 'left' ? <AlignLeft size={16}/> : align === 'center' ? <AlignCenter size={16}/> : <AlignRight size={16}/>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'templates' && (
                                <div className="p-4 space-y-4">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                            <Settings2 size={14} className="text-indigo-500" /> {t.wsTools}
                                        </h3>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={workspaceTools.math} onChange={e => setWorkspaceTools(prev => ({ ...prev, math: e.target.checked }))} className="w-4 h-4 rounded text-indigo-500 border-slate-300 focus:ring-indigo-500" />
                                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">{t.mathEd}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={workspaceTools.table} onChange={e => setWorkspaceTools(prev => ({ ...prev, table: e.target.checked }))} className="w-4 h-4 rounded text-indigo-500 border-slate-300 focus:ring-indigo-500" />
                                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">{t.tableBld}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input type="checkbox" checked={workspaceTools.image} onChange={e => setWorkspaceTools(prev => ({ ...prev, image: e.target.checked }))} className="w-4 h-4 rounded text-indigo-500 border-slate-300 focus:ring-indigo-500" />
                                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">{t.imgUp}</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                            <Globe size={14} className="text-blue-500" /> {t.availTemplates}
                                        </h3>
                                        {loadingTemplates ? (
                                            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                                <Loader2 className="animate-spin mb-2" size={24} />
                                                <span className="text-xs font-medium uppercase tracking-widest">{t.loading}</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* Default Template Option */}
                                                <button onClick={() => {
                                                    setSelectedTemplateId('default');
                                                    alert(uiLang === 'bn' ? "ডিফল্ট সেটিংস অ্যাপ্লাই করা হয়েছে।" : "Default settings applied.");
                                                    // optionally reset settings to default
                                                    setDocSettings(DEFAULT_SETTINGS);
                                                }} className={`w-full flex flex-col text-left px-3 py-2.5 bg-white border rounded-lg transition-all group ${selectedTemplateId === 'default' ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300'}`}>
                                                    <span className={`text-sm font-bold transition-colors ${selectedTemplateId === 'default' ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>{uiLang === 'bn' ? 'ডিফল্ট সেটিংস' : 'Default Settings'}</span>
                                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">{uiLang === 'bn' ? 'সিস্টেম ডিফল্ট' : 'System Default'}</span>
                                                </button>

                                                {templates.length > 0 && templates.map(tpl => (
                                                    <button key={tpl.id} onClick={() => {
                                                        setSelectedTemplateId(tpl.id);
                                                        applyTemplate(tpl);
                                                    }} className={`w-full flex flex-col text-left px-3 py-2.5 bg-white border rounded-lg transition-all group ${selectedTemplateId === tpl.id ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300'}`}>
                                                        <span className={`text-sm font-bold transition-colors ${selectedTemplateId === tpl.id ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>{tpl.templateName}</span>
                                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">{tpl.global ? t.globalTpl : t.instTpl}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default NexusEditor;
