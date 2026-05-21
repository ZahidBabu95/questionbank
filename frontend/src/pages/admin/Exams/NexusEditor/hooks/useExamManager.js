import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import examService from '../../../../../services/examService';
import questionService from '../../../../../services/questionService';
import settingsService from '../../../../../services/settingsService';
import axios from '../../../../../utils/axios';
import { useNexusEditor } from '../context/NexusEditorContext';
import { DEFAULT_SETTINGS } from '../components/DocumentSettings';
import { formatDuration, parseDurationToMinutes } from '../../../../../utils/formatUtils';

// Module-level caches to prevent duplicate requests on rapid remounts
const examPromises = new Map();
const examCache = new Map();
const examCacheTimes = new Map();

const deduplicatedGetExam = (id) => {
    const now = Date.now();
    if (examCache.has(id) && (now - (examCacheTimes.get(id) || 0) < 3000)) {
        return Promise.resolve(examCache.get(id));
    }
    if (examPromises.has(id)) {
        return examPromises.get(id);
    }
    const promise = examService.getExam(id).then(res => {
        examCache.set(id, res);
        examCacheTimes.set(id, Date.now());
        examPromises.delete(id);
        return res;
    }).catch(err => {
        examPromises.delete(id);
        throw err;
    });
    examPromises.set(id, promise);
    return promise;
};

const invalidateExamCache = (id) => {
    if (id) {
        examCache.delete(id);
        examCacheTimes.delete(id);
    }
};

const settingsPromises = new Map();
const settingsCache = new Map();
const settingsCacheTimes = new Map();

const deduplicatedGetSettings = (type, isGlobal = false) => {
    const key = `${type}_${isGlobal ? 'global' : 'institute'}`;
    const now = Date.now();
    if (settingsCache.has(key) && (now - (settingsCacheTimes.get(key) || 0) < 3000)) {
        return Promise.resolve(settingsCache.get(key));
    }
    if (settingsPromises.has(key)) {
        return settingsPromises.get(key);
    }
    const serviceCall = isGlobal 
        ? settingsService.getGlobalSettings(type)
        : settingsService.getInstituteSettings(type);
    
    const promise = serviceCall.then(res => {
        settingsCache.set(key, res);
        settingsCacheTimes.set(key, Date.now());
        settingsPromises.delete(key);
        return res;
    }).catch(err => {
        settingsPromises.delete(key);
        throw err;
    });
    settingsPromises.set(key, promise);
    return promise;
};

const invalidateSettingsCache = (type, isGlobal = false) => {
    const key = `${type}_${isGlobal ? 'global' : 'institute'}`;
    settingsCache.delete(key);
    settingsCacheTimes.delete(key);
};

let templatesPromise = null;
let templatesCache = null;
let templatesCacheTime = 0;

const deduplicatedGetTemplates = () => {
    const now = Date.now();
    if (templatesCache && (now - templatesCacheTime < 3000)) {
        return Promise.resolve(templatesCache);
    }
    if (templatesPromise) {
        return templatesPromise;
    }
    templatesPromise = examService.getTemplates().then(res => {
        templatesCache = res;
        templatesCacheTime = Date.now();
        templatesPromise = null;
        return res;
    }).catch(err => {
        templatesPromise = null;
        throw err;
    });
    return templatesPromise;
};

const invalidateTemplatesCache = () => {
    templatesCache = null;
    templatesCacheTime = 0;
};

let knowledgePromise = null;
let knowledgeCache = null;
let knowledgeCacheTime = 0;

const deduplicatedGetKnowledge = () => {
    const now = Date.now();
    if (knowledgeCache && (now - knowledgeCacheTime < 3000)) {
        return Promise.resolve(knowledgeCache);
    }
    if (knowledgePromise) {
        return knowledgePromise;
    }
    knowledgePromise = axios.get('/v1/support/knowledge').then(res => {
        knowledgeCache = res;
        knowledgeCacheTime = Date.now();
        knowledgePromise = null;
        return res;
    }).catch(err => {
        knowledgePromise = null;
        throw err;
    });
    return knowledgePromise;
};

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
    const [savedSubjectsList, setSavedSubjectsList] = useState([]);
    const [savedClassSubjectsList, setSavedClassSubjectsList] = useState([]);

    const getNormalizedSubjectKey = (subject) => {
        if (!subject) return '';
        return subject.toString().trim().toLowerCase().replace(/\s+/g, '');
    };

    const getNormalizedClassKey = (className) => {
        if (!className) return '';
        return className.toString().trim().toLowerCase().replace(/\s+/g, '');
    };

    const findDefaultLayoutInSettings = (settings, className, subjectName) => {
        if (!settings || !subjectName) return null;
        
        const normSubject = subjectName.toString().trim().toLowerCase().replace(/\s+/g, '');
        const normClass = className ? className.toString().trim().toLowerCase().replace(/\s+/g, '') : '';
        
        const targetClassSubKey = 'subject_default_' + normClass + '_' + normSubject;
        const targetSubOnlyKey = 'subject_default_' + normSubject;
        
        const settingsKeys = Object.keys(settings);
        const normalizeSettingKey = (k) => k.toString().trim().toLowerCase().replace(/\s+/g, '');
        
        // 1. Try matching Class + Subject first
        if (className) {
            const matchedKey = settingsKeys.find(k => {
                const normK = normalizeSettingKey(k);
                return normK === targetClassSubKey;
            });
            if (matchedKey && settings[matchedKey]) {
                try {
                    return JSON.parse(settings[matchedKey]);
                } catch (e) {
                    console.error("Failed to parse settings for key:", matchedKey, e);
                }
            }
        }
        
        // 2. Try matching Subject only
        const matchedSubKey = settingsKeys.find(k => {
            const normK = normalizeSettingKey(k);
            return normK === targetSubOnlyKey;
        });
        if (matchedSubKey && settings[matchedSubKey]) {
            try {
                return JSON.parse(settings[matchedSubKey]);
            } catch (e) {
                console.error("Failed to parse settings for key:", matchedSubKey, e);
            }
        }
        
        return null;
    };

    const fetchSavedSubjects = async () => {
        try {
            let settings;
            const userData = localStorage.getItem('user');
            let isSuper = false;
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    isSuper = user.roles && (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ROLE_SUPER_ADMIN'));
                } catch (e) {}
            }
            if (isSuper) {
                settings = await deduplicatedGetSettings('EXAM', true);
            } else {
                settings = await deduplicatedGetSettings('EXAM', false);
            }
            const allKeys = Object.keys(settings || {})
                .filter(k => k.startsWith('subject_default_'))
                .map(k => k.replace('subject_default_', ''));
            
            const classSubjectList = allKeys.filter(k => k.includes('_'));
            const subjectOnlyList = allKeys.filter(k => !k.includes('_'));
            
            setSavedSubjectsList(subjectOnlyList);
            setSavedClassSubjectsList(classSubjectList);
        } catch (err) {
            console.warn("Failed to load saved subjects list:", err);
        }
    };

    useEffect(() => {
        fetchSavedSubjects();
    }, []);

    // Fetch existing exam
    useEffect(() => {
        if (!id) return;
        const fetchExam = async () => {
            try {
                const res = await deduplicatedGetExam(id);
                if (res?.data) {
                    setExamData(res.data);
                    if (res.data.editorMode) {
                        setEditorMode(res.data.editorMode);
                    }

                    // Fetch Subject specific default setup from settings if exam has no settings of its own
                    let subjectDefaultSettings = null;
                    const hasNoSettings = !res.data.docSettingsJson || 
                                          res.data.docSettingsJson === 'null' || 
                                          res.data.docSettingsJson === 'undefined' ||
                                          res.data.docSettingsJson === '{}' || 
                                          res.data.docSettingsJson.trim() === '';
                    
                    console.log("[useExamManager] Fetching exam, docSettingsJson is empty?", hasNoSettings, "subject:", res.data.subjectName, "class:", res.data.className);
                    
                    if (hasNoSettings && res.data.subjectName) {
                        try {
                            const subjectName = res.data.subjectName;
                            const className = res.data.className;
                            
                            // 1. Try loading from institute settings
                            try {
                                const examSettings = await deduplicatedGetSettings('EXAM', false);
                                subjectDefaultSettings = findDefaultLayoutInSettings(examSettings, className, subjectName);
                            } catch (e) {
                                console.warn("Failed to load institute default layout:", e);
                            }
                            
                            // 2. Fallback to global settings
                            if (!subjectDefaultSettings) {
                                try {
                                    const globalSettings = await deduplicatedGetSettings('EXAM', true);
                                    subjectDefaultSettings = findDefaultLayoutInSettings(globalSettings, className, subjectName);
                                } catch (e) {
                                    console.warn("Failed to load global default layout:", e);
                                }
                            }
                            
                            if (subjectDefaultSettings) {
                                console.log("[useExamManager] Found matching default layout settings:", subjectDefaultSettings);
                            }
                        } catch (schemaErr) { console.error("Failed to load subject default settings:", schemaErr); }
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
                                     data-section-id="${q.sectionId || sec?.id || ''}"
                                     type="${q.type || 'MCQ'}" 
                                     questiontext="${qText}" 
                                     stimulus="${stimulusText}"
                                     explanation="${explanationText}"
                                     answer="${answerText}"
                                     syncedfromdb="true"
                                     language="${q.language || 'Bangla'}"
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
                            const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                            let defaultSec = null;
                            if (baseSettings.sections && Array.isArray(baseSettings.sections)) {
                                if (type === 'MCQ') {
                                    defaultSec = baseSettings.sections.find(s => s.isMCQ === true);
                                } else if (type === 'CQ') {
                                    defaultSec = baseSettings.sections.find(s => 
                                        s.isMCQ === false && 
                                        (s.name?.includes('সৃজনশীল') || s.name?.toLowerCase().includes('cq'))
                                    ) || baseSettings.sections.find(s => s.isMCQ === false);
                                } else if (type === 'SHORT') {
                                    defaultSec = baseSettings.sections.find(s => 
                                        s.isMCQ === false && 
                                        (s.name?.includes('সংক্ষিপ্ত') || s.name?.toLowerCase().includes('short'))
                                    ) || baseSettings.sections.filter(s => s.isMCQ === false)[1]
                                      || baseSettings.sections.find(s => s.isMCQ === false);
                                } else {
                                    defaultSec = baseSettings.sections.find(s => 
                                        s.isMCQ === false && 
                                        !s.name?.includes('সৃজনশীল') && 
                                        !s.name?.includes('সংক্ষিপ্ত')
                                    ) || baseSettings.sections.find(s => s.isMCQ === false);
                                }
                            }

                            if (defaultSec) {
                                let cleanName = defaultSec.name || sectionNames[type] || 'প্রশ্নমালা';
                                cleanName = cleanName.replace(/^[ক-হa-zA-Z\d\s-]+-বিভাগ:\s*/, '');
                                cleanName = cleanName.replace(/^Section\s+[A-Z]:\s*/i, '');
                                cleanName = cleanName.replace(/^বিভাগ:\s*/, '');
                                
                                if (type === 'SHORT' && !cleanName.includes('সংক্ষিপ্ত') && !cleanName.toLowerCase().includes('short')) {
                                    cleanName = sectionNames[type];
                                } else if (type === 'CQ' && !cleanName.includes('সৃজনশীল') && !cleanName.toLowerCase().includes('cq')) {
                                    cleanName = sectionNames[type];
                                } else if (type === 'MCQ' && !cleanName.includes('বহুনির্বাচনী') && !cleanName.toLowerCase().includes('mcq')) {
                                    cleanName = sectionNames[type];
                                }
                                
                                return { 
                                    ...defaultSec, 
                                    id: `sec-${Date.now()}-${sectionIndex}`, 
                                    name: `${sectionPrefixes[sectionIndex]}-বিভাগ: ${cleanName}`
                                };
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

                        // Apply pending revisions before setting raw content
                        if (finalHtml) {
                            try {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(finalHtml, 'text/html');
                                const nodes = doc.querySelectorAll('div[data-type="question-block"]');
                                const ids = Array.from(nodes).map(n => n.getAttribute('questionid')).filter(Boolean);
                                if (ids.length > 0) {
                                    const revisions = await questionService.getMyPendingRevisions(ids);
                                    if (revisions && Object.keys(revisions).length > 0) {
                                        nodes.forEach(node => {
                                            const qid = node.getAttribute('questionid');
                                            if (revisions[qid]) {
                                                const rev = revisions[qid];
                                                node.setAttribute('questiontext', rev.questionText ? rev.questionText.replace(/"/g, "&quot;") : "");
                                                node.setAttribute('stimulus', rev.stimulus ? rev.stimulus.replace(/"/g, "&quot;") : "");
                                                node.setAttribute('explanation', rev.explanation ? rev.explanation.replace(/"/g, "&quot;") : "");
                                                node.setAttribute('answer', rev.correctAnswer ? rev.correctAnswer.replace(/"/g, "&quot;") : "");
                                                if (rev.options) node.setAttribute('data-options', JSON.stringify(rev.options).replace(/'/g, "&#39;"));
                                                if (rev.statements) node.setAttribute('data-statements', JSON.stringify(rev.statements).replace(/'/g, "&#39;"));
                                            }
                                        });
                                        finalHtml = doc.body.innerHTML;
                                    }
                                }
                            } catch (e) { console.error("Failed to fetch pending revisions", e); }
                        }

                        setRawContent(finalHtml);
                        
                        if (!hasNoSettings) {
                            try {
                                const parsedSettings = JSON.parse(res.data.docSettingsJson);
                                if (parsedSettings && typeof parsedSettings === 'object') {
                                    if (dynamicSections.length > 0) parsedSettings.sections = [...(parsedSettings.sections || []), ...dynamicSections];
                                    setDocSettings(parsedSettings);
                                } else {
                                    throw new Error("Parsed settings is null or invalid object");
                                }
                            } catch (e) {
                                console.error("Failed to parse docSettingsJson, falling back:", e);
                                const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                                setDocSettings(prev => ({
                                    ...prev,
                                    ...baseSettings,
                                    institute: res.data.instituteName || baseSettings.institute || prev.institute,
                                    subject: res.data.subjectName || baseSettings.subject || prev.subject,
                                    className: res.data.className || baseSettings.className || prev.className,
                                    exam: res.data.title || baseSettings.exam || prev.exam,
                                    time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, res.data.language) : (baseSettings.time || prev.time),
                                    totalMarks: res.data.totalMarks || baseSettings.totalMarks || prev.totalMarks,
                                    year: new Date().getFullYear().toString(),
                                    language: res.data.language || baseSettings.language || 'BENGALI',
                                    sections: dynamicSections.length > 0 ? dynamicSections : (baseSettings.sections || prev.sections)
                                }));
                            }
                        } else {
                            const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                            setDocSettings(prev => ({
                                ...prev,
                                ...baseSettings,
                                institute: res.data.instituteName || baseSettings.institute || prev.institute,
                                subject: res.data.subjectName || baseSettings.subject || prev.subject,
                                className: res.data.className || baseSettings.className || prev.className,
                                exam: res.data.title || baseSettings.exam || prev.exam,
                                time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, res.data.language) : (baseSettings.time || prev.time),
                                totalMarks: res.data.totalMarks || baseSettings.totalMarks || prev.totalMarks,
                                year: new Date().getFullYear().toString(),
                                language: res.data.language || baseSettings.language || 'BENGALI',
                                sections: dynamicSections.length > 0 ? dynamicSections : (baseSettings.sections || prev.sections)
                            }));
                        }
                    } else {
                        // Apply pending revisions before setting raw content
                        if (finalHtml) {
                            try {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(finalHtml, 'text/html');
                                const nodes = doc.querySelectorAll('div[data-type="question-block"]');
                                const ids = Array.from(nodes).map(n => n.getAttribute('questionid')).filter(Boolean);
                                if (ids.length > 0) {
                                    const revisions = await questionService.getMyPendingRevisions(ids);
                                    if (revisions && Object.keys(revisions).length > 0) {
                                        nodes.forEach(node => {
                                            const qid = node.getAttribute('questionid');
                                            if (revisions[qid]) {
                                                const rev = revisions[qid];
                                                node.setAttribute('questiontext', rev.questionText ? rev.questionText.replace(/"/g, "&quot;") : "");
                                                node.setAttribute('stimulus', rev.stimulus ? rev.stimulus.replace(/"/g, "&quot;") : "");
                                                node.setAttribute('explanation', rev.explanation ? rev.explanation.replace(/"/g, "&quot;") : "");
                                                node.setAttribute('answer', rev.correctAnswer ? rev.correctAnswer.replace(/"/g, "&quot;") : "");
                                                if (rev.options) node.setAttribute('data-options', JSON.stringify(rev.options).replace(/'/g, "&#39;"));
                                                if (rev.statements) node.setAttribute('data-statements', JSON.stringify(rev.statements).replace(/'/g, "&#39;"));
                                            }
                                        });
                                        finalHtml = doc.body.innerHTML;
                                    }
                                }
                            } catch (e) { console.error("Failed to fetch pending revisions", e); }
                        }

                        setRawContent(finalHtml);
                        if (!hasNoSettings) {
                            try {
                                const parsedSettings = JSON.parse(res.data.docSettingsJson);
                                if (parsedSettings && typeof parsedSettings === 'object') {
                                    setDocSettings(parsedSettings);
                                } else {
                                    throw new Error("Parsed settings is null or invalid object");
                                }
                            } catch (e) {
                                console.error("Failed to parse docSettingsJson, falling back:", e);
                                const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                                setDocSettings(prev => ({
                                    ...prev,
                                    ...baseSettings,
                                    institute: res.data.instituteName || baseSettings.institute || prev.institute,
                                    subject: res.data.subjectName || baseSettings.subject || prev.subject,
                                    className: res.data.className || baseSettings.className || prev.className,
                                    exam: res.data.title || baseSettings.exam || prev.exam,
                                    time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, res.data.language) : (baseSettings.time || prev.time),
                                    totalMarks: res.data.totalMarks || baseSettings.totalMarks || prev.totalMarks,
                                    year: new Date().getFullYear().toString(),
                                    language: res.data.language || baseSettings.language || 'BENGALI',
                                    sections: baseSettings.sections || prev.sections
                                }));
                            }
                        } else {
                            const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                            setDocSettings(prev => ({
                                ...prev,
                                ...baseSettings,
                                institute: res.data.instituteName || baseSettings.institute || prev.institute,
                                subject: res.data.subjectName || baseSettings.subject || prev.subject,
                                className: res.data.className || baseSettings.className || prev.className,
                                exam: res.data.title || baseSettings.exam || prev.exam,
                                time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, res.data.language) : (baseSettings.time || prev.time),
                                totalMarks: res.data.totalMarks || baseSettings.totalMarks || prev.totalMarks,
                                year: new Date().getFullYear().toString(),
                                language: res.data.language || baseSettings.language || 'BENGALI',
                                sections: baseSettings.sections || prev.sections
                            }));
                        }
                    }

                    // Fetch Subject specific curriculum schema
                    if (res.data.subjectName) {
                        try {
                            const subTag = 'RULE_FOR_' + res.data.subjectName.replace(/\s/g, '');
                            const altTag = res.data.subjectName;
                            const kbRes = await deduplicatedGetKnowledge();
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
                const res = await deduplicatedGetTemplates();
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
                parsedSettings.group = docSettings.group;
                parsedSettings.board = docSettings.board;
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
                invalidateTemplatesCache();
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
            const parsedMins = parseDurationToMinutes(docSettings.time);
            const payload = {
                title: docSettings.exam || "Nexus Exam",
                examCode: "NEXUS-" + Math.floor(Math.random() * 10000),
                editorMode: editorMode,
                rawContent: rawContent,
                docSettingsJson: JSON.stringify(docSettings),
                isAutoGenerated: !!id,
                status: 'DRAFT',
                ...(parsedMins !== null ? { durationMinutes: parsedMins } : {})
            };
            
            if (id) {
                await examService.updateExam(id, payload);
                invalidateExamCache(id);
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
            const parsedMins = parseDurationToMinutes(docSettings.time);
            const payload = {
                title: title.trim(),
                examCode: "NEXUS-" + Math.floor(Math.random() * 10000),
                editorMode: editorMode,
                rawContent: rawContent,
                docSettingsJson: JSON.stringify(docSettings),
                isAutoGenerated: false,
                status: 'DRAFT',
                ...(parsedMins !== null ? { durationMinutes: parsedMins } : {})
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

    const saveSubjectDefaults = async (subjectName, currentSettings, type, className) => {
        if (!subjectName || subjectName.trim() === '') {
            alert(uiLang === 'bn' ? "দয়া করে প্রথমে বিষয় নির্বাচন করুন।" : "Please set a subject name first.");
            return;
        }
        
        let confirmMessage = '';
        if (type === 'class_subject') {
            if (!className || className.trim() === '') {
                alert(uiLang === 'bn' ? "দয়া করে প্রথমে শ্রেণী নির্বাচন করুন।" : "Please set a class name first.");
                return;
            }
            confirmMessage = uiLang === 'bn' 
                ? `আপনি কি বর্তমান লেআউটটি '${className}' শ্রেণীর '${subjectName}' বিষয়ের ডিফল্ট লেআউট হিসেবে সেট করতে চান?` 
                : `Are you sure you want to save current layout as default for Class '${className}' and Subject '${subjectName}'?`;
        } else {
            confirmMessage = uiLang === 'bn' 
                ? `আপনি কি বর্তমান লেআউটটি '${subjectName}' এর ডিফল্ট লেআউট হিসেবে সেট করতে চান?` 
                : `Are you sure you want to save current layout as default for '${subjectName}'?`;
        }
        
        const confirmSave = window.confirm(confirmMessage);
        if (!confirmSave) return;

        try {
            let subKey = '';
            if (type === 'class_subject') {
                subKey = 'subject_default_' + className.trim().toLowerCase() + '_' + subjectName.trim().toLowerCase();
            } else {
                subKey = 'subject_default_' + subjectName.trim().toLowerCase();
            }
            
            const userData = localStorage.getItem('user');
            let isSuper = false;
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    isSuper = user.roles && (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ROLE_SUPER_ADMIN'));
                } catch (e) {}
            }

            let examSettings = {};
            try {
                if (isSuper) {
                    examSettings = await settingsService.getGlobalSettings('EXAM');
                } else {
                    examSettings = await settingsService.getInstituteSettings('EXAM');
                }
            } catch (err) {
                console.warn("Failed to get current settings, initializing empty map", err);
            }
            examSettings[subKey] = JSON.stringify(currentSettings);
            
            if (isSuper) {
                await settingsService.updateGlobalSettings('EXAM', examSettings);
            } else {
                await settingsService.updateInstituteSettings('EXAM', examSettings);
            }
            invalidateSettingsCache('EXAM', isSuper);
            alert(uiLang === 'bn' ? "ডিফল্ট লেআউট সফলভাবে সংরক্ষিত হয়েছে!" : "Default layout saved successfully!");
            fetchSavedSubjects();
        } catch (err) {
            console.error("Failed to save subject default settings:", err);
            alert(uiLang === 'bn' ? "ডিফল্ট লেআউট সেভ করতে সমস্যা হয়েছে।" : "Error saving subject default layout.");
        }
    };

    const loadSubjectDefaults = async (subjectName, type, className) => {
        if (!subjectName || subjectName.trim() === '') return;
        try {
            let subjectDefaultSettings = null;
            let examSettings = null;
            let globalSettings = null;
            
            // Try loading from institute settings first
            try {
                examSettings = await deduplicatedGetSettings('EXAM', false);
            } catch (e) {
                console.warn("Failed to get institute settings, checking global...", e);
            }

            // Fallback to global settings
            try {
                globalSettings = await deduplicatedGetSettings('EXAM', true);
            } catch (e) {
                console.warn("Failed to get global settings", e);
            }

            // Helper to match using findDefaultLayoutInSettings
            const findMatch = (settings) => {
                if (!settings) return null;
                
                // If subjectName already contains key format (e.g. from the list: "৯ম-১০ম শ্রেণি_পদার্থবিজ্ঞান")
                if (type === 'class_subject' && subjectName.includes('_')) {
                    const parts = subjectName.split('_');
                    const displayClass = parts[0];
                    const displaySubject = parts.slice(1).join('_');
                    return findDefaultLayoutInSettings(settings, displayClass, displaySubject);
                }
                
                return findDefaultLayoutInSettings(settings, className, subjectName);
            };

            if (examSettings) {
                subjectDefaultSettings = findMatch(examSettings);
            }
            if (!subjectDefaultSettings && globalSettings) {
                subjectDefaultSettings = findMatch(globalSettings);
            }

            if (subjectDefaultSettings) {
                setDocSettings(prev => ({
                    ...prev,
                    ...subjectDefaultSettings,
                    institute: docSettings.institute || prev.institute,
                    subject: docSettings.subject || prev.subject,
                    className: docSettings.className || prev.className,
                    exam: docSettings.exam || prev.exam,
                    time: docSettings.time || prev.time,
                    totalMarks: docSettings.totalMarks || prev.totalMarks,
                    year: docSettings.year || prev.year,
                    language: docSettings.language || prev.language
                }));
                alert(uiLang === 'bn' ? "ডিফল্ট লেআউট লোড করা হয়েছে!" : "Default layout loaded successfully!");
            } else {
                const displayName = type === 'class_subject' 
                    ? (subjectName.includes('_') ? subjectName.replace('_', ' - ') : `${className} - ${subjectName}`) 
                    : subjectName;
                alert(uiLang === 'bn' ? `'${displayName}' এর জন্য কোনো ডিফল্ট লেআউট পাওয়া যায়নি।` : `No default layout found for '${displayName}'.`);
            }
        } catch (err) {
            console.error("Failed to load subject default layout:", err);
            alert(uiLang === 'bn' ? "ডিফল্ট লেআউট লোড করতে সমস্যা হয়েছে।" : "Error loading subject default layout.");
        }
    };

    const deleteSubjectDefault = async (subjectName, type, className) => {
        let targetKeySuffix = '';
        let displayName = subjectName;
        
        if (type === 'class_subject') {
            if (subjectName.includes('_')) {
                targetKeySuffix = subjectName;
                const parts = subjectName.split('_');
                displayName = parts[0] + ' - ' + parts.slice(1).join(' ');
            } else {
                if (!className) return;
                targetKeySuffix = className + '_' + subjectName;
                displayName = className + ' - ' + subjectName;
            }
        } else {
            targetKeySuffix = subjectName;
        }

        const targetKey = 'subject_default_' + targetKeySuffix;
        const normTargetKey = targetKey.toString().trim().toLowerCase().replace(/\s+/g, '');

        const confirmDelete = window.confirm(uiLang === 'bn' 
            ? `'${displayName}' এর ডিফল্ট লেআউট কি মুছে ফেলতে চান?` 
            : `Are you sure you want to delete default layout for '${displayName}'?`);
        if (!confirmDelete) return;

        try {
            const userData = localStorage.getItem('user');
            let isSuper = false;
            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    isSuper = user.roles && (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ROLE_SUPER_ADMIN'));
                } catch (e) {}
            }

            let examSettings = {};
            if (isSuper) {
                examSettings = await settingsService.getGlobalSettings('EXAM');
            } else {
                examSettings = await settingsService.getInstituteSettings('EXAM');
            }

            if (examSettings) {
                // Find matching key using normalized compare
                const matchedKey = Object.keys(examSettings).find(k => k.toString().trim().toLowerCase().replace(/\s+/g, '') === normTargetKey);
                if (matchedKey) {
                    delete examSettings[matchedKey];
                    if (isSuper) {
                        await settingsService.updateGlobalSettings('EXAM', examSettings);
                    } else {
                        await settingsService.updateInstituteSettings('EXAM', examSettings);
                    }
                    invalidateSettingsCache('EXAM', isSuper);
                    alert(uiLang === 'bn' ? "ডিফল্ট লেআউট মুছে ফেলা হয়েছে!" : "Default layout deleted successfully!");
                    fetchSavedSubjects();
                } else {
                    alert(uiLang === 'bn' ? "ডিফল্ট লেআউট খুঁজে পাওয়া যায়নি।" : "Default layout not found.");
                }
            }
        } catch (err) {
            console.error("Failed to delete subject default settings:", err);
            alert(uiLang === 'bn' ? "ডিফল্ট লেআউট মুছতে সমস্যা হয়েছে।" : "Error deleting subject default layout.");
        }
    };

    return {
        templates, loadingTemplates, isSavingTemplate,
        savedSubjectsList, savedClassSubjectsList, fetchSavedSubjects, saveSubjectDefaults, loadSubjectDefaults, deleteSubjectDefault,
        applyTemplate, handleSaveTemplate,
        handleSaveDocument, handleSaveAs,
        getNormalizedSubjectKey, getNormalizedClassKey
    };
};
