import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { RefreshCw, Trash2, Edit3, RotateCcw } from 'lucide-react';
import questionService from '../../../../../services/questionService';

const parseMarkdownImages = (text) => {
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
            let marginStyle = '0.5rem 0';
            if (align === 'center') marginStyle = '0.5rem auto';
            if (align === 'right') marginStyle = '0.5rem 0 0 auto';

            const imgId = `${url}-${imgCount}`;
            const isSelected = window.__NEXUS_SELECTED_IMAGE__ === imgId;
            const ringClasses = isSelected ? 'outline outline-2 outline-indigo-500 shadow-sm' : 'hover:outline hover:outline-2 hover:outline-indigo-300';

            return `<img id="img-${imgId}" data-img-id="${imgId}" data-img-index="${imgCount++}" data-raw-alt="${rawAlt}" data-url="${url}" src="${finalUrl}" alt="${alt}" referrerPolicy="no-referrer" style="max-width: 100% !important; width: ${width} !important; border-radius: 0.5rem; margin: ${marginStyle} !important; display: block; cursor: pointer;" class="${ringClasses} transition-all print:outline-none" title="Click to resize or align image" />`;
        });
    };

    const QuestionComponent = ({ node, editor, deleteNode, updateAttributes, getPos, selected }) => {
        // Strict mode lock removed as per user request to make it fully usable
        const isStrict = editor.view.dom.classList.contains('strict-analytics-mode');
        
        // Convert 0, 1, 2, 3 to ক, খ, গ, ঘ
        const getBanglaOptionLabel = (idx) => {
            const labels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ'];
            return labels[idx] || String.fromCharCode(97 + idx);
        };

        const ptToPx = (pt) => pt ? pt * 1.333333 : null;
        const fSize = ptToPx(node.attrs.fontSize);
        
        // Safety clamp for line gap to prevent collapsing
        const safeLineGap = node.attrs.lineGap ? Math.max(1.0, Number(node.attrs.lineGap)) : 'inherit';

        // Track latest attributes to prevent stale closures in onUpdate
        const attrsRef = React.useRef(node.attrs);
        React.useEffect(() => {
            attrsRef.current = node.attrs;
        }, [node.attrs]);

        // Auto-sync missing fields from DB for old saved questions
        React.useEffect(() => {
            const attrs = node.attrs;
            if (!attrs.questionId || attrs.syncedFromDb) return;
            
            // Check if we need to sync (missing explanation or missing correct flags in options)
            const isMissingData = !attrs.explanation || 
                                  (attrs.type === 'MCQ' && attrs.options && attrs.options.length > 0 && !attrs.options.some(o => o.isCorrect !== undefined || o.correct !== undefined));
            
            if (isMissingData) {
                questionService.getQuestionById(attrs.questionId).then(q => {
                    if (q) {
                        updateAttributes({
                            syncedFromDb: true,
                            explanation: q.explanation || '',
                            answer: q.correctAnswer || '',
                            options: q.options ? q.options.map(opt => ({ ...opt, optionText: opt.optionText })) : attrs.options
                        });
                    }
                }).catch(err => {
                    console.error("Failed to sync question data for ID:", attrs.questionId, err);
                    updateAttributes({ syncedFromDb: true }); // Prevent infinite retry
                });
            } else {
                updateAttributes({ syncedFromDb: true });
            }
        }, [node.attrs.questionId, node.attrs.syncedFromDb, updateAttributes]);

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

                // Dispatch global event to open properties panel in NexusEditor
                const updateImageConfig = (newAlign, newWidth) => {
                    const newRawAlt = `${alt}|${newAlign}|${newWidth}`;
                    const newMarkdown = `![${newRawAlt}](${url})`;

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

                    // 1. Try replacing in questionText using LATEST attrs
                    const qtResult = replaceNthImage(attrsRef.current.questionText);

                    if (qtResult.replaced && updateAttributes) {
                        updateAttributes({ questionText: qtResult.text });
                        window.dispatchEvent(new CustomEvent('nexusImageSelected', {
                            detail: { width: newWidth, align: newAlign, onUpdate: updateImageConfig }
                        }));
                        return;
                    }

                    // 2. Try replacing in options
                    if (attrsRef.current.options && attrsRef.current.options.length > 0 && updateAttributes) {
                        let anyReplaced = false;
                        const newOptions = attrsRef.current.options.map(opt => {
                            const optResult = replaceNthImage(opt.optionText || opt.text || '');
                            if (optResult.replaced) anyReplaced = true;
                            return { ...opt, optionText: optResult.text };
                        });
                        if (anyReplaced) {
                            updateAttributes({ options: newOptions });
                            window.dispatchEvent(new CustomEvent('nexusImageSelected', {
                                detail: { width: newWidth, align: newAlign, onUpdate: updateImageConfig }
                            }));
                        }
                    }
                };
            }
        };

        const handleMouseDown = (e) => {
            if (e.target.tagName === 'IMG') {
                const img = e.target;
                window.dispatchEvent(new CustomEvent('nexusImageSelected', {
                    detail: {
                        src: img.src,
                        width: img.style.width || img.width,
                        height: img.style.height || img.height,
                        align: img.style.float || img.style.display === 'block' ? 'center' : 'none',
                        updateImage: (updates) => {
                            img.style.width = updates.width + 'px';
                            img.style.height = updates.height + 'px';
                            if (updates.align === 'center') {
                                img.style.display = 'block';
                                img.style.margin = '0 auto';
                                img.style.float = 'none';
                            } else if (updates.align === 'none') {
                                img.style.display = 'inline-block';
                                img.style.margin = '0';
                                img.style.float = 'none';
                            } else {
                                img.style.display = 'inline-block';
                                img.style.float = updates.align;
                            }
                            setRawContent(editor.getHTML());
                        }
                    }
                }));
                return;
            }
        };

        const handleClick = (e) => {
            if (e.target.tagName === 'IMG') return;
            const isStrict = editor.view.dom.classList.contains('strict-analytics-mode');
            if (isStrict) {
                // Just open the setup panel for the section, or do nothing.
                window.dispatchEvent(new CustomEvent('nexusOpenTab', { detail: 'questionSetup' }));
            }
        };

        return (
                        <NodeViewWrapper 
                data-type="question-block" 
                data-numberingstyle={node.attrs.numberingStyle || 'bn'}
                className={`relative mb-0 transition-all duration-200 rounded-xl ${isStrict ? 'cursor-pointer hover:bg-slate-50' : 'cursor-text'} print:bg-transparent print:scale-100 print:shadow-none print:ring-0`}
                style={{ 
                    fontSize: fSize ? `${fSize}px` : 'inherit',
                    lineHeight: safeLineGap,
                    marginBottom: node.attrs.questionGap !== undefined && node.attrs.questionGap !== null ? `${node.attrs.questionGap}px` : undefined,
                    paddingTop: '8px',
                    paddingBottom: '8px'
                }}
                onMouseDown={handleMouseDown}
                onClick={handleClick}
            >
                <div className="relative transition-all">
                    {/* Action buttons moved to sidebar */}
                </div>

                <div className="flex flex-col items-start gap-1 w-full">
                    {node.attrs.stimulus && (
                        <div className="w-full mb-3 text-slate-800" 
                             style={{ textAlign: node.attrs.textAlign || 'left', lineHeight: safeLineGap }}
                             dangerouslySetInnerHTML={{ __html: parseMarkdownImages(node.attrs.stimulus) }} 
                        />
                    )}
                    
                    <div className="flex items-start justify-between gap-4 w-full">
                        <div className="text-slate-900 font-medium flex-1 w-full" 
                             style={{ textAlign: node.attrs.textAlign || 'left' }}
                             dangerouslySetInnerHTML={{ __html: parseMarkdownImages(node.attrs.questionText) }} 
                        />
                        {node.attrs.marksConfig !== 'hide' && node.attrs.marks && (
                            <span className="font-medium text-slate-800 whitespace-nowrap shrink-0 ml-4 mt-0.5 select-none"
                                  style={{ fontSize: fSize ? `${fSize * 0.9}px` : '0.9em' }}>
                                {node.attrs.marksConfig === 'showBracket' ? `(${node.attrs.marks})` : node.attrs.marks}
                            </span>
                        )}
                    </div>
                    
                    {node.attrs.statements && Array.isArray(node.attrs.statements) && node.attrs.statements.length > 0 && (
                        <div className="w-full mt-2 mb-2 flex justify-center">
                            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                                {node.attrs.statements.map((stmt, idx) => {
                                    const roman = ['i', 'ii', 'iii', 'iv', 'v'][idx] || (idx + 1);
                                    const safeStmt = typeof stmt === 'string' ? stmt : '';
                                    // Strip existing prefix like 'i.', 'ii)', '1.', etc.
                                    const cleanStmt = safeStmt.replace(/^(?:i{1,3}|iv|v|vi{0,3}|ix|x|[0-9]+|[১-৯]+)[\.\)]\s*/i, '').trim();
                                    return (
                                        <div key={idx} className="flex gap-2 items-start text-slate-800" style={{ fontSize: fSize ? `${fSize * 0.95}px` : '0.95em' }}>
                                            <span className="font-medium mt-[1px]">{roman}.</span>
                                            <div dangerouslySetInnerHTML={{ __html: parseMarkdownImages(cleanStmt) }} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* MCQ Options Rendering */}
                {node.attrs.options && Array.isArray(node.attrs.options) && node.attrs.options.length > 0 && (
                    <div className={`options-grid mt-[0.3em] grid gap-x-6 ${node.attrs.optionLayout === 'col4' ? 'grid-cols-4' : node.attrs.optionLayout === 'col2' ? 'grid-cols-2' : 'grid-cols-1'}`}
                         style={{ 
                             rowGap: node.attrs.optionGap ? `${node.attrs.optionGap}px` : '8px',
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
                                
                            return (
                                <div key={idx} className={`flex items-start gap-2 ${opt.isCorrect || opt.correct ? 'nexus-correct-option p-1' : 'p-1'}`}>
                                    <span className={bubbleClass} style={{
                                        width: dec === 'bubble' ? '1.2em' : 'auto',
                                        height: dec === 'bubble' ? '1.2em' : 'auto',
                                        fontSize: dec === 'bubble' ? '0.8em' : 'inherit',
                                        paddingBottom: dec === 'bubble' ? '0.05em' : '0'
                                    }}>{formattedLabel}</span>
                                    <div dangerouslySetInnerHTML={{ __html: parseMarkdownImages(opt.optionText || opt.text || '') }} className="text-slate-700" style={{ lineHeight: Math.max(1.2, Number(node.attrs.lineGap || 1.625)) }} />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Inline Detailed Answer Block */}
                <div className="nexus-detailed-answer-block mt-2 break-inside-avoid w-full hidden"
                     style={{ fontSize: node.attrs.fontSize ? `${node.attrs.fontSize}pt` : 'inherit', fontFamily: 'inherit' }}>
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
                                    correctOpts.push(`${optLabel}. ${opt.optionText || opt.text || ''}`);
                                }
                            });
                            return correctOpts.length > 0 ? correctOpts.join('<br/>') : (node.attrs.answer || 'N/A');
                        })() }} />
                    </div>
                    {node.attrs.explanation && (
                        <div className="explanation-block text-slate-800 mt-1 flex items-start gap-1 p-2 bg-slate-50 border border-slate-200 rounded">
                            <span className="font-bold shrink-0 text-emerald-700">ব্যাখ্যা:</span>
                            <div dangerouslySetInnerHTML={{ __html: node.attrs.explanation }} />
                        </div>
                    )}
                </div>

                {/* Free Edit Warning overlay (optional) */}
                {!isStrict && (
                    <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-dashed border-slate-400">
                        <span className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-md">
                            Convert to Plain Text to Edit
                        </span>
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
            numberingStyle: { default: 'bn' },
            marksConfig: { default: 'hide' },
            optionLayout: { default: 'col1' },
            optionStyle: { default: 'bn' },
            optionDecoration: { default: 'rightBracket' },
            fontSize: { default: null },
            lineGap: { default: null },
            optionGap: { default: null },
            questionGap: { default: null },
            textAlign: { default: 'left' }
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
                    type: dom.getAttribute('type') || 'MCQ',
                    questionText: dom.getAttribute('questiontext') || '',
                    stimulus: dom.getAttribute('stimulus') || '',
                    statements: statements,
                    chapterName: dom.getAttribute('chaptername') || '',
                    marks: Number(dom.getAttribute('marks')) || 1,
                    explanation: dom.getAttribute('explanation') || '',
                    answer: dom.getAttribute('answer') || '',
                    syncedFromDb: dom.getAttribute('syncedfromdb') === 'true',
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
                    options
                };
            }
        }];
    },

    renderHTML({ HTMLAttributes }) {
        const { options, statements, ...restAttrs } = HTMLAttributes;
        return ['div', mergeAttributes(restAttrs, {
            'data-type': 'question-block',
            'data-options': JSON.stringify(options || []),
            'data-statements': JSON.stringify(statements || []),
            'questionid': HTMLAttributes.questionId || null,
            'stimulus': HTMLAttributes.stimulus || '',
            'explanation': HTMLAttributes.explanation || '',
            'answer': HTMLAttributes.answer || '',
            'syncedfromdb': HTMLAttributes.syncedFromDb ? 'true' : 'false',
            'fontsize': HTMLAttributes.fontSize || null,
            'linegap': HTMLAttributes.lineGap || null,
            'optiongap': HTMLAttributes.optionGap || null,
            'questiongap': HTMLAttributes.questionGap || null,
            'textalign': HTMLAttributes.textAlign || 'left'
        })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(QuestionComponent);
    }
});
