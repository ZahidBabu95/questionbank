import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import examService from '../../../../../services/examService';
import axios from '../../../../../utils/axios';
import { useNexusEditor } from '../context/NexusEditorContext';
import { DEFAULT_SETTINGS } from '../components/DocumentSettings';

export const useExamManager = () => {
    const { id } = useParams();
    const { 
        examData, setExamData, 
        editorMode, setEditorMode, 
        rawContent, setRawContent, 
        docSettings, setDocSettings, 
        setEditorConfig, setGenerationBlueprint,
        isSavingDocument, setIsSavingDocument,
        uiLang 
    } = useNexusEditor();

    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    // Fetch existing exam
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
                    
                    let finalHtml = res.data.rawContent || '';
                    
                    // Generate HTML if rawContent is empty but questions exist
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
                            const statementsJson = q.statements ? JSON.stringify(q.statements).replace(/'/g, "&#39;") : "[]";
                            const qText = q.questionText ? q.questionText.replace(/"/g, "&quot;") : "";
                            const stimulusText = q.stimulus ? q.stimulus.replace(/"/g, "&quot;") : "";
                            const explanationText = q.explanation ? q.explanation.replace(/"/g, "&quot;") : "";
                            const answerText = q.correctAnswer ? q.correctAnswer.replace(/"/g, "&quot;") : "";
                            return `
                                <div data-type="question-block" 
                                     questionid="${q.originalQuestionId || q.id}"
                                     type="${q.type || 'MCQ'}" 
                                     questiontext="${qText}" 
                                     stimulus="${stimulusText}"
                                     explanation="${explanationText}"
                                     answer="${answerText}"
                                     syncedfromdb="true"
                                     chaptername="${q.chapterName || q.subjectName || 'General'}" 
                                     marks="${q.marks || 1}" 
                                     numberingstyle="${sec?.numberingStyle || 'bn'}"
                                     marksconfig="${sec?.marksConfig || 'hide'}"
                                     optionlayout="${sec?.optionLayout || 'col1'}"
                                     optionstyle="${sec?.optionStyle || 'bn'}"
                                     optiondecoration="${sec?.optionDecoration || 'rightBracket'}"
                                     data-statements='${statementsJson}'
                                     data-options='${optionsJson}'>
                                </div>`;
                        };

                        let dynamicSections = [];
                        const sectionNames = { MCQ: 'বহুনির্বাচনী প্রশ্ন', CQ: 'সৃজনশীল প্রশ্ন', SHORT: 'সংক্ষিপ্ত প্রশ্ন', OTHER: 'অন্যান্য প্রশ্ন' };
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
                                instructions: "সকল প্রশ্নের উত্তর দাও。",
                                conditions: "", numberingStyle: "bn", marksConfig: "showBracket", optionLayout: "col1", isMCQ: type === 'MCQ'
                            };
                        };

                        ['MCQ', 'CQ', 'SHORT', 'OTHER'].forEach(type => {
                            const qs = qsByType[type];
                            if (qs && qs.length > 0) {
                                const secConfig = buildSectionConfig(type);
                                dynamicSections.push(secConfig);
                                finalHtml += `
                                    <h3 data-section-id="${secConfig.id}" class="section-name" style="font-weight: bold; font-size: 1.1em; text-align: center; margin-bottom: 4px; margin-top: 24px;">${secConfig.name || ''}</h3>
                                    <p data-section-id="${secConfig.id}" class="section-conditions" style="text-align: center; font-weight: bold; margin-bottom: 8px;">${secConfig.conditions ? '[' + secConfig.conditions + ']' : ''}</p>
                                    <p data-section-id="${secConfig.id}" class="section-instructions" style="font-style: italic; margin-bottom: 12px; text-align: center;">${secConfig.instructions || ''}</p>
                                `;
                                qs.forEach(q => finalHtml += getQHtml(q, secConfig));
                                sectionIndex++;
                            }
                        });

                        setRawContent(finalHtml);
                        
                        if (res.data.docSettingsJson) {
                            try {
                                const parsedSettings = JSON.parse(res.data.docSettingsJson);
                                if (dynamicSections.length > 0) parsedSettings.sections = [...(parsedSettings.sections || []), ...dynamicSections];
                                setDocSettings(parsedSettings);
                            } catch (e) { console.error("Failed to parse docSettingsJson", e); }
                        } else {
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
                        setRawContent(finalHtml);
                        if (res.data.docSettingsJson) {
                            try { setDocSettings(JSON.parse(res.data.docSettingsJson)); } 
                            catch (e) { console.error("Failed to parse docSettingsJson", e); }
                        } else {
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
                            let rules = kbRes.data.filter(k => k.tags && (k.tags.includes(subTag) || k.tags.includes(altTag)));
                            if (rules.length === 0) rules = kbRes.data.filter(k => k.content && k.content.includes(res.data.subjectName));
                            if (rules.length > 0) {
                                const matchedRule = rules.find(r => r.tags && r.tags.includes(res.data.className)) || rules[0];
                                const schemaObj = JSON.parse(matchedRule.content);
                                if (Array.isArray(schemaObj)) {
                                    setEditorConfig({ allowed_blocks: ["MCQ", "CQ", "SHORT"], toolbar_features: ["math_formula", "draw_canvas", "table"] });
                                } else {
                                    if (schemaObj.editor_config) setEditorConfig(schemaObj.editor_config);
                                    if (schemaObj.generation_blueprint) setGenerationBlueprint(schemaObj.generation_blueprint);
                                }
                            }
                        } catch (schemaErr) { console.error("Failed to load dynamic schema for subject:", schemaErr); }
                    }
                }
            } catch (err) { console.error("Failed to load exam:", err); }
        };
        fetchExam();
    }, [id]);

    // Fetch templates
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoadingTemplates(true);
            try {
                const res = await examService.getTemplates();
                if (res?.data) setTemplates(res.data);
            } catch (err) { console.error("Failed to load templates:", err); } 
            finally { setLoadingTemplates(false); }
        };
        fetchTemplates();
    }, []);

    const applyTemplate = (template) => {
        if (template.docSettingsJson) {
            try {
                const parsedSettings = JSON.parse(template.docSettingsJson);
                if (parsedSettings.sections && docSettings.sections) {
                    parsedSettings.sections = docSettings.sections.map(currentSec => {
                        const templateSec = parsedSettings.sections.find(s => s.isMCQ === currentSec.isMCQ);
                        return templateSec ? { ...templateSec, id: currentSec.id } : currentSec;
                    });
                }
                parsedSettings.institute = docSettings.institute;
                parsedSettings.subject = docSettings.subject;
                parsedSettings.className = docSettings.className;
                parsedSettings.exam = docSettings.exam;
                parsedSettings.totalMarks = docSettings.totalMarks;
                parsedSettings.time = docSettings.time;
                parsedSettings.year = docSettings.year;
                parsedSettings.templateId = template.id;
                
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
        const templateName = window.prompt(uiLang === 'bn' ? "নতুন টেমপ্লেটের নাম দিন:" : "Enter a name for this new template:");
        if (!templateName || templateName.trim() === '') return;
        const isGlobalConfirm = window.confirm(uiLang === 'bn' ? "আপনি কি এটি গ্লোবাল টেমপ্লেট হিসেবে সেভ করতে চান?" : "Do you want to save this as a Global template?");
        setIsSavingTemplate(true);
        try {
            const payload = {
                templateName: templateName.trim(),
                isGlobal: isGlobalConfirm,
                structureJson: "[]",
                docSettingsJson: JSON.stringify(docSettings)
            };
            const res = await examService.createTemplate(payload);
            if (res?.data) {
                setTemplates(prev => [...prev, res.data]);
                alert(uiLang === 'bn' ? "টেমপ্লেট সফলভাবে সেভ হয়েছে!" : "Template saved successfully!");
            }
        } catch (err) {
            console.error("Failed to save template:", err);
            alert(uiLang === 'bn' ? "টেমপ্লেট সেভ করতে সমস্যা হয়েছে।" : "Error saving template.");
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleSaveDocument = async () => {
        setIsSavingDocument(true);
        try {
            const payload = {
                title: docSettings.exam || "Nexus Exam",
                examCode: "NEXUS-" + Math.floor(Math.random() * 10000),
                editorMode: editorMode,
                rawContent: rawContent,
                docSettingsJson: JSON.stringify(docSettings),
                isAutoGenerated: !!id,
                status: 'DRAFT'
            };
            
            if (id) {
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

    return {
        templates, loadingTemplates, isSavingTemplate,
        applyTemplate, handleSaveTemplate,
        handleSaveDocument, handleSaveAs
    };
};
