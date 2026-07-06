import React, { useEffect, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Extension } from '@tiptap/core';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';

import { ResizableImage } from '../../Exams/NexusEditor/extensions/ResizableImageNode';
import { MathNode } from '../../Exams/NexusEditor/extensions/MathNode';
import { QuestionBlockNode } from '../../Exams/NexusEditor/extensions/QuestionBlockNode';
import { CustomHeading, CustomParagraph } from '../../Exams/NexusEditor/extensions/CustomNodes';
import { usePageCountObserver } from '../../Exams/NexusEditor/hooks/usePageCountObserver';

import { Trash2, Minus, Plus, RotateCcw, Settings } from 'lucide-react';

export const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize?.replace(/['"]/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .run();
            },
        };
    },
});

export const FontFamily = Extension.create({
    name: 'fontFamily',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontFamily: {
                        default: null,
                        parseHTML: element => element.style.fontFamily?.replace(/['"]/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontFamily) {
                                return {};
                            }
                            return {
                                style: `font-family: ${attributes.fontFamily}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontFamily: fontFamily => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontFamily })
                    .run();
            },
            unsetFontFamily: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontFamily: null })
                    .run();
            },
        };
    },
});

export const HighlightColor = Extension.create({
    name: 'highlightColor',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    highlightColor: {
                        default: null,
                        parseHTML: element => element.style.backgroundColor || element.style.background,
                        renderHTML: attributes => {
                            if (!attributes.highlightColor) {
                                return {};
                            }
                            return {
                                style: `background-color: ${attributes.highlightColor}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setHighlightColor: highlightColor => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { highlightColor })
                    .run();
            },
            unsetHighlightColor: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { highlightColor: null })
                    .run();
            },
        };
    },
});

const marginPixels = {
    'narrow': '48px',
    'moderate': '72px',
    'normal': '96px',
    'wide': '144px'
};

const marginValues = {
    'narrow': 48,
    'moderate': 72,
    'normal': 96,
    'wide': 144
};

const paperDimensions = {
    'A4': { portrait: { w: 794, h: 1123 }, landscape: { w: 1123, h: 794 } },
    'Legal': { portrait: { w: 816, h: 1344 }, landscape: { w: 1344, h: 816 } },
    'Letter': { portrait: { w: 816, h: 1056 }, landscape: { w: 1056, h: 816 } }
};

const LecturePaperCanvas = ({
    lecture,
    setLecture,
    config,
    zoom,
    setZoom,
    selection,
    setSelection,
    setRightPanelOpen,
    isBengaliFont,
    toBengaliNumeral,
    rightPanelOpen,
    getOptionLabel,
    rawContent,
    onEditorChange,
    setEditor
}) => {
    const canvasContainerRef = useRef(null);
    const lastEditorContentRef = useRef(rawContent);

    // Page configurations
    const margin = marginValues[config.margins] || 96;
    const toBengaliNumerals = (num) => {
        const banglaDigits = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
        return String(num).split('').map(digit => banglaDigits[digit] || digit).join('');
    };

    const pageConfig = useMemo(() => {
        const dims = paperDimensions[config.paperSize]?.[config.orientation || 'portrait'] || paperDimensions['A4'].portrait;
        return {
            w: dims.w,
            h: dims.h,
            margin,
            printableH: dims.h - margin * 2,
            printableW: dims.w - margin * 2
        };
    }, [config.paperSize, config.orientation, margin]);

    // Initialize Tiptap Editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                paragraph: false,
            }),
            CustomHeading,
            CustomParagraph,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            ResizableImage,
            MathNode,
            QuestionBlockNode,
            TextStyle,
            Color,
            FontSize,
            FontFamily,
            HighlightColor,
        ],
        content: rawContent || '<p></p>',
        editorProps: {
            attributes: {
                class: 'focus:outline-none w-full min-h-[500px]',
            },
            handleClick: (view, pos, event) => {
                // Determine if user clicked a question block or section heading to update selection
                const { state } = view;
                const $pos = state.doc.resolve(pos);
                
                // Traverse up to find custom nodes
                for (let i = $pos.depth; i >= 0; i--) {
                    const node = $pos.node(i);
                    if (node.type.name === 'questionBlock') {
                        const qId = node.attrs.questionId || node.attrs.id;
                        setSelection({ type: 'question', id: qId, sectionId: node.attrs.sectionId });
                        setRightPanelOpen(true);
                        return;
                    }
                    if (node.type.name === 'heading' && node.attrs['data-section-id']) {
                        const secId = node.attrs['data-section-id'];
                        setSelection({ type: 'section', id: secId });
                        setRightPanelOpen(true);
                        return;
                    }
                }
                
                // Fallback: click elsewhere resets selection to page
                setSelection({ type: 'page', id: null });
            }
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            lastEditorContentRef.current = html;
            if (onEditorChange) {
                onEditorChange(html);
            }
        }
    });

    // Share editor instance with parent
    useEffect(() => {
        if (editor && setEditor) {
            setEditor(editor);
        }
        return () => {
            if (setEditor) {
                setEditor(null);
            }
        };
    }, [editor, setEditor]);

    // Sync external rawContent changes ONLY when switching to a different lecture sheet
    useEffect(() => {
        if (editor && rawContent) {
            const timer = setTimeout(() => {
                if (editor && !editor.isDestroyed) {
                    editor.commands.setContent(rawContent);
                }
            }, 0);
            lastEditorContentRef.current = rawContent;
            return () => clearTimeout(timer);
        }
    }, [lecture?.id, editor]);

    // Page count observer
    const pageCount = usePageCountObserver(
        canvasContainerRef,
        editor,
        pageConfig.h,
        margin,
        margin,
        null
    );

    // Scroll to section heading on selection change
    useEffect(() => {
        if (selection.type === 'section' && selection.id && canvasContainerRef.current) {
            const heading = canvasContainerRef.current.querySelector(`h3[data-section-id="${selection.id}"]`);
            if (heading) {
                heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selection]);

    const isContinuous = config.pageView === 'continuous';

    // Helper to group question types: map CQ_DESCRIPTIVE and CQ to CQ so they share the numbering sequence
    const getBaseType = (t) => {
        const typeStr = t || 'MCQ';
        if (typeStr === 'CQ' || typeStr === 'CQ_DESCRIPTIVE') return 'CQ';
        return typeStr;
    };

    // Auto-numbering of questions in Tiptap doc
    useEffect(() => {
        if (!editor) return;

        const syncQuestionNumbers = () => {
            let runningCounter = 0;
            const typeCounters = {};
            const updates = [];

            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    if (config.resetNumberingBySection) {
                        runningCounter = 0;
                        Object.keys(typeCounters).forEach(key => {
                            typeCounters[key] = 0;
                        });
                    }
                }
                if (node.type.name === 'questionBlock') {
                    const isAlternative = node.attrs.alternativeToId != null && node.attrs.alternativeToId !== '';
                    let assignedNumber = 0;
                    if (!isAlternative) {
                        if (config.resetNumberingByType) {
                            const qType = getBaseType(node.attrs.type);
                            typeCounters[qType] = (typeCounters[qType] || 0) + 1;
                            assignedNumber = typeCounters[qType];
                        } else {
                            runningCounter++;
                            assignedNumber = runningCounter;
                        }
                    } else {
                        if (config.resetNumberingByType) {
                            const qType = getBaseType(node.attrs.type);
                            assignedNumber = typeCounters[qType] || 0;
                        } else {
                            assignedNumber = runningCounter;
                        }
                    }

                    if (node.attrs.questionNumber !== assignedNumber) {
                        updates.push({ pos, questionNumber: assignedNumber });
                    }
                    return false; // Skip children of question block
                }
            });

            if (updates.length > 0) {
                let tr = editor.state.tr;
                tr.setMeta('addToHistory', false);
                updates.forEach(up => {
                    const currentNode = tr.doc.nodeAt(up.pos);
                    if (currentNode) {
                        tr = tr.setNodeMarkup(up.pos, undefined, { 
                             ...currentNode.attrs, 
                             questionNumber: up.questionNumber 
                        });
                    }
                });
                editor.view.dispatch(tr);
            }
        };

        // Run initially
        syncQuestionNumbers();

        // Run on update with debouncing to prevent keystroke lag
        let debounceTimer;
        const debouncedSync = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(syncQuestionNumbers, 1500);
        };

        editor.on('update', debouncedSync);
        return () => {
            clearTimeout(debounceTimer);
            editor.off('update', debouncedSync);
        };
    }, [editor, config.resetNumberingByType, config.resetNumberingBySection]);

    // Handle questionsAtEnd cloning logic in interactive canvas
    useEffect(() => {
        if (!editor || !config.questionsAtEnd) return;

        const updateQuestionsAtEnd = () => {
            const container = document.getElementById('questions-at-end-canvas-container');
            if (!container) return;

            // Clear previous
            container.innerHTML = '';

            // Find all question blocks in editor DOM
            const editorEl = editor.view.dom;
            const qBlocks = editorEl.querySelectorAll('[data-type="question-block"]');
            
            qBlocks.forEach(q => {
                const qClone = q.cloneNode(true);
                qClone.style.display = 'block';
                
                // Strip interactive buttons
                const actions = qClone.querySelector('.question-actions');
                if (actions) actions.remove();
                const dragHandle = qClone.querySelector('.drag-handle');
                if (dragHandle) dragHandle.remove();
                
                container.appendChild(qClone);
            });
        };

        // Run initially
        updateQuestionsAtEnd();

        // Run on update with debouncing to prevent keystroke lag
        let debounceTimer;
        const debouncedUpdate = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updateQuestionsAtEnd, 1500);
        };

        editor.on('update', debouncedUpdate);
        return () => {
            clearTimeout(debounceTimer);
            editor.off('update', debouncedUpdate);
        };
    }, [editor, config.questionsAtEnd, config.showAnswers, config.showExplanations, config.showSources, config.showQuestionNumbers]);

    // Sync optionCols and smartFit to all question block nodes
    useEffect(() => {
        if (!editor) return;

        const syncOptionLayouts = () => {
            const updates = [];
            const isAuto = config.optionCols === 'auto' || !config.optionCols;
            const targetLayout = isAuto ? 'col1' : `col${config.optionCols}`;
            const targetSmartFit = isAuto;

            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'questionBlock') {
                    const currentSmartFit = node.attrs.smartFit !== false;
                    const currentLayout = node.attrs.optionLayout || 'col1';

                    if (currentSmartFit !== targetSmartFit || (!targetSmartFit && currentLayout !== targetLayout)) {
                        updates.push({
                            pos,
                            attrs: {
                                ...node.attrs,
                                smartFit: targetSmartFit,
                                ...(!targetSmartFit ? { optionLayout: targetLayout } : {})
                            }
                        });
                    }
                    return false;
                }
            });

            if (updates.length > 0) {
                let tr = editor.state.tr;
                tr.setMeta('addToHistory', false);
                updates.forEach(up => {
                    const currentNode = tr.doc.nodeAt(up.pos);
                    if (currentNode) {
                        tr = tr.setNodeMarkup(up.pos, undefined, up.attrs);
                    }
                });
                editor.view.dispatch(tr);
            }
        };

        syncOptionLayouts();

        // Run on update with debouncing to prevent keystroke lag
        let debounceTimer;
        const debouncedLayoutsSync = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(syncOptionLayouts, 1500);
        };

        editor.on('update', debouncedLayoutsSync);
        return () => {
            clearTimeout(debounceTimer);
            editor.off('update', debouncedLayoutsSync);
        };
    }, [editor, config.optionCols]);

    // Paginated view mode spacer margins logic
    useEffect(() => {
        if (!editor || !canvasContainerRef.current) return;

        const pm = canvasContainerRef.current.querySelector('.ProseMirror');
        if (!pm) return;

        const updatePageMargins = () => {
            if (isContinuous) {
                return;
            }

            const children = Array.from(pm.children);
            if (children.length === 0) return;

            // Performance budget: skip heavy page margins calculations for large documents to prevent layout thrashing
            if (children.length > 250) {
                if (canvasContainerRef.current && !canvasContainerRef.current.classList.contains('view-disabled-margins')) {
                    canvasContainerRef.current.classList.add('view-disabled-margins');
                }
                return;
            } else {
                if (canvasContainerRef.current && canvasContainerRef.current.classList.contains('view-disabled-margins')) {
                    canvasContainerRef.current.classList.remove('view-disabled-margins');
                }
            }

            // Measure natural offsets of all children based on their current offsetTop and marginTop
            const childData = children.map(el => {
                const currentMargin = parseInt(el.style.marginTop) || 0;
                return {
                    el,
                    height: el.offsetHeight,
                    naturalTop: el.offsetTop - currentMargin
                };
            });

            const pageHeight = pageConfig.h;
            const gapVal = isContinuous ? 0 : 24;
            const printableH = pageConfig.printableH;

            let currentPageIndex = 0;
            let currentAccumulatedMargin = 0;

            const pageStep = isContinuous ? printableH : (pageHeight + gapVal);

            for (let j = 0; j < childData.length; j++) {
                const item = childData[j];
                const actualTop = item.naturalTop + currentAccumulatedMargin;
                
                // Determine current page index
                currentPageIndex = Math.max(currentPageIndex, Math.floor((actualTop - margin) / pageStep));

                const pageStart = currentPageIndex * pageStep + margin;
                const pageContentEnd = pageStart + printableH;
                const elementHeight = item.height;

                const isCategoryHeader = item.el.classList.contains('lecture-category-header');
                
                let shouldPush = false;
                if (isCategoryHeader) {
                    // Category headers always start on a new page, unless they are already at the top of a page
                    shouldPush = actualTop > pageStart + 15;
                } else if (!isContinuous) {
                    // For paginated mode, we also push standard elements if they overflow
                    const startsInGap = actualTop > pageContentEnd;
                    const overflowsPage = elementHeight < printableH
                        ? (actualTop + elementHeight > pageContentEnd)
                        : (actualTop > pageStart + 15);
                    shouldPush = startsInGap || overflowsPage;
                }

                let requiredMargin = 0;
                if (shouldPush) {
                    currentPageIndex++;
                    const nextPageStart = currentPageIndex * pageStep + margin;
                    requiredMargin = nextPageStart - (item.naturalTop + currentAccumulatedMargin);
                    if (requiredMargin < 0) requiredMargin = 0;
                }

                if (requiredMargin > 0) {
                    const marginStr = `${requiredMargin}px`;
                    if (item.el.style.marginTop !== marginStr) {
                        item.el.style.marginTop = marginStr;
                    }
                    currentAccumulatedMargin += requiredMargin;
                } else {
                    if (item.el.style.marginTop !== '') {
                        item.el.style.marginTop = '';
                    }
                }
            }
        };

        let frameId;
        let updateTimeout;
        const triggerUpdate = () => {
            if (updateTimeout) clearTimeout(updateTimeout);
            const debounceTime = (editor && editor.isFocused) ? 2000 : 200;
            updateTimeout = setTimeout(() => {
                if (frameId) window.cancelAnimationFrame(frameId);
                frameId = window.requestAnimationFrame(updatePageMargins);
            }, debounceTime);
        };

        // Run initially, on editor/selection updates, and window resize
        triggerUpdate();
        editor.on('update', triggerUpdate);
        window.addEventListener('resize', triggerUpdate);

        // Capture image load events inside the editor to re-layout instantly
        const handleImageLoad = (e) => {
            if (e.target && e.target.tagName === 'IMG') {
                triggerUpdate();
            }
        };
        pm.addEventListener('load', handleImageLoad, true);

        // Cascaded timeouts to guarantee page break calculations complete after editor initialization
        const t1 = setTimeout(triggerUpdate, 100);
        const t2 = setTimeout(triggerUpdate, 500);
        const t3 = setTimeout(triggerUpdate, 1000);

        return () => {
            if (frameId) window.cancelAnimationFrame(frameId);
            if (updateTimeout) clearTimeout(updateTimeout);
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            pm.removeEventListener('load', handleImageLoad, true);
            editor.off('update', triggerUpdate);
            window.removeEventListener('resize', triggerUpdate);
        };
    }, [editor, isContinuous, margin, pageConfig.h, pageConfig.printableH]);

    // Page background styles
    const getPageStyle = () => {
        const { w, h } = pageConfig;
        const cAccent = config.coverAccentColor || '#334155';
        
        let borderStyle = '1px solid #cbd5e1';
        let boxShadowStyle = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)';
        
        if (config.showPageBorder) {
            const preset = config.pageBorderPreset || 'double';
            if (preset === 'double') {
                boxShadowStyle = `0 0 0 1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1), inset 0 0 0 2px ${cAccent}, inset 0 0 0 5px white, inset 0 0 0 6px ${cAccent}`;
                borderStyle = 'none';
            } else if (preset === 'solid') {
                boxShadowStyle = '0 0 0 1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1)';
                borderStyle = `2px solid ${cAccent}`;
            } else if (preset === 'minimal') {
                boxShadowStyle = '0 0 0 1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1)';
                borderStyle = '1px solid #cbd5e1';
            } else {
                boxShadowStyle = '0 0 0 1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1)';
                borderStyle = 'none';
            }
        }
        
        return {
            width: `${w}px`,
            height: `${h}px`,
            backgroundColor: config.paperColor || '#ffffff',
            boxShadow: boxShadowStyle,
            border: borderStyle,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
        };
    };

    const getContainerStyle = () => ({
        transform: `scale(${zoom / 100})`,
        transformOrigin: 'top center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    const hasCoverPage = config.showInstituteName || config.showTitle;
    const totalPages = hasCoverPage ? 1 + pageCount : pageCount;
    const canvasTextColor = config.paperColor === '#1e293b' ? '#f8fafc' : '#1e293b';

    return (
        <main className="flex-1 overflow-auto relative custom-scrollbar scroll-smooth bg-slate-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]">


            <style dangerouslySetInnerHTML={{ __html: `
                .ProseMirror {
                    font-size: ${config.fontSize || 12}px;
                    line-height: ${config.lineSpacing || 1.5};
                    letter-spacing: ${config.letterSpacing || 0}px;
                    width: 100% !important;
                    outline: none;
                    position: relative !important;
                    column-count: ${config.columns || 1} !important;
                    column-gap: ${config.columnGap || 32}px !important;
                    column-rule: ${config.columns > 1 && config.showColumnDivider !== false ? `${config.columnDividerWidth || 1}px ${config.columnDividerStyle || 'solid'} ${config.columnDividerColor || '#cbd5e1'}` : 'none'} !important;
                    text-align: justify;
                }
                .ProseMirror img, 
                .ProseMirror [data-type="question-block"],
                .ProseMirror table,
                .ProseMirror p,
                .ProseMirror li {
                    break-inside: avoid-column !important;
                    page-break-inside: avoid !important;
                    max-width: 100% !important;
                    padding-top: 2px !important;
                }
                .ProseMirror > * {
                    margin-top: 0px;
                }
                .view-continuous .ProseMirror > *,
                .view-disabled-margins .ProseMirror > * {
                    margin-top: 0px !important;
                }
                .ProseMirror [data-type="question-block"] {
                    position: relative;
                    padding-left: 2.5em !important;
                    box-sizing: border-box;
                }
                .ProseMirror [data-type="question-block"],
                .ProseMirror [data-type="question-block"] *,
                .ProseMirror [data-type="question-block"] p,
                .ProseMirror [data-type="question-block"] div,
                .ProseMirror [data-type="question-block"] span,
                .ProseMirror [data-type="question-block"] li,
                .ProseMirror [data-type="question-block"] font {
                    margin-top: 0px !important;
                    margin-bottom: 0px !important;
                    line-height: ${config.lineSpacing || 1.5} !important;
                }
                .ProseMirror [data-type="question-block"] .cq-question-layout {
                    gap: calc(${config.lineSpacing || 1.5} * 2px) !important;
                }
                .ProseMirror [data-type="question-block"] .cq-stimulus-block {
                    margin-bottom: calc(${config.lineSpacing || 1.5} * 2px) !important;
                }
                .ProseMirror [data-type="question-block"] .cq-subparts-list {
                    margin-top: calc(${config.lineSpacing || 1.5} * 3px) !important;
                    gap: calc(${config.lineSpacing || 1.5} * 2px) !important;
                    padding-left: 1.25rem !important;
                }
                .ProseMirror [data-type="question-block"] .cq-subpart-item {
                    gap: calc(${config.lineSpacing || 1.5} * 2px) !important;
                }
                .ProseMirror [data-type="question-block"] .cq-statements-container {
                    margin-top: calc(${config.lineSpacing || 1.5} * 2px) !important;
                    margin-bottom: calc(${config.lineSpacing || 1.5} * 2px) !important;
                    padding-left: 1rem !important;
                }
                .ProseMirror [data-type="question-block"] .cq-statements-list {
                    gap: calc(${config.lineSpacing || 1.5} * 2px) !important;
                }
                .ProseMirror [data-type="question-block"] .cq-statement-item {
                    gap: calc(${config.lineSpacing || 1.5} * 2px) !important;
                }
                .ProseMirror [data-type="question-block"] .options-grid {
                    row-gap: calc(${config.lineSpacing || 1.5} * 3px) !important;
                    column-gap: calc(${config.lineSpacing || 1.5} * 5px) !important;
                    margin-top: calc(${config.lineSpacing || 1.5} * 3px) !important;
                    margin-bottom: calc(${config.lineSpacing || 1.5} * 2px) !important;
                }
                .ProseMirror [data-type="question-block"] .options-grid > div {
                    padding: 1px 4px !important;
                    gap: calc(${config.lineSpacing || 1.5} * 2px) !important;
                }
                .ProseMirror [data-type="question-block"] .nexus-detailed-answer-block {
                    margin-top: calc(${config.lineSpacing || 1.5} * 3px) !important;
                }
                .ProseMirror [data-type="question-block"] .nexus-answer-line,
                .ProseMirror [data-type="question-block"] .explanation-block {
                    margin-top: calc(${config.lineSpacing || 1.5} * 2px) !important;
                    margin-bottom: 0px !important;
                }
                .ProseMirror h3.lecture-section-header {
                    display: none !important;
                }
                .ProseMirror h4.lecture-category-header {
                    font-size: 1.1em;
                    font-weight: 700;
                    margin-top: 0px;
                    padding-top: 1.25em;
                    margin-bottom: 0.5em;
                    color: #4b5563;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 0.2em;
                    position: relative;
                }
                .ProseMirror table {
                    border-collapse: collapse;
                    margin: 10px 0;
                    width: 100%;
                }
                .ProseMirror td, .ProseMirror th {
                    border: 1px solid #cbd5e1;
                    padding: 6px;
                }
                .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 10px auto;
                }
                .page-number-footer {
                    position: absolute;
                    bottom: 16px;
                    right: 32px;
                    font-size: 10px;
                    font-weight: bold;
                    color: #94a3b8;
                    user-select: none;
                }

                /* Inline answer/explanation/source display */
                .show-answers-inline .nexus-detailed-answer-block {
                    display: block !important;
                    border-top: none !important;
                    padding-top: 6px !important;
                    margin-top: 6px !important;
                }
                .show-answers-inline .nexus-detailed-answer-block .explanation-block {
                    display: none !important;
                }
                .show-answers-inline.show-explanation-inline .nexus-detailed-answer-block {
                    display: block !important;
                }
                .show-answers-inline.show-explanation-inline .nexus-detailed-answer-block .explanation-block {
                    display: flex !important;
                }
                .show-explanation-inline:not(.show-answers-inline) .nexus-detailed-answer-block {
                    display: block !important;
                }
                .show-explanation-inline:not(.show-answers-inline) .nexus-detailed-answer-block .nexus-answer-line,
                .show-explanation-inline:not(.show-answers-inline) .nexus-detailed-answer-block > div:first-child {
                    display: none !important;
                }
                
                /* Source badge visible when show-sources is on */
                .show-sources-inline .nexus-source-badge {
                    display: inline-block !important;
                    font-size: 0.85em !important;
                    font-weight: normal !important;
                    color: #475569 !important;
                    margin-left: 0.4em !important;
                    background: none !important;
                    border: none !important;
                    padding: 0 !important;
                }
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0 !important;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                    }
                    #lecture-paper-canvas {
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .show-sources-inline .nexus-source-badge {
                        display: inline-block !important;
                        color: #000000 !important;
                    }
                    
                    /* Show background pages wrapper in print, align page by page */
                    #lecture-paper-canvas > div.pointer-events-none {
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        z-index: 0 !important;
                    }
                    .paper-page-background {
                        height: 100vh !important;
                        page-break-after: always !important;
                        break-after: page !important;
                        box-sizing: border-box !important;
                        position: relative !important;
                    }
                }

                @media screen {
                    .screen-hidden {
                        display: none !important;
                    }
                    .no-print-screen {
                        display: none !important;
                    }
                }





                /* Hide question numbers */
                .hide-question-numbers .ProseMirror [data-type="question-block"] {
                    padding-left: 0px !important;
                }
                .hide-question-numbers .ProseMirror [data-type="question-block"] > span.absolute {
                    display: none !important;
                }

                /* Hide inline questions when they are shown at the end */
                .questions-at-end .ProseMirror [data-type="question-block"],
                .questions-at-end.ProseMirror [data-type="question-block"] {
                    display: none !important;
                }
                
                /* End of sheet questions style */
                .questions-at-end-section {
                    margin-top: 40px !important;
                    padding-top: 24px !important;
                    border-top: 2px solid #6366f1 !important;
                }
                .questions-at-end-section [data-type="question-block"] {
                    display: block !important;
                    margin-bottom: 24px !important;
                    break-inside: avoid-column !important;
                    page-break-inside: avoid !important;
                }
                #questions-at-end-canvas-container {
                    column-count: ${config.columns || 1} !important;
                    column-gap: ${config.columnGap || 32}px !important;
                    column-rule: ${config.columns > 1 && config.showColumnDivider !== false ? `${config.columnDividerWidth || 1}px ${config.columnDividerStyle || 'solid'} ${config.columnDividerColor || '#cbd5e1'}` : 'none'} !important;
                }
            ` }} />

            <div
                ref={canvasContainerRef}
                id="lecture-paper-canvas"
                className={`flex flex-col items-center py-12 min-h-full ${config.fontFamily} ${isContinuous ? 'view-continuous' : 'view-paginated'}`}
                style={getContainerStyle()}
                data-lang={isBengaliFont ? 'bn' : 'en'}
            >
                {/* Background Pages Wrapper */}
                <div className="absolute top-12 left-0 w-full flex flex-col items-center pointer-events-none z-0" style={{ gap: '24px' }}>
                    {/* Cover Page Background */}
                    {hasCoverPage && (
                        <div className="paper-page-background" style={getPageStyle()}>
                            {config.watermark && (
                                <div 
                                    className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none"
                                    style={{ opacity: (config.watermarkOpacity || 10) / 100 }}
                                >
                                    <h1 className="font-black text-slate-800 -rotate-45 whitespace-nowrap uppercase tracking-widest" style={{ fontSize: `${config.watermarkSize || 8}rem` }}>
                                        {config.watermarkText}
                                    </h1>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {isContinuous ? (
                        /* Content Pages Backgrounds Container (Continuous Mode) */
                        <div 
                            className="flex flex-col items-center" 
                            style={{ 
                                gap: '0px',
                                paddingTop: `${margin}px`,
                                paddingBottom: `${margin}px`,
                                backgroundColor: config.paperColor || '#ffffff',
                                boxShadow: config.showPageBorder
                                    ? '0 0 0 1px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.1), inset 0 0 0 2px #334155, inset 0 0 0 5px white, inset 0 0 0 6px #334155'
                                    : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)',
                                border: config.showPageBorder ? 'none' : '1px solid #cbd5e1',
                                borderRadius: '4px',
                                boxSizing: 'border-box'
                            }}
                        >
                            {Array.from({ length: pageCount }).map((_, i) => (
                                <div 
                                    key={i} 
                                    className="paper-page-background" 
                                    style={{
                                        width: `${pageConfig.w}px`,
                                        height: `${pageConfig.printableH}px`,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxSizing: 'border-box',
                                        borderBottom: i < pageCount - 1 ? '1px dashed #94a3b8' : undefined
                                    }}
                                >
                                    {config.watermark && (
                                        <div 
                                            className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none"
                                            style={{ opacity: (config.watermarkOpacity || 10) / 100 }}
                                        >
                                            <h1 className="font-black text-slate-800 -rotate-45 whitespace-nowrap uppercase tracking-widest" style={{ fontSize: `${config.watermarkSize || 8}rem` }}>
                                                {config.watermarkText}
                                            </h1>
                                        </div>
                                    )}
                                    
                                    {config.showPageHeader && (
                                        <div 
                                            className={i !== pageCount - 1 ? 'hidden print:flex justify-between items-center' : 'flex justify-between items-center'}
                                            style={{ position: 'absolute', top: '12px', left: '24px', right: '24px', fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', borderBottom: '0.5px solid #e2e8f0', paddingBottom: '4px', userSelect: 'none' }}
                                        >
                                            <span>{config.pageHeaderText !== undefined ? config.pageHeaderText : (lecture?.title || '')}</span>
                                            <span>{lecture?.subjectName || ''}</span>
                                        </div>
                                    )}

                                    <div 
                                        className={i !== pageCount - 1 ? 'hidden print:flex justify-between items-center' : 'flex justify-between items-center'}
                                        style={{ position: 'absolute', bottom: '12px', left: '24px', right: '24px', fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', borderTop: '0.5px solid #e2e8f0', paddingTop: '4px', userSelect: 'none' }}
                                    >
                                        <span>{config.showPageFooterText ? (config.pageFooterText || "Perfect Academic Publication") : ""}</span>
                                        <span>
                                            {config.showPageNumbers ? `Page ${hasCoverPage ? i + 2 : i + 1} / ${totalPages}` : ""}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Content Pages Backgrounds (Paginated Mode - Separate A4 Cards) */
                        <>
                            {Array.from({ length: pageCount }).map((_, i) => (
                                <div 
                                    key={i} 
                                    className="paper-page-background" 
                                    style={getPageStyle()}
                                >
                                    {config.watermark && (
                                        <div 
                                            className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 select-none"
                                            style={{ opacity: (config.watermarkOpacity || 10) / 100 }}
                                        >
                                            <h1 className="font-black text-slate-800 -rotate-45 whitespace-nowrap uppercase tracking-widest" style={{ fontSize: `${config.watermarkSize || 8}rem` }}>
                                                {config.watermarkText}
                                            </h1>
                                        </div>
                                    )}
                                    
                                    {config.showPageHeader && (
                                        <div style={{ position: 'absolute', top: `${margin / 2}px`, left: `${margin}px`, right: `${margin}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', borderBottom: '0.5px solid #e2e8f0', paddingBottom: '4px', userSelect: 'none' }}>
                                            <span>{config.pageHeaderText !== undefined ? config.pageHeaderText : (lecture?.title || '')}</span>
                                            <span>{lecture?.subjectName || ''}</span>
                                        </div>
                                    )}

                                    <div style={{ position: 'absolute', bottom: `${margin / 2}px`, left: `${margin}px`, right: `${margin}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', fontWeight: 'bold', color: '#94a3b8', borderTop: '0.5px solid #e2e8f0', paddingTop: '4px', userSelect: 'none' }}>
                                        <span>{(i === pageCount - 1 && config.showPageFooterText) ? (config.pageFooterText || "Perfect Academic Publication") : ""}</span>
                                        <span>
                                            {config.showPageNumbers ? `Page ${hasCoverPage ? i + 2 : i + 1} / ${totalPages}` : ""}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
 
                {/* Foreground Container */}
                <div className="relative z-10 flex flex-col items-center" style={{ gap: '24px' }}>
                    {/* Cover Page Foreground */}
                    {hasCoverPage && (
                        <div
                            onClick={(e) => { e.stopPropagation(); setSelection({ type: 'header', id: null }); setRightPanelOpen(true); }}
                            className={`lecture-cover-page relative z-10 transition-all hover:bg-slate-50/5 cursor-pointer overflow-hidden ${selection.type === 'header' ? 'bg-indigo-50/10 ring-2 ring-indigo-500/20 shadow-md' : ''}`}
                            style={{
                                width: `${pageConfig.w}px`,
                                height: `${pageConfig.h}px`,
                                boxSizing: 'border-box',
                                padding: `${margin + 24}px`,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                position: 'relative'
                            }}
                        >
                            {config.coverBgImage && config.coverBgLayout !== 'under_topics' && (
                                <div 
                                    className="absolute pointer-events-none transition-all duration-300"
                                    style={{
                                        zIndex: 0,
                                        opacity: (config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100,
                                        backgroundImage: `url(${config.coverBgImage})`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                        ...(config.coverBgLayout === 'partial' ? {
                                            width: `${config.coverBgSize || 300}px`,
                                            height: `${config.coverBgSize || 300}px`,
                                            left: '50%',
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            backgroundSize: 'contain',
                                            border: config.coverBgBorder ? `2px solid ${config.coverAccentColor || '#4f46e5'}` : 'none',
                                            borderRadius: config.coverBgBorder ? '12px' : '0px'
                                        } : {
                                            inset: 0,
                                            backgroundSize: 'cover',
                                        })
                                    }}
                                />
                            )}


                            {/* Academic Margin-Aligned Page Border (Only for Classic, Modern, and Premium) */}
                            {((config.coverTemplate || 'classic') !== 'minimal') && (
                                <div 
                                    className="lecture-cover-border absolute pointer-events-none transition-all duration-300"
                                    style={{
                                        top: `${margin}px`,
                                        left: `${margin}px`,
                                        right: `${margin}px`,
                                        bottom: `${margin}px`,
                                        border: selection.type === 'header' ? '2.5px solid #6366f1' : ((config.coverTemplate === 'premium') ? `2px double ${config.coverAccentColor || '#b45309'}` : '2px solid #1e293b'),
                                        boxShadow: selection.type === 'header' ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none',
                                        boxSizing: 'border-box',
                                        zIndex: 0
                                    }}
                                >
                                    <div 
                                        style={{
                                            position: 'absolute',
                                            top: '4px',
                                            left: '4px',
                                            right: '4px',
                                            bottom: '4px',
                                            border: selection.type === 'header' ? '1px solid #818cf8' : ((config.coverTemplate === 'premium') ? `1px solid ${config.coverAccentColor || '#b45309'}` : '1px solid #1e293b'),
                                            opacity: (config.coverTemplate === 'premium') ? 0.3 : 0.5,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Side line highlight for Minimalist Modern */}
                            {((config.coverTemplate || 'classic') === 'minimal') && (
                                <div 
                                    className="lecture-cover-minimal-line absolute pointer-events-none"
                                    style={{
                                        top: `${margin}px`,
                                        left: `${margin}px`,
                                        bottom: `${margin}px`,
                                        width: '6px',
                                        backgroundColor: config.coverAccentColor || '#4f46e5',
                                        zIndex: 0
                                    }}
                                />
                            )}

                            {/* Template classic */}
                            {((config.coverTemplate || 'classic') === 'classic') && (
                                <>
                                    <div className="text-center relative z-10 flex flex-col items-center">
                                        {config.coverLogo && (
                                            <div className="mb-3 group relative pointer-events-auto">
                                                <img 
                                                    src={config.coverLogo} 
                                                    alt="Institute Logo" 
                                                    className="object-contain" style={{ maxHeight: `${config.coverLogoSize || 64}px` }} 
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfig({ ...config, coverLogo: null }); }}
                                                    className="absolute -top-2 -right-6 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm flex items-center justify-center w-5 h-5 text-[8px]"
                                                    title="Remove Logo"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                        {config.showInstituteName && (
                                            <div className="space-y-1">
                                                <h1
                                                    contentEditable suppressContentEditableWarning
                                                    onBlur={(e) => setLecture(prev => ({ ...prev, instituteName: e.target.innerText }))}
                                                    className="font-black tracking-[4px] text-slate-800 uppercase outline-none text-center cursor-text"
                                                    style={{ fontSize: `${config.instituteFontSize + 4}pt` }}
                                                >
                                                    {lecture?.instituteName || "PERFECT ACADEMY"}
                                                </h1>
                                                <p className="text-[10px] uppercase tracking-[3px] text-slate-500 font-bold select-none">Academic Concept Series</p>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center gap-2 mt-4 select-none">
                                            <div className="w-12 h-[1px] bg-slate-300" />
                                            <span className="text-slate-400 text-xs">◆</span>
                                            <div className="w-12 h-[1px] bg-slate-300" />
                                        </div>
                                    </div>
         
                                    <div className="text-center flex flex-col items-center justify-center my-auto py-8 relative z-10">
                                        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-[11px] font-black tracking-[2px] uppercase mb-6 shadow-sm select-none">
                                            Lecture Sheet &amp; Study Guide
                                        </div>
                                        {config.showTitle && !(lecture?.title && (lecture.title.includes("লেকচার শিট") || lecture.title.includes("টি টপিক"))) && (
                                            <h2
                                                contentEditable suppressContentEditableWarning
                                                onBlur={(e) => setLecture(prev => ({ ...prev, title: e.target.innerText }))}
                                                className="text-slate-900 font-black tracking-normal leading-[1.3] outline-none text-center cursor-text max-w-[500px]"
                                                style={{ fontSize: `${config.titleFontSize + 8}pt` }}
                                            >
                                                {lecture?.title || "LECTURE TITLE"}
                                            </h2>
                                        )}
{lecture?.sections && lecture.sections.length > 0 ? (
                                            <div className="mt-6 text-left max-w-[380px] mx-auto w-full bg-slate-50/40 border border-slate-200/50 rounded-2xl p-4 shadow-sm">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200/60 pb-1 select-none">টপিকসমূহ (Topics)</p>
                                                <ul className="space-y-1.5 list-none text-xs font-bold text-slate-700 pl-0">
                                                    {lecture.sections.map((sec, idx) => (
                                                        <li key={sec.id || idx} className="flex items-start gap-1.5">
                                                            <span className="text-indigo-500 select-none">▪</span>
                                                            <span>{sec.sectionTitle || "নতুন টপিক"}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <div className="mt-8 text-indigo-500 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50 select-none shadow-sm">
                                                <svg className="w-16 h-16 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                                                    <path d="M6 6h10" /><path d="M6 10h10" /><path d="M6 14h10" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
         
{config.coverBgImage && config.coverBgLayout === 'under_topics' && (
                                            <div className="mt-2 mb-4 flex justify-center items-start pointer-events-none relative w-full">
                                                <div 
                                                    style={{
                                                        width: `${config.coverBgSize || 150}px`,
                                                        height: `${config.coverBgSize || 150}px`,
                                                        backgroundImage: `url(${config.coverBgImage})`,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'center',
                                                        backgroundSize: 'contain',
                                                        opacity: (config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100,
                                                        border: config.coverBgBorder ? `2px solid ${config.coverAccentColor || '#4f46e5'}` : 'none',
                                                        borderRadius: config.coverBgBorder ? '12px' : '0px',
                                                        WebkitPrintColorAdjust: 'exact',
                                                        printColorAdjust: 'exact'
                                                    }}
                                                />
                                            </div>
                                        )}

                                    <div className="space-y-6 relative z-10 bg-transparent">
                                        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 max-w-[420px] mx-auto shadow-sm">
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-slate-800 font-bold" style={{ fontSize: `${config.metadataFontSize || 11}pt` }}>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-slate-400 select-none">বিষয়:</span>
                                                    <span
                                                        contentEditable suppressContentEditableWarning
                                                        onBlur={(e) => setLecture(prev => ({ ...prev, subjectName: e.target.innerText.trim() }))}
                                                        className="outline-none cursor-text hover:bg-slate-200/50 px-1 rounded min-w-[60px]"
                                                    >
                                                        {lecture?.subjectName || "__________"}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-slate-400 select-none">শ্রেণী:</span>
                                                    <span
                                                        contentEditable suppressContentEditableWarning
                                                        onBlur={(e) => setLecture(prev => ({ ...prev, className: e.target.innerText.trim() }))}
                                                        className="outline-none cursor-text hover:bg-slate-200/50 px-1 rounded min-w-[60px]"
                                                    >
                                                        {lecture?.className || "__________"}
                                                    </span>
                                                </div>


                                            </div>
                                        </div>

                                    </div>
                                </>
                            )}

                            {/* Template minimal */}
                            {((config.coverTemplate) === 'minimal') && (
                                <>
                                    <div className="text-left relative z-10 pl-6 w-full flex flex-col items-start">
                                        {config.coverLogo && (
                                            <div className="mb-3 group relative pointer-events-auto">
                                                <img 
                                                    src={config.coverLogo} 
                                                    alt="Institute Logo" 
                                                    className="object-contain" style={{ maxHeight: `${config.coverLogoSize || 56}px` }} 
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfig({ ...config, coverLogo: null }); }}
                                                    className="absolute -top-1.5 -right-6 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm flex items-center justify-center w-5 h-5 text-[8px]"
                                                    title="Remove Logo"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                        {config.showInstituteName && (
                                            <div className="space-y-1">
                                                <h1
                                                    contentEditable suppressContentEditableWarning
                                                    onBlur={(e) => setLecture(prev => ({ ...prev, instituteName: e.target.innerText }))}
                                                    className="font-black tracking-[2px] outline-none cursor-text text-left"
                                                    style={{ 
                                                        fontSize: `${config.instituteFontSize + 2}pt`,
                                                        color: config.coverAccentColor || '#4f46e5'
                                                    }}
                                                >
                                                    {lecture?.instituteName || "PERFECT ACADEMY"}
                                                </h1>
                                                <p className="text-[9px] uppercase tracking-[2px] text-slate-400 font-bold select-none">Lecture Notes Series</p>
                                            </div>
                                        )}
                                    </div>
         
                                    <div className="text-left flex flex-col items-start justify-center my-auto py-8 relative z-10 pl-6 w-full">
                                        <div className="text-slate-400 text-xs font-black uppercase tracking-[1px] mb-3 select-none">
                                            Lecture Sheet &amp; Course Guide
                                        </div>
                                        {config.showTitle && (
                                            (lecture?.title && (lecture.title.includes("লেকচার শিট") || lecture.title.includes("টি টপিক"))) ? (
                                                <div className="flex flex-col items-start gap-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 w-full select-none">টপিকসমূহ (Topics)</p>
                                                    <ul className="space-y-1.5 list-disc pl-5 text-sm font-bold text-slate-700">
                                                        {(lecture.sections || []).map((sec, sIdx) => (
                                                            <li key={sIdx}>{sec.sectionTitle || sec.title}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <h2
                                                    contentEditable suppressContentEditableWarning
                                                    onBlur={(e) => setLecture(prev => ({ ...prev, title: e.target.innerText }))}
                                                    className="text-slate-900 font-extrabold tracking-tight leading-[1.25] outline-none text-left cursor-text max-w-[500px]"
                                                    style={{ fontSize: `${config.titleFontSize + 8}pt` }}
                                                >
                                                    {lecture?.title || "LECTURE TITLE"}
                                                </h2>
                                            )
                                        )}
                                        <div className="w-20 h-1 mt-6 rounded-full" style={{ backgroundColor: config.coverAccentColor || '#4f46e5' }} />
                                    </div>
         
{config.coverBgImage && config.coverBgLayout === 'under_topics' && (
                                            <div className="mt-2 mb-4 flex justify-center items-start pointer-events-none relative w-full">
                                                <div 
                                                    style={{
                                                        width: `${config.coverBgSize || 150}px`,
                                                        height: `${config.coverBgSize || 150}px`,
                                                        backgroundImage: `url(${config.coverBgImage})`,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'center',
                                                        backgroundSize: 'contain',
                                                        opacity: (config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100,
                                                        border: config.coverBgBorder ? `2px solid ${config.coverAccentColor || '#4f46e5'}` : 'none',
                                                        borderRadius: config.coverBgBorder ? '12px' : '0px',
                                                        WebkitPrintColorAdjust: 'exact',
                                                        printColorAdjust: 'exact'
                                                    }}
                                                />
                                            </div>
                                        )}

                                    <div className="space-y-6 relative z-10 pl-6 w-full">
                                        <div className="max-w-[420px] text-slate-700 font-bold border-l-2 pl-4" style={{ borderColor: config.coverAccentColor || '#4f46e5', fontSize: `${config.metadataFontSize || 11}pt` }}>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-slate-400 select-none">বিষয়:</span>
                                                    <span
                                                        contentEditable suppressContentEditableWarning
                                                        onBlur={(e) => setLecture(prev => ({ ...prev, subjectName: e.target.innerText.trim() }))}
                                                        className="outline-none cursor-text hover:bg-slate-200/50 px-1 rounded min-w-[60px]"
                                                    >
                                                        {lecture?.subjectName || "__________"}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-slate-400 select-none">শ্রেণী:</span>
                                                    <span
                                                        contentEditable suppressContentEditableWarning
                                                        onBlur={(e) => setLecture(prev => ({ ...prev, className: e.target.innerText.trim() }))}
                                                        className="outline-none cursor-text hover:bg-slate-200/50 px-1 rounded min-w-[60px]"
                                                    >
                                                        {lecture?.className || "__________"}
                                                    </span>
                                                </div>


                                            </div>
                                        </div>

                                    </div>
                                </>
                            )}

                            {/* Template modern */}
                            {((config.coverTemplate) === 'modern') && (
                                <>
                                    {/* Top accent colored banner */}
                                    <div 
                                        className="lecture-cover-modern-banner absolute top-0 left-0 right-0 h-32 flex items-center justify-center px-8 text-white z-0"
                                        style={{ backgroundColor: config.coverAccentColor || '#0f172a' }}
                                    >
                                        {config.showInstituteName && (
                                            <h1
                                                contentEditable suppressContentEditableWarning
                                                onBlur={(e) => setLecture(prev => ({ ...prev, instituteName: e.target.innerText }))}
                                                className="font-black tracking-[3px] uppercase outline-none text-center cursor-text"
                                                style={{ fontSize: `${config.instituteFontSize}pt` }}
                                            >
                                                {lecture?.instituteName || "PERFECT ACADEMY"}
                                            </h1>
                                        )}
                                    </div>
         
                                    <div className="text-center flex flex-col items-center justify-center mt-32 mb-auto py-8 relative z-10 w-full">
                                        {config.coverLogo ? (
                                            <div className="mb-6 group relative pointer-events-auto">
                                                <img 
                                                    src={config.coverLogo} 
                                                    alt="Institute Logo" 
                                                    className="object-contain" style={{ maxHeight: `${config.coverLogoSize || 64}px` }} 
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfig({ ...config, coverLogo: null }); }}
                                                    className="absolute -top-2 -right-6 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm flex items-center justify-center w-5 h-5 text-[8px]"
                                                    title="Remove Logo"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-4 text-white p-4 rounded-full shadow-md mb-6" style={{ backgroundColor: config.coverAccentColor || '#0f172a' }}>
                                                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                                                    <path d="M6 6h10" /><path d="M6 10h10" /><path d="M6 14h10" />
                                                </svg>
                                            </div>
                                        )}
                                        {config.showTitle && !(lecture?.title && (lecture.title.includes("লেকচার শিট") || lecture.title.includes("টি টপিক"))) && (
                                            <h2
                                                contentEditable suppressContentEditableWarning
                                                onBlur={(e) => setLecture(prev => ({ ...prev, title: e.target.innerText }))}
                                                className="text-slate-900 font-black tracking-normal leading-[1.3] outline-none text-center cursor-text max-w-[500px]"
                                                style={{ fontSize: `${config.titleFontSize + 8}pt` }}
                                            >
                                                {lecture?.title || "LECTURE TITLE"}
                                            </h2>
                                        )}
                                        <p className="text-[11px] font-bold text-slate-500 mt-3 tracking-widest uppercase select-none">Lecture Sheet &amp; Study Material</p>
                                    </div>
         
                                    <div className="space-y-6 relative z-10 w-full">
{config.coverBgImage && config.coverBgLayout === 'under_topics' && (
                                            <div className="mt-2 mb-4 flex justify-center items-start pointer-events-none relative w-full">
                                                <div 
                                                    style={{
                                                        width: `${config.coverBgSize || 150}px`,
                                                        height: `${config.coverBgSize || 150}px`,
                                                        backgroundImage: `url(${config.coverBgImage})`,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'center',
                                                        backgroundSize: 'contain',
                                                        opacity: (config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100,
                                                        border: config.coverBgBorder ? `2px solid ${config.coverAccentColor || '#4f46e5'}` : 'none',
                                                        borderRadius: config.coverBgBorder ? '12px' : '0px',
                                                        WebkitPrintColorAdjust: 'exact',
                                                        printColorAdjust: 'exact'
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-[420px] mx-auto shadow-sm">
                                            <div className="grid grid-cols-2 gap-2 text-slate-800 font-bold text-center" style={{ fontSize: `${config.metadataFontSize || 11}pt` }}>
                                                <div className="flex flex-col gap-1 border-r border-slate-250">
                                                    <span className="text-[9px] text-slate-400 select-none">বিষয়</span>
                                                    <span
                                                        contentEditable suppressContentEditableWarning
                                                        onBlur={(e) => setLecture(prev => ({ ...prev, subjectName: e.target.innerText.trim() }))}
                                                        className="outline-none cursor-text hover:bg-slate-200/50 px-1 rounded truncate min-h-[16px] inline-block w-full"
                                                    >
                                                        {lecture?.subjectName || "__________"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] text-slate-400 select-none">শ্রেণী</span>
                                                    <span
                                                        contentEditable suppressContentEditableWarning
                                                        onBlur={(e) => setLecture(prev => ({ ...prev, className: e.target.innerText.trim() }))}
                                                        className="outline-none cursor-text hover:bg-slate-200/50 px-1 rounded truncate min-h-[16px] inline-block w-full"
                                                    >
                                                        {lecture?.className || "__________"}
                                                    </span>
                                                </div>

                                            </div>

                                        </div>

                                    </div>
                                </>
                            )}

                            {((config.coverTemplate) === 'premium') && (
                                <>
                                    <div className="text-center relative z-10 flex flex-col items-center">
                                        {config.coverLogo && (
                                            <div className="mb-3 group relative pointer-events-auto">
                                                <img 
                                                    src={config.coverLogo} 
                                                    alt="Institute Logo" 
                                                    className="object-contain" style={{ maxHeight: `${config.coverLogoSize || 64}px` }} 
                                                />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setConfig({ ...config, coverLogo: null }); }}
                                                    className="absolute -top-2 -right-6 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm flex items-center justify-center w-5 h-5 text-[8px]"
                                                    title="Remove Logo"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                        {config.showInstituteName && (
                                            <div className="space-y-1">
                                                <h1
                                                    contentEditable suppressContentEditableWarning
                                                    onBlur={(e) => setLecture(prev => ({ ...prev, instituteName: e.target.innerText }))}
                                                    className="font-black outline-none text-center cursor-text font-serif italic"
                                                    style={{ 
                                                        fontSize: `${config.instituteFontSize + 4}pt`,
                                                        color: config.coverAccentColor || '#b45309'
                                                    }}
                                                >
                                                    {lecture?.instituteName || "PERFECT ACADEMY"}
                                                </h1>
                                                <p className="text-[9px] uppercase tracking-[3px] text-slate-455 font-bold select-none italic font-serif">Academic Master Class Collection</p>
                                            </div>
                                        )}
                                    </div>
         
                                    <div className="text-center flex flex-col items-center justify-center my-auto py-8 relative z-10 font-serif">
                                        <div className="text-slate-400 text-xs tracking-[4px] uppercase mb-4 select-none italic">
                                            - Lecture Companion -
                                        </div>
                                        {config.showTitle && !(lecture?.title && (lecture.title.includes("লেকচার শিট") || lecture.title.includes("টি টপিক"))) && (
                                            <h2
                                                contentEditable suppressContentEditableWarning
                                                onBlur={(e) => setLecture(prev => ({ ...prev, title: e.target.innerText }))}
                                                className="text-slate-900 font-bold tracking-normal leading-[1.35] outline-none text-center cursor-text max-w-[500px] font-serif"
                                                style={{ fontSize: `${config.titleFontSize + 8}pt` }}
                                            >
                                                {lecture?.title || "LECTURE TITLE"}
                                            </h2>
                                        )}
                                        {/* Premium ornamental divider */}
                                        <div className="flex items-center justify-center gap-3 mt-6 text-slate-350 w-full select-none">
                                            <div className="w-16 h-[0.5px] bg-slate-300" />
                                            <span className="text-[14px]" style={{ color: config.coverAccentColor || '#b45309' }}>⚜</span>
                                            <div className="w-16 h-[0.5px] bg-slate-300" />
                                        </div>
                                    </div>
         
                                    {config.coverBgImage && config.coverBgLayout === 'under_topics' && (
                                            <div className="mt-2 mb-4 flex justify-center items-start pointer-events-none relative w-full">
                                                <div 
                                                    style={{
                                                        width: `${config.coverBgSize || 150}px`,
                                                        height: `${config.coverBgSize || 150}px`,
                                                        backgroundImage: `url(${config.coverBgImage})`,
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'center',
                                                        backgroundSize: 'contain',
                                                        opacity: (config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15) / 100,
                                                        border: config.coverBgBorder ? `2px solid ${config.coverAccentColor || '#4f46e5'}` : 'none',
                                                        borderRadius: config.coverBgBorder ? '12px' : '0px',
                                                        WebkitPrintColorAdjust: 'exact',
                                                        printColorAdjust: 'exact'
                                                    }}
                                                />
                                            </div>
                                        )}

                                    <div className="space-y-6 relative z-10 w-full font-serif">
                                        <div className="bg-amber-50/10 border border-amber-200/30 rounded-xl p-5 max-w-[420px] mx-auto shadow-sm">
                                            <table className="w-full text-slate-800 text-[12px] font-bold">
                                                <tbody>
                                                    <tr className="border-b border-amber-100/20">
                                                        <td className="py-1.5 text-slate-400 font-normal text-left">বিষয়:</td>
                                                        <td className="py-1.5 text-right">
                                                            <span
                                                                contentEditable suppressContentEditableWarning
                                                                onBlur={(e) => setLecture(prev => ({ ...prev, subjectName: e.target.innerText.trim() }))}
                                                                className="outline-none cursor-text hover:bg-slate-200/50 px-1 rounded min-w-[60px] inline-block font-serif"
                                                            >
                                                                {lecture?.subjectName || "__________"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr className="border-b border-amber-100/20">
                                                        <td className="py-1.5 text-slate-400 font-normal text-left">শ্রেণী:</td>
                                                        <td className="py-1.5 text-right">
                                                            <span
                                                                contentEditable suppressContentEditableWarning
                                                                onBlur={(e) => setLecture(prev => ({ ...prev, className: e.target.innerText.trim() }))}
                                                                className="outline-none cursor-text hover:bg-slate-200/50 px-1 rounded min-w-[60px] inline-block font-serif"
                                                            >
                                                                {lecture?.className || "__________"}
                                                            </span>
                                                        </td>
                                                    </tr>


                                                </tbody>
                                            </table>
                                        </div>

                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Content Editor Canvas */}
                    <div
                        className="lecture-content-canvas transition-all relative border border-transparent"
                        style={{
                            width: `${pageConfig.w}px`,
                            minHeight: isContinuous 
                                ? `${pageCount * pageConfig.printableH + margin * 2}px`
                                : `${pageCount * pageConfig.h + (pageCount - 1) * 24}px`,
                            paddingTop: `${margin}px`,
                            paddingBottom: `${margin}px`,
                            paddingLeft: `${margin}px`,
                            paddingRight: `${margin}px`,
                            boxSizing: 'border-box',
                            color: canvasTextColor
                        }}
                    >
                        <div className={[
                            config.showAnswers ? 'show-answers-inline' : '',
                            config.showExplanations ? 'show-explanation-inline' : '',
                            config.showSources ? 'show-sources-inline' : '',
                            !config.showQuestionNumbers ? 'hide-question-numbers' : '',
                            config.questionsAtEnd ? 'questions-at-end' : ''
                        ].filter(Boolean).join(' ')}>
                            <EditorContent editor={editor} />
                            
                            {config.questionsAtEnd && (
                                <div className="questions-at-end-section font-outfit">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Settings size={16} className="text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} />
                                        <span>অনুশীলনী প্রশ্নাবলী (Exercises)</span>
                                    </h3>
                                    <div id="questions-at-end-canvas-container" className="space-y-6">
                                        {/* Cloned questions will be dynamically rendered here */}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Zoom controls */}
            <div className={`no-print fixed bottom-6 transition-all duration-300 z-[60] bg-white/90 backdrop-blur border border-slate-200 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-4 ${rightPanelOpen ? 'right-72' : 'right-6'} mr-6 border-b-4 border-b-indigo-500`}>
                <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(Math.max(25, zoom - 10))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <Minus size={16} />
                    </button>
                    <input type="range" min="25" max="200" value={zoom} onChange={e => setZoom(parseInt(e.target.value))} className="w-32 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <Plus size={16} />
                    </button>
                </div>
                <div className="w-[1px] h-6 bg-slate-200" />
                <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-slate-700 w-10 text-center select-none">{zoom}%</span>
                    <button onClick={() => setZoom(100)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600" title="Reset Zoom">
                        <RotateCcw size={12} />
                    </button>
                </div>
            </div>
        </main>
    );
};

export default LecturePaperCanvas;
