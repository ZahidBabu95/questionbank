import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { RefreshCw, Trash2, Edit3, RotateCcw } from 'lucide-react';
import questionService from '../../../../../services/questionService';

const parseMarkdownImages = (text, contextId = 'unknown') => {
    if (!text) return text;
    let imgCount = 0;
    return text.toString().replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, rawAlt, url) => {
        let finalUrl = url;
        if (url.includes('r2.dev') && !url.includes('proxy-image')) {
            finalUrl = `/api/v1/public/proxy-image?url=${encodeURIComponent(url)}`;
        }
        
        let alt = rawAlt;
        let align = 'center';
        let width = 'auto';
        
        if (rawAlt && rawAlt.includes('|')) {
            const parts = rawAlt.split('|');
            alt = parts[0];
            if (parts[1]) align = parts[1];
            if (parts[2]) width = parts[2];
        }
        
        if (contextId === 'stimulus' && (width === 'auto' || !width)) {
            width = '35%';
        }
            let marginStyle = '0.5rem 0';
            if (align === 'center') marginStyle = '0.5rem auto';
            if (align === 'right') marginStyle = '0.5rem 0 0 auto';

            const imgId = `${url}-${imgCount}`;
            const isSelected = window.__NEXUS_SELECTED_IMAGE__ === imgId;
            const ringClasses = isSelected ? 'outline outline-2 outline-indigo-500 shadow-sm' : 'hover:outline hover:outline-2 hover:outline-indigo-300';

            return `<img id="img-${imgId}" data-img-id="${imgId}" data-img-index="${imgCount++}" data-context="${contextId}" data-raw-alt="${rawAlt}" data-url="${url}" src="${finalUrl}" alt="${alt}" referrerPolicy="no-referrer" style="max-width: 100% !important; width: ${width} !important; border-radius: 0.5rem; margin: ${marginStyle} !important; display: block; cursor: pointer;" class="${ringClasses} transition-all print:outline-none" title="Click to resize or align image" />`;
        });
    };

const stripOptionPrefix = (html) => {
    if (!html) return '';
    let stripped = html.replace(/^(<p[^>]*>)?\s*(?:(?:[কখগঘa-dA-D1-4]|i{1,3}|iv)\s*[\.\)])\s*/i, '$1');
    stripped = stripped.replace(/^(<p[^>]*>)?\s*(?:(?:[কখগঘa-dA-D1-4]|i{1,3}|iv)\s*[\.\)])\s*/i, '$1');
    return stripped;
};

const formatMarksDigits = (marksVal, numberingStyle) => {
    if (marksVal === null || marksVal === undefined) return '';
    let str = marksVal.toString().trim();
    
    // Normalize: convert Bengali digits to English digits temporarily for numeric processing
    const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
    let enStr = str.replace(/[০-৯]/g, m => bnToEn[m]);
    
    // Parse as float, then convert to string to strip trailing .0 (e.g. 1.0 -> 1)
    const num = parseFloat(enStr);
    if (!isNaN(num)) {
        enStr = num.toString();
    }
    
    // Now translate to target numbering style
    if (numberingStyle === 'bn') {
        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        str = enStr.replace(/[0-9]/g, m => enToBn[m]);
    } else {
        str = enStr;
    }
    return str;
};

const isPlaceholderText = (text) => {
    if (!text) return true;
    const clean = text.toString().replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    return clean === '' || 
           clean.startsWith('generated question') || 
           clean.startsWith('dynamic question') || 
           clean.startsWith('ডায়নামিক প্রশ্ন') || 
           clean.startsWith('ডায়নামিক প্রশ্ন');
};

const cleanPlaceholderText = (html) => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Remove empty stem if it contains placeholder text
        const stem = doc.querySelector('.cq-stem');
        if (stem) {
            const stemText = (stem.textContent || stem.innerText || '').trim().toLowerCase();
            if (stemText.startsWith('generated question') || 
                stemText.startsWith('dynamic question') || 
                stemText.startsWith('ডায়নামিক প্রশ্ন') || 
                stemText.startsWith('ডায়নামিক প্রশ্ন') || 
                stemText === '') {
                stem.remove();
            }
        }

        const walk = (node) => {
            if (node.nodeType === 3) { // TEXT_NODE
                let txt = node.nodeValue;
                txt = txt
                    .replace(/generated\s+question/gi, '')
                    .replace(/dynamic\s+question/gi, '')
                    .replace(/ডায়নামিক\s+প্রশ্ন/g, '')
                    .replace(/ডায়নামিক\s+প্রশ্ন/g, '');
                
                // Strip leftover numbering/punctuation at the beginning of the text node
                txt = txt.replace(/^\s*[০-৯\d\s\.\,\-\:\)\(\[\]\{\}\/\\।]+/, '');
                node.nodeValue = txt;
            } else {
                for (let child of node.childNodes) {
                    walk(child);
                }
            }
        };
        
        walk(doc.body);
        
        // Now check if the remaining body has any actual text content
        const bodyText = (doc.body.textContent || doc.body.innerText || '').trim();
        const onlyPunct = /^[০-৯\d\s\.\,\-\:\)\(\[\]\{\}\/\\।]*$/;
        if (onlyPunct.test(bodyText)) {
            return '';
        }
        
        return doc.body.innerHTML;
    } catch (e) {
        console.error("Error in cleanPlaceholderText:", e);
        let clean = html
            .replace(/generated\s+question/gi, '')
            .replace(/dynamic\s+question/gi, '')
            .replace(/ডায়নামিক\s+প্রশ্ন/g, '')
            .replace(/ডায়নামিক\s+প্রশ্ন/g, '');
        
        clean = clean.replace(/^\s*[০-৯\d\s\.\,\-\:\)\(\[\]\{\}\/\\।]+/, '');
        const plainText = clean.replace(/<[^>]*>?/gm, '').trim();
        if (/^[০-৯\d\s\.\,\-\:\)\(\[\]\{\}\/\\।]*$/.test(plainText)) {
            return '';
        }
        return clean;
    }
};


    const QuestionComponent = ({ node, editor, deleteNode, updateAttributes, getPos, selected }) => {
        // Strict mode lock removed as per user request to make it fully usable
        const isStrict = editor?.view?.dom?.classList?.contains('strict-analytics-mode') || false;
        
        // Convert 0, 1, 2, 3 to ক, খ, গ, ঘ
        const getBanglaOptionLabel = (idx) => {
            const labels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ'];
            return labels[idx] || String.fromCharCode(97 + idx);
        };

        const ptToPx = (pt) => pt ? pt * 1.333333 : null;
        const fSize = ptToPx(node.attrs.fontSize);
        
        // Safety clamp for line gap to prevent collapsing
        const safeLineGap = node.attrs.lineGap ? Number(node.attrs.lineGap) : 'inherit';

        // Track latest attributes to prevent stale closures in onUpdate
        const attrsRef = React.useRef(node.attrs);
        React.useEffect(() => {
            attrsRef.current = node.attrs;
        }, [node.attrs]);

        // Auto-sync missing fields from DB for old saved questions
        React.useEffect(() => {
            const attrs = node.attrs;
            if (!attrs.questionId) return;

            const isMCQ = attrs.type === 'MCQ';
            
            // We need to sync if it hasn't been synced from DB, or if dynamicData is missing/null,
            // or if it's MCQ and option correct flags are missing.
            const needsBasicSync = !attrs.syncedFromDb;
            const needsDynamicSync = !attrs.dynamicDataSynced && !attrs.dynamicData;
            
            if (needsBasicSync || needsDynamicSync) {
                questionService.getQuestionById(attrs.questionId).then(q => {
                    if (q) {
                        const updateObj = {
                            syncedFromDb: true,
                            dynamicDataSynced: true
                        };
                        
                        // Sync explanation/answer if missing
                        if (!attrs.explanation && q.explanation) {
                            updateObj.explanation = q.explanation;
                        }
                        if (!attrs.answer && q.correctAnswer) {
                            updateObj.answer = q.correctAnswer;
                        }
                        if (!attrs.language && q.language) {
                            updateObj.language = q.language;
                        }
                        
                        // Sync dynamicData if missing
                        if (!attrs.dynamicData && q.dynamicData) {
                            updateObj.dynamicData = q.dynamicData;
                        }
                        
                        // Sync stimulus if missing
                        if (!attrs.stimulus && q.stimulus) {
                            updateObj.stimulus = q.stimulus;
                        }
                        
                        // Sync questionText if missing or placeholder
                        const cleanCurrentText = (attrs.questionText || '').replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                        const isTextPlaceholder = cleanCurrentText.startsWith('generated question') || 
                                                  cleanCurrentText.startsWith('dynamic question') || 
                                                  cleanCurrentText.startsWith('ডায়নামিক প্রশ্ন') || 
                                                  cleanCurrentText.startsWith('ডায়নামিক প্রশ্ন') || 
                                                  cleanCurrentText === '';
                        if (isTextPlaceholder && q.questionText) {
                            updateObj.questionText = q.questionText;
                        }

                        // Sync options if MCQ and missing correct flags
                        if (isMCQ && q.options) {
                            const hasCorrectFlag = attrs.options && attrs.options.some(o => o.isCorrect !== undefined || o.correct !== undefined);
                            if (!hasCorrectFlag) {
                                updateObj.options = q.options.map(opt => ({
                                    id: opt.id,
                                    optionText: opt.optionText,
                                    correct: opt.isCorrect || opt.correct
                                }));
                            }
                        }

                        updateAttributes(updateObj);
                    } else {
                        // Question not found in DB, mark as synced to prevent loops
                        updateAttributes({ syncedFromDb: true, dynamicDataSynced: true });
                    }
                }).catch(err => {
                    console.error("Failed to sync question data for ID:", attrs.questionId, err);
                    updateAttributes({ syncedFromDb: true, dynamicDataSynced: true }); // Prevent infinite retry
                });
            }
        }, [node.attrs.questionId, node.attrs.syncedFromDb, node.attrs.dynamicDataSynced, node.attrs.dynamicData, updateAttributes]);

        const handleImageMouseDown = (e) => {
            if (e.target.tagName === 'IMG' && e.target.hasAttribute('data-img-index')) {
                // Allows native interaction
                e.stopPropagation();
                
                const rawAlt = e.target.getAttribute('data-raw-alt') || '';
                const url = e.target.getAttribute('data-url');
                const imgIndex = parseInt(e.target.getAttribute('data-img-index'));
                const imgId = e.target.getAttribute('data-img-id');
                
                // Set global selection
                window.__NEXUS_SELECTED_IMAGE__ = imgId;

                // Update DOM immediately for visual feedback
                document.querySelectorAll('img[data-img-index]').forEach(img => {
                    img.classList.remove('outline', 'outline-2', 'outline-indigo-500', 'shadow-sm');
                    img.classList.add('hover:outline', 'hover:outline-2', 'hover:outline-indigo-300');
                });
                e.target.classList.remove('hover:outline', 'hover:outline-2', 'hover:outline-indigo-300');
                e.target.classList.add('outline', 'outline-2', 'outline-indigo-500', 'shadow-sm');
                
                let parts = rawAlt.split('|');
                let alt = parts[0] || 'চিত্র';
                let align = parts[1] || 'center';
                let width = parts[2] || 'auto';

                const contextId = e.target.getAttribute('data-context');

                // Dispatch global event to open properties panel in NexusEditor
                const updateImageConfig = (newAlign, newWidth, newUrl) => {
                    const finalUrl = newUrl || url;
                    const newRawAlt = `${alt}|${newAlign}|${newWidth}`;
                    const newMarkdown = `![${newRawAlt}](${finalUrl})`;

                    // Helper to safely replace the Nth occurrence of an image
                    const replaceNthImage = (text) => {
                        if (!text) return { replaced: false, text };
                        let count = 0;
                        let replaced = false;
                        
                        const newText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, matchAlt, matchUrl) => {
                            if (count === imgIndex) {
                                replaced = true;
                                count++;
                                return newMarkdown;
                            }
                            count++;
                            return match;
                        });
                        return { replaced, text: newText };
                    };

                    if (!updateAttributes) return;

                    if (contextId === 'stimulus') {
                        const res = replaceNthImage(attrsRef.current.stimulus);
                        if (res.replaced) updateAttributes({ stimulus: res.text });
                    } 
                    else if (contextId === 'questionText') {
                        const res = replaceNthImage(attrsRef.current.questionText);
                        if (res.replaced) updateAttributes({ questionText: res.text });
                    }
                    else if (contextId && contextId.startsWith('stmt-')) {
                        const idx = parseInt(contextId.split('-')[1]);
                        const newStmts = [...attrsRef.current.statements];
                        const res = replaceNthImage(newStmts[idx]);
                        if (res.replaced) {
                            newStmts[idx] = res.text;
                            updateAttributes({ statements: newStmts });
                        }
                    }
                    else if (contextId && contextId.startsWith('opt-')) {
                        const idx = parseInt(contextId.split('-')[1]);
                        const newOpts = [...attrsRef.current.options];
                        const res = replaceNthImage(newOpts[idx].optionText || newOpts[idx].text || '');
                        if (res.replaced) {
                            newOpts[idx] = { ...newOpts[idx], optionText: res.text };
                            updateAttributes({ options: newOpts });
                        }
                    }

                    window.dispatchEvent(new CustomEvent('nexusImageSelected', {
                        detail: { width: newWidth, align: newAlign, src: finalUrl, onUpdate: updateImageConfig }
                    }));
                };

                // Initial dispatch to open the properties panel with current values
                window.dispatchEvent(new CustomEvent('nexusImageSelected', {
                    detail: { src: url, width: width, align: align, onUpdate: updateImageConfig }
                }));
            }
        };

        const handleMouseDown = (e) => {
            if (e.target.tagName === 'IMG') {
                handleImageMouseDown(e);
                return;
            }
        };

        const handleClick = (e) => {
            if (e.target.tagName === 'IMG') return;
            const isStrict = editor?.view?.dom?.classList?.contains('strict-analytics-mode') || false;
            if (isStrict) {
                // Just open the setup panel for the section, or do nothing.
                window.dispatchEvent(new CustomEvent('nexusOpenTab', { detail: 'questionSetup' }));
            }
        };

        const getRenderedQuestionText = () => {
            let html = node.attrs.questionText || '';
            if (!html) return '';

            try {
                const cleanedHtml = cleanPlaceholderText(html);
                if (!cleanedHtml) return '';

                const parser = new DOMParser();
                const doc = parser.parseFromString(cleanedHtml, 'text/html');

                // Format cq-marks
                const cqMarks = doc.querySelectorAll('.cq-marks');
                cqMarks.forEach(span => {
                    let text = span.textContent || '';
                    const match = text.match(/[\d\.০-৯]+/);
                    if (match) {
                        const originalNum = match[0];
                        const targetStyle = (node.attrs.language === 'English' || node.attrs.numberingStyle === 'en') ? 'en' : 'bn';
                        const formattedNum = formatMarksDigits(originalNum, targetStyle);
                        span.textContent = formattedNum;
                    }
                });

                return doc.body.innerHTML;
            } catch (e) {
                console.error("Failed to parse and clean questionText HTML", e);
                return cleanPlaceholderText(html);
            }
        };

        const cleanHtml = (html) => {
            if (!html) return '';
            let cleaned = html;
            let prev;
            do {
                prev = cleaned;
                cleaned = cleaned
                    .replace(/<p[^>]*>\s*<\/p>/gi, '')
                    .replace(/<p[^>]*>\s*<br[^>]*>\s*<\/p>/gi, '')
                    .replace(/<p[^>]*>(?:\s|&nbsp;)*<\/p>/gi, '')
                    .replace(/<br[^>]*>\s*$/gi, '')
                    .replace(/^\s*<br[^>]*>/gi, '')
                    .trim();
            } while (cleaned !== prev);
            return cleaned;
        };

        let dynamicDataParsed = null;
        let hideSubParts = false;
        if (node.attrs.dynamicData) {
            try {
                dynamicDataParsed = typeof node.attrs.dynamicData === 'string' 
                    ? JSON.parse(node.attrs.dynamicData) 
                    : node.attrs.dynamicData;
                const isDescriptiveCQ = node.attrs.type === 'CQ_DESCRIPTIVE';
                hideSubParts = dynamicDataParsed && (dynamicDataParsed.hideSubPartsTable === true || dynamicDataParsed.hide_sub_parts === true || isDescriptiveCQ);
            } catch (e) {
                console.error("Failed to parse dynamicData in QuestionComponent:", e);
            }
        }

        const questionFields = [];
        const answerFields = [];
        const explanationFields = [];

        const hasSubPartsAnswers = dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.some(part => part.answer);
        const hasSubPartsExplanations = dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.some(part => part.explanation);

        if (dynamicDataParsed) {
            const entries = Object.entries(dynamicDataParsed);

            const metadataKeys = [
                'questiontype', 'question_type', 'type',
                'sources', 'source',
                'stimulus',
                'difficulty',
                'marks',
                'language',
                'bloomlevel', 'bloom_level'
            ];

            entries.forEach(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return;
                const lowerKey = key.toLowerCase();
                if (metadataKeys.includes(lowerKey)) return;
                if (lowerKey === 'sub_parts' && hideSubParts) return;

                if (lowerKey.includes('explanation') || lowerKey.includes('rationale')) {
                    if (!hasSubPartsExplanations) {
                        explanationFields.push([key, value]);
                    }
                } else if (lowerKey.includes('answer') || lowerKey.includes('solution') || lowerKey.includes('correct')) {
                    if (!hasSubPartsAnswers) {
                        answerFields.push([key, value]);
                    }
                } else {
                    questionFields.push([key, value]);
                }
            });
        }

        const renderDynamicValue = (key, value, isAnswerBlock = false) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;

            if (typeof value === 'string') {
                const cleanVal = value.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                if (cleanVal.startsWith('generated question') || cleanVal.startsWith('dynamic question') || cleanVal.startsWith('ডায়নামিক প্রশ্ন') || cleanVal.startsWith('ডায়নামিক প্রশ্ন') || cleanVal === '') {
                    return null;
                }
            }

            const lowerKey = key.toLowerCase();
            const hideLabel = lowerKey === 'text' || lowerKey === 'question' || lowerKey === 'questiontext' || lowerKey === 'question_text' || lowerKey === 'content';

            if (typeof value === 'string') {
                return (
                    <div key={key} className="mb-2 last:mb-0 w-full">
                        {!isStrict && !hideLabel && (
                            <div className={`text-[10px] font-bold uppercase tracking-wider select-none mb-0.5 ${
                                isAnswerBlock ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                                {key.replace(/_/g, ' ')}
                            </div>
                        )}
                        <div className={isAnswerBlock ? 'text-emerald-800 font-medium' : 'text-slate-900'}
                             style={{ lineHeight: safeLineGap }}
                             dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(value, key)) }}
                        />
                    </div>
                );
            } else if (Array.isArray(value)) {
                return (
                    <div key={key} className="mb-3 last:mb-0 w-full">
                        {!isStrict && !hideLabel && (
                            <div className={`text-[10px] font-bold uppercase tracking-wider select-none mb-1 ${
                                isAnswerBlock ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                                {key.replace(/_/g, ' ')}
                            </div>
                        )}
                        <div className="space-y-1.5 w-full">
                            {value.map((item, idx) => (
                                <div key={idx} className={`p-2 rounded-lg border ${
                                    isAnswerBlock ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/50 border-slate-200'
                                }`}>
                                    {typeof item === 'object' ? (
                                        <div className="flex flex-wrap gap-3">
                                            {Object.entries(item).map(([k, v]) => (
                                                <div key={k} className="flex-1 min-w-[120px]">
                                                    <span className={`text-[9px] font-bold block mb-0.5 uppercase ${
                                                        isAnswerBlock ? 'text-emerald-600' : 'text-slate-400'
                                                    }`}>
                                                        {k.replace(/_/g, ' ')}
                                                    </span>
                                                    <div className={isAnswerBlock ? 'text-emerald-800' : 'text-slate-800'}
                                                         dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(v || '-', k)) }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={isAnswerBlock ? 'text-emerald-800' : 'text-slate-800'}
                                             dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(item, `${key}-${idx}`)) }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            return null;
        };

        return (
            <NodeViewWrapper 
                data-type="question-block" 
                data-section-id={node.attrs.sectionId}
                data-numberingstyle={node.attrs.numberingStyle || 'bn'}
                data-first-in-section={node.attrs.firstInSection ? 'true' : undefined}
                className={`relative group mb-0 transition-all duration-200 rounded-xl ${isStrict ? 'cursor-pointer hover:bg-slate-50' : 'cursor-text'} print:bg-transparent print:scale-100 print:shadow-none print:ring-0 ${node.attrs.language === 'English' ? 'lang-en' : 'lang-bn'}`}
                style={{ 
                    fontSize: fSize ? `${fSize}px` : 'inherit',
                    lineHeight: safeLineGap,
                    marginBottom: node.attrs.questionGap !== undefined && node.attrs.questionGap !== null ? `${node.attrs.questionGap}px` : undefined,
                    paddingTop: '0px',
                    paddingBottom: '0px',
                    counterReset: node.attrs.questionNumber ? `question-counter ${node.attrs.questionNumber - 1}` : undefined
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <div className="relative transition-all">
                    {/* Action buttons moved to sidebar */}
                </div>

                <div className="flex flex-col items-start gap-1 w-full cq-question-layout">
                    {node.attrs.stimulus && !isPlaceholderText(node.attrs.stimulus) && (
                        <div className="w-full mb-1 text-slate-800 cq-stimulus-block" 
                             style={{ textAlign: node.attrs.textAlign || 'left', lineHeight: safeLineGap }}
                             dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(node.attrs.stimulus, 'stimulus')) }} 
                        />
                    )}
                    
                    {getRenderedQuestionText() ? (
                        <div className="flex items-start justify-between gap-4 w-full">
                            <div className="text-slate-900 font-medium flex-1 w-full" 
                                 style={{ textAlign: node.attrs.textAlign || 'left' }}
                                 dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(getRenderedQuestionText(), 'questionText')) }} 
                            />
                            {node.attrs.marksConfig !== 'hide' && node.attrs.marks && (
                                <span className="font-medium text-slate-800 whitespace-nowrap shrink-0 ml-4 mt-0.5 select-none"
                                      style={{ fontSize: fSize ? `${fSize * 0.9}px` : '0.9em' }}>
                                    {node.attrs.marksConfig === 'showBracket' 
                                        ? `(${formatMarksDigits(node.attrs.marks, node.attrs.numberingStyle)})` 
                                        : formatMarksDigits(node.attrs.marks, node.attrs.numberingStyle)}
                                </span>
                            )}
                        </div>
                    ) : (
                        node.attrs.marksConfig !== 'hide' && node.attrs.marks && (
                            <div className="flex justify-end w-full">
                                <span className="font-medium text-slate-800 whitespace-nowrap shrink-0 ml-4 mt-0.5 select-none"
                                      style={{ fontSize: fSize ? `${fSize * 0.9}px` : '0.9em' }}>
                                    {node.attrs.marksConfig === 'showBracket' 
                                        ? `(${formatMarksDigits(node.attrs.marks, node.attrs.numberingStyle)})` 
                                        : formatMarksDigits(node.attrs.marks, node.attrs.numberingStyle)}
                                </span>
                            </div>
                        )
                    )}

                    {dynamicDataParsed && questionFields.length > 0 && (
                        <div className="w-full flex flex-col gap-2">
                            {questionFields.map(([key, value]) => renderDynamicValue(key, value, false))}
                        </div>
                    )}

                    {dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.length > 0 && !hideSubParts && (
                        <div className="w-full mt-2 pl-4 flex flex-col gap-2 cq-subparts-list">
                            {dynamicDataParsed.sub_parts.map((part, pIdx) => {
                                const partLabel = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                const labelText = `(${partLabel})`;
                                const partMarks = part.marks !== undefined && part.marks !== null ? part.marks : (pIdx + 1);
                                return (
                                    <div key={pIdx} className="flex items-start justify-between gap-4 w-full cq-subpart-item" style={{ fontSize: fSize ? `${fSize * 0.95}px` : '0.95em' }}>
                                        <div className="flex gap-2 flex-1 items-start text-slate-800">
                                            <span className="font-semibold select-none">{labelText}</span>
                                            <div 
                                                className="font-normal inline text-slate-800 cq-subpart-question-text"
                                                dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(part.questionText || '', `subpart-q-${pIdx}`)) }} 
                                            />
                                        </div>
                                        {node.attrs.marksConfig !== 'hide' && partMarks && (
                                            <span className="font-medium text-slate-800 whitespace-nowrap shrink-0 ml-4 select-none"
                                                  style={{ fontSize: fSize ? `${fSize * 0.85}px` : '0.85em' }}>
                                                {node.attrs.marksConfig === 'showBracket' 
                                                    ? `(${formatMarksDigits(partMarks, node.attrs.numberingStyle)})` 
                                                    : formatMarksDigits(partMarks, node.attrs.numberingStyle)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {node.attrs.statements && Array.isArray(node.attrs.statements) && node.attrs.statements.length > 0 && (
                        <div className="w-full mt-[0.2em] mb-[0.2em] pl-[1.5em]">
                            <div className="flex flex-col gap-y-1">
                                {node.attrs.statements.map((stmt, idx) => {
                                    const roman = ['i', 'ii', 'iii', 'iv', 'v'][idx] || (idx + 1);
                                    const safeStmt = typeof stmt === 'string' ? stmt : '';
                                    // Strip existing prefix like 'i.', 'ii)', '1.', etc.
                                    const cleanStmt = safeStmt.replace(/^(?:i{1,3}|iv|v|vi{0,3}|ix|x|[0-9]+|[১-৯]+)[\.\)]\s*/i, '').trim();
                                    return (
                                        <div key={idx} className="flex gap-2 items-start text-slate-800" style={{ fontSize: fSize ? `${fSize * 0.95}px` : '0.95em' }}>
                                            <span className="font-medium mt-[1px]">{roman}.</span>
                                            <div dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(cleanStmt, `stmt-${idx}`)) }} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* MCQ Options Rendering */}
                {node.attrs.options && Array.isArray(node.attrs.options) && node.attrs.options.length > 0 && (() => {
                    let computedLayout = node.attrs.optionLayout || 'col1';

                    if (node.attrs.smartFit !== false) {
                        const hasImage = node.attrs.options.some(o => (o.optionText || o.text || '').toLowerCase().includes('<img'));
                        if (hasImage) {
                            computedLayout = 'col1';
                        } else {
                            const getVisualLength = (html) => {
                                const text = (html || '').replace(/<[^>]*>?/gm, '');
                                let len = 0;
                                for(let i=0; i<text.length; i++) {
                                    const code = text.charCodeAt(i);
                                    if (code >= 0x0980 && code <= 0x09FF) len += 1.3; // Bengali
                                    else if (code >= 0x41 && code <= 0x5A) len += 1.2; // Uppercase EN
                                    else if (text[i] === '\\' || text[i] === '$' || text[i] === '^' || text[i] === '_') len += 1.5; // Math
                                    else len += 1.0;
                                }
                                return len;
                            };
                            
                            const maxLen = Math.max(...node.attrs.options.map(o => getVisualLength(o.optionText || o.text)));
                            
                            let pageCols = node.attrs.pageCols || 1;
                            
                            const scale = (fSize || 14.66) / 14.66;
                            
                            // Improved thresholds for professional fit
                            const threshold1Col = Math.floor((pageCols > 1 ? 22 : 45) / scale);
                            const threshold2Col = Math.floor((pageCols > 1 ? 10 : 20) / scale);
                            
                            if (maxLen >= threshold1Col) {
                                computedLayout = 'col1';
                            } else if (maxLen >= threshold2Col) {
                                computedLayout = 'col2';
                            } else {
                                computedLayout = 'col4';
                            }
                        }
                    }
                    
                    return (
                        <div className={`options-grid grid gap-x-6 ${computedLayout === 'col4' ? 'grid-cols-4' : computedLayout === 'col2' ? 'grid-cols-2' : 'grid-cols-1'}`}
                             style={{ 
                                 rowGap: (node.attrs.optionGap && node.attrs.optionGap < 0) ? '0px' : (node.attrs.optionGap ? `${node.attrs.optionGap}px` : '8px'),
                                 fontSize: fSize ? `${fSize}px` : 'inherit'
                             }}
                        >
                            {node.attrs.options.map((opt, idx) => {
                            const optStyle = node.attrs.optionStyle || 'bn';
                            const optLabel = optStyle === 'en' 
                                ? String.fromCharCode(97 + idx) 
                                : optStyle === 'roman'
                                ? ['i', 'ii', 'iii', 'iv', 'v'][idx]
                                : optStyle === 'num_en'
                                ? `${idx + 1}`
                                : optStyle === 'num_bn'
                                ? ['১', '২', '৩', '৪', '৫'][idx]
                                : getBanglaOptionLabel(idx);
                                
                            const dec = node.attrs.optionDecoration || 'rightBracket';
                            const formattedLabel = dec === 'bracket' ? `(${optLabel})` 
                                                 : dec === 'dot' ? `${optLabel}.` 
                                                 : dec === 'bubble' ? optLabel 
                                                 : `${optLabel})`;
                                                 
                            const bubbleClass = dec === 'bubble' 
                                ? 'inline-flex items-center justify-center rounded-full border border-slate-700 font-medium shrink-0 mt-[3px] leading-none' 
                                : 'font-semibold text-slate-800 shrink-0';
                                
                            const negativeMargin = (node.attrs.optionGap && node.attrs.optionGap < 0) ? `${node.attrs.optionGap}px` : '0px';

                            return (
                                <div key={idx} className={`flex items-start gap-2 ${opt.isCorrect || opt.correct ? 'nexus-correct-option p-1' : 'p-1'}`} style={{ marginBottom: negativeMargin }}>
                                    <span className={bubbleClass} style={{
                                        width: dec === 'bubble' ? '1.2em' : 'auto',
                                        height: dec === 'bubble' ? '1.2em' : 'auto',
                                        fontSize: dec === 'bubble' ? '0.8em' : 'inherit',
                                        paddingBottom: dec === 'bubble' ? '0.05em' : '0'
                                    }}>{formattedLabel}</span>
                                    <div dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(stripOptionPrefix(opt.optionText || opt.text || ''), `opt-${idx}`)) }} className="text-slate-700" style={{ lineHeight: 'inherit' }} />
                                </div>
                            );
                        })}
                    </div>
                ); })()}

                {/* Inline Detailed Answer Block */}
                <div className="nexus-detailed-answer-block mt-2 break-inside-avoid w-full hidden"
                     style={{ fontSize: node.attrs.fontSize ? `${node.attrs.fontSize}pt` : 'inherit', fontFamily: 'inherit' }}>
                    
                    {/* Standard Answer */}
                    {(!dynamicDataParsed || (answerFields.length === 0 && (!dynamicDataParsed.sub_parts || dynamicDataParsed.sub_parts.length === 0))) && (
                        <div className="flex items-start gap-1 font-bold text-slate-800 nexus-answer-line">
                            <span className="shrink-0 answer-label-text">উত্তর:</span>
                            <div className="nexus-answer-content text-indigo-700" dangerouslySetInnerHTML={{ __html: (() => {
                                if (node.attrs.type === 'CQ' || !node.attrs.options || node.attrs.options.length === 0) {
                                    return node.attrs.answer || 'N/A';
                                }
                                const correctOpts = [];
                                node.attrs.options.forEach((opt, idx) => {
                                    if (opt.correct === true || opt.isCorrect === true || String(opt.correct) === 'true' || String(opt.isCorrect) === 'true') {
                                        const optStyle = node.attrs.optionStyle || 'bn';
                                        const optLabel = optStyle === 'en' 
                                            ? String.fromCharCode(97 + idx) 
                                            : optStyle === 'roman'
                                            ? ['i', 'ii', 'iii', 'iv', 'v'][idx]
                                            : optStyle === 'num_en'
                                            ? `${idx + 1}`
                                            : optStyle === 'num_bn'
                                            ? ['১', '২', '৩', '৪', '৫'][idx]
                                            : getBanglaOptionLabel(idx);
                                        correctOpts.push(`${optLabel}. ${stripOptionPrefix(opt.optionText || opt.text || '')}`);
                                    }
                                });
                                return correctOpts.length > 0 ? correctOpts.join('<br/>') : (node.attrs.answer || 'N/A');
                            })() }} />
                        </div>
                    )}

                    {/* Dynamic Answer Fields */}
                    {dynamicDataParsed && answerFields.length > 0 && (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 mt-1">
                            {answerFields.map(([key, value]) => renderDynamicValue(key, value, true))}
                        </div>
                    )}

                    {/* Sub Parts Answers and Explanations (CQ_DESCRIPTIVE) */}
                    {dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.length > 0 && (hasSubPartsAnswers || hasSubPartsExplanations) && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3 mt-1 text-slate-800">
                            {dynamicDataParsed.sub_parts.map((part, pIdx) => {
                                const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                return (
                                    <div key={pIdx} className="flex flex-col gap-1 border-b border-emerald-100 last:border-0 pb-2 last:pb-0">
                                        {part.answer && (
                                            <div className="flex items-start gap-1.5 text-sm">
                                                <span className="shrink-0 text-emerald-800 font-bold">({label}) উত্তর:</span>
                                                <div className="text-indigo-700 font-medium" dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(part.answer, `subpart-ans-${pIdx}`)) }} />
                                            </div>
                                        )}
                                        {part.explanation && (
                                            <div className="flex items-start gap-1.5 mt-0.5 text-xs pl-4">
                                                <span className="font-bold shrink-0 text-emerald-700">
                                                    {!part.answer ? `(${label}) ব্যাখ্যা:` : 'ব্যাখ্যা:'}
                                                </span>
                                                <div className="text-slate-700 font-normal" dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(part.explanation, `subpart-exp-${pIdx}`)) }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Standard Explanation */}
                    {(!dynamicDataParsed || (explanationFields.length === 0 && (!dynamicDataParsed.sub_parts || dynamicDataParsed.sub_parts.length === 0))) && node.attrs.explanation && (
                        <div className="explanation-block text-slate-800 mt-1 flex items-start gap-1 p-2 bg-slate-50 border border-slate-200 rounded">
                            <span className="font-bold shrink-0 text-emerald-700">ব্যাখ্যা:</span>
                            <div dangerouslySetInnerHTML={{ __html: node.attrs.explanation }} />
                        </div>
                    )}

                    {/* Dynamic Explanation Fields */}
                    {dynamicDataParsed && explanationFields.length > 0 && (
                        <div className="p-2 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2 mt-1">
                            {explanationFields.map(([key, value]) => renderDynamicValue(key, value, false))}
                        </div>
                    )}
                </div>

                {/* Revise Button for Revise Mode (formerly Free Edit) */}
                {!isStrict && (
                    <div className="absolute top-2 right-2 print:hidden flex gap-2 z-50">
                        <button
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent('nexusReviseRequested', { 
                                    detail: { pos: getPos(), nodeSize: node.nodeSize, attrs: node.attrs } 
                                }));
                            }}
                            className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-2 py-1.5 rounded-md flex items-center gap-1.5 text-[11px] font-bold shadow-sm transition-colors border border-indigo-200"
                            title="Revise this question inline"
                        >
                            <Edit3 size={14}/> Revise
                        </button>
                    </div>
                )}
        </NodeViewWrapper>
    );
};

export const QuestionBlockNode = Node.create({
    name: 'questionBlock',
    group: 'block',
    atom: true, // This makes the node an unbreakable, atomic unit in Tiptap

    addAttributes() {
        return {
            questionId: { default: null },
            sectionId: { default: null },
            subjectId: { default: null },
            chapterId: { default: null },
            type: { default: 'MCQ' },
            questionText: { default: '' },
            stimulus: { default: '' },
            statements: { default: [] },
            chapterName: { default: '' },
            marks: { default: 1 },
            options: { default: [] },
            explanation: { default: '' },
            answer: { default: '' },
            syncedFromDb: { default: false },
            language: { default: 'Bangla' },
            numberingStyle: { default: 'bn' },
            marksConfig: { default: 'hide' },
            optionLayout: { default: 'col1' },
            optionStyle: { default: 'bn' },
            optionDecoration: { default: 'rightBracket' },
            fontSize: { default: null },
            lineGap: { default: null },
            optionGap: { default: null },
            questionGap: { default: null },
            textAlign: { default: 'left' },
            smartFit: { default: true },
            pageCols: { default: 1 },
            firstInSection: { default: false },
            questionNumber: { default: null },
            dynamicData: { default: null },
            dynamicDataSynced: { default: false }
        };
    },

    parseHTML() {
        return [{
            tag: 'div[data-type="question-block"]',
            getAttrs: dom => {
                const optionsRaw = dom.getAttribute('data-options');
                let options = [];
                if (optionsRaw) {
                    try {
                        options = JSON.parse(optionsRaw);
                    } catch (e) { console.error("Failed to parse options", e); }
                }
                const statementsRaw = dom.getAttribute('data-statements');
                let statements = [];
                if (statementsRaw) {
                    try {
                        statements = JSON.parse(statementsRaw);
                    } catch (e) { console.error("Failed to parse statements", e); }
                }
                return {
                    questionId: dom.getAttribute('questionid') || null,
                    sectionId: dom.getAttribute('data-section-id') || null,
                    subjectId: dom.getAttribute('subjectid') || null,
                    chapterId: dom.getAttribute('chapterid') || null,
                    type: dom.getAttribute('type') || 'MCQ',
                    questionText: dom.getAttribute('questiontext') || '',
                    stimulus: dom.getAttribute('stimulus') || '',
                    statements: statements,
                    chapterName: dom.getAttribute('chaptername') || '',
                    marks: Number(dom.getAttribute('marks')) || 1,
                    explanation: dom.getAttribute('explanation') || '',
                    answer: dom.getAttribute('answer') || '',
                    syncedFromDb: dom.getAttribute('syncedfromdb') === 'true',
                    language: dom.getAttribute('language') || 'Bangla',
                    numberingStyle: dom.getAttribute('numberingstyle') || 'bn',
                    marksConfig: dom.getAttribute('marksconfig') || 'hide',
                    optionLayout: dom.getAttribute('optionlayout') || 'col1',
                    optionStyle: dom.getAttribute('optionstyle') || 'bn',
                    optionDecoration: dom.getAttribute('optiondecoration') || 'rightBracket',
                    fontSize: dom.getAttribute('fontsize') || null,
                    lineGap: dom.getAttribute('linegap') || null,
                    optionGap: dom.getAttribute('optiongap') || null,
                    questionGap: dom.getAttribute('questiongap') || null,
                    textAlign: dom.getAttribute('textalign') || 'left',
                    smartFit: dom.getAttribute('smartfit') !== 'false',
                    pageCols: Number(dom.getAttribute('pagecols')) || 1,
                    firstInSection: dom.getAttribute('data-first-in-section') === 'true',
                    questionNumber: dom.getAttribute('data-question-number') ? Number(dom.getAttribute('data-question-number')) : null,
                    dynamicData: dom.getAttribute('data-dynamic-data') || null,
                    dynamicDataSynced: dom.getAttribute('data-dynamic-data-synced') === 'true',
                    options
                };
            }
        }];
    },

    renderHTML({ HTMLAttributes }) {
        const { options, statements, dynamicData, ...restAttrs } = HTMLAttributes;
        const qNum = HTMLAttributes.questionNumber;
        const styleString = restAttrs.style || '';
        const counterResetStyle = qNum ? `counter-reset: question-counter ${qNum - 1} !important;` : '';
        const finalStyle = styleString 
            ? (styleString.endsWith(';') ? `${styleString} ${counterResetStyle}` : `${styleString}; ${counterResetStyle}`) 
            : counterResetStyle;

        return ['div', mergeAttributes(restAttrs, {
            'data-type': 'question-block',
            'data-options': JSON.stringify(options || []),
            'data-statements': JSON.stringify(statements || []),
            'questionid': HTMLAttributes.questionId || null,
            'data-section-id': HTMLAttributes.sectionId || null,
            'subjectid': HTMLAttributes.subjectId || null,
            'chapterid': HTMLAttributes.chapterId || null,
            'stimulus': HTMLAttributes.stimulus || '',
            'explanation': HTMLAttributes.explanation || '',
            'answer': HTMLAttributes.answer || '',
            'syncedfromdb': HTMLAttributes.syncedFromDb ? 'true' : 'false',
            'language': HTMLAttributes.language || 'Bangla',
            'fontsize': HTMLAttributes.fontSize || null,
            'linegap': HTMLAttributes.lineGap || null,
            'optiongap': HTMLAttributes.optionGap || null,
            'questiongap': HTMLAttributes.questionGap || null,
            'textalign': HTMLAttributes.textAlign || 'left',
            'smartfit': HTMLAttributes.smartFit !== false ? 'true' : 'false',
            'pagecols': HTMLAttributes.pageCols || 1,
            'data-first-in-section': HTMLAttributes.firstInSection ? 'true' : null,
            'data-question-number': qNum || null,
            'style': finalStyle || null,
            'data-dynamic-data': HTMLAttributes.dynamicData || null,
            'data-dynamic-data-synced': HTMLAttributes.dynamicDataSynced ? 'true' : 'false'
        })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(QuestionComponent);
    }
});
