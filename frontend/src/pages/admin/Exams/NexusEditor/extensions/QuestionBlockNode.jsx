import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import questionService from '../../../../../services/questionService';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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
                if (node.parentNode && typeof node.parentNode.closest === 'function') {
                    if (node.parentNode.closest('.cq-marks')) {
                        return;
                    }
                }
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

const getFormattedNumber = (num, numberingStyle, language) => {
    const n = Number(num);
    if (!n || isNaN(n)) return '';
    const defaultStyle = language === 'English' || language === 'ENGLISH' ? 'en' : 'bn';
    const style = numberingStyle || defaultStyle;
    
    if (style === 'bn') {
        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
        const numStr = n.toString().replace(/[0-9]/g, m => enToBn[m]);
        return `${numStr}.`;
    }
    if (style === 'en') {
        return `${n}.`;
    }
    if (style === 'roman') {
        const romanMap = [
            { v: 50, c: 'l' },
            { v: 40, c: 'xl' },
            { v: 10, c: 'x' },
            { v: 9, c: 'ix' },
            { v: 5, c: 'v' },
            { v: 4, c: 'iv' },
            { v: 1, c: 'i' }
        ];
        let remaining = n;
        let roman = '';
        romanMap.forEach(pair => {
            while (remaining >= pair.v) {
                roman += pair.c;
                remaining -= pair.v;
            }
        });
        return `${roman || n}.`;
    }
    if (style === 'alpha') {
        const code = 97 + (n - 1) % 26;
        const char = String.fromCharCode(code);
        return `${char})`;
    }
    return `${n}.`;
};

const formatMathPowers = (html) => {
    if (!html) return '';
    return html.replace(/(<[^>]+>)|(([a-zA-Z0-9\)\}])\^\{?(-?[a-zA-Z0-9.]+)\}?)|(([a-zA-Z0-9\)\}])_\{?(-?[a-zA-Z0-9.]+)\}?)/g, (match, tag, powMatch, powBase, powExp, subMatch, subBase, subVal) => {
        if (tag) return tag;
        if (powMatch) return `${powBase}<sup>${powExp}</sup>`;
        if (subMatch) return `${subBase}<sub>${subVal}</sub>`;
        return match;
    });
};

const renderLatexMath = (html) => {
    if (!html) return '';
    const mathBlocks = [];
    let count = 0;
    
    // Replace inline latex $...$ with placeholders
    let processed = html.replace(/\$(.*?)\$/g, (match, formula) => {
        try {
            const cleanFormula = formula
                .replace(/<[^>]+>/g, '') // Strip HTML tags inside formula
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
                
            const rendered = katex.renderToString(cleanFormula, {
                throwOnError: false,
                displayMode: false
            });
            const placeholder = `___MATH_BLOCK_${count}___`;
            mathBlocks.push({ placeholder, html: rendered });
            count++;
            return placeholder;
        } catch (e) {
            console.error("KaTeX error in QuestionBlockNode:", e);
            return match;
        }
    });
    
    // Process regular math powers/subscripts on the rest of the text
    processed = formatMathPowers(processed);
    
    // Restore KaTeX rendered blocks
    mathBlocks.forEach(block => {
        processed = processed.replace(block.placeholder, block.html);
    });
    
    return processed;
};

const processTabularHTML = (html) => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const isTabularText = (text) => {
            return /\t| {3,}|(?:\s*&nbsp;\s*){2,}/i.test(text) || text.includes('\u00A0\u00A0');
        };
        
        const processBlock = (blockNode) => {
            const children = Array.from(blockNode.childNodes);
            if (children.length === 0) return;
            
            const lines = [];
            let currentLine = [];
            
            children.forEach(child => {
                if (child.tagName === 'BR') {
                    lines.push(currentLine);
                    currentLine = [];
                } else {
                    currentLine.push(child);
                }
            });
            if (currentLine.length > 0 || children[children.length - 1]?.tagName === 'BR') {
                lines.push(currentLine);
            }
            
            const lineIsTabular = lines.map(lineNodes => {
                return lineNodes.some(node => {
                    const text = node.nodeType === 3 ? node.nodeValue : (node.textContent || '');
                    return isTabularText(text);
                });
            });
            
            const groups = [];
            let currentGroup = { isTable: false, lines: [] };
            
            for (let i = 0; i < lines.length; i++) {
                const isTab = lineIsTabular[i];
                if (isTab) {
                    if (currentGroup.isTable) {
                        currentGroup.lines.push(lines[i]);
                    } else {
                        if (currentGroup.lines.length > 0) {
                            groups.push(currentGroup);
                        }
                        currentGroup = { isTable: true, lines: [lines[i]] };
                    }
                } else {
                    const nextLineIsTabular = i + 1 < lines.length && lineIsTabular[i + 1];
                    if (currentGroup.isTable && nextLineIsTabular) {
                        currentGroup.lines.push(lines[i]);
                    } else {
                        if (currentGroup.lines.length > 0) {
                            groups.push(currentGroup);
                        }
                        currentGroup = { isTable: false, lines: [lines[i]] };
                    }
                }
            }
            if (currentGroup.lines.length > 0) {
                groups.push(currentGroup);
            }
            
            while (blockNode.firstChild) {
                blockNode.removeChild(blockNode.firstChild);
            }
            
            groups.forEach((group, gIdx) => {
                if (group.isTable) {
                    const tableDiv = doc.createElement('div');
                    tableDiv.className = 'nexus-tabular-grid';
                    tableDiv.setAttribute('style', "font-family: Consolas, Monaco, 'Courier New', monospace !important; white-space: pre !important; font-size: 12.5px !important; line-height: 1.5 !important; background-color: #fafafa; border: 1px solid #d1d5db; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0; letter-spacing: 0.03em; color: #111827; display: block; width: 100%; box-sizing: border-box;");
                    
                    group.lines.forEach((lineNodes, lIdx) => {
                        lineNodes.forEach(node => {
                            if (node.nodeType === 3) {
                                node.nodeValue = node.nodeValue.replace(/\u00A0/g, ' ');
                            }
                            tableDiv.appendChild(node);
                        });
                        if (lIdx < group.lines.length - 1) {
                            tableDiv.appendChild(doc.createElement('br'));
                        }
                    });
                    blockNode.appendChild(tableDiv);
                } else {
                    group.lines.forEach((lineNodes, lIdx) => {
                        lineNodes.forEach(node => {
                            blockNode.appendChild(node);
                        });
                        if (lIdx < group.lines.length - 1 || gIdx < groups.length - 1) {
                            blockNode.appendChild(doc.createElement('br'));
                        }
                    });
                }
            });
        };
        
        const blocks = Array.from(doc.body.querySelectorAll('p, div, td, th, li'));
        if (blocks.length === 0) {
            processBlock(doc.body);
        } else {
            blocks.forEach(block => processBlock(block));
        }
        
        return doc.body.innerHTML;
    } catch (e) {
        console.error("Error in processTabularHTML:", e);
        return html;
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
    return renderLatexMath(processTabularHTML(cleaned));
};


const syncedQuestionIds = new Set();

    const QuestionComponent = React.memo(({ node, editor, deleteNode, updateAttributes, getPos, selected }) => {
        const [rerenderCount, setRerenderCount] = React.useState(0);
        const hasSyncedRef = React.useRef(false);
        const prevQuestionIdRef = React.useRef(node.attrs.questionId);

        if (prevQuestionIdRef.current !== node.attrs.questionId) {
            prevQuestionIdRef.current = node.attrs.questionId;
            hasSyncedRef.current = false;
        }

        React.useEffect(() => {
            const handleRerender = () => {
                setRerenderCount(prev => prev + 1);
            };
            window.addEventListener('nexus-editor-rerender', handleRerender);
            return () => {
                window.removeEventListener('nexus-editor-rerender', handleRerender);
            };
        }, []);

        const cachedQ = questionService.getQuestionFromCache(node.attrs.questionId) || {};

        const type = node.attrs.type || cachedQ.type || 'MCQ';
        const questionText = node.attrs.questionText || cachedQ.questionText || '';
        const options = (node.attrs.options && node.attrs.options.length > 0) ? node.attrs.options : (cachedQ.options || []);
        const stimulus = node.attrs.stimulus || cachedQ.stimulus || '';
        const explanation = node.attrs.explanation || cachedQ.explanation || '';
        const answer = node.attrs.answer || cachedQ.correctAnswer || cachedQ.answer || '';
        const statements = (node.attrs.statements && node.attrs.statements.length > 0) ? node.attrs.statements : (cachedQ.statements || []);
        const marks = node.attrs.marks || cachedQ.marks || 1;
        const difficulty = node.attrs.difficulty || cachedQ.difficulty || 'MEDIUM';
        const mcqType = node.attrs.mcqType || cachedQ.mcqType || 'SINGLE_CHOICE';
        const dynamicData = node.attrs.dynamicData || cachedQ.dynamicData;

        const docSettings = editor?.docSettings;
        const documentQuestions = editor?.documentQuestions;

        const activeSet = docSettings?.activeSet;
        const count = docSettings?.setCount || 4;
        const lang = docSettings?.setLanguage || 'BN';
        const setNames = lang === 'EN' 
            ? (count === 2 ? ['A', 'B'] : ['A', 'B', 'C', 'D'])
            : (count === 2 ? ['ক', 'খ'] : ['ক', 'খ', 'গ', 'ঘ']);
        const masterSet = setNames[0] || 'ক';
        const isShuffledSet = docSettings?.multipleSetsEnabled && activeSet && activeSet !== masterSet;

        const mappings = docSettings?.setMappings || {};
        const setMapping = activeSet ? mappings[activeSet] : null;

        const isMCQ = type === 'MCQ';
        const mcqs = (documentQuestions || []).filter(q => (q.attrs?.type || questionService.getQuestionFromCache(q.attrs?.questionId)?.type || 'MCQ') === 'MCQ');
        const currentPos = typeof getPos === 'function' ? getPos() : null;
        const isLastMCQ = isMCQ && (mcqs.length > 0) && (mcqs[mcqs.length - 1].pos === currentPos);

        let displayQuestionNumber = node.attrs.questionNumber;
        if (isMCQ) {
            const originalIndex = mcqs.findIndex(q => q.attrs?.questionId === node.attrs.questionId);
            
            if (isShuffledSet) {
                if (setMapping && setMapping.questions) {
                    const shuffledIndex = setMapping.questions.indexOf(node.attrs.questionId);
                    if (shuffledIndex !== -1) {
                        const targetOriginalMCQ = mcqs[shuffledIndex];
                        displayQuestionNumber = targetOriginalMCQ?.attrs?.questionNumber || (shuffledIndex + 1);
                    }
                }
            } else if (originalIndex !== -1) {
                displayQuestionNumber = node.attrs.questionNumber || (originalIndex + 1);
            }
        }

        let displayOptions = options || [];
        if (isShuffledSet && setMapping && setMapping.options) {
            const qId = node.attrs.questionId;
            const shuffledOptionIds = setMapping.options[qId];
            if (shuffledOptionIds && shuffledOptionIds.length > 0) {
                const optionsMap = {};
                (options || []).forEach((opt, oIdx) => {
                    const optId = opt.id || `opt-${oIdx}`;
                    optionsMap[optId] = opt;
                });
                const mappedOpts = shuffledOptionIds.map(optId => optionsMap[optId]).filter(Boolean);
                if (mappedOpts.length > 0) {
                    displayOptions = mappedOpts;
                }
            }
        }

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
            if (syncedQuestionIds.has(attrs.questionId)) return;

            // If the question details are already in cache, we don't need to fetch them from DB
            // and we don't need to dispatch transaction updates, because the renderer will fall back
            // to the cached question details (cachedQ) synchronously.
            const cached = questionService.getQuestionFromCache(attrs.questionId);
            if (cached) {
                syncedQuestionIds.add(attrs.questionId);
                return;
            }

            const isMCQ = attrs.type === 'MCQ';
            
            // We need to sync if it hasn't been synced from DB, or if dynamicData is missing/null,
            // or if it's MCQ and option correct flags are missing.
            const needsBasicSync = !attrs.syncedFromDb;
            const needsDynamicSync = !attrs.dynamicDataSynced && !attrs.dynamicData;
            
            if ((needsBasicSync || needsDynamicSync) && !hasSyncedRef.current) {
                hasSyncedRef.current = true;
                syncedQuestionIds.add(attrs.questionId);
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
                        
                        // Sync dynamicData and sources
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
                        const dynamicDataJson = JSON.stringify(dynamicDataObj);
                        if (dynamicDataJson !== '{}') {
                            updateObj.dynamicData = dynamicDataJson;
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

        const renderedStimulus = React.useMemo(() => {
            if (!node.attrs.stimulus || isPlaceholderText(node.attrs.stimulus)) return '';
            return cleanHtml(parseMarkdownImages(node.attrs.stimulus, 'stimulus'));
        }, [node.attrs.stimulus]);

        const renderedQuestionText = React.useMemo(() => {
            let html = node.attrs.questionText || '';
            if (!html) return '';

            try {
                const cleanedHtml = cleanPlaceholderText(html);
                if (!cleanedHtml) return '';

                const parser = new DOMParser();
                const doc = parser.parseFromString(cleanedHtml, 'text/html');

                // Remove duplicated stimulus if node.attrs.stimulus is present and rendered standalone
                if (node.attrs.stimulus && !isPlaceholderText(node.attrs.stimulus)) {
                    const stem = doc.querySelector('.cq-stem');
                    if (stem) {
                        stem.remove();
                    }
                }

                // Format cq-marks
                const cqMarks = doc.querySelectorAll('.cq-marks');
                cqMarks.forEach(span => {
                    let text = span.textContent || '';
                    const match = text.match(/[\d\.০-৯]+/);
                    if (match) {
                        const originalNum = match[0];
                        const targetStyle = (node.attrs.language === 'English' || node.attrs.numberingStyle === 'en') ? 'en' : 'bn';
                        const formattedNum = formatMarksDigits(originalNum, targetStyle);
                        if (node.attrs.marksConfig === 'showBracket') {
                            span.textContent = `(${formattedNum})`;
                        } else {
                            span.textContent = formattedNum;
                        }
                    }
                });

                // Add class based on marksConfig to any .cq-questions container
                const cqQuestionsList = doc.querySelectorAll('.cq-questions');
                cqQuestionsList.forEach(container => {
                    container.classList.remove('cq-marks-hide', 'cq-marks-bracket', 'cq-marks-right');
                    if (node.attrs.marksConfig === 'hide') {
                        container.classList.add('cq-marks-hide');
                    } else if (node.attrs.marksConfig === 'showBracket') {
                        container.classList.add('cq-marks-bracket');
                    } else if (node.attrs.marksConfig === 'showRight') {
                        container.classList.add('cq-marks-right');
                    }
                });

                return cleanHtml(parseMarkdownImages(doc.body.innerHTML, 'questionText'));
            } catch (e) {
                console.error("Failed to parse and clean questionText HTML", e);
                return cleanHtml(parseMarkdownImages(cleanPlaceholderText(html), 'questionText'));
            }
        }, [node.attrs.questionText, node.attrs.stimulus, node.attrs.language, node.attrs.numberingStyle, node.attrs.marksConfig]);

        const computedLayout = React.useMemo(() => {
            let layout = node.attrs.optionLayout || 'col1';
            if (node.attrs.smartFit === false) {
                return layout;
            }
            if (!node.attrs.options || !Array.isArray(node.attrs.options)) {
                return layout;
            }

            const hasImage = node.attrs.options.some(o => (o.optionText || o.text || '').toLowerCase().includes('<img'));
            if (hasImage) {
                return 'col1';
            }

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
            
            // Dynamic column width calculation in pixels
            const dimensions = {
                'A4': { w: 794, h: 1123 },
                'Legal': { w: 816, h: 1344 },
                'Letter': { w: 816, h: 1056 },
                'A5': { w: 559, h: 794 },
                'Custom': { w: (node.attrs.customW || 210) * 3.7795275591, h: (node.attrs.customH || 297) * 3.7795275591 }
            };
            const pageSizeKey = node.attrs.pageSize || docSettings?.pageSize || 'A4';
            const orient = node.attrs.orientation || docSettings?.orientation || 'portrait';
            let { w: pageW } = dimensions[pageSizeKey] || dimensions['A4'];
            
            if (orient === 'landscape') {
                const { h: pageH } = dimensions[pageSizeKey] || dimensions['A4'];
                pageW = pageH;
            }
            
            const mmToPx = (mm) => (mm || 0) * 3.7795275591;
            const mL = mmToPx(node.attrs.marginLeft !== undefined ? node.attrs.marginLeft : (docSettings?.marginLeft !== undefined ? docSettings.marginLeft : 10));
            const mR = mmToPx(node.attrs.marginRight !== undefined ? node.attrs.marginRight : (docSettings?.marginRight !== undefined ? docSettings.marginRight : 10));
            const cGap = mmToPx(node.attrs.colGap !== undefined ? node.attrs.colGap : (docSettings?.colGap !== undefined ? docSettings.colGap : 10));
            
            const contentWidth = Math.max(200, pageW - mL - mR);
            let pageCols = Number(docSettings?.columns) || 1;
            const colWidth = pageCols > 1 ? Math.max(100, (contentWidth - (pageCols - 1) * cGap) / pageCols) : contentWidth;
            
            const scale = (fSize || 14.66) / 14.66;
            const threshold2Col = Math.max(3, Math.floor((colWidth / 28) / scale));
            const threshold1Col = Math.max(6, Math.floor((colWidth / 13) / scale));
            
            if (maxLen >= threshold1Col) {
                return 'col1';
            } else if (maxLen >= threshold2Col) {
                return 'col2';
            } else {
                return 'col4';
            }
        }, [
            node.attrs.optionLayout,
            node.attrs.smartFit,
            JSON.stringify(node.attrs.options || []),
            docSettings?.pageSize,
            docSettings?.orientation,
            docSettings?.marginLeft,
            docSettings?.marginRight,
            docSettings?.colGap,
            docSettings?.columns,
            node.attrs.pageSize,
            node.attrs.orientation,
            node.attrs.customW,
            node.attrs.customH,
            node.attrs.marginLeft,
            node.attrs.marginRight,
            node.attrs.colGap,
            node.attrs.pageCols,
            fSize
        ]);

        const dynamicDataParsed = React.useMemo(() => {
            if (!node.attrs.dynamicData) return null;
            try {
                return typeof node.attrs.dynamicData === 'string' 
                    ? JSON.parse(node.attrs.dynamicData) 
                    : node.attrs.dynamicData;
            } catch (e) {
                console.error("Failed to parse dynamicData in QuestionComponent:", e);
                return null;
            }
        }, [node.attrs.dynamicData]);

        const hideSubParts = React.useMemo(() => {
            if (!dynamicDataParsed) return false;
            const isDescriptiveCQ = node.attrs.type === 'CQ_DESCRIPTIVE';
            return dynamicDataParsed.hideSubPartsTable === true || dynamicDataParsed.hide_sub_parts === true || isDescriptiveCQ;
        }, [dynamicDataParsed, node.attrs.type]);

        const sourceBadgeText = React.useMemo(() => {
            const sources = dynamicDataParsed?.sources || [];
            
            const abbreviateSource = (org, exam, year, isBangla = true) => {
                let shortOrg = org || '';
                
                const boardReplacements = {
                    'ঢাকা বোর্ড': 'ঢা. বো.',
                    'রাজশাহী বোর্ড': 'রা. বো.',
                    'কুমিল্লা বোর্ড': 'কু. বো.',
                    'যশোর বোর্ড': 'য. বো.',
                    'চট্টগ্রাম বোর্ড': 'চ. বো.',
                    'বরিশাল বোর্ড': 'ব. বো.',
                    'সিলেট বোর্ড': 'সি. বো.',
                    'দিনাজপুর বোর্ড': 'দি. বো.',
                    'ময়মনসিংহ বোর্ড': 'ম. বো.',
                    'মাদরাসা বোর্ড': 'মা. বো.',
                    'কারিগরি বোর্ড': 'কা. বো.'
                };
                
                for (const [full, short] of Object.entries(boardReplacements)) {
                    if (shortOrg.includes(full)) {
                        shortOrg = shortOrg.replace(full, short);
                        break;
                    }
                }
                
                let shortYear = '';
                if (year) {
                    let yStr = String(year).slice(-2);
                    if (isBangla) {
                        const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
                        yStr = yStr.replace(/[0-9]/g, m => enToBn[m]);
                    }
                    shortYear = `'${yStr}`;
                }
                
                return `${shortOrg}${shortYear ? ` ${shortYear}` : ''}`;
            };

            const isBangla = docSettings?.setLanguage !== 'EN';

            if (sources.length > 0) {
                const limit = 2;
                const visibleSources = sources.slice(0, limit);
                const formatted = visibleSources.map((src) => {
                    return abbreviateSource(src.organizationName || '', src.examName || '', src.examYear, isBangla);
                }).join(', ');
                
                if (sources.length > limit) {
                    const remainingCount = sources.length - limit;
                    const remainingText = isBangla 
                        ? ` + ${remainingCount}টি` 
                        : ` + ${remainingCount}`;
                    return `${formatted}${remainingText}`;
                }
                return formatted;
            }
            
            const srcRef = dynamicDataParsed?.sourceReference || dynamicDataParsed?.source || node.attrs.sourceReference || node.attrs.source || '';
            if (srcRef && !srcRef.toUpperCase().includes('CHUNK_') && srcRef !== 'Textbook Content') {
                if (srcRef.length > 30) {
                    return srcRef.slice(0, 30) + '...';
                }
                return srcRef;
            }
            
            return '';
        }, [dynamicDataParsed, docSettings?.setLanguage]);

        const hasSubPartsAnswers = React.useMemo(() => {
            return dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.some(part => part.answer);
        }, [dynamicDataParsed]);

        const hasSubPartsExplanations = React.useMemo(() => {
            return dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.some(part => part.explanation);
        }, [dynamicDataParsed]);

        const { questionFields, answerFields, explanationFields } = React.useMemo(() => {
            const qFields = [];
            const aFields = [];
            const eFields = [];
            
            if (!dynamicDataParsed) {
                return { questionFields: qFields, answerFields: aFields, explanationFields: eFields };
            }
            
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

                // Pre-process values (clean and parse markdown images only once!)
                let processedValue = value;
                if (typeof value === 'string') {
                    processedValue = cleanHtml(parseMarkdownImages(value, key));
                } else if (Array.isArray(value)) {
                    processedValue = value.map((item, idx) => {
                        if (typeof item === 'object' && item !== null) {
                            const obj = {};
                            Object.entries(item).forEach(([k, v]) => {
                                obj[k] = cleanHtml(parseMarkdownImages(v || '-', k));
                            });
                            return obj;
                        } else {
                            return cleanHtml(parseMarkdownImages(item || '', `${key}-${idx}`));
                        }
                    });
                }

                if (lowerKey.includes('explanation') || lowerKey.includes('rationale')) {
                    if (!hasSubPartsExplanations) {
                        eFields.push([key, processedValue]);
                    }
                } else if (lowerKey.includes('answer') || lowerKey.includes('solution') || lowerKey.includes('correct')) {
                    if (!hasSubPartsAnswers) {
                        aFields.push([key, processedValue]);
                    }
                } else {
                    qFields.push([key, processedValue]);
                }
            });
            
            return { questionFields: qFields, answerFields: aFields, explanationFields: eFields };
        }, [dynamicDataParsed, hideSubParts, hasSubPartsAnswers, hasSubPartsExplanations]);

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
                                isAnswerBlock ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                                {key.replace(/_/g, ' ')}
                            </div>
                        )}
                        <div className={isAnswerBlock ? 'text-slate-900 font-medium' : 'text-slate-900'}
                             style={{ lineHeight: safeLineGap }}
                             dangerouslySetInnerHTML={{ __html: value }}
                        />
                    </div>
                );
            } else if (Array.isArray(value)) {
                return (
                    <div key={key} className="mb-3 last:mb-0 w-full">
                        {!isStrict && !hideLabel && (
                            <div className={`text-[10px] font-bold uppercase tracking-wider select-none mb-1 ${
                                isAnswerBlock ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                                {key.replace(/_/g, ' ')}
                            </div>
                        )}
                        <div className="space-y-1.5 w-full">
                            {value.map((item, idx) => (
                                <div key={idx} className={isAnswerBlock ? 'py-1 w-full' : 'p-2 rounded-lg border bg-slate-50/50 border-slate-200'}>
                                    {typeof item === 'object' && item !== null ? (
                                        <div className="flex flex-wrap gap-3">
                                            {Object.entries(item).map(([k, v]) => (
                                                <div key={k} className="flex-1 min-w-[120px]">
                                                    <span className={`text-[9px] font-bold block mb-0.5 uppercase ${
                                                        isAnswerBlock ? 'text-slate-500' : 'text-slate-400'
                                                    }`}>
                                                        {k.replace(/_/g, ' ')}
                                                    </span>
                                                    <div className={isAnswerBlock ? 'text-slate-900' : 'text-slate-800'}
                                                         dangerouslySetInnerHTML={{ __html: v }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={isAnswerBlock ? 'text-slate-900' : 'text-slate-800'}
                                             dangerouslySetInnerHTML={{ __html: item }}
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
                questionid={node.attrs.questionId}
                type={node.attrs.type}
                data-section-id={node.attrs.sectionId}
                data-numberingstyle={node.attrs.numberingStyle || 'bn'}
                data-first-in-section={node.attrs.firstInSection ? 'true' : undefined}
                data-options={JSON.stringify(node.attrs.options || [])}
                optionstyle={node.attrs.optionStyle || 'bn'}
                optiondecoration={node.attrs.optionDecoration || 'rightBracket'}
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
                {/* Programmatic Question Number for html2canvas and layout consistency */}
                {!node.attrs.alternativeToId && (
                    <span 
                        className="absolute left-0 top-[2px] font-bold text-slate-900 select-none print:text-black"
                        style={{
                            width: '2.2em',
                            textAlign: 'right',
                            paddingRight: '0.4em',
                            whiteSpace: 'nowrap',
                            fontSize: '1em',
                            fontFamily: 'inherit'
                        }}
                    >
                        {getFormattedNumber(displayQuestionNumber, node.attrs.numberingStyle, node.attrs.language)}
                    </span>
                )}

                {node.attrs.alternativeToId && (
                    <div 
                        className="w-full flex items-center justify-center my-2 select-none print:my-1"
                        style={{
                            marginLeft: '-2.6em',
                            width: 'calc(100% + 2.6em)',
                            fontFamily: 'inherit',
                        }}
                    >
                        <div className="flex-grow border-t border-dashed border-slate-300 print:border-black"></div>
                        <span className="mx-3 text-xs font-bold text-slate-500 bg-white px-2 print:text-black print:text-[11px]">
                            অথবা / OR
                        </span>
                        <div className="flex-grow border-t border-dashed border-slate-300 print:border-black"></div>
                    </div>
                )}

                <div className="relative transition-all">
                    {/* Action buttons moved to sidebar */}
                </div>

                <div className="flex flex-col items-start gap-1 w-full cq-question-layout">
                    {renderedStimulus && (
                        <div className="w-full mb-1 text-slate-800 cq-stimulus-block" 
                             style={{ textAlign: node.attrs.textAlign || 'left', lineHeight: safeLineGap }}
                             dangerouslySetInnerHTML={{ __html: renderedStimulus }} 
                        />
                    )}
                    
                    {renderedQuestionText ? (
                        <div className="flex items-start justify-between gap-4 w-full">
                            <div className="text-slate-900 font-medium flex-1 w-full" 
                                 style={{ textAlign: node.attrs.textAlign || 'left' }}
                                 dangerouslySetInnerHTML={{ __html: renderedQuestionText }} 
                            />
                            <div className="flex items-start gap-2 shrink-0 select-none">
                                {sourceBadgeText && (
                                    <span className="nexus-source-badge text-slate-500 font-normal select-none"
                                          style={{ fontSize: fSize ? `${fSize * 0.85}px` : '0.85em', fontFamily: 'inherit' }}>
                                        [{sourceBadgeText}]
                                    </span>
                                )}
                                {node.attrs.marksConfig !== 'hide' && node.attrs.marks && node.attrs.type !== 'CQ' && node.attrs.type !== 'CQ_DESCRIPTIVE' && (
                                    <span className="font-medium text-slate-800 whitespace-nowrap ml-1 mt-0.5 select-none"
                                          style={{ fontSize: fSize ? `${fSize * 0.9}px` : '0.9em' }}>
                                        {node.attrs.marksConfig === 'showBracket' 
                                            ? `(${formatMarksDigits(node.attrs.marks, node.attrs.numberingStyle)})` 
                                            : formatMarksDigits(node.attrs.marks, node.attrs.numberingStyle)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        node.attrs.marksConfig !== 'hide' && node.attrs.marks && node.attrs.type !== 'CQ' && node.attrs.type !== 'CQ_DESCRIPTIVE' && (
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
                        <div className={`w-full mt-2 pl-4 flex flex-col gap-2 cq-subparts-list cq-marks-${node.attrs.marksConfig === 'showRight' ? 'right' : node.attrs.marksConfig === 'showBracket' ? 'bracket' : 'hide'}`}>
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
                        <div className="w-full mt-[0.2em] mb-[0.2em] pl-[1.5em] cq-statements-container">
                            <div className="flex flex-col cq-statements-list">
                                {node.attrs.statements.map((stmt, idx) => {
                                    const roman = ['i', 'ii', 'iii', 'iv', 'v'][idx] || (idx + 1);
                                    const safeStmt = typeof stmt === 'string' ? stmt : '';
                                    // Strip existing prefix like 'i.', 'ii)', '1.', etc.
                                    const cleanStmt = safeStmt.replace(/^(?:i{1,3}|iv|v|vi{0,3}|ix|x|[0-9]+|[১-৯]+)[\.\)]\s*/i, '').trim();
                                    return (
                                        <div key={idx} className="flex gap-2 items-start text-slate-800 cq-statement-item" style={{ fontSize: fSize ? `${fSize * 0.95}px` : '0.95em' }}>
                                            <span className="font-medium mt-[1px]">{roman}.</span>
                                            <div className="cq-statement-text" dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(cleanStmt, `stmt-${idx}`)) }} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* MCQ Options Rendering */}
                {displayOptions && displayOptions.length > 0 && (
                    <div className={`options-grid grid ${computedLayout === 'col4' ? 'grid-cols-4 gap-x-3' : computedLayout === 'col2' ? 'grid-cols-2 gap-x-6' : 'grid-cols-1 gap-x-6'}`}
                         style={{ 
                             rowGap: (node.attrs.optionGap && node.attrs.optionGap < 0) ? '0px' : (node.attrs.optionGap ? `${node.attrs.optionGap}px` : '8px'),
                             fontSize: fSize ? `${fSize}px` : 'inherit',
                             letterSpacing: computedLayout === 'col4' ? '-0.015em' : 'normal'
                         }}
                    >
                        {displayOptions.map((opt, idx) => {
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
                )}

                {/* Inline Detailed Answer Block - controlled by .show-answers-inline / .show-explanation-inline class on parent */}
                <div className="nexus-detailed-answer-block mt-2 break-inside-avoid w-full"
                     style={{ fontSize: node.attrs.fontSize ? `${node.attrs.fontSize}pt` : 'inherit', fontFamily: 'inherit', display: 'none' }}>
                    
                    {/* Standard Answer */}
                    {(!dynamicDataParsed || (answerFields.length === 0 && (!dynamicDataParsed.sub_parts || dynamicDataParsed.sub_parts.length === 0))) && (
                        <div className="flex items-start gap-1 font-bold text-slate-800 nexus-answer-line">
                            <span className="shrink-0 answer-label-text">উত্তর:</span>
                            <div className="nexus-answer-content text-slate-900" dangerouslySetInnerHTML={{ __html: (() => {
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
                        <div className="space-y-1.5 mt-1">
                            {answerFields.map(([key, value]) => renderDynamicValue(key, value, true))}
                        </div>
                    )}

                    {/* Sub Parts Answers and Explanations (CQ_DESCRIPTIVE) */}
                    {dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.length > 0 && (hasSubPartsAnswers || hasSubPartsExplanations) && (
                        <div className="space-y-3 mt-2 text-slate-800 w-full pl-4">
                            {dynamicDataParsed.sub_parts.map((part, pIdx) => {
                                const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                return (
                                    <div key={pIdx} className="flex flex-col gap-1 border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                                        {part.answer && (
                                            <div className="flex items-start gap-1.5 text-sm">
                                                <span className="shrink-0 text-slate-900 font-bold">({label}) উত্তর:</span>
                                                <div className="text-slate-900 font-medium" dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(part.answer, `subpart-ans-${pIdx}`)) }} />
                                            </div>
                                        )}
                                        {part.explanation && (
                                            <div className="flex items-start gap-1.5 mt-0.5 text-xs pl-4">
                                                <span className="font-bold shrink-0 text-slate-800">
                                                    {!part.answer ? `(${label}) ব্যাখ্যা:` : 'ব্যাখ্যা:'}
                                                </span>
                                                <div className="text-slate-900 font-normal" dangerouslySetInnerHTML={{ __html: cleanHtml(parseMarkdownImages(part.explanation, `subpart-exp-${pIdx}`)) }} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Standard Explanation */}
                    {(!dynamicDataParsed || (explanationFields.length === 0 && (!dynamicDataParsed.sub_parts || dynamicDataParsed.sub_parts.length === 0))) && node.attrs.explanation && (
                        <div className="explanation-block text-slate-800 mt-2 flex items-start gap-1">
                            <span className="font-bold shrink-0 text-slate-800">ব্যাখ্যা:</span>
                            <div dangerouslySetInnerHTML={{ __html: node.attrs.explanation }} />
                        </div>
                    )}

                    {/* Dynamic Explanation Fields */}
                    {dynamicDataParsed && explanationFields.length > 0 && (
                        <div className="space-y-2 mt-2 w-full pl-4">
                            {explanationFields.map(([key, value]) => renderDynamicValue(key, value, false))}
                        </div>
                    )}
                </div>



        </NodeViewWrapper>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.selected === nextProps.selected &&
        prevProps.node.attrs.questionId === nextProps.node.attrs.questionId &&
        prevProps.node.attrs.questionText === nextProps.node.attrs.questionText &&
        prevProps.node.attrs.marks === nextProps.node.attrs.marks &&
        prevProps.node.attrs.marksConfig === nextProps.node.attrs.marksConfig &&
        prevProps.node.attrs.language === nextProps.node.attrs.language &&
        prevProps.node.attrs.numberingStyle === nextProps.node.attrs.numberingStyle &&
        prevProps.node.attrs.dynamicData === nextProps.node.attrs.dynamicData &&
        prevProps.node.attrs.questionNumber === nextProps.node.attrs.questionNumber &&
        prevProps.node.attrs.smartFit === nextProps.node.attrs.smartFit &&
        prevProps.node.attrs.optionLayout === nextProps.node.attrs.optionLayout &&
        prevProps.node.attrs.optionStyle === nextProps.node.attrs.optionStyle &&
        prevProps.node.attrs.optionDecoration === nextProps.node.attrs.optionDecoration &&
        prevProps.node.attrs.questionGap === nextProps.node.attrs.questionGap &&
        prevProps.node.attrs.textAlign === nextProps.node.attrs.textAlign &&
        JSON.stringify(prevProps.node.attrs.options || []) === JSON.stringify(nextProps.node.attrs.options || [])
    );
});

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
            alternativeToId: { default: null },
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
            dynamicDataSynced: { default: false },
            orientation: { default: 'portrait' },
            pageSize: { default: 'A4' },
            customW: { default: 210 },
            customH: { default: 297 },
            marginLeft: { default: 10 },
            marginRight: { default: 10 },
            colGap: { default: 10 }
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
                    alternativeToId: dom.getAttribute('data-alternative-to-id') || null,
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
                    orientation: dom.getAttribute('orientation') || 'portrait',
                    pageSize: dom.getAttribute('pagesize') || 'A4',
                    customW: dom.getAttribute('customw') ? Number(dom.getAttribute('customw')) : 210,
                    customH: dom.getAttribute('customh') ? Number(dom.getAttribute('customh')) : 297,
                    marginLeft: dom.getAttribute('marginleft') ? Number(dom.getAttribute('marginleft')) : 10,
                    marginRight: dom.getAttribute('marginright') ? Number(dom.getAttribute('marginright')) : 10,
                    colGap: dom.getAttribute('colgap') ? Number(dom.getAttribute('colgap')) : 10,
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
            'data-alternative-to-id': HTMLAttributes.alternativeToId || null,
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
            'data-dynamic-data-synced': HTMLAttributes.dynamicDataSynced ? 'true' : 'false',
            'orientation': HTMLAttributes.orientation || 'portrait',
            'pagesize': HTMLAttributes.pageSize || 'A4',
            'customw': HTMLAttributes.customW || 210,
            'customh': HTMLAttributes.customH || 297,
            'marginleft': HTMLAttributes.marginLeft !== undefined ? HTMLAttributes.marginLeft : 10,
            'marginright': HTMLAttributes.marginRight !== undefined ? HTMLAttributes.marginRight : 10,
            'colgap': HTMLAttributes.colGap !== undefined ? HTMLAttributes.colGap : 10
        })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(QuestionComponent);
    }
});
