import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import examService from '../../../../../services/examService';
import questionService from '../../../../../services/questionService';
import settingsService from '../../../../../services/settingsService';
import axios from '../../../../../utils/axios';
import { useNexusEditor } from '../context/NexusEditorContext';
import { DEFAULT_SETTINGS } from '../components/DocumentSettings';
import { formatDuration, parseDurationToMinutes } from '../../../../../utils/formatUtils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const resolveInstituteName = (examLanguage, apiInstituteName) => {
    try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        const lang = (examLanguage || '').toUpperCase();
        if (lang === 'ENGLISH') {
            return u.instituteNameEn || apiInstituteName || '';
        } else if (lang === 'BENGALI' || lang === 'BANGLA') {
            return u.instituteNameBn || apiInstituteName || '';
        }
        return u.instituteNameBn || apiInstituteName || '';
    } catch (e) {
        return apiInstituteName || '';
    }
};

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
        uiLang, pageCount,
        isDownloadingPdf, setIsDownloadingPdf,
        downloadProgress, setDownloadProgress,
        downloadStatus, setDownloadStatus
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

                    // Fetch Subject specific curriculum schema
                    let blueprintSections = null;
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
                                    if (schemaObj.generation_blueprint) {
                                        setGenerationBlueprint(schemaObj.generation_blueprint);
                                        if (schemaObj.generation_blueprint.mandatory_sections && Array.isArray(schemaObj.generation_blueprint.mandatory_sections)) {
                                            blueprintSections = schemaObj.generation_blueprint.mandatory_sections.map((sec, idx) => ({
                                                id: `sec-bp-${idx}-${Date.now()}`,
                                                name: sec.name,
                                                isMCQ: sec.type === 'MCQ',
                                                instructions: sec.instructions || '',
                                                conditions: sec.conditions || '',
                                                questionsToAnswer: sec.questionsToAnswer || null,
                                                marksPerQuestion: sec.marksPerQuestion || null,
                                                numberingStyle: 'bn',
                                                marksConfig: sec.type === 'MCQ' ? 'hide' : 'showBracket',
                                                optionLayout: 'col1',
                                                optionStyle: 'bn',
                                                optionDecoration: 'rightBracket'
                                            }));
                                        }
                                    }
                                }
                            }
                        } catch (schemaErr) { console.error("Failed to load dynamic schema for subject:", schemaErr); }
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
                             
                             let dynamicDataObj = {};
                             if (q.dynamicData) {
                                 try {
                                     dynamicDataObj = typeof q.dynamicData === 'string' ? JSON.parse(q.dynamicData) : q.dynamicData;
                                 } catch (e) { console.error("Error parsing dynamicData", e); }
                             }
                             if (q.sources && q.sources.length > 0 && (!dynamicDataObj.sources || dynamicDataObj.sources.length === 0)) {
                                 dynamicDataObj.sources = q.sources.map(src => ({
                                     organizationName: src.organizationName || src.organization_name,
                                     examYear: src.examYear || src.exam_year,
                                     examName: src.examName || src.exam_name,
                                     sourceType: src.sourceType || src.source_type
                                 }));
                             }
                             const dynamicDataJson = JSON.stringify(dynamicDataObj).replace(/'/g, "&#39;");

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
                                      data-options='${optionsJson}'
                                      data-dynamic-data='${dynamicDataJson}'>
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
                                    if (!parsedSettings.pageSize && !parsedSettings.orientation) {
                                        const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                                        const mergedSettings = {
                                            ...baseSettings,
                                            ...parsedSettings,
                                            institute: resolveInstituteName(parsedSettings.language || res.data.language || baseSettings.language || 'BENGALI', parsedSettings.institute || res.data.instituteName || baseSettings.institute),
                                            subject: res.data.subjectName || parsedSettings.subject || baseSettings.subject,
                                            className: res.data.className || parsedSettings.className || baseSettings.className,
                                            exam: res.data.title || parsedSettings.exam || baseSettings.exam,
                                            time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, parsedSettings.language || res.data.language) : (parsedSettings.time || baseSettings.time),
                                            totalMarks: res.data.totalMarks || parsedSettings.totalMarks || baseSettings.totalMarks,
                                            year: parsedSettings.year || new Date().getFullYear().toString(),
                                            language: parsedSettings.language || res.data.language || baseSettings.language || 'BENGALI',
                                            sections: parsedSettings.sections && parsedSettings.sections.length > 0 
                                                ? (dynamicSections.length > 0 ? [...parsedSettings.sections, ...dynamicSections] : parsedSettings.sections)
                                                : (dynamicSections.length > 0 ? dynamicSections : (blueprintSections || baseSettings.sections))
                                        };
                                        setDocSettings(mergedSettings);
                                    } else {
                                        if (dynamicSections.length > 0) parsedSettings.sections = [...(parsedSettings.sections || []), ...dynamicSections];
                                        const examLang = parsedSettings.language || res.data.language || 'BENGALI';
                                        parsedSettings.institute = resolveInstituteName(examLang, parsedSettings.institute || res.data.instituteName);
                                        setDocSettings(parsedSettings);
                                    }
                                } else {
                                    throw new Error("Parsed settings is null or invalid object");
                                }
                            } catch (e) {
                                console.error("Failed to parse docSettingsJson, falling back:", e);
                                const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                                setDocSettings(prev => ({
                                    ...prev,
                                    ...baseSettings,
                                    institute: resolveInstituteName(res.data.language || baseSettings.language || 'BENGALI', res.data.instituteName || baseSettings.institute || prev.institute),
                                    subject: res.data.subjectName || baseSettings.subject || prev.subject,
                                    className: res.data.className || baseSettings.className || prev.className,
                                    exam: res.data.title || baseSettings.exam || prev.exam,
                                    time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, res.data.language) : (baseSettings.time || prev.time),
                                    totalMarks: res.data.totalMarks || baseSettings.totalMarks || prev.totalMarks,
                                    year: new Date().getFullYear().toString(),
                                    language: res.data.language || baseSettings.language || 'BENGALI',
                                    sections: dynamicSections.length > 0 ? dynamicSections : (blueprintSections || baseSettings.sections || prev.sections)
                                }));
                            }
                        } else {
                            const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                            setDocSettings(prev => ({
                                ...prev,
                                ...baseSettings,
                                institute: resolveInstituteName(res.data.language || baseSettings.language || 'BENGALI', res.data.instituteName || baseSettings.institute || prev.institute),
                                subject: res.data.subjectName || baseSettings.subject || prev.subject,
                                className: res.data.className || baseSettings.className || prev.className,
                                exam: res.data.title || baseSettings.exam || prev.exam,
                                time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, res.data.language) : (baseSettings.time || prev.time),
                                totalMarks: res.data.totalMarks || baseSettings.totalMarks || prev.totalMarks,
                                year: new Date().getFullYear().toString(),
                                language: res.data.language || baseSettings.language || 'BENGALI',
                                sections: dynamicSections.length > 0 ? dynamicSections : (blueprintSections || baseSettings.sections || prev.sections)
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
                                    if (!parsedSettings.pageSize && !parsedSettings.orientation) {
                                        const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                                        const mergedSettings = {
                                            ...baseSettings,
                                            ...parsedSettings,
                                            institute: resolveInstituteName(parsedSettings.language || res.data.language || baseSettings.language || 'BENGALI', parsedSettings.institute || res.data.instituteName || baseSettings.institute),
                                            subject: res.data.subjectName || parsedSettings.subject || baseSettings.subject,
                                            className: res.data.className || parsedSettings.className || baseSettings.className,
                                            exam: res.data.title || parsedSettings.exam || baseSettings.exam,
                                            time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, parsedSettings.language || res.data.language) : (parsedSettings.time || baseSettings.time),
                                            totalMarks: res.data.totalMarks || parsedSettings.totalMarks || baseSettings.totalMarks,
                                            year: parsedSettings.year || new Date().getFullYear().toString(),
                                            language: parsedSettings.language || res.data.language || baseSettings.language || 'BENGALI',
                                            sections: parsedSettings.sections && parsedSettings.sections.length > 0 
                                                ? (blueprintSections || baseSettings.sections)
                                                : (blueprintSections || baseSettings.sections)
                                        };
                                        setDocSettings(mergedSettings);
                                    } else {
                                        const examLang = parsedSettings.language || res.data.language || 'BENGALI';
                                        parsedSettings.institute = resolveInstituteName(examLang, parsedSettings.institute || res.data.instituteName);
                                        setDocSettings(parsedSettings);
                                    }
                                } else {
                                    throw new Error("Parsed settings is null or invalid object");
                                }
                            } catch (e) {
                                console.error("Failed to parse docSettingsJson, falling back:", e);
                                const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                                setDocSettings(prev => ({
                                    ...prev,
                                    ...baseSettings,
                                    institute: resolveInstituteName(res.data.language || baseSettings.language || 'BENGALI', res.data.instituteName || baseSettings.institute || prev.institute),
                                    subject: res.data.subjectName || baseSettings.subject || prev.subject,
                                    className: res.data.className || baseSettings.className || prev.className,
                                    exam: res.data.title || baseSettings.exam || prev.exam,
                                    time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, res.data.language) : (baseSettings.time || prev.time),
                                    totalMarks: res.data.totalMarks || baseSettings.totalMarks || prev.totalMarks,
                                    year: new Date().getFullYear().toString(),
                                    language: res.data.language || baseSettings.language || 'BENGALI',
                                    sections: blueprintSections || baseSettings.sections || prev.sections
                                }));
                            }
                        } else {
                            const baseSettings = subjectDefaultSettings || DEFAULT_SETTINGS;
                            setDocSettings(prev => ({
                                ...prev,
                                ...baseSettings,
                                institute: resolveInstituteName(res.data.language || baseSettings.language || 'BENGALI', res.data.instituteName || baseSettings.institute || prev.institute),
                                subject: res.data.subjectName || baseSettings.subject || prev.subject,
                                className: res.data.className || baseSettings.className || prev.className,
                                exam: res.data.title || baseSettings.exam || prev.exam,
                                time: res.data.durationMinutes ? formatDuration(res.data.durationMinutes, res.data.language) : (baseSettings.time || prev.time),
                                totalMarks: res.data.totalMarks || baseSettings.totalMarks || prev.totalMarks,
                                year: new Date().getFullYear().toString(),
                                language: res.data.language || baseSettings.language || 'BENGALI',
                                sections: blueprintSections || baseSettings.sections || prev.sections
                            }));
                        }
                    }

                    // Fetch Subject specific curriculum schema removed as it has been moved to the top of fetchExam
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

      const handleDownloadPdf = async (silent = false, customFilename = '', selectedSetName = '') => {
          if (!id) {
              alert(uiLang === 'bn' ? "দয়া করে প্রথমে ডকুমেন্টটি সেভ করুন।" : "Please save the document first.");
              return;
          }
          setIsDownloadingPdf(true);
          setDownloadProgress(5);
          setDownloadStatus(uiLang === 'bn' ? "ডকুমেন্ট খসড়া প্রস্তুত করা হচ্ছে..." : "Preparing draft document...");

          let progressInterval = null;
          try {
              // 1. Silent save first to make sure any current visual edits are pushed to database before download
              const parsedMins = parseDurationToMinutes(docSettings.time);
              const payload = {
                  title: docSettings.exam || "Nexus Exam",
                  examCode: "NEXUS-" + Math.floor(Math.random() * 10000),
                  editorMode: editorMode,
                  rawContent: rawContent,
                  docSettingsJson: JSON.stringify(docSettings),
                  isAutoGenerated: true,
                  status: 'DRAFT',
                  ...(parsedMins !== null ? { durationMinutes: parsedMins } : {})
              };
              await examService.updateExam(id, payload);
              invalidateExamCache(id);

              setDownloadProgress(20);
              setDownloadStatus(uiLang === 'bn' ? "ক্যানভাস এলিমেন্ট সনাক্ত করা হচ্ছে..." : "Identifying canvas element...");

              const element = document.querySelector('.paper-canvas-container');
              if (!element) {
                  throw new Error("Paper canvas element not found");
              }

              // Wait for fonts to load before doing any height measurements
              try {
                  await document.fonts.ready;
              } catch (e) {
                  console.warn("Failed to wait for fonts to load:", e);
              }
              await new Promise(resolve => setTimeout(resolve, 300));

              const pageSize = docSettings.pageSize === 'A4' ? 'a4' : docSettings.pageSize === 'Legal' ? 'legal' : 'letter';
              const orientation = docSettings.orientation === 'landscape' || docSettings.orientation === 'Landscape' ? 'l' : 'p';

              // Calculate exact dimensions
              const sDetails = docSettings || {};
              const dimensions = {
                  'A4': { w: 794, h: 1123 },
                  'Legal': { w: 816, h: 1344 },
                  'Letter': { w: 816, h: 1056 },
                  'A5': { w: 559, h: 794 },
                  'Custom': { w: (sDetails.customW || 210) * 3.7795275591, h: (sDetails.customH || 297) * 3.7795275591 }
              };
              let { w, h } = dimensions[sDetails.pageSize || 'A4'] || dimensions['A4'];
              if (sDetails.orientation === 'landscape' || sDetails.orientation === 'Landscape') {
                  const temp = w;
                  w = h;
                  h = temp;
              }

              const borderOffset = docSettings.outerBorder ? (Number(docSettings.outerBorderWidth) || 1) * 3 + 12 : 0;
              const mmToPx = (mm) => mm * 3.7795275591;
              const paddingTop = mmToPx(docSettings.marginTop ?? 20) + borderOffset;
              const paddingBottom = mmToPx(docSettings.marginBottom ?? 20) + borderOffset;
              const paddingLeft = mmToPx(docSettings.marginLeft ?? 25) + borderOffset;
              const paddingRight = mmToPx(docSettings.marginRight ?? 20) + borderOffset;

              const proseMirror = element.querySelector('.ProseMirror');
              if (!proseMirror) {
                  throw new Error("ProseMirror editor container not found");
              }

              setDownloadProgress(35);
              setDownloadStatus(uiLang === 'bn' ? "পৃষ্ঠা বিভাজন ও ডিস্ট্রিবিউশন করা হচ্ছে..." : "Distributing content across physical pages...");

              // 1. Create temporary offscreen container
              const printContainer = document.createElement('div');
              printContainer.id = 'temp-pdf-print-container';
              printContainer.style.position = 'fixed';
              printContainer.style.left = '-9999px';
              printContainer.style.top = '-9999px';
              printContainer.style.width = `${w}px`;
              printContainer.style.zIndex = '-99999';
              document.body.appendChild(printContainer);

              const proseStyle = window.getComputedStyle(proseMirror);
              const header = element.querySelector('.nexus-native-header');

              const createNewPageElement = (pageNum) => {
                  const answerClass = (docSettings.includeAnswerSheet && docSettings.ansLayout !== 'compact')
                      ? `show-answers-${docSettings.ansLayout || 'highlighted'}`
                      : '';

                  const page = document.createElement('div');
                  page.className = `print-physical-page pdf-export-active ${answerClass}`;
                  page.style.width = `${w}px`;
                  page.style.height = `${h}px`;
                  page.style.backgroundColor = '#ffffff';
                  page.style.position = 'relative';
                  page.style.boxSizing = 'border-box';
                  page.style.overflow = 'hidden';
                  page.style.display = 'block';

                  // Apply exact double border in CSS
                  if (docSettings.outerBorder) {
                      const borderWidth = Number(docSettings.outerBorderWidth) || 1;
                      const borderDiv = document.createElement('div');
                      borderDiv.style.position = 'absolute';
                      borderDiv.style.top = '12px';
                      borderDiv.style.bottom = '12px';
                      borderDiv.style.left = '12px';
                      borderDiv.style.right = '12px';
                      borderDiv.style.border = `${borderWidth}px solid #000000`;
                      borderDiv.style.boxSizing = 'border-box';
                      borderDiv.style.pointerEvents = 'none';

                      const innerBorder = document.createElement('div');
                      const gapDist = borderWidth + 2.5;
                      innerBorder.style.position = 'absolute';
                      innerBorder.style.top = `${gapDist}px`;
                      innerBorder.style.bottom = `${gapDist}px`;
                      innerBorder.style.left = `${gapDist}px`;
                      innerBorder.style.right = `${gapDist}px`;
                      innerBorder.style.border = '0.8px solid #000000';
                      innerBorder.style.boxSizing = 'border-box';
                      innerBorder.style.pointerEvents = 'none';

                      borderDiv.appendChild(innerBorder);
                      page.appendChild(borderDiv);
                  }

                  // Watermark
                  if (docSettings.watermark && docSettings.watermark !== "কোনোটি নয়") {
                      const watermarkDiv = document.createElement('div');
                      watermarkDiv.className = 'absolute inset-0 flex items-center justify-center pointer-events-none z-0';
                      watermarkDiv.style.opacity = docSettings.watermarkOpacity / 100;
                      
                      const watermarkInner = document.createElement('div');
                      watermarkInner.style.transform = 'rotate(-45deg)';
                      watermarkInner.style.fontSize = '96px';
                      watermarkInner.style.fontWeight = '900';
                      watermarkInner.style.color = '#1e293b';
                      watermarkInner.style.opacity = '0.15';
                      watermarkInner.style.fontFamily = docSettings.enFont || 'Times New Roman';
                      watermarkInner.textContent = docSettings.watermark === "কাস্টম" ? docSettings.watermarkCustom : docSettings.watermark === "Confidential" ? "CONFIDENTIAL" : docSettings.institute;
                      
                      watermarkDiv.appendChild(watermarkInner);
                      page.appendChild(watermarkDiv);
                  }

                  // Inner wrapper to apply padding and avoid html2canvas root padding rendering issues
                  const innerWrapper = document.createElement('div');
                  innerWrapper.className = 'print-page-inner-wrapper';
                  innerWrapper.style.width = '100%';
                  innerWrapper.style.height = '100%';
                  innerWrapper.style.boxSizing = 'border-box';
                  innerWrapper.style.display = 'block'; // Avoid flexbox padding issues in html2canvas
                  innerWrapper.style.paddingTop = `${paddingTop}px`;
                  innerWrapper.style.paddingBottom = `${paddingBottom}px`;
                  innerWrapper.style.paddingLeft = `${paddingLeft}px`;
                  innerWrapper.style.paddingRight = `${paddingRight}px`;
                  innerWrapper.style.position = 'relative';
                  innerWrapper.style.zIndex = '10';
                  innerWrapper.style.backgroundColor = 'transparent';

                  const pageHeader = document.createElement('div');
                  pageHeader.className = 'print-page-header';
                  pageHeader.style.width = '100%';
                  pageHeader.style.display = 'block';
                  pageHeader.style.zIndex = '10';

                  const pageContent = document.createElement('div');
                  pageContent.className = `print-page-content ProseMirror focus:outline-none pdf-export-active ${answerClass}`;
                  pageContent.style.display = 'block';
                  pageContent.style.height = 'auto';
                  pageContent.style.minHeight = '0px';
                  pageContent.style.width = '100%';
                  pageContent.style.boxSizing = 'border-box';
                  pageContent.style.color = '#000000';
                  pageContent.style.backgroundColor = 'transparent';
                  pageContent.style.zIndex = '10';
                  pageContent.style.fontFamily = proseStyle.fontFamily;
                  pageContent.style.fontSize = proseStyle.fontSize;
                  pageContent.style.lineHeight = proseStyle.lineHeight;

                  if (pageNum === 1) {
                      pageHeader.style.display = 'block';
                      innerWrapper.appendChild(pageHeader);
                  } else {
                      pageHeader.style.display = 'none';
                  }

                  // Columns styling
                  const globalColCount = Number(docSettings.columns) || 1;
                  const isGlobalColActive = globalColCount > 1;
                  let colCount = 1;
                  let colGap = docSettings.colGap || 10;
                  
                  if (isGlobalColActive) {
                      colCount = globalColCount;
                  } else {
                      colCount = Math.max(1, ...(docSettings.sections || []).map(sec => Number(sec.columns) || 1));
                      const sectionWithGap = (docSettings.sections || []).find(sec => (Number(sec.columns) || 1) > 1 && sec.colGap);
                      if (sectionWithGap) {
                          colGap = sectionWithGap.colGap;
                      }
                  }

                  if (colCount > 1) {
                      pageContent.style.columnCount = colCount;
                      pageContent.style.columnGap = `${mmToPx(colGap)}px`;
                      pageContent.style.columnRule = 'none'; // Avoid black vertical rules
                      pageContent.style.columnFill = 'balance';
                  }

                  innerWrapper.appendChild(pageContent);
                  page.appendChild(innerWrapper);
                  return page;
              };

              const getFontFallback = (fontName) => {
                  if (!fontName) return 'serif';
                  const name = fontName.toLowerCase();
                  if (name.includes('serif') || name.includes('tiro') || name.includes('times')) {
                      return 'serif';
                  }
                  return 'sans-serif';
              };

              const maxPrintableHeight = h - paddingTop - paddingBottom;
              const safetyBuffer = 10; // 10px safety buffer to prevent subpixel overflow/clipping at page bottom

              const pages = [];
              let currentPage = createNewPageElement(1);
              printContainer.appendChild(currentPage);
              pages.push(currentPage);

              let currentPageContent = currentPage.querySelector('.print-page-content');
              let currentPageHeader = currentPage.querySelector('.print-page-header');

              // 2. Clone and place native header inside Page 1 (conditional flow vs span)
              const globalColCount = Number(docSettings.columns) || 1;
              const isGlobalColActive = globalColCount > 1;
              let headerHeight = 0;
              if (header) {
                  const clonedHeader = header.cloneNode(true);
                  clonedHeader.style.color = '#000000';

                  if (docSettings.multipleSetsEnabled && selectedSetName) {
                      const setCodeWrapper = clonedHeader.querySelector('.nexus-header-set-code');
                      if (setCodeWrapper) {
                          const canvasBorderColor = docSettings.orientation === 'landscape' ? '#cbd5e1' : '#e2e8f0';
                          setCodeWrapper.innerHTML = `<div class="nexus-set-code-box" style="display: inline-block; border: 1px solid ${canvasBorderColor}; padding: 2px 8px; font-size: 13px; font-weight: bold; border-radius: 4px; white-space: nowrap;">${docSettings.language === 'ENGLISH' ? 'Set Code' : 'সেট কোড'}: ${selectedSetName}</div>`;
                      }
                  }
                  if (isGlobalColActive) {
                      clonedHeader.style.setProperty('column-span', 'none', 'important');
                      clonedHeader.style.setProperty('-webkit-column-span', 'none', 'important');
                      clonedHeader.style.display = 'block';
                      currentPageContent.appendChild(clonedHeader);
                      headerHeight = 0; // Natural flow inside currentPageContent
                  } else {
                      clonedHeader.style.setProperty('column-span', 'all', 'important');
                      clonedHeader.style.setProperty('-webkit-column-span', 'all', 'important');
                      currentPageHeader.appendChild(clonedHeader);
                      
                      // Measure the rendered header height in offscreen print DOM
                      headerHeight = currentPageHeader.offsetHeight || header.offsetHeight || 180;
                  }
              }

              // 3. Distribute all other child elements dynamically
              let children = Array.from(proseMirror.children);

              if (docSettings.multipleSetsEnabled && selectedSetName) {
                  const mappings = docSettings.setMappings || {};
                  const setMapping = mappings[selectedSetName];

                  if (setMapping && setMapping.questions) {
                      const shuffledQIds = setMapping.questions;
                      const shuffledOptionsMap = setMapping.options || {};

                      // Find all MCQ children and their original positions
                      const mcqElements = [];
                      const mcqIndices = [];

                      children.forEach((child, idx) => {
                          const qBlock = child.getAttribute('data-type') === 'question-block'
                              ? child
                              : child.querySelector('div[data-type="question-block"]');
                          
                          if (qBlock) {
                              // Check if it's MCQ (has options-grid)
                              const optionsGrid = qBlock.querySelector('.options-grid');
                              if (optionsGrid) {
                                  mcqElements.push(child); // Store the top-level child wrapper
                                  mcqIndices.push(idx);
                              }
                          }
                      });

                      if (mcqElements.length > 0) {
                          // Map questionId -> element wrapper
                          const elementMap = {};
                          mcqElements.forEach(el => {
                              const qBlock = el.getAttribute('data-type') === 'question-block'
                                  ? el
                                  : el.querySelector('div[data-type="question-block"]');
                              if (qBlock) {
                                  const qId = qBlock.getAttribute('questionid');
                                  if (qId) elementMap[qId] = el;
                              }
                          });

                          // Reconstruct shuffled array of MCQ elements
                          const shuffledMcqElements = [];
                          shuffledQIds.forEach(qId => {
                              if (elementMap[qId]) {
                                  // Clone the element wrapper to avoid mutating original
                                  const clonedEl = elementMap[qId].cloneNode(true);
                                  const qBlock = clonedEl.getAttribute('data-type') === 'question-block'
                                      ? clonedEl
                                      : clonedEl.querySelector('div[data-type="question-block"]');

                                  // Shuffling options if options mappings exist for this question
                                  const optIds = shuffledOptionsMap[qId];
                                  if (optIds && optIds.length > 0 && qBlock) {
                                      const grid = qBlock.querySelector('.options-grid');
                                      if (grid) {
                                          const optionDivs = Array.from(grid.children);
                                          const dataOptions = JSON.parse(qBlock.getAttribute('data-options') || '[]');

                                          // Map optionId -> optionDiv
                                          const optDivMap = {};
                                          dataOptions.forEach((opt, oIdx) => {
                                              const optId = opt.id || `opt-${oIdx}`;
                                              if (optionDivs[oIdx]) {
                                                  optDivMap[optId] = optionDivs[oIdx];
                                              }
                                          });

                                          // Reorder option elements
                                          const shuffledOptionDivs = [];
                                          optIds.forEach(optId => {
                                              if (optDivMap[optId]) {
                                                  shuffledOptionDivs.push(optDivMap[optId]);
                                              }
                                          });

                                          // Clear and append in shuffled order
                                          grid.innerHTML = '';
                                          shuffledOptionDivs.forEach((optDiv, newIdx) => {
                                              grid.appendChild(optDiv);

                                              // Update label text
                                              const labelSpan = optDiv.querySelector('span');
                                              if (labelSpan) {
                                                  const optStyle = qBlock.getAttribute('optionstyle') || 'bn';
                                                  const dec = qBlock.getAttribute('optiondecoration') || 'rightBracket';

                                                  // Local label helper
                                                  const getOptionLabel = (idx, style = 'bn') => {
                                                      if (style === 'en') return String.fromCharCode(97 + idx);
                                                      if (style === 'roman') return ['i', 'ii', 'iii', 'iv', 'v'][idx] || (idx + 1);
                                                      if (style === 'num_en') return `${idx + 1}`;
                                                      if (style === 'num_bn') return ['১', '২', '৩', '৪', '৫'][idx] || (idx + 1);
                                                      return ['ক', 'খ', 'গ', 'ঘ', 'ঙ'][idx] || String.fromCharCode(97 + idx);
                                                  };

                                                  const optLabel = getOptionLabel(newIdx, optStyle);
                                                  const formattedLabel = dec === 'bracket' ? `(${optLabel})` 
                                                                       : dec === 'dot' ? `${optLabel}.` 
                                                                       : dec === 'bubble' ? optLabel 
                                                                       : `${optLabel})`;
                                                  labelSpan.textContent = formattedLabel;
                                              }
                                          });
                                      }
                                  }

                                  shuffledMcqElements.push(clonedEl);
                              }
                          });

                          // Place shuffled elements back at original indices in children
                          mcqIndices.forEach((origIdx, listIdx) => {
                              if (shuffledMcqElements[listIdx]) {
                                  children[origIdx] = shuffledMcqElements[listIdx];
                              }
                          });
                      }
                  }
              }
              for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  // Skip header portal container (we handled header separately)
                  if (child.classList.contains('nexus-native-header-portal-container')) {
                      continue;
                  }

                  // Handle manual page break node
                  if (child.classList.contains('page-break')) {
                      currentPage = createNewPageElement(pages.length + 1);
                      printContainer.appendChild(currentPage);
                      pages.push(currentPage);

                      currentPageContent = currentPage.querySelector('.print-page-content');
                      continue;
                  }

                  let nodeToAppend;

                  // Group consecutive section elements (name, conditions, instructions) sharing the same sectionId
                  if (child.classList.contains('section-name')) {
                      const sectionId = child.getAttribute('data-section-id');
                      
                      const wrapper = document.createElement('div');
                      wrapper.className = 'section-header-wrapper';
                      wrapper.setAttribute('data-section-id', sectionId || '');
                      const sectionSpanVal = isGlobalColActive ? 'none' : 'all';
                      wrapper.style.setProperty('column-span', sectionSpanVal, 'important');
                      wrapper.style.setProperty('-webkit-column-span', sectionSpanVal, 'important');
                      wrapper.style.width = '100%';
                      wrapper.style.display = 'block';
                      wrapper.style.breakInside = 'avoid';
                      wrapper.style.pageBreakInside = 'avoid';
                      wrapper.style.boxSizing = 'border-box';
                      wrapper.style.backgroundColor = 'transparent';

                      const sec = (docSettings.sections || []).find(x => x.id === sectionId);
                      const secFont = sec ? (sec.fontFamily || (docSettings.language === 'ENGLISH' || sec.numberingStyle === 'en' ? (docSettings.enFont || 'Times New Roman') : (docSettings.bnFont || 'Noto Serif Bengali'))) : (docSettings.language === 'ENGLISH' ? (docSettings.enFont || 'Times New Roman') : (docSettings.bnFont || 'Noto Serif Bengali'));
                      const secFallback = getFontFallback(secFont);
                      
                      const nameClone = child.cloneNode(true);
                      nameClone.style.setProperty('column-span', 'none', 'important');
                      nameClone.style.setProperty('-webkit-column-span', 'none', 'important');
                      nameClone.style.color = '#000000';
                      nameClone.style.fontFamily = `'${secFont}', ${secFallback}`;
                      wrapper.appendChild(nameClone);

                      while (i + 1 < children.length) {
                          const nextChild = children[i + 1];
                          const isCond = nextChild.classList.contains('section-conditions');
                          const isInst = nextChild.classList.contains('section-instructions');
                          const nextSecId = nextChild.getAttribute('data-section-id');

                          if ((isCond || isInst) && nextSecId === sectionId) {
                              const nextClone = nextChild.cloneNode(true);
                              nextClone.style.setProperty('column-span', 'none', 'important');
                              nextClone.style.setProperty('-webkit-column-span', 'none', 'important');
                              nextClone.style.color = '#000000';
                              nextClone.style.fontFamily = `'${secFont}', ${secFallback}`;
                              wrapper.appendChild(nextClone);
                              i++;
                          } else {
                               break;
                          }
                      }
                      nodeToAppend = wrapper;
                  } else {
                      nodeToAppend = child.cloneNode(true);
                      nodeToAppend.style.color = '#000000';
                  }

                  currentPageContent.appendChild(nodeToAppend);

                  // Measure scroll height vs max height allowed (subtracting header height on first page, minus safety buffer)
                  const limit = (pages.length === 1 ? (maxPrintableHeight - headerHeight) : maxPrintableHeight) - safetyBuffer;
                  if (currentPageContent.scrollHeight > limit) {
                      if (currentPageContent.children.length > 1) {
                          nodeToAppend.remove(); // Remove from current page

                          // Create new page
                          currentPage = createNewPageElement(pages.length + 1);
                          printContainer.appendChild(currentPage);
                          pages.push(currentPage);

                          currentPageContent = currentPage.querySelector('.print-page-content');
                          currentPageContent.appendChild(nodeToAppend);
                      }
                  }
              }

              // 4. Handle inline compact answer sheet if appended inside element
              const compactSheet = element.querySelector('.nexus-compact-answer-sheet');
              if (compactSheet) {
                  const clonedSheet = compactSheet.cloneNode(true);
                  clonedSheet.style.color = '#000000';
                  currentPageContent.appendChild(clonedSheet);

                  const limit = (pages.length === 1 ? (maxPrintableHeight - headerHeight) : maxPrintableHeight) - safetyBuffer;
                  if (currentPageContent.scrollHeight > limit) {
                      if (currentPageContent.children.length > 1) {
                          clonedSheet.remove();

                          // Create final page just for answers
                          currentPage = createNewPageElement(pages.length + 1);
                          printContainer.appendChild(currentPage);
                          pages.push(currentPage);

                          currentPageContent = currentPage.querySelector('.print-page-content');
                          currentPageContent.appendChild(clonedSheet);
                      }
                  }
              }

              const actualPageCount = pages.length;

              // Allow browser layout engine to fully paint offscreen elements
              await new Promise(resolve => setTimeout(resolve, 50));

              // Add vertical column rule lines to pages for html2canvas compatibility
              const isGlobalColumns = (docSettings.columns || 1) > 1;
              const showColBorder = (docSettings.sections || []).some(sec => sec.columns > 1 && sec.columnBorder) || (docSettings.columns > 1 && docSettings.columnBorder !== false);
              const colCountLines = Math.max(docSettings.columns || 1, ...(docSettings.sections || []).map(sec => sec.columns || 1));
              if (colCountLines > 1 && showColBorder) {
                  const colGap = docSettings.columns > 1 ? (docSettings.colGap || 10) : ((docSettings.sections || []).find(sec => sec.columns > 1 && sec.colGap)?.colGap || docSettings.colGap || 10);
                  const colGapPx = mmToPx(colGap);
                  const contentWidth = w - paddingLeft - paddingRight;
                  const colWidth = (contentWidth - (colCountLines - 1) * colGapPx) / colCountLines;

                  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
                      const page = pages[pageIdx];
                      const isPage1 = pageIdx === 0;

                      if (isGlobalColumns) {
                          for (let c = 1; c < colCountLines; c++) {
                              const lineX = paddingLeft + c * colWidth + (c - 0.5) * colGapPx;
                              const dividerLine = document.createElement('div');
                              dividerLine.className = 'print-column-divider';
                              dividerLine.style.position = 'absolute';
                              dividerLine.style.left = `${lineX}px`;
                              dividerLine.style.top = `${isPage1 ? (paddingTop + headerHeight) : paddingTop}px`;
                              dividerLine.style.bottom = `${paddingBottom}px`;
                              dividerLine.style.width = '0px';
                              dividerLine.style.borderLeft = '1.5px solid #000000';
                              dividerLine.style.pointerEvents = 'none';
                              dividerLine.style.zIndex = '5';
                              page.appendChild(dividerLine);
                          }
                      } else {
                          // Draw section-specific column lines
                          (docSettings.sections || []).forEach(sec => {
                              if (sec.columns > 1 && sec.columnBorder) {
                                  const qBlocks = Array.from(page.querySelectorAll(`[data-section-id="${sec.id}"][data-type="question-block"]`));
                                  if (qBlocks.length > 0) {
                                      let minTop = Infinity;
                                      let maxBottom = -Infinity;

                                      qBlocks.forEach(block => {
                                          const blockRect = block.getBoundingClientRect();
                                          const pageRect = page.getBoundingClientRect();
                                          const topRel = blockRect.top - pageRect.top;
                                          const bottomRel = blockRect.bottom - pageRect.top;

                                          if (topRel < minTop) minTop = topRel;
                                          if (bottomRel > maxBottom) maxBottom = bottomRel;
                                      });

                                      if (minTop !== Infinity && maxBottom !== -Infinity) {
                                          for (let c = 1; c < colCountLines; c++) {
                                              const lineX = paddingLeft + c * colWidth + (c - 0.5) * colGapPx;
                                              const dividerLine = document.createElement('div');
                                              dividerLine.className = 'print-column-divider';
                                              dividerLine.style.position = 'absolute';
                                              dividerLine.style.left = `${lineX}px`;
                                              dividerLine.style.top = `${minTop}px`;
                                              dividerLine.style.height = `${maxBottom - minTop}px`;
                                              dividerLine.style.width = '0px';
                                              dividerLine.style.borderLeft = '1.5px solid #000000';
                                              dividerLine.style.pointerEvents = 'none';
                                              dividerLine.style.zIndex = '5';
                                              page.appendChild(dividerLine);
                                          }
                                      }
                                  }
                              }
                          });
                      }
                  }
              }

              // 6. Initialize jsPDF
              const pdf = new jsPDF({
                  orientation: orientation,
                  unit: 'px',
                  format: [w, h]
              });

              // 7. Screenshot each physical A4 page individually
              for (let i = 0; i < actualPageCount; i++) {
                  setDownloadProgress(30 + Math.round((i / actualPageCount) * 55));
                  setDownloadStatus(uiLang === 'bn' ? `পৃষ্ঠা ${i + 1} প্রস্তুত করা হচ্ছে...` : `Preparing page ${i + 1}...`);

                  // Yield control to the browser to prevent UI freezing and lag
                  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50)));

                  const canvas = await html2canvas(pages[i], {
                      scale: 2, // 2x high resolution
                      useCORS: true,
                      allowTaint: false,
                      backgroundColor: '#ffffff',
                      logging: false,
                      width: w,
                      height: h,
                      windowWidth: w,
                      windowHeight: h,
                      scrollX: 0,
                      scrollY: 0
                  });

                  const imgData = canvas.toDataURL('image/jpeg', 1.0);

                  if (i > 0) {
                      pdf.addPage([w, h], orientation);
                  }

                  pdf.addImage(imgData, 'JPEG', 0, 0, w, h, undefined, 'FAST');
              }

              // Cleanup offscreen print container
              document.body.removeChild(printContainer);

              setDownloadProgress(90);
              setDownloadStatus(uiLang === 'bn' ? "পিডিএফ ফাইল ডাউনলোড করা হচ্ছে..." : "Downloading PDF file...");

              const hasAnswers = docSettings.includeAnswerSheet === true;

              if (window.ReactNativeWebView) {
                  setDownloadProgress(95);
                  setDownloadStatus(uiLang === 'bn' ? "পিডিএফ সার্ভারে সিঙ্ক করা হচ্ছে..." : "Syncing PDF with server...");

                  const pdfBlob = pdf.output('blob');
                  const formData = new FormData();
                  const suffix = selectedSetName ? `-${selectedSetName}` : '';
                  const saveName = customFilename ? `${customFilename}${suffix}.pdf` : `${docSettings.exam || 'exam'}${suffix}-${id}.pdf`;
                  formData.append('file', pdfBlob, saveName);

                  try {
                      await axios.post(`/v1/exams/download/upload-temp/${id}?includeAnswers=${hasAnswers}`, formData, {
                          headers: {
                              'Content-Type': 'multipart/form-data'
                          }
                      });
                  } catch (uploadErr) {
                      console.warn("Failed to pre-upload client-side PDF to server, mobile will fall back to server-side generation:", uploadErr);
                  }

                  const token = localStorage.getItem('token') || '';
                  const combinedParams = {
                      pageSize: docSettings.pageSize === 'A4' ? 'A4' : docSettings.pageSize === 'Legal' ? 'Legal' : 'Letter',
                      orientation: docSettings.orientation === 'landscape' || docSettings.orientation === 'Landscape' ? 'landscape' : 'portrait',
                      includeAnswers: hasAnswers
                  };
                  if (token) combinedParams.token = token;
                  if (customFilename) combinedParams.filename = customFilename;
                  const queryString = new URLSearchParams(combinedParams).toString();
                  
                  setDownloadProgress(100);
                  setDownloadStatus(uiLang === 'bn' ? "ডাউনলোড সম্পন্ন হয়েছে!" : "Download complete!");
                  
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'download_pdf',
                      examId: id,
                      queryString: queryString
                  }));
              } else {
                  const suffix = selectedSetName ? `-${selectedSetName}` : '';
                  const saveName = customFilename ? `${customFilename}${suffix}.pdf` : `${docSettings.exam || 'exam'}${suffix}-${id}.pdf`;
                  pdf.save(saveName);
                  
                  setDownloadProgress(100);
                  setDownloadStatus(uiLang === 'bn' ? "ডাউনলোড সম্পন্ন হয়েছে!" : "Download complete!");
              }

          } catch (err) {
              if (progressInterval) clearInterval(progressInterval);
              console.error("Failed to download PDF:", err);
          } finally {
              if (progressInterval) clearInterval(progressInterval);
              setTimeout(() => {
                  setIsDownloadingPdf(false);
                  setDownloadProgress(0);
                  setDownloadStatus('');
              }, 800);
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
        templates, loadingTemplates, isSavingTemplate, isDownloadingPdf, handleDownloadPdf,
        savedSubjectsList, savedClassSubjectsList, fetchSavedSubjects, saveSubjectDefaults, loadSubjectDefaults, deleteSubjectDefault,
        applyTemplate, handleSaveTemplate,
        handleSaveDocument, handleSaveAs,
        getNormalizedSubjectKey, getNormalizedClassKey
    };
};
