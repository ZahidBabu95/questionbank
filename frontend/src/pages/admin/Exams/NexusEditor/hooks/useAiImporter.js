import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import examService from '../../../../../services/examService';
import { useNexusEditor } from '../context/NexusEditorContext';
import { DEFAULT_SETTINGS } from '../components/DocumentSettings';

export const useAiImporter = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setRawContent, uiLang, docSettings } = useNexusEditor();

    useEffect(() => {
        const importFromAi = async () => {
            const importedStr = localStorage.getItem('nexus_editor_import');
            if (importedStr && !id) {
                try {
                    const parsed = JSON.parse(importedStr);
                    if (parsed.actionable_type === 'questions' && parsed.data) {
                        const qs = parsed.data;
                        const qsByType = { MCQ: [], CQ: [], SHORT: [], OTHER: [] };
                        qs.forEach(q => {
                            if (!q.type) q.type = (q.options && q.options.length > 0) ? 'MCQ' : 'SHORT';
                            if (q.type === 'MCQ') qsByType.MCQ.push(q);
                            else if (q.type === 'CQ') qsByType.CQ.push(q);
                            else if (q.type === 'SHORT') qsByType.SHORT.push(q);
                            else qsByType.OTHER.push(q);
                        });

                        const getQHtml = (q, sec) => {
                            const options = q.options ? q.options.map(o => ({ optionText: typeof o === 'string' ? o : o.optionText || o.label || '' })) : [];
                            const optionsJson = JSON.stringify(options).replace(/'/g, "&#39;");
                            const statementsJson = q.statements ? JSON.stringify(q.statements.map(s => typeof s === 'string' ? { statementText: s } : s)).replace(/'/g, "&#39;") : "[]";
                            
                            let qText = q.questionText ? q.questionText : (q.question || "");
                            if (q.type === 'CQ' && q.subQuestions && q.subQuestions.length > 0) {
                                let subHtml = '<ol type="a" class="cq-subquestions" style="margin-top: 8px;">';
                                q.subQuestions.forEach(sq => {
                                    subHtml += `<li data-marks="${sq.marks || 1}" style="display: flex; justify-content: space-between;">
                                        <span class="cq-text">${sq.questionText || sq.question || ''}</span>
                                        <span class="cq-marks">(${sq.marks || 1})</span>
                                    </li>`;
                                });
                                subHtml += '</ol>';
                                qText = subHtml;
                            }
                            
                            qText = qText.replace(/"/g, "&quot;");
                            const stimulusText = q.stimulus ? q.stimulus.replace(/"/g, "&quot;") : "";
                            const explanationText = q.explanation ? q.explanation.replace(/"/g, "&quot;") : "";
                            const answerText = q.answer ? q.answer.replace(/"/g, "&quot;") : "";
                            const qIdAttr = q.originalQuestionId ? q.originalQuestionId : `ai-${Math.random()}`;
                            const dynamicDataJson = q.dynamicData ? (typeof q.dynamicData === 'object' ? JSON.stringify(q.dynamicData).replace(/'/g, "&#39;") : q.dynamicData.replace(/'/g, "&#39;")) : "";
                            
                            return `
                            <div data-type="question-block" 
                                 questionid="${qIdAttr}"
                                 type="${q.type}" 
                                 questiontext="${qText}" 
                                 stimulus="${stimulusText}"
                                 explanation="${explanationText}"
                                 answer="${answerText}"
                                 language="${q.language || 'Bangla'}"
                                 chaptername="AI Generated" 
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
                                return { ...defaultSec, id: `sec-ai-${Date.now()}-${sectionIndex}`, name: `${sectionPrefixes[sectionIndex]}-বিভাগ: ${sectionNames[type]}` };
                            }
                            return {
                                id: `sec-ai-${Date.now()}-${sectionIndex}`,
                                name: `${sectionPrefixes[sectionIndex]}-বিভাগ: ${sectionNames[type] || 'প্রশ্নমালা'}`,
                                instructions: "সকল প্রশ্নের উত্তর দাও।",
                                conditions: "",
                                numberingStyle: "bn",
                                marksConfig: "showBracket",
                                optionLayout: "col1",
                                isMCQ: type === 'MCQ'
                            };
                        };

                        let finalHtml = '';
                        ['MCQ', 'CQ', 'SHORT', 'OTHER'].forEach(type => {
                            const typeQs = qsByType[type];
                            if (typeQs && typeQs.length > 0) {
                                const secConfig = buildSectionConfig(type);
                                dynamicSections.push(secConfig);
                                
                                finalHtml += `
                                <h3 data-section-id="${secConfig.id}" class="section-name" style="font-weight: bold; font-size: 1.1em; text-align: center; margin-bottom: 4px; margin-top: 24px;">${secConfig.name || ''}</h3>
                                <p data-section-id="${secConfig.id}" class="section-conditions" style="text-align: center; font-weight: bold; margin-bottom: 8px;">${secConfig.conditions ? '[' + secConfig.conditions + ']' : ''}</p>
                                <p data-section-id="${secConfig.id}" class="section-instructions" style="font-style: italic; margin-bottom: 12px; text-align: center;">${secConfig.instructions || ''}</p>
                                `;
                                
                                typeQs.forEach(q => {
                                    finalHtml += getQHtml(q, secConfig);
                                });
                                sectionIndex++;
                            }
                        });
                        
                        setRawContent(finalHtml);
                        localStorage.removeItem('nexus_editor_import');
                        
                        // Auto-save logic
                        setTimeout(async () => {
                            const title = window.prompt(uiLang === 'bn' ? "প্রশ্নপত্রের একটি নাম দিন (যেমন: মডেল টেস্ট ১):" : "Enter a title for this document:");
                            if (title && title.trim() !== '') {
                                try {
                                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                                    const instName = user.instituteName || "";
                                    const payload = {
                                        title: title.trim(),
                                        examCode: "NEXUS-AI-" + Math.floor(Math.random() * 10000),
                                        editorMode: 'STRICT_LINKED',
                                        rawContent: finalHtml,
                                        docSettingsJson: null,
                                        isAutoGenerated: true,
                                        status: 'DRAFT',
                                        classSubjectId: parsed.classSubjectId || '00000000-0000-0000-0000-000000000000',
                                        totalMarks: qs.reduce((sum, q) => sum + (Number(q.marks) || 1), 0) || 100,
                                        durationMinutes: 120,
                                        language: 'Bangla',
                                        instituteName: instName,
                                        examType: 'MODEL_TEST'
                                    };
                                    const res = await examService.createManualExam(payload);
                                    if (res?.data?.id) {
                                        navigate(`/exams/generate/nexus-editor/${res.data.id}`, { replace: true });
                                    }
                                } catch (err) {
                                    console.error("Failed to auto-save AI import", err);
                                    alert(uiLang === 'bn' ? "অটো-সেভ ব্যর্থ হয়েছে। ম্যানুয়ালি সেভ করুন।" : "Auto-save failed. Please save manually.");
                                }
                            }
                        }, 500);
                    }
                } catch (err) {
                    console.error("Failed to parse AI import", err);
                }
            }
        };
        importFromAi();
    }, [id, docSettings, navigate, uiLang, setRawContent]);
};
