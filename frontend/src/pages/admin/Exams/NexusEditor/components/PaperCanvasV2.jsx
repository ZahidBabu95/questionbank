import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import CanvasToolbar from './CanvasToolbar';
import { QuestionBlockNode } from '../extensions/QuestionBlockNode';
import { ResizableImage } from '../extensions/ResizableImageNode';
import { MathNode } from '../extensions/MathNode';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';
import { CustomHeading, CustomParagraph } from '../extensions/CustomNodes';
import CanvasStyleInjector from './CanvasStyleInjector';
import { useCanvasSync } from '../hooks/useCanvasSync';
import { usePageCountObserver } from '../hooks/usePageCountObserver';
import { formatDurationString } from '../../../../../utils/formatUtils';

import katex from 'katex';
import 'katex/dist/katex.min.css';

const formatMathPowers = (html) => {
    if (!html) return '';
    return html.replace(/(<[^>]+>)|(([a-zA-Z0-9\)\}])\^\{?(-?[a-zA-Z0-9.]+)\}?)|(([a-zA-Z0-9\)\}])_\{?(-?[a-zA-Z0-9.]+)\}?)/g, (match, tag, powMatch, powBase, powExp, subMatch, subBase, subVal) => {
        if (tag) return tag;
        if (powMatch) return `${powBase}<sup>${powExp}</sup>`;
        if (subMatch) return `${subBase}<sub>${subVal}</sub>`;
        return match;
    });
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
            console.error("KaTeX error:", e);
            return match;
        }
    });
    
    // Process regular math powers/subscripts on the rest of the text
    processed = formatMathPowers(processed);
    
    // Restore KaTeX rendered blocks
    mathBlocks.forEach(block => {
        processed = processed.replace(block.placeholder, block.html);
    });
    
    return processTabularHTML(processed);
};
const getDisplayQuestionText = (q) => {
    if (!q) return '';
    let text = q.questionText || '';
    
    if (q.stimulus) {
        const cleanStim = q.stimulus.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
        const isStimPlaceholder = cleanStim === '' || 
                                  cleanStim.startsWith('generated question') || 
                                  cleanStim.startsWith('dynamic question') || 
                                  cleanStim.startsWith('ডায়নামিক প্রশ্ন') || 
                                  cleanStim.startsWith('ডায়নামিক প্রশ্ন');
        if (!isStimPlaceholder) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const stem = doc.querySelector('.cq-stem');
                if (stem) {
                    stem.remove();
                    text = doc.body.innerHTML;
                }
            } catch (e) {
                console.error("Failed to strip cq-stem in getDisplayQuestionText:", e);
            }
        }
    }

    const cleanText = text.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    const isPlaceholder = cleanText.startsWith('generated question') || 
                          cleanText.startsWith('dynamic question') || 
                          cleanText.startsWith('ডায়নামিক প্রশ্ন') || 
                          cleanText.startsWith('ডায়নামিক প্রশ্ন') || 
                          cleanText === '';
    if (isPlaceholder) {
        let dynamicData = q.dynamicData;
        if (dynamicData) {
            if (typeof dynamicData === 'string') {
                try {
                    dynamicData = JSON.parse(dynamicData);
                } catch (e) {
                    dynamicData = null;
                }
            }
            if (dynamicData) {
                const keys = ['text', 'question', 'questionText', 'question_text', 'content'];
                for (const key of keys) {
                    const val = dynamicData[key];
                    if (val && typeof val === 'string') {
                        const cleanVal = val.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                        if (cleanVal && !cleanVal.startsWith('generated question') && !cleanVal.startsWith('dynamic question') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন')) {
                            return val;
                        }
                    }
                }
                
                // Fallback for CQ_DESCRIPTIVE/sub_parts
                if (Array.isArray(dynamicData.sub_parts) && dynamicData.sub_parts.length > 0) {
                    const partsTexts = [];
                    dynamicData.sub_parts.forEach((part, pIdx) => {
                        if (part && typeof part === 'object') {
                            const subKeys = ['questionText', 'text', 'question', 'content'];
                            for (const key of subKeys) {
                                const val = part[key];
                                if (val && typeof val === 'string') {
                                    const cleanVal = val.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                                    if (cleanVal && !cleanVal.startsWith('generated question') && !cleanVal.startsWith('dynamic question') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন')) {
                                        const partLabel = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                        partsTexts.push(`(${partLabel}) ${val}`);
                                        break;
                                    }
                                }
                            }
                        }
                    });
                    if (partsTexts.length > 0) {
                        return partsTexts.join(' ');
                    }
                }
            }
        }
        return '';
    }
    return text;
};

const StrictHeaderExtension = Extension.create({
    name: 'strictHeader',
    addProseMirrorPlugins() {
        let dom = null;
        if (typeof document !== 'undefined') {
            dom = document.createElement('div');
            dom.className = 'nexus-native-header-portal-container';
            dom.setAttribute('contenteditable', 'false');
            dom.style.width = '100%';
            dom.style.display = 'block';
            dom.style.userSelect = 'none';
            dom.style.webkitUserSelect = 'none';
        }
        return [
            new Plugin({
                key: new PluginKey('strictHeader'),
                props: {
                    decorations(state) {
                        if (!dom) return DecorationSet.empty;
                        const { doc } = state;
                        const widget = Decoration.widget(0, () => dom, { 
                            key: 'nexus-header-widget',
                            side: -1 
                        });
                        return DecorationSet.create(doc, [widget]);
                    }
                }
            })
        ];
    }
});

const PaperCanvasV2 = React.memo(({ 
    editorMode, rawContent, setRawContent, 
    docSettings, zoom = 100,
    editorConfig = null, workspaceTools = null, onPageCountChange,
    pendingInsertQuestion, onQuestionInserted,
    pendingSwapQuestion, onQuestionSwapped,
    setDocumentQuestions, documentQuestions = [],
    canvasTheme = 'white', uiLang = 'bn', setEditor, setIsEditorLoaded
}) => {
    const s = docSettings || {};
    const lastEditorContentRef = useRef(rawContent);
    const editorUpdateTimeoutRef = useRef(null);
    const extractTimeoutRef = useRef(null);
    const documentQuestionsRef = useRef(documentQuestions);
    
    useEffect(() => {
        documentQuestionsRef.current = documentQuestions;
    }, [documentQuestions]);

    const [headerPortalContainer, setHeaderPortalContainer] = useState(null);

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
            StrictHeaderExtension,
        ],
        content: rawContent || '<p></p>',
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[800px]',
                style: 'width: 100% !important;'
            },
            handleKeyDown: (view, event) => {
                if (view.dom.classList.contains('strict-analytics-mode')) {
                    // Allow navigation and copy
                    const isNav = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key);
                    const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c';
                    if (!isNav && !isCopy) {
                        return true; // prevent default
                    }
                }
                return false;
            },
            handleTextInput: (view) => {
                if (view.dom.classList.contains('strict-analytics-mode')) return true;
                return false;
            },
            handlePaste: (view) => {
                if (view.dom.classList.contains('strict-analytics-mode')) return true;
                return false;
            },
            handleDrop: (view, event, slice, moved) => {
                // Ignore if it's just moving text within the editor
                if (!moved && event.dataTransfer && event.dataTransfer.types.includes('application/json')) {
                    event.preventDefault();
                    try {
                        const payload = event.dataTransfer.getData('application/json');
                        const data = JSON.parse(payload);
                        
                        if (data.type === 'questionBlock') {
                            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                            if (coordinates) {
                                const { schema } = view.state;
                                // Create the node with the dragged data attributes
                                const node = schema.nodes.questionBlock.create(data.attrs);
                                // Insert at drop location
                                const transaction = view.state.tr.insert(coordinates.pos, node);
                                view.dispatch(transaction);
                                // Optional: Update our React state
                                setRawContent(view.state.doc.getHTML());
                                return true;
                            }
                        }
                    } catch (e) {
                        console.error('Drop error:', e);
                    }
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            lastEditorContentRef.current = html;
            const proseMirror = editor.view.dom.querySelector('.ProseMirror') || editor.view.dom;
            const isShuffled = proseMirror.getAttribute('data-is-shuffled') === 'true';
            if (isShuffled) return;

            // Debounce to prevent lag when typing
            if (editorUpdateTimeoutRef.current) clearTimeout(editorUpdateTimeoutRef.current);
            editorUpdateTimeoutRef.current = setTimeout(() => {
                setRawContent(html);
            }, 800);
        }
    });

    useEffect(() => {
        if (editor && setEditor) {
            setEditor(editor);
            if (rawContent && setIsEditorLoaded) {
                setIsEditorLoaded(true);
            }
        }
        return () => {
            if (setEditor) {
                setEditor(null);
            }
        };
    }, [editor, setEditor, rawContent, setIsEditorLoaded]);

    // Handle Mode Switching visually
    useEffect(() => {
        if (editor && !editor.isDestroyed) {
            try {
                if (editor.view && editor.view.dom) {
                    editor.view.dom.classList.toggle('strict-analytics-mode', editorMode === 'STRICT_LINKED');
                }
            } catch (e) {
                // Ignore safe warning if view is not fully mounted on DOM yet
            }
        }
    }, [editor, editorMode]);

    // Extract questions for Document tab and listen for external delete
    useEffect(() => {
        if (!editor) return;
        
        const extractAndDispatch = () => {
            if (extractTimeoutRef.current) clearTimeout(extractTimeoutRef.current);
            extractTimeoutRef.current = setTimeout(() => {
                const qs = [];
                editor.state.doc.descendants((node, pos) => {
                    if (node.type.name === 'questionBlock') {
                        qs.push({ pos, nodeSize: node.nodeSize, attrs: node.attrs });
                    }
                });
                
                const areEqual = (listA, listB) => {
                    if (!listA || !listB) return false;
                    if (listA.length !== listB.length) return false;
                    for (let i = 0; i < listA.length; i++) {
                        const a = listA[i];
                        const b = listB[i];
                        if (a.pos !== b.pos) return false;
                        if (a.nodeSize !== b.nodeSize) return false;
                        if (a.attrs?.questionId !== b.attrs?.questionId) return false;
                        if (a.attrs?.type !== b.attrs?.type) return false;
                        if (a.attrs?.questionNumber !== b.attrs?.questionNumber) return false;
                        if (a.attrs?.alternativeToId !== b.attrs?.alternativeToId) return false;
                        if (a.attrs?.firstInSection !== b.attrs?.firstInSection) return false;
                    }
                    return true;
                };

                if (!areEqual(documentQuestionsRef.current, qs)) {
                    if (setDocumentQuestions) setDocumentQuestions(qs);
                }
            }, 800);
        };
        
        // Initial extraction
        extractAndDispatch();
        
        // Listen to updates
        editor.on('update', extractAndDispatch);

        // Listen for delete requests from Document tab
        const handleDelete = (e) => {
            if (!e.detail) return;
            const { pos, nodeSize } = e.detail;
            // Ensure pos is still valid
            try {
                const tr = editor.state.tr.delete(pos, pos + nodeSize);
                editor.view.dispatch(tr);
            } catch (err) {
                console.error("Failed to delete node:", err);
            }
        };
        window.addEventListener('nexusDeleteNodeRequested', handleDelete);

        return () => {
            editor.off('update', extractAndDispatch);
            window.removeEventListener('nexusDeleteNodeRequested', handleDelete);
            if (extractTimeoutRef.current) clearTimeout(extractTimeoutRef.current);
        };
    }, [editor]);

    // Global cleanup for active timers on unmount
    useEffect(() => {
        return () => {
            if (editorUpdateTimeoutRef.current) clearTimeout(editorUpdateTimeoutRef.current);
            if (extractTimeoutRef.current) clearTimeout(extractTimeoutRef.current);
        };
    }, []);

    // Sync external rawContent changes (e.g., when a Template is clicked)
    useEffect(() => {
        if (editor && rawContent && rawContent !== lastEditorContentRef.current) {
            const timer = setTimeout(() => {
                if (editor && !editor.isDestroyed) {
                    editor.commands.setContent(rawContent);
                    if (setIsEditorLoaded) {
                        setIsEditorLoaded(true);
                    }
                }
            }, 0);
            lastEditorContentRef.current = rawContent;
            return () => clearTimeout(timer);
        }
    }, [rawContent, editor, setIsEditorLoaded]);

    // Handle programmatic insertion of questions from parent (Add to Canvas button)
    useEffect(() => {
        if (editor && pendingInsertQuestion) {
            const { schema } = editor.state;
            const node = schema.nodes.questionBlock.create(pendingInsertQuestion.attrs);
            
            // Try to insert at selection, otherwise append to end
            let pos = editor.state.doc.content.size;
            if (editor.view.hasFocus() && editor.state.selection) {
                pos = editor.state.selection.$head.pos;
            }
            
            const transaction = editor.state.tr.insert(pos, node);
            editor.view.dispatch(transaction);
            
            setRawContent(editor.getHTML());
            
            if (onQuestionInserted) onQuestionInserted();
        }
    }, [pendingInsertQuestion, editor, onQuestionInserted, setRawContent]);

    // Handle programmatic swap of questions from parent
    useEffect(() => {
        if (editor && pendingSwapQuestion) {
            const { schema } = editor.state;
            const node = schema.nodes.questionBlock.create(pendingSwapQuestion.attrs);
            
            const transaction = editor.state.tr.replaceWith(
                pendingSwapQuestion.pos, 
                pendingSwapQuestion.pos + pendingSwapQuestion.nodeSize, 
                node
            );
            editor.view.dispatch(transaction);
            
            setRawContent(editor.getHTML());
            
            if (onQuestionSwapped) onQuestionSwapped();
        }
    }, [pendingSwapQuestion, editor, onQuestionSwapped, setRawContent]);

    // Dynamically apply Question Setup settings to existing question nodes and upgrade legacy headers
    useCanvasSync(editor, s);

    useEffect(() => {
        if (editor) {
            editor.docSettings = s;
            editor.documentQuestions = documentQuestions;
            window.dispatchEvent(new CustomEvent('nexus-editor-rerender'));
        }
    }, [editor, s.activeSet, s.multipleSetsEnabled, s.setMappings, s.showStudentAnswerSheet, documentQuestions]);

    if (!editor) {
        return <div className="animate-pulse h-[800px] bg-slate-100 rounded-lg w-full"></div>;
    }

    // Attach settings to editor instance for ReactNodeViews to access
    editor.docSettings = s;
    editor.documentQuestions = documentQuestions;

    const dimensions = {
        'A4': { w: 794, h: 1123, gap: 0 },
        'Legal': { w: 816, h: 1344, gap: 0 },
        'Letter': { w: 816, h: 1056, gap: 0 },
        'A5': { w: 559, h: 794, gap: 0 },
        'Custom': { w: (s.customW || 210) * 3.7795275591, h: (s.customH || 297) * 3.7795275591, gap: 0 }
    };
    let { w, h, gap } = dimensions[s.pageSize || 'A4'] || dimensions['A4'];
    
    // Handle Orientation
    if (s.orientation === 'landscape') {
        const temp = w;
        w = h;
        h = temp;
    }
    const totalH = h + gap;

    const ptToPx = (pt) => pt * 1.333333;
    const mmToPx = (mm) => mm * 3.7795275591;
    
    useEffect(() => {
        if (!editor || editorMode !== 'STRICT_LINKED') {
            setHeaderPortalContainer(null);
            return;
        }

        const updateContainer = () => {
            const dom = editor.view.dom;
            if (!dom) return;
            const container = dom.querySelector('.nexus-native-header-portal-container');
            setHeaderPortalContainer(container);
        };

        // Run initially
        updateContainer();

        // Listen to all transactions and updates to keep container in sync
        editor.on('transaction', updateContainer);
        editor.on('update', updateContainer);

        return () => {
            editor.off('transaction', updateContainer);
            editor.off('update', updateContainer);
        };
    }, [editor, editorMode]);

    // Handle Editability of editor based on selected set
    useEffect(() => {
        if (!editor) return;
        const count = s.setCount || 4;
        const lang = s.setLanguage || 'BN';
        const setNames = lang === 'EN' 
            ? (count === 2 ? ['A', 'B'] : ['A', 'B', 'C', 'D'])
            : (count === 2 ? ['ক', 'খ'] : ['ক', 'খ', 'গ', 'ঘ']);
        const masterSet = setNames[0] || 'ক';
        
        const isMultipleSets = s.multipleSetsEnabled;
        const currentSet = s.activeSet || masterSet;
        
        const shouldBeReadOnly = isMultipleSets && currentSet !== masterSet;
        
        if (shouldBeReadOnly) {
            editor.setEditable(false);
            editor.view.dom.classList.add('strict-analytics-mode');
        } else {
            editor.setEditable(true);
            editor.view.dom.classList.toggle('strict-analytics-mode', editorMode === 'STRICT_LINKED');
        }
    }, [editor, s.multipleSetsEnabled, s.activeSet, s.setCount, s.setLanguage, editorMode]);

    // Handle Visual Shuffling of MCQ questions in Tiptap DOM using DOM rearrangement
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom;
        if (!dom) return;

        const proseMirror = dom.querySelector('.ProseMirror') || dom;
        
        const count = s.setCount || 4;
        const lang = s.setLanguage || 'BN';
        const setNames = lang === 'EN' 
            ? (count === 2 ? ['A', 'B'] : ['A', 'B', 'C', 'D'])
            : (count === 2 ? ['ক', 'খ'] : ['ক', 'খ', 'গ', 'ঘ']);
        const masterSet = setNames[0] || 'ক';
        
        const isMultipleSets = s.multipleSetsEnabled;
        const currentSet = s.activeSet || masterSet;
        const isShuffledSet = isMultipleSets && currentSet !== masterSet;

        if (!isShuffledSet) {
            // Restore original DOM order if it was previously shuffled
            if (proseMirror.getAttribute('data-is-shuffled') === 'true') {
                const originalQIds = [];
                editor.state.doc.descendants((node) => {
                    if (node.type.name === 'questionBlock') {
                        const qType = node.attrs.type;
                        if (qType === 'MCQ') {
                            originalQIds.push(node.attrs.questionId);
                        }
                    }
                });

                const children = Array.from(proseMirror.children);
                const mcqElements = [];
                const mcqIndices = [];

                children.forEach((child, idx) => {
                    const qBlock = child.getAttribute('questionid')
                        ? child
                        : child.querySelector('[questionid]');
                    
                    if (qBlock) {
                        const qType = qBlock.getAttribute('type') || qBlock.getAttribute('data-qtype') || '';
                        const hasOptions = qBlock.querySelector('.options-grid') || qType === 'MCQ';
                        if (hasOptions) {
                            mcqElements.push({ child, qBlock, originalIdx: idx });
                            mcqIndices.push(idx);
                        }
                    }
                });

                if (mcqElements.length > 0) {
                    const elementMap = {};
                    mcqElements.forEach(item => {
                        const qId = item.qBlock.getAttribute('questionid');
                        if (qId) elementMap[qId] = item.child;
                    });

                    const newChildrenOrder = [...children];
                    originalQIds.forEach((qId, shuffledIdx) => {
                        const childNode = elementMap[qId];
                        const targetIdx = mcqIndices[shuffledIdx];
                        if (childNode && targetIdx !== undefined) {
                            newChildrenOrder[targetIdx] = childNode;
                        }
                    });

                    newChildrenOrder.forEach(child => {
                        proseMirror.appendChild(child);
                    });
                }

                proseMirror.setAttribute('data-is-shuffled', 'false');
                window.dispatchEvent(new CustomEvent('nexus-editor-rerender'));
            }
            return;
        }

        const mappings = s.setMappings || {};
        const setMapping = mappings[currentSet];
        if (!setMapping || !setMapping.questions) return;

        const shuffledQIds = setMapping.questions;
        const children = Array.from(proseMirror.children);

        const mcqElements = [];
        const mcqIndices = [];

        children.forEach((child, idx) => {
            const qBlock = child.getAttribute('questionid')
                ? child
                : child.querySelector('[questionid]');
            
            if (qBlock) {
                const qType = qBlock.getAttribute('type') || qBlock.getAttribute('data-qtype') || '';
                const hasOptions = qBlock.querySelector('.options-grid') || qType === 'MCQ';
                if (hasOptions) {
                    mcqElements.push({ child, qBlock, originalIdx: idx });
                    mcqIndices.push(idx);
                }
            }
        });

        if (mcqElements.length > 0) {
            const elementMap = {};
            mcqElements.forEach(item => {
                const qId = item.qBlock.getAttribute('questionid');
                if (qId) elementMap[qId] = item.child;
            });

            // Reconstruct the children array with shuffled MCQ DOM nodes
            const newChildrenOrder = [...children];
            
            shuffledQIds.forEach((qId, shuffledIdx) => {
                const childNode = elementMap[qId];
                const targetIdx = mcqIndices[shuffledIdx];
                if (childNode && targetIdx !== undefined) {
                    newChildrenOrder[targetIdx] = childNode;
                }
            });

            // Re-append all children to proseMirror in the new shuffled order
            newChildrenOrder.forEach(child => {
                proseMirror.appendChild(child);
            });

            proseMirror.setAttribute('data-is-shuffled', 'true');
        }
    }, [editor, s.multipleSetsEnabled, s.activeSet, s.setMappings, s.setCount, s.setLanguage, rawContent]);

    const borderOffset = s.outerBorder ? (s.outerBorderWidth || 1) * 3 + 12 : 0;
    const paddingTop = mmToPx(s.marginTop || 20) + borderOffset;
    const paddingBottom = mmToPx(s.marginBottom || 20) + borderOffset;
    const paddingLeft = mmToPx(s.marginLeft || 25) + borderOffset;
    const paddingRight = mmToPx(s.marginRight || 20) + borderOffset;

    const containerRef = useRef(null);
    const pageCount = usePageCountObserver(containerRef, editor, totalH, paddingTop, paddingBottom, onPageCountChange);

    const [isDragActive, setIsDragActive] = useState(false);
    useEffect(() => {
        const handleDragStart = () => setIsDragActive(true);
        const handleDragEnd = () => setIsDragActive(false);
        window.addEventListener('nexusDragStarted', handleDragStart);
        window.addEventListener('nexusDragEnded', handleDragEnd);
        return () => {
            window.removeEventListener('nexusDragStarted', handleDragStart);
            window.removeEventListener('nexusDragEnded', handleDragEnd);
        };
    }, []);

    const canvasTextColor = canvasTheme === 'dark' ? '#f1f5f9' : '#000000';
    const canvasBorderColor = canvasTheme === 'dark' ? '#475569' : '#000000';

    // Check workspace tools from user UI settings (default to true)
    const hasMath = workspaceTools?.math ?? true;
    const hasTable = workspaceTools?.table ?? true;
    const hasImage = workspaceTools?.image ?? true;

    const convertDigits = (value, language) => {
        if (value === null || value === undefined) return '';
        let str = value.toString();
        if (language === 'ENGLISH') {
            const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
            str = str.replace(/[০-৯]/g, m => bnToEn[m]);
            str = str.replace(/মিনিট/g, 'Minutes').replace(/ঘণ্টা/g, 'Hours');
        } else {
            const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
            str = str.replace(/[0-9]/g, m => enToBn[m]);
            str = str.replace(/Minutes?/gi, 'মিনিট').replace(/Hours?/gi, 'ঘণ্টা');
        }
        return str;
    };

    return (
        <div id="nexus-editor-root" data-page-cols={s.columns || 1} className="w-full h-full relative flex flex-col items-center">
            
            {/* Dynamic Sticky Toolbar */}
            <CanvasToolbar 
                editor={editor} 
                editorMode={editorMode} 
                hasMath={hasMath} 
                hasTable={hasTable} 
                hasImage={hasImage} 
            />



            {/* Canvas Container */}
            <div 
                className="flex justify-center transition-all duration-300 relative print-canvas-wrapper print:block print:w-full print:m-0 print:p-0" 
                style={{ width: `${w * (zoom / 100)}px`, minHeight: `${(pageCount * totalH) * (zoom / 100)}px` }}
            >
            <div 
                ref={containerRef}
                className={`paper-canvas-container shrink-0 relative origin-top print:block print:m-0 print:p-0 theme-${canvasTheme}`}
                data-outer-border={s.outerBorder ? "true" : "false"}
                style={{ 
                    transform: `scale(${zoom / 100})`, 
                    width: `${w}px`, 
                    height: `${pageCount * totalH}px` 
                }}
            >
            
            {/* Background Pages Array */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none flex flex-col" style={{ gap: `${gap}px` }}>
                {Array.from({ length: pageCount }).map((_, i) => (
                    <div key={i} className="paper-page-background w-full relative overflow-hidden transition-colors duration-300" style={{ 
                        height: `${h}px`,
                        backgroundColor: canvasTheme === 'cream' ? '#fbf0d9' : canvasTheme === 'dark' ? '#1e293b' : '#ffffff',
                        border: s.outerBorder ? `double ${s.outerBorderWidth + 2}px ${canvasBorderColor}` : 'none',
                        borderBottom: editorMode !== 'PRINT_VIEW' && gap === 0 && i < pageCount - 1 ? (canvasTheme === 'dark' ? '1px dashed #475569' : '1px dashed #cbd5e1') : undefined,
                        boxSizing: 'border-box',
                        boxShadow: gap > 0 ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' : (i === 0 ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none')
                    }}>
                        {/* Watermark Overlay per page */}
                        {s.watermark && s.watermark !== "কোনোটি নয়" && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ opacity: s.watermarkOpacity / 100 }}>
                                <div className="transform -rotate-45 text-8xl font-black text-slate-800" style={{ fontFamily: s.enFont }}>
                                    {s.watermark === "কাস্টম" ? s.watermarkCustom : s.watermark === "Confidential" ? "CONFIDENTIAL" : s.institute}
                                </div>
                            </div>
                        )}
                        
                        {/* Page Break / Page Number indicator inside editor - strictly omitted from DOM in PRINT_VIEW mode */}
                        {editorMode !== 'PRINT_VIEW' && i < pageCount - 1 && (
                            <div 
                                data-html2canvas-ignore="true"
                                className="nexus-editor-page-divider-badge absolute bottom-0 left-0 w-full flex items-center justify-between px-6 py-2 select-none pointer-events-none print:hidden z-20" 
                                style={{
                                    borderBottom: canvasTheme === 'dark' ? '2px dashed #475569' : '2px dashed #cbd5e1',
                                    opacity: 0.85
                                }}
                            >
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md shadow-sm border border-slate-100 dark:border-slate-700/50">
                                    {uiLang === 'bn' ? 'পৃষ্ঠা বিভাজক' : 'Page Break'}
                                </span>
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md shadow-sm border border-slate-100 dark:border-slate-700/50">
                                    {uiLang === 'bn' ? `পৃষ্ঠা ${convertDigits(i + 1, 'BANGLA')}` : `Page ${i + 1}`}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Editor Mode Indicator */}
            {editorMode === 'STRICT_LINKED' && (
                <div data-html2canvas-ignore="true" className="absolute -top-4 -right-4 bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm z-50 print:hidden">
                    Database Linked
                </div>
            )}
            
            <div className="relative z-10 h-full w-full paper-content-wrapper" style={{
                paddingTop, paddingBottom, paddingLeft, paddingRight,
                color: canvasTextColor
            }}>
                {/* Render Native Header inside ProseMirror via React Portal */}
                {headerPortalContainer && (() => {
                    const headerLH = s.headerLineHeight !== undefined ? Number(s.headerLineHeight) : 1.2;
                    const safeHeaderLH = s.language === 'ENGLISH' ? headerLH : Math.max(1.25, headerLH);
                    
                    const subHeaderItemMargin = Math.round((headerLH - 0.9) * 10);
                    const rowGapVal = subHeaderItemMargin;
                    const subHeaderMarginBottom = Math.round(8 * headerLH);
                    const candidateMarginTop = Math.round(12 * headerLH);
                    const candItemMargin = Math.round(8 * headerLH);
                    const hasCandidates = !!(s.showName || s.showRoll || s.showReg);
                    const doubleBorderMarginTop = hasCandidates ? Math.round(8 * headerLH) : Math.round(14 * headerLH);
                    const actualHeaderGap = s.headerGap !== undefined ? Number(s.headerGap) : ((s.headerStyle === 'ডাবল বর্ডার' || (s.showDivider && s.dividerStyle === 'double')) ? 12 : 20);

                    return createPortal(
                        <div className="nexus-native-header" style={{
                            fontFamily: s.language === 'ENGLISH' ? (s.enFont || 'Times New Roman') : (s.bnFont || 'Noto Serif Bengali'), 
                            borderBottom: s.headerStyle === 'ডাবল বর্ডার' ? 'none' : 
                                          s.headerStyle === 'বক্স স্টাইল' ? '1px solid ' + canvasBorderColor : 
                                          s.headerStyle === 'থিক টপ লাইন' ? '3px solid ' + canvasBorderColor : 
                                          (s.showDivider ? (s.dividerStyle === 'double' ? 'none' : s.dividerStyle === 'dashed' ? '1px dashed ' + canvasBorderColor : '1px solid ' + canvasBorderColor) : 'none'),
                            borderTop: s.headerStyle === 'থিক টপ লাইন' ? '3px solid ' + canvasBorderColor : 
                                       s.headerStyle === 'বক্স স্টাইল' ? '1px solid ' + canvasBorderColor : 'none',
                            borderLeft: s.headerStyle === 'বক্স স্টাইল' ? '1px solid ' + canvasBorderColor : 'none',
                            borderRight: s.headerStyle === 'বক্স স্টাইল' ? '1px solid ' + canvasBorderColor : 'none',
                            padding: s.headerStyle === 'বক্স স্টাইল' ? '10px' : '0 0 4px 0',
                            marginBottom: actualHeaderGap
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '28px', marginBottom: rowGapVal, width: '100%', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                {/* Left: Subject Code */}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
                                    {(s.showSubjectCode !== false && s.subjectCode) && (
                                        <div style={{display: 'inline-block', border: '1px solid ' + canvasBorderColor, padding: '2px 8px', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                            {s.language === 'ENGLISH' ? 'Sub Code' : 'বিষয় কোড'}: {convertDigits(s.subjectCode, s.language)}
                                        </div>
                                    )}
                                </div>

                                {/* Center: Institute Name */}
                                <div style={{ flex: '0 1 auto', textAlign: 'center', maxWidth: '60%', padding: '0 10px' }}>
                                    {s.showInstitute !== false && (
                                        <div style={{fontSize: ptToPx(s.headerFontSize), fontWeight: s.boldInstitute ? 'bold' : 'normal', wordBreak: 'break-word', lineHeight: safeHeaderLH}}>
                                            {s.institute || 'প্রতিষ্ঠানের নাম'}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Set Code */}
                                <div className="nexus-header-set-code" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                                    {s.multipleSetsEnabled ? (
                                        <div style={{display: 'inline-block', border: '1px solid ' + canvasBorderColor, padding: '2px 8px', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                            {s.language === 'ENGLISH' ? 'Set Code' : 'সেট কোড'}: {s.activeSet || 'ক'}
                                        </div>
                                    ) : (s.showSetCode !== false && s.setCode) && (
                                        <div style={{display: 'inline-block', border: '1px solid ' + canvasBorderColor, padding: '2px 8px', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                            {s.language === 'ENGLISH' ? 'Set Code' : 'সেট কোড'}: {convertDigits(s.setCode, s.language)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{textAlign: 'center', fontSize: ptToPx(s.subHeaderFontSize), fontWeight: s.boldSubject ? 'bold' : 'normal', marginBottom: subHeaderMarginBottom, lineHeight: safeHeaderLH}}>
                                {(s.showBoard !== false && s.board) && (
                                    <div style={{marginBottom: subHeaderItemMargin}}>
                                        {s.board} {s.language === 'ENGLISH' ? 'Board' : 'বอร์ด'}
                                    </div>
                                )}
                                {(s.showExamType !== false || s.showYear !== false) && (
                                    <div style={{marginBottom: subHeaderItemMargin}}>
                                        {[s.showExamType !== false ? s.exam : null, s.showYear !== false ? convertDigits(s.year, s.language) : null].filter(Boolean).join(' - ')}
                                    </div>
                                )}
                                {(s.showClass !== false || s.showSubject !== false || s.showGroup) && (
                                    <div>
                                        {[
                                            s.showClass !== false ? `${s.language === 'ENGLISH' ? 'Class' : 'শ্রেণি'}: ${s.className}` : null,
                                            s.showSubject !== false ? `${s.language === 'ENGLISH' ? 'Subject' : 'বিষয়'}: ${s.subject}` : null,
                                            (s.showGroup && s.group !== 'সাধারণ' && s.group !== 'General') ? `${s.language === 'ENGLISH' ? 'Group' : 'বিভাগ'}: ${s.group}` : null
                                        ].filter(Boolean).join(' | ')}
                                    </div>
                                )}
                            </div>
                            {(s.showTime !== false || s.showTotalMarks !== false) && (
                                <div style={{display:'flex', justifyContent:'space-between', fontSize: ptToPx((s.subHeaderFontSize || 14) * 0.85), fontWeight: 'bold', lineHeight: safeHeaderLH}}>
                                    <span>{s.showTime !== false ? `${s.language === 'ENGLISH' ? 'Time' : 'সময়'}: ${convertDigits(formatDurationString(s.time, s.language), s.language)}` : ''}</span>
                                    <span>{s.showTotalMarks !== false ? `${s.language === 'ENGLISH' ? 'Full Marks' : 'পূর্ণমান'}: ${convertDigits(s.totalMarks, s.language)}` : ''}</span>
                                </div>
                            )}
                            {(s.showName || s.showRoll || s.showReg) && (
                                <div style={{ marginTop: candidateMarginTop, fontSize: ptToPx(s.bodyFontSize) }}>
                                    {s.candidateLayout === 'inline' ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 15, flexWrap: 'wrap' }}>
                                            {s.showName && <div style={{flex: 1}}><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{display:'inline-block', width:'calc(100% - 40px)', borderBottom:'1px dashed ' + canvasBorderColor}}></span></div>}
                                            <div style={{display:'flex', gap: 15, flexShrink: 0}}>
                                                {s.showRoll && <div><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Roll No' : 'রোল নম্বর'}:</span> <span style={{display:'inline-block', width:80, borderBottom:'1px dashed ' + canvasBorderColor}}></span></div>}
                                                {s.showReg && <div><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Reg No' : 'রেজিঃ নম্বর'}:</span> <span style={{display:'inline-block', width:90, borderBottom:'1px dashed ' + canvasBorderColor}}></span></div>}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {s.showName && <div style={{marginBottom: candItemMargin, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{flex: 1, borderBottom:'1px dashed ' + canvasBorderColor}}></span></div>}
                                            {(s.showRoll || s.showReg) && (
                                                <div style={{display:'flex', justifyContent: (s.showRoll && s.showReg) ? 'space-between' : 'flex-start', gap: 40}}>
                                                    {s.showRoll && <div style={{flex: 1, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Roll No' : 'রোল নম্বর'}:</span> <span style={{flex: 1, borderBottom:'1px dashed ' + canvasBorderColor}}></span></div>}
                                                    {s.showReg && <div style={{flex: 1, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Reg No' : 'রেজিঃ নম্বর'}:</span> <span style={{flex: 1, borderBottom:'1px dashed ' + canvasBorderColor}}></span></div>}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            {/* Double line emulation for html2canvas compatibility */}
                            {(s.headerStyle === 'ডাবল বন্টার' || s.headerStyle === 'ডাবল বর্ডার' || (s.headerStyle !== 'বক্স স্টাইল' && s.headerStyle !== 'থিক টপ লাইন' && s.showDivider && s.dividerStyle === 'double')) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginTop: doubleBorderMarginTop, marginBottom: '0px' }}>
                                    <div style={{ borderTop: '1px solid ' + canvasBorderColor, width: '100%', height: '0px' }}></div>
                                    <div style={{ borderTop: '1px solid ' + canvasBorderColor, width: '100%', height: '0px' }}></div>
                                </div>
                            )}
                        </div>,
                        headerPortalContainer
                    );
                })()}
                {/* Tiptap Content */}
                <div className={[
                    (s.includeAnswerSheet && s.ansLayout !== 'compact') ? `show-answers-${s.ansLayout || 'highlighted'}` : '',
                    s.showAnswersInline ? 'show-answers-inline' : '',
                    s.showExplanationInline ? 'show-explanation-inline' : '',
                    s.showSources ? 'show-sources-inline' : ''
                ].filter(Boolean).join(' ')}>
                    <EditorContent editor={editor} />
                </div>

                {/* STUDENT OMR BUBBLE SHEET */}
                {s.showStudentAnswerSheet && (() => {
                    const mcqs = (documentQuestions || []).filter(q => (q.attrs?.type || 'MCQ') === 'MCQ');
                    if (mcqs.length === 0) return null;

                    const numCols = 5;
                    const totalMcq = mcqs.length;
                    const numRows = Math.ceil(totalMcq / numCols);

                    return (
                        <div className="nexus-student-omr-sheet mt-2 pt-2 border-t-2 border-slate-800 break-inside-avoid w-full select-none" style={{ fontFamily: s.fontFamily || 'Kalpurush', boxSizing: 'border-box', columnSpan: 'all', WebkitColumnSpan: 'all' }}>
                            <div className="text-center font-bold mb-1 select-none text-slate-800" style={{ fontSize: '10pt' }}>
                                {s.language === 'ENGLISH' ? 'OMR Answer Sheet' : 'উত্তরপত্র (বহুনির্বাচনি)'}
                            </div>
                            
                            <div className="w-full bg-white rounded-lg border border-slate-300 overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.03)] mb-1">
                                <table className="w-full text-left" style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr className="bg-slate-100/80">
                                            {Array.from({ length: numCols }).map((_, colIdx) => (
                                                <React.Fragment key={colIdx}>
                                                    <th className="py-1 px-1 font-bold text-slate-700 text-center select-none border-b border-r border-slate-300" style={{ width: '4%', fontSize: '8.5pt' }}>
                                                        {s.language === 'ENGLISH' ? 'Q.' : 'প্রশ্ন'}
                                                    </th>
                                                    <th className={`py-1 px-1.5 font-bold text-slate-700 text-center select-none border-b border-slate-300 ${colIdx < numCols - 1 ? 'border-r' : ''}`} style={{ width: '16%', fontSize: '8.5pt' }}>
                                                        {s.language === 'ENGLISH' ? 'Ans.' : 'উত্তর'}
                                                    </th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: numRows }).map((_, rowIdx) => (
                                            <tr key={rowIdx} className="hover:bg-slate-50/40 transition-colors odd:bg-slate-50/10">
                                                {Array.from({ length: numCols }).map((_, colIdx) => {
                                                    const qIndex = colIdx * numRows + rowIdx;
                                                    
                                                    if (qIndex < totalMcq) {
                                                        const mq = mcqs[qIndex];
                                                        const qNum = mq.attrs?.questionNumber || (qIndex + 1);
                                                        const displayNum = mq.attrs?.numberingStyle === 'en' || s.language === 'ENGLISH' 
                                                            ? qNum 
                                                            : convertDigits(qNum, 'BANGLA');

                                                        const mqOptions = mq.attrs?.options || [];
                                                        const optionCount = mqOptions.length > 0 ? mqOptions.length : 4;
                                                        const optStyle = mq.attrs?.optionStyle || (s.language === 'ENGLISH' ? 'en' : 'bn');
                                                        
                                                        return (
                                                            <React.Fragment key={colIdx}>
                                                                <td className={`py-1 px-1 font-bold text-slate-800 text-center select-none border-r border-slate-300 bg-slate-50/20 ${rowIdx < numRows - 1 ? 'border-b border-slate-200' : ''}`} style={{ width: '4%', fontSize: '8.5pt' }}>
                                                                    {displayNum}
                                                                </td>
                                                                <td className={`py-1 px-1.5 text-center ${colIdx < numCols - 1 ? 'border-r border-slate-300' : ''} ${rowIdx < numRows - 1 ? 'border-b border-slate-200' : ''}`} style={{ width: '16%' }}>
                                                                    <div className="flex gap-0.5 justify-center items-center">
                                                                        {Array.from({ length: optionCount }).map((_, oIdx) => {
                                                                            const bubbleLabel = optStyle === 'en' 
                                                                                ? String.fromCharCode(65 + oIdx) // A, B, C, D
                                                                                : optStyle === 'roman'
                                                                                ? ['I', 'II', 'III', 'IV', 'V'][oIdx]
                                                                                : optStyle === 'num_en'
                                                                                ? `${oIdx + 1}`
                                                                                : optStyle === 'num_bn'
                                                                                ? ['১', '২', '৩', '৪', '৫'][oIdx]
                                                                                : ['ক', 'খ', 'গ', 'ঘ', 'ঙ'][oIdx] || String.fromCharCode(2453 + oIdx);

                                                                            return (
                                                                                <svg 
                                                                                    key={oIdx} 
                                                                                    width="14" 
                                                                                    height="14" 
                                                                                    viewBox="0 0 14 14" 
                                                                                    className="select-none"
                                                                                    style={{ display: 'inline-block', verticalAlign: 'middle' }}
                                                                                >
                                                                                    <circle cx="7" cy="7" r="6.2" stroke="#1e293b" strokeWidth="1" fill="none" />
                                                                                    <text 
                                                                                        x="7" 
                                                                                        y="7" 
                                                                                        textAnchor="middle" 
                                                                                        dominantBaseline="central" 
                                                                                        fontSize="7.5px" 
                                                                                        fontWeight="900" 
                                                                                        fill="#1e293b"
                                                                                        style={{ fontFamily: s.fontFamily || 'Kalpurush' }}
                                                                                    >
                                                                                        {bubbleLabel}
                                                                                    </text>
                                                                                </svg>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </td>
                                                            </React.Fragment>
                                                        );
                                                    } else {
                                                        return (
                                                            <React.Fragment key={colIdx}>
                                                                <td className={`py-1 px-1 text-slate-400 bg-slate-50/20 text-center border-r border-slate-300 ${rowIdx < numRows - 1 ? 'border-b border-slate-200' : ''}`} style={{ width: '4%' }}>-</td>
                                                                <td className={`py-1 px-1.5 text-center ${colIdx < numCols - 1 ? 'border-r border-slate-300' : ''} ${rowIdx < numRows - 1 ? 'border-b border-slate-200' : ''}`} style={{ width: '16%' }}>-</td>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()}

                {/* Compact Answer Grid Inline */}
                {s.includeAnswerSheet && s.ansLayout === 'compact' && documentQuestions && documentQuestions.length > 0 && (() => {
                    const mcqQuestions = [];
                    const nonMcqQuestions = [];

                    documentQuestions.forEach((q, i) => {
                        const qType = q.attrs?.type || 'MCQ';
                        const qNum = q.attrs?.questionNumber || (i + 1);
                        const displayNum = q.attrs?.numberingStyle === 'en' || s.language === 'ENGLISH' 
                            ? qNum 
                            : convertDigits(qNum, 'BANGLA');

                        if (qType === 'MCQ') {
                            mcqQuestions.push({ q, index: i, displayNum });
                        } else {
                            nonMcqQuestions.push({ q, index: i, displayNum });
                        }
                    });

                    const numCols = 5;
                    const totalMcq = mcqQuestions.length;
                    const numRows = Math.ceil(totalMcq / numCols);

                    const getOptionLabel = (idx, style = 'bn') => {
                        if (style === 'en') return String.fromCharCode(97 + idx);
                        if (style === 'roman') return ['i', 'ii', 'iii', 'iv', 'v'][idx] || (idx + 1);
                        if (style === 'num_en') return `${idx + 1}`;
                        if (style === 'num_bn') return ['১', '২', '৩', '৪', '৫'][idx] || (idx + 1);
                        return ['ক', 'খ', 'গ', 'ঘ', 'ঙ'][idx] || String.fromCharCode(97 + idx);
                    };

                    return (
                        <div className="nexus-compact-answer-sheet mt-12 pt-6 border-t-2 border-slate-800 break-inside-avoid" style={{ fontFamily: s.fontFamily || 'Kalpurush' }}>
                            <h4 className="text-center font-bold mb-4" style={{ fontSize: ptToPx(s.subHeaderFontSize || 14) }}>
                                {s.language === 'ENGLISH' ? 'Answer Sheet' : 'উত্তরপত্র'}
                            </h4>
                            
                            {/* MCQ Answers Grid Table */}
                            {totalMcq > 0 && (
                                <table className="w-full border-collapse border-2 border-slate-800 text-center text-sm mb-6" style={{ tableLayout: 'fixed', fontSize: ptToPx(s.bodyFontSize || 12) }}>
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-800">
                                            {Array.from({ length: numCols }).map((_, colIdx) => (
                                                <React.Fragment key={colIdx}>
                                                    <th className={`border border-slate-800 py-1 px-1.5 font-bold ${colIdx > 0 ? 'border-l-2' : ''}`} style={{ width: '8%' }}>
                                                        {s.language === 'ENGLISH' ? 'Q.' : 'প্রশ্ন'}
                                                    </th>
                                                    <th className="border border-slate-800 py-1 px-1.5 font-bold" style={{ width: '12%' }}>
                                                        {s.language === 'ENGLISH' ? 'Ans.' : 'উত্তর'}
                                                    </th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: numRows }).map((_, rowIdx) => (
                                            <tr key={rowIdx} className="hover:bg-slate-50 border-b border-slate-800 last:border-b-2">
                                                {Array.from({ length: numCols }).map((_, colIdx) => {
                                                    const qIndex = rowIdx * numCols + colIdx;
                                                    
                                                    if (qIndex < totalMcq) {
                                                        const { q, displayNum } = mcqQuestions[qIndex];
                                                        const options = q.attrs?.options || [];
                                                        const correctOpts = [];
                                                        options.forEach((opt, oi) => {
                                                            if (opt.correct || opt.isCorrect) {
                                                                const optStyle = q.attrs?.optionStyle || 'bn';
                                                                const optLabel = optStyle === 'en' 
                                                                    ? String.fromCharCode(97 + oi) 
                                                                    : optStyle === 'roman'
                                                                    ? ['i', 'ii', 'iii', 'iv', 'v'][oi]
                                                                    : optStyle === 'num_en'
                                                                    ? `${oi + 1}`
                                                                    : optStyle === 'num_bn'
                                                                    ? ['১', '২', '৩', '৪', '৫'][oi]
                                                                    : ['ক', 'খ', 'গ', 'ঘ', 'ঙ'][oi] || String.fromCharCode(2453 + oi);
                                                                correctOpts.push(optLabel);
                                                            }
                                                        });
                                                        const ansText = correctOpts.length > 0 ? correctOpts.join(', ') : 'N/A';
                                                        const qFontSize = q.attrs?.fontSize || s.bodyFontSize || 12;

                                                        return (
                                                            <React.Fragment key={colIdx}>
                                                                <td className={`border border-slate-800 py-1.5 px-1 font-bold text-slate-700 bg-slate-50/50 ${colIdx > 0 ? 'border-l-2' : ''}`} style={{ width: '8%', fontSize: ptToPx(qFontSize) }}>
                                                                    {displayNum}
                                                                </td>
                                                                <td className="border border-slate-800 py-1.5 px-2 font-bold text-slate-900" style={{ width: '12%', fontSize: ptToPx(qFontSize) }} dangerouslySetInnerHTML={{ __html: renderLatexMath(ansText) }} />
                                                            </React.Fragment>
                                                        );
                                                    } else {
                                                        return (
                                                            <React.Fragment key={colIdx}>
                                                                <td className={`border border-slate-800 py-1.5 px-1 bg-slate-50/30 ${colIdx > 0 ? 'border-l-2' : ''}`} style={{ width: '8%' }}>-</td>
                                                                <td className="border border-slate-800 py-1.5 px-2" style={{ width: '12%' }}>-</td>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Non-MCQ Answers List */}
                            {nonMcqQuestions.length > 0 && (
                                <div className="mt-6 space-y-4 text-left">
                                    <h5 className="font-bold border-b border-slate-300 pb-1 text-slate-800" style={{ fontSize: ptToPx(s.subHeaderFontSize || 14) }}>
                                        {s.language === 'ENGLISH' ? 'Short & Broad Questions Answers' : 'সংক্ষিপ্ত ও রচনামূলক প্রশ্নের উত্তর'}
                                    </h5>
                                    <div className="space-y-4">
                                        {nonMcqQuestions.map(({ q, displayNum }) => {
                                            const content = getDisplayQuestionText(q.attrs);
                                            const ansText = q.attrs?.answer || 'N/A';
                                            const qFontSize = q.attrs?.fontSize || s.bodyFontSize || 12;
                                            
                                            let dynamicDataParsed = null;
                                            if (q.attrs?.dynamicData) {
                                                try {
                                                    dynamicDataParsed = typeof q.attrs.dynamicData === 'string'
                                                        ? JSON.parse(q.attrs.dynamicData)
                                                        : q.attrs.dynamicData;
                                                } catch (e) {
                                                    console.error("Failed to parse dynamicData in PaperCanvasV2:", e);
                                                }
                                            }
                                            const hasSubParts = dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.length > 0;

                                            return (
                                                <div key={displayNum} className="border-b border-slate-100 pb-2 last:border-b-0 break-inside-avoid" style={{ fontSize: ptToPx(qFontSize) }}>
                                                    <div className="flex gap-2">
                                                        <span className="font-bold text-slate-700">{displayNum}.</span>
                                                        <div className="font-semibold text-slate-800 inline-block" dangerouslySetInnerHTML={{ __html: renderLatexMath(content) }} />
                                                    </div>
                                                    {hasSubParts ? (
                                                        <div className="pl-6 mt-1.5 space-y-2 text-slate-900 font-bold">
                                                            {dynamicDataParsed.sub_parts.map((part, pIdx) => {
                                                                const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                                                return (
                                                                    <div key={pIdx} className="flex flex-col gap-0.5 pb-1 border-b border-slate-100 last:border-0 last:pb-0">
                                                                        {part.answer && (
                                                                            <div className="flex items-start gap-1 font-bold">
                                                                                <span className="text-xs text-slate-800 font-bold shrink-0">({label}) {s.language === 'ENGLISH' ? 'Ans:' : 'উত্তর:'}</span>
                                                                                <div className="inline font-bold text-slate-900" dangerouslySetInnerHTML={{ __html: renderLatexMath(part.answer) }} />
                                                                            </div>
                                                                        )}
                                                                        {part.explanation && (
                                                                            <div className="flex items-start gap-1 pl-4 text-xs font-normal text-slate-600">
                                                                                <span className="font-semibold shrink-0 text-slate-800">{!part.answer ? `(${label}) ` : ''}{s.language === 'ENGLISH' ? 'Explanation:' : 'ব্যাখ্যা:'}</span>
                                                                                <div className="inline text-slate-700 font-normal" dangerouslySetInnerHTML={{ __html: renderLatexMath(part.explanation) }} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="pl-6 mt-1 text-slate-900 font-bold">
                                                            <span className="text-xs text-slate-500 font-normal mr-1.5">{s.language === 'ENGLISH' ? 'Ans:' : 'উত্তর:'}</span>
                                                            <div className="inline" dangerouslySetInnerHTML={{ __html: renderLatexMath(ansText) }} />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
                
                {/* Print Footer */}
                {s.showFooter && s.footerText && (
                    <div className="hidden print:block fixed bottom-[8mm] left-0 right-0 text-center" style={{ fontSize: ptToPx(10), fontFamily: s.fontFamily || 'Kalpurush', color: '#64748b' }}>
                        {s.footerText}
                    </div>
                )}

                {isDragActive && (
                    <div className="absolute inset-0 bg-indigo-500/10 border-4 border-dashed border-indigo-500 rounded-lg pointer-events-none z-[999] flex items-center justify-center animate-pulse">
                        <div className="bg-indigo-600 text-white font-extrabold text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-indigo-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
                            {uiLang === 'bn' ? 'প্রশ্নটি ক্যানভাসে ড্রপ করুন' : 'Drop Question here to insert'}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom CSS for Tiptap in Paper Engine */}
            <CanvasStyleInjector s={s} ptToPx={ptToPx} mmToPx={mmToPx} />
        </div>
        </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.editorMode === nextProps.editorMode &&
        prevProps.rawContent === nextProps.rawContent &&
        prevProps.docSettings === nextProps.docSettings &&
        prevProps.zoom === nextProps.zoom &&
        prevProps.canvasTheme === nextProps.canvasTheme &&
        prevProps.uiLang === nextProps.uiLang &&
        prevProps.workspaceTools === nextProps.workspaceTools &&
        prevProps.editorConfig === nextProps.editorConfig &&
        prevProps.pendingInsertQuestion === nextProps.pendingInsertQuestion &&
        prevProps.pendingSwapQuestion === nextProps.pendingSwapQuestion &&
        prevProps.documentQuestions === nextProps.documentQuestions &&
        prevProps.setEditor === nextProps.setEditor
    );
});

export default PaperCanvasV2;
