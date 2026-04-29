import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { RefreshCw, BookOpen, Trash2 } from 'lucide-react';

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

    const QuestionComponent = ({ node, editor, deleteNode, updateAttributes }) => {
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

                window.dispatchEvent(new CustomEvent('nexusImageSelected', {
                    detail: {
                        width: width,
                        align: align,
                        onUpdate: updateImageConfig
                    }
                }));
            }
        };

        return (
            <NodeViewWrapper 
                data-type="question-block" 
                data-numberingstyle={node.attrs.numberingStyle || 'bn'}
                className={`relative group mb-0 cursor-text`}
                style={{ 
                    fontSize: fSize ? `${fSize}px` : 'inherit',
                    lineHeight: safeLineGap,
                    marginBottom: node.attrs.questionGap !== undefined && node.attrs.questionGap !== null ? `${node.attrs.questionGap}px` : undefined
                }}
                onMouseDown={handleImageMouseDown}
            >
                <div className="relative px-0 transition-all">
                    {/* Action Buttons (Visible on Hover) */}
                {isStrict && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 right-2 flex items-center gap-1 bg-white shadow-sm border border-slate-200 rounded-md p-0.5 z-10">
                        <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Swap Question">
                            <RefreshCw size={13} />
                        </button>
                        <button onClick={deleteNode} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded" title="Remove Question">
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}

                {/* Main Question Text & Marks */}
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
                
                {/* MCQ Options Rendering */}
                {node.attrs.type === 'MCQ' && node.attrs.options && node.attrs.options.length > 0 && (
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
                                <div key={idx} className="flex items-start gap-2">
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

                {/* Free Edit Warning overlay (optional) */}
                {!isStrict && (
                    <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-dashed border-slate-400">
                        <span className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-md">
                            Convert to Plain Text to Edit
                        </span>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

export const QuestionBlockNode = Node.create({
    name: 'questionBlock',
    group: 'block',
    atom: true, // This makes the node an unbreakable, atomic unit in Tiptap

    addAttributes() {
        return {
            type: { default: 'MCQ' },
            questionText: { default: '' },
            chapterName: { default: '' },
            marks: { default: 1 },
            options: { default: [] },
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
                return {
                    type: dom.getAttribute('type') || 'MCQ',
                    questionText: dom.getAttribute('questiontext') || '',
                    chapterName: dom.getAttribute('chaptername') || '',
                    marks: Number(dom.getAttribute('marks')) || 1,
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
        const { options, ...restAttrs } = HTMLAttributes;
        return ['div', mergeAttributes(restAttrs, {
            'data-type': 'question-block',
            'data-options': JSON.stringify(options),
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
