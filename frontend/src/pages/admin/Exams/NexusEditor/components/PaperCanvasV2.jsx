import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { QuestionBlockNode } from '../extensions/QuestionBlockNode';
import { ResizableImage } from '../extensions/ResizableImageNode';
import { MathNode } from '../extensions/MathNode';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, Sigma, Image as ImageIcon, Table as TableIcon } from 'lucide-react';
import Heading from '@tiptap/extension-heading';
import Paragraph from '@tiptap/extension-paragraph';

// Custom Extensions to preserve custom attributes for section toggling
const CustomHeading = Heading.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            'data-section-id': {
                default: null,
                parseHTML: element => element.getAttribute('data-section-id'),
                renderHTML: attributes => {
                    if (!attributes['data-section-id']) return {};
                    return { 'data-section-id': attributes['data-section-id'] };
                }
            },
            class: {
                default: null,
                parseHTML: element => element.getAttribute('class'),
                renderHTML: attributes => {
                    if (!attributes.class) return {};
                    return { class: attributes.class };
                }
            }
        }
    }
});

const CustomParagraph = Paragraph.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            'data-section-id': {
                default: null,
                parseHTML: element => element.getAttribute('data-section-id'),
                renderHTML: attributes => {
                    if (!attributes['data-section-id']) return {};
                    return { 'data-section-id': attributes['data-section-id'] };
                }
            },
            class: {
                default: null,
                parseHTML: element => element.getAttribute('class'),
                renderHTML: attributes => {
                    if (!attributes.class) return {};
                    return { class: attributes.class };
                }
            }
        }
    }
});

// Custom Extension to handle "Locked Question Blocks" in Strict Mode
// In future, this will be expanded to a NodeView to render CQ/MCQ UI
const PaperCanvasV2 = ({ 
    editorMode, rawContent, setRawContent, 
    docSettings, zoom = 100,
    editorConfig = null, workspaceTools = null, onPageCountChange,
    pendingInsertQuestion, onQuestionInserted,
    pendingSwapQuestion, onQuestionSwapped,
    setDocumentQuestions, documentQuestions = []
}) => {
    const s = docSettings || {};

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
            // Debounce to prevent lag when typing
            if (window.editorUpdateTimeout) clearTimeout(window.editorUpdateTimeout);
            window.editorUpdateTimeout = setTimeout(() => {
                setRawContent(editor.getHTML());
            }, 800);
        },
    });

    // Handle Mode Switching visually
    useEffect(() => {
        if (editor) {
            editor.view.dom.classList.toggle('strict-analytics-mode', editorMode === 'STRICT_LINKED');
        }
    }, [editor, editorMode]);

    // Extract questions for Document tab and listen for external delete
    useEffect(() => {
        if (!editor) return;
        
        const extractAndDispatch = () => {
            const qs = [];
            editor.state.doc.descendants((node, pos) => {
                if (node.type.name === 'questionBlock') {
                    qs.push({ pos, nodeSize: node.nodeSize, attrs: node.attrs });
                }
            });
            if (setDocumentQuestions) setDocumentQuestions(qs);
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
        };
    }, [editor]);

    // Sync external rawContent changes (e.g., when a Template is clicked)
    useEffect(() => {
        if (editor && rawContent && rawContent !== editor.getHTML()) {
            editor.commands.setContent(rawContent);
        }
    }, [rawContent, editor]);

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

    const prevFormatHashRef = useRef(null);
    const syncTimeoutRef = useRef(null);

    // Dynamically apply Question Setup settings to existing question nodes and upgrade legacy headers
    useEffect(() => {
        if (!editor || !s.sections) return;
        
        // --- 1. Detect if Legacy Upgrade is needed ---
        let needsLegacyUpgrade = false;
        editor.state.doc.descendants((node) => {
            if (node.type.name === 'heading' && !node.attrs['data-section-id']) {
                needsLegacyUpgrade = true;
            }
        });
        
        // --- 2. Update Question Node Attributes & Section Text ---
        // Create a hash of ONLY the properties that require a full document traversal
        const formatHash = JSON.stringify({
            sections: s.sections.map(sec => ({
                id: sec.id,
                name: sec.name,
                inst: sec.instructions,
                cond: sec.conditions,
                ns: sec.numberingStyle,
                mc: sec.marksConfig,
                ol: sec.optionLayout,
                od: sec.optionDecoration,
                fs: sec.fontSize,
                lg: sec.lineGap,
                og: sec.optionGap,
                qg: sec.questionGap,
                ta: sec.textAlign,
                cols: sec.columns
            })),
            bodyFs: s.bodyFontSize,
            lineH: s.lineHeight,
            qGap: s.questionGap
        });
        
        // If formatting hasn't changed AND no legacy upgrade needed, skip the heavy traversal
        if (prevFormatHashRef.current === formatHash && !needsLegacyUpgrade) {
            return;
        }
        prevFormatHashRef.current = formatHash;

        const mcqSec = s.sections.find(sec => sec.isMCQ);
        const cqSec = s.sections.find(sec => !sec.isMCQ);

        // Use setTimeout to unblock the UI thread immediately (fixes dropdown lag)
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
            const updates = [];
            let currentSecId = null;
            const processed = { names: new Set(), instructions: new Set(), conditions: new Set() };
            
            // Single document traversal
            editor.state.doc.descendants((node, pos) => {
                // 1. Legacy Upgrade Logic (Headers without section ID)
                if (node.type.name === 'heading' && !node.attrs['data-section-id']) {
                    // Fast skip: assume legacy upgrades are already handled by other mechanisms
                    // or handled individually. For safety, we just skip here if not set.
                } 
                // 2. Track Active Section ID
                else if (node.type.name === 'heading' && node.attrs['data-section-id']) {
                    currentSecId = node.attrs['data-section-id'];
                }

                // 3. Sync Question Node Attributes
                if (node.type.name === 'questionBlock') {
                    const targetSec = s.sections.find(sec => sec.id === currentSecId) || (node.attrs.type === 'MCQ' ? mcqSec : cqSec);
                    
                    if (targetSec) {
                        let needsUpdate = false;
                        const changes = {};
                        
                        const ns = targetSec.numberingStyle || 'bn';
                        const mc = targetSec.marksConfig || 'hide';
                        const ol = targetSec.optionLayout || 'col1';
                        const os = targetSec.optionStyle || 'bn';
                        const od = targetSec.optionDecoration || 'rightBracket';

                        if (node.attrs.numberingStyle !== ns) { changes.numberingStyle = ns; needsUpdate = true; }
                        if (node.attrs.marksConfig !== mc) { changes.marksConfig = mc; needsUpdate = true; }
                        if (node.attrs.optionLayout !== ol) { changes.optionLayout = ol; needsUpdate = true; }
                        if (node.attrs.optionStyle !== os) { changes.optionStyle = os; needsUpdate = true; }
                        if (node.attrs.optionDecoration !== od) { changes.optionDecoration = od; needsUpdate = true; }
                        
                        // Layout & Typography sync
                        const fSize = targetSec.fontSize !== undefined && targetSec.fontSize !== '' ? targetSec.fontSize : s.bodyFontSize;
                        const lGap = targetSec.lineGap !== undefined && targetSec.lineGap !== '' ? targetSec.lineGap : s.lineHeight;
                        const oGap = targetSec.optionGap !== undefined && targetSec.optionGap !== '' ? targetSec.optionGap : null;
                        const qGap = targetSec.questionGap !== undefined && targetSec.questionGap !== '' ? targetSec.questionGap : s.questionGap;
                        const tAlign = targetSec.textAlign || 'left';
                        
                        if (node.attrs.fontSize != fSize) { changes.fontSize = fSize; needsUpdate = true; }
                        if (node.attrs.lineGap != lGap) { changes.lineGap = lGap; needsUpdate = true; }
                        if (node.attrs.optionGap != oGap) { changes.optionGap = oGap; needsUpdate = true; }
                        if (node.attrs.questionGap != qGap) { changes.questionGap = qGap; needsUpdate = true; }
                        if (node.attrs.textAlign != tAlign) { changes.textAlign = tAlign; needsUpdate = true; }
                        
                        if (needsUpdate) {
                            updates.push({ pos, type: 'attrs', changes });
                        }
                    }
                    return false; // skip children of question block
                } 
                // 4. Sync Section Text (Instructions, Conditions, Names)
                else if (node.attrs && node.attrs['data-section-id']) {
                    const secId = node.attrs['data-section-id'];
                    currentSecId = secId;
                    const targetSec = s.sections.find(sec => sec.id === secId);
                    
                    if (targetSec) {
                        const nodeClass = node.attrs.class || '';
                        let targetText = null;
                        let nodeTypeKey = null;
                        
                        if (node.type.name === 'heading' && nodeClass.includes('section-name')) {
                            targetText = targetSec.name || '';
                            nodeTypeKey = 'names';
                        } else if (node.type.name === 'paragraph' && nodeClass.includes('section-instructions')) {
                            targetText = targetSec.instructions || '';
                            nodeTypeKey = 'instructions';
                        } else if (node.type.name === 'paragraph' && nodeClass.includes('section-conditions')) {
                            targetText = targetSec.conditions ? `[${targetSec.conditions}]` : '';
                            nodeTypeKey = 'conditions';
                        }
                        
                        if (nodeTypeKey) {
                            if (processed[nodeTypeKey].has(secId)) {
                                // This is a duplicate node. Mark for deletion.
                                updates.push({ pos, type: 'delete', nodeSize: node.nodeSize });
                                return false;
                            }
                            processed[nodeTypeKey].add(secId);
                            
                            if (targetText !== null && node.textContent !== targetText) {
                                updates.push({ pos, type: 'text', text: targetText, node });
                            }
                            return false; // skip children
                        }
                    }
                }
            });

            if (updates.length > 0) {
                // Apply updates in reverse order of position to avoid mapping issues
                updates.sort((a, b) => b.pos - a.pos);
                
                let tr = editor.state.tr;
                updates.forEach(update => {
                    if (update.type === 'delete') {
                        tr = tr.delete(update.pos, update.pos + update.nodeSize);
                    } else if (update.type === 'attrs') {
                        const currentNode = tr.doc.nodeAt(update.pos);
                        if (currentNode) {
                            tr = tr.setNodeMarkup(update.pos, undefined, { ...currentNode.attrs, ...update.changes });
                        }
                    } else if (update.type === 'text') {
                        const newContent = update.text ? [editor.schema.text(update.text)] : [];
                        const newNode = editor.schema.nodes[update.node.type.name].create(update.node.attrs, newContent);
                        tr = tr.replaceWith(update.pos, update.pos + update.node.nodeSize, newNode);
                    }
                });
                editor.view.dispatch(tr);
            }
        }, 300);
    }, [s.sections, editor]);

    if (!editor) {
        return <div className="animate-pulse h-[800px] bg-slate-100 rounded-lg w-full"></div>;
    }

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
    
    const paddingTop = mmToPx(s.marginTop || 20);
    const paddingBottom = mmToPx(s.marginBottom || 20);
    const paddingLeft = mmToPx(s.marginLeft || 25);
    const paddingRight = mmToPx(s.marginRight || 20);

    const [pageCount, setPageCount] = useState(1);
    
    useEffect(() => {
        if (onPageCountChange) {
            onPageCountChange(pageCount);
        }
    }, [pageCount, onPageCountChange]);

    const containerRef = useRef(null);

    // Observer to calculate how many physical pages are needed and enforce page breaks
    useEffect(() => {
        if (!containerRef.current || !editor) return;

        const pm = containerRef.current.querySelector('.ProseMirror');
        if (!pm) return;

        let resizeTimer;
        const observer = new ResizeObserver((entries) => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // Determine the total scrollable height of the Tiptap editor
                // Add paddingTop and paddingBottom to the scroll height to get the total height needed
                const pmScrollH = pm.scrollHeight;
                const totalContentH = pmScrollH + paddingTop + paddingBottom;
                
                // Calculate how many physical pages are needed based on total height including gaps
                const calculatedPages = Math.max(1, Math.ceil(totalContentH / totalH));
                setPageCount(prev => {
                    if (prev !== calculatedPages) {
                        if (onPageCountChange) onPageCountChange(calculatedPages);
                        return calculatedPages;
                    }
                    return prev;
                });
            }, 150); // slight debounce
        });
        
        observer.observe(pm);
        return () => {
            observer.disconnect();
            clearTimeout(resizeTimer);
        };
    }, [totalH, paddingTop, paddingBottom, editor]);


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
        <div className="w-full h-full relative flex flex-col items-center">
            
            {/* Dynamic Sticky Toolbar */}
            {editorMode === 'DISCONNECTED_FREE_EDIT' && (
                <div className="sticky top-4 z-[100] mb-6 bg-white border border-slate-200 shadow-xl rounded-xl p-2 flex items-center justify-between w-full max-w-[800px]">
                    <div className="flex items-center gap-1">
                        <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-lg transition-all ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Bold size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg transition-all ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Italic size={16} /></button>
                        <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded-lg transition-all ${editor.isActive('underline') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><UnderlineIcon size={16} /></button>
                        
                        <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
                        
                        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded-lg transition-all ${editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><AlignLeft size={16} /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded-lg transition-all ${editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><AlignCenter size={16} /></button>
                        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-2 rounded-lg transition-all ${editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><AlignRight size={16} /></button>

                        {(hasMath || hasTable || hasImage) && <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>}
                        
                        {hasMath && <button onClick={() => editor.chain().focus().insertContent('<span data-type="math"></span>').run()} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all" title="Insert Math Formula"><Sigma size={16} /></button>}
                        {hasTable && <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all" title="Insert Table"><TableIcon size={16} /></button>}
                        {hasImage && <button onClick={() => { const url = window.prompt("Enter image URL:"); if (url) editor.chain().focus().setImage({ src: url }).run(); }} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all" title="Upload Image"><ImageIcon size={16} /></button>}
                    </div>
                </div>
            )}



            {/* Canvas Container */}
            <div 
                className="flex justify-center transition-all duration-300 relative print-canvas-wrapper print:block print:w-full print:m-0 print:p-0" 
                style={{ width: `${w * (zoom / 100)}px`, minHeight: `${(pageCount * totalH) * (zoom / 100)}px` }}
            >
            <div 
                ref={containerRef}
                className="paper-canvas-container relative origin-top-left print:block print:m-0 print:p-0" 
                style={{ 
                    transform: `scale(${zoom / 100})`, 
                    width: `${w}px`, 
                    height: `${pageCount * totalH}px` 
                }}
            >
            
            {/* Background Pages Array */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none flex flex-col" style={{ gap: `${gap}px` }}>
                {Array.from({ length: pageCount }).map((_, i) => (
                    <div key={i} className="bg-white w-full relative overflow-hidden" style={{ 
                        height: `${h}px`,
                        border: s.outerBorder ? `${s.outerBorderWidth}px solid #000` : 'none',
                        borderBottom: gap === 0 && i < pageCount - 1 ? '1px dashed #cbd5e1' : undefined,
                        margin: s.outerBorder ? `${s.outerBorderWidth}px` : '0',
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
                    </div>
                ))}
            </div>

            {/* Editor Mode Indicator */}
            {editorMode === 'STRICT_LINKED' && (
                <div className="absolute -top-4 -right-4 bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm z-50 print:hidden">
                    Database Linked
                </div>
            )}
            
            <div className="relative z-10 h-full w-full paper-content-wrapper" style={{
                paddingTop, paddingBottom, paddingLeft, paddingRight
            }}>
                {/* Native Header for Strict Mode */}
                {editorMode === 'STRICT_LINKED' && (
                    <div style={{
                        fontFamily: s.bnFont, 
                        borderBottom: s.headerStyle === 'ডাবল বর্ডার' ? '3px double #000' : 
                                      s.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 
                                      s.headerStyle === 'থিক টপ লাইন' ? '3px solid #000' : 
                                      (s.showDivider ? (s.dividerStyle === 'double' ? '3px double #000' : s.dividerStyle === 'dashed' ? '1px dashed #000' : '1px solid #000') : 'none'),
                        borderTop: s.headerStyle === 'থিক টপ লাইন' ? '3px solid #000' : 
                                   s.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                        borderLeft: s.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                        borderRight: s.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                        padding: s.headerStyle === 'বক্স স্টাইল' ? '10px' : '0 0 10px 0',
                        marginBottom: 20
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '28px', marginBottom: 4, width: '100%' }}>
                            {/* Left: Subject Code */}
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
                                {(s.showSubjectCode !== false && s.subjectCode) && (
                                    <div style={{display: 'inline-block', border: '1px solid #000', padding: '2px 8px', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                        {s.language === 'ENGLISH' ? 'Sub Code' : 'বিষয় কোড'}: {convertDigits(s.subjectCode, s.language)}
                                    </div>
                                )}
                            </div>

                            {/* Center: Institute Name */}
                            <div style={{ flex: '0 1 auto', textAlign: 'center', maxWidth: '60%', padding: '0 10px' }}>
                                {s.showInstitute !== false && (
                                    <div style={{fontSize: ptToPx(s.headerFontSize), fontWeight: s.boldInstitute ? 'bold' : 'normal', wordBreak: 'break-word', lineHeight: 1.2}}>
                                        {s.institute || 'প্রতিষ্ঠানের নাম'}
                                    </div>
                                )}
                            </div>

                            {/* Right: Set Code */}
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                                {(s.showSetCode !== false && s.setCode) && (
                                    <div style={{display: 'inline-block', border: '1px solid #000', padding: '2px 8px', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                        {s.language === 'ENGLISH' ? 'Set Code' : 'সেট কোড'}: {convertDigits(s.setCode, s.language)}
                                    </div>
                                )}
                            </div>
                        </div>
                            <div style={{textAlign: 'center', fontSize: ptToPx(s.subHeaderFontSize), fontWeight: s.boldSubject ? 'bold' : 'normal', marginBottom: 8}}>
                                {(s.showBoard !== false && s.board) && (
                                    <div style={{marginBottom: 2}}>
                                        {s.board} {s.language === 'ENGLISH' ? 'Board' : 'বোর্ড'}
                                    </div>
                                )}
                                {(s.showExamType !== false || s.showYear !== false) && (
                                    <div>
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
                                <div style={{display:'flex', justifyContent:'space-between', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold'}}>
                                    <span>{s.showTime !== false ? `${s.language === 'ENGLISH' ? 'Time' : 'সময়'}: ${convertDigits(s.time, s.language)}` : ''}</span>
                                    <span>{s.showTotalMarks !== false ? `${s.language === 'ENGLISH' ? 'Full Marks' : 'পূর্ণমান'}: ${convertDigits(s.totalMarks, s.language)}` : ''}</span>
                                </div>
                            )}
                        {(s.showName || s.showRoll || s.showReg) && (
                            <div style={{ marginTop: 12, fontSize: ptToPx(s.bodyFontSize) }}>
                                {s.candidateLayout === 'inline' ? (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 15 }}>
                                        {s.showName && <div style={{flex: 1}}><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{display:'inline-block', width:'calc(100% - 40px)', borderBottom:'1px dashed #000'}}></span></div>}
                                        <div style={{display:'flex', gap: 15, flexShrink: 0}}>
                                            {s.showRoll && <div><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Roll No' : 'রোল নম্বর'}:</span> <span style={{display:'inline-block', width:80, borderBottom:'1px dashed #000'}}></span></div>}
                                            {s.showReg && <div><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Reg No' : 'রেজিঃ নম্বর'}:</span> <span style={{display:'inline-block', width:90, borderBottom:'1px dashed #000'}}></span></div>}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {s.showName && <div style={{marginBottom: 8, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                        {(s.showRoll || s.showReg) && (
                                            <div style={{display:'flex', justifyContent: (s.showRoll && s.showReg) ? 'space-between' : 'flex-start', gap: 40}}>
                                                {s.showRoll && <div style={{flex: 1, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Roll No' : 'রোল নম্বর'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                                {s.showReg && <div style={{flex: 1, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Reg No' : 'রেজিঃ নম্বর'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {/* Tiptap Content */}
                <div className={s.includeAnswerSheet ? `show-answers-${s.ansLayout || 'highlighted'}` : ''}>
                    <EditorContent editor={editor} />
                </div>

                {/* Compact Answer Grid Inline */}
                {s.includeAnswerSheet && s.ansLayout === 'compact' && documentQuestions && documentQuestions.length > 0 && (
                    <div className="mt-12 pt-6 border-t-2 border-slate-800 break-inside-avoid print:break-before-page" style={{ fontFamily: s.fontFamily || 'Kalpurush' }}>
                        <h4 className="text-center font-bold mb-4" style={{ fontSize: ptToPx(s.subHeaderFontSize || 14) }}>
                            {s.language === 'ENGLISH' ? 'Answer Sheet' : 'উত্তরপত্র'}
                        </h4>
                        <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm" style={{ fontSize: ptToPx(s.bodyFontSize || 12) }}>
                            {documentQuestions.map((q, i) => {
                                const qType = q.attrs?.type || 'MCQ';
                                const options = q.attrs?.options || [];
                                let ansText = '';

                                if (qType === 'MCQ' && options && Array.isArray(options)) {
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
                                    ansText = correctOpts.length > 0 ? correctOpts.join(', ') : 'N/A';
                                } else {
                                    ansText = q.attrs?.answer || 'N/A';
                                }

                                const qNumber = q.attrs?.numberingStyle === 'en' || s.language === 'ENGLISH' 
                                    ? (i + 1) 
                                    : convertDigits(i + 1, 'BANGLA');

                                return (
                                    <div key={i} className="flex items-start gap-1">
                                        <span className="font-bold shrink-0">{qNumber}.</span>
                                        <span className="font-bold" dangerouslySetInnerHTML={{ __html: ansText }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Custom CSS for Tiptap in Paper Engine */}
            <style dangerouslySetInnerHTML={{ __html: `
                .strict-analytics-mode {
                    caret-color: transparent !important;
                    user-select: none !important;
                    -webkit-user-select: none !important;
                }
                .strict-analytics-mode [data-section-id] {
                    pointer-events: none !important;
                }
                .strict-analytics-mode p, .strict-analytics-mode h3 {
                    cursor: default !important;
                }
                
                .ProseMirror {
                    font-family: '${s.language === 'ENGLISH' ? (s.enFont || 'Times New Roman') : (s.bnFont || 'Noto Serif Bengali')}', sans-serif;
                    font-size: ${ptToPx(s.bodyFontSize)}px;
                    line-height: ${s.lineHeight};
                    width: 100% !important;
                    background-color: transparent !important;
                    box-sizing: border-box;
                    outline: none;
                    margin: 0 !important;
                    padding: 0 !important;
                    
                    /* Editor View is forced to 1-column to guarantee accurate vertical page breaks and reading order. */
                    ${Math.max(s.columns || 1, ...(s.sections || []).map(sec => sec.columns || 1)) > 1 ? `
                    /* Column Support */
                    column-count: ${Math.max(s.columns || 1, ...(s.sections || []).map(sec => sec.columns || 1))};
                    column-gap: ${mmToPx((s.sections || []).find(sec => sec.columns > 1 && sec.colGap)?.colGap || s.colGap || 10)}px;
                    ${(s.sections || []).some(sec => sec.columns > 1 && sec.columnBorder) || s.columns > 1 ? 'column-rule: 1px solid #000000;' : ''}
                    ` : ''}
                    
                    counter-reset: question-counter;
                }
                .ProseMirror:focus {
                    outline: none;
                }
                
                /* Inline Answer Sheet Marking */
                .show-answers-highlighted .nexus-correct-option {
                    background-color: #f0fdf4 !important;
                    outline: 1.5px solid #86efac;
                    border-radius: 3px;
                    position: relative;
                    padding-right: 24px !important;
                }
                .show-answers-highlighted .nexus-correct-option::after {
                    content: '✔';
                    position: absolute;
                    right: 6px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #16a34a;
                    font-size: 14px;
                    font-weight: bold;
                }
                
                .show-answers-detailed .nexus-detailed-answer-block {
                    display: block !important;
                }
                
                /* Compact Answer Sheet Marking */
                .show-answers-compact .ProseMirror {
                    column-count: 4 !important;
                    column-gap: 20px !important;
                }
                .show-answers-compact [data-type="question-block"] {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    padding-left: 2.6em !important;
                    margin-bottom: 12px !important;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                .show-answers-compact [data-type="question-block"]::before {
                    position: absolute;
                    left: 0;
                    top: 50%;
                    transform: translateY(-50%);
                }
                .show-answers-compact [data-type="question-block"] > .relative.transition-all,
                .show-answers-compact .nexus-question-wrapper > .nexus-question-content,
                .show-answers-compact [data-type="question-block"] > .options-grid {
                    display: none !important;
                }
                
                .show-answers-compact .nexus-detailed-answer-block {
                    display: block !important;
                    margin-top: 0 !important;
                }
                .show-answers-compact .nexus-detailed-answer-block .explanation-block {
                    display: none !important;
                }
                .show-answers-compact .nexus-detailed-answer-block .answer-label-text {
                    display: none !important;
                }

                /* Dynamic Section Display Toggles & Styles */
                ${(s.sections || []).map(sec => `
                    ${sec.showName === false ? `[data-section-id="${sec.id}"].section-name { display: none !important; }` : `
                        [data-section-id="${sec.id}"].section-name {
                            font-weight: ${sec.nameBold !== false ? 'bold' : 'normal'} !important;
                            font-style: ${sec.nameItalic ? 'italic' : 'normal'};
                            text-decoration: ${sec.nameUnderline ? 'underline' : 'none'};
                            ${sec.nameFontSize ? `font-size: ${sec.nameFontSize}px !important;` : ''}
                            
                            /* Global Section Style Override */
                            ${s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড' ? 'background-color: #000000 !important; color: #ffffff !important; padding: 6px 10px; border-radius: 4px; display: block;' : 
                              s.sectionStyle === 'বর্ডার বক্স' ? 'border: 1px solid #000000 !important; padding: 6px 10px; border-radius: 4px; display: block;' : 
                              s.sectionStyle === 'আন্ডারলাইন' ? 'border-bottom: 1px solid #000000 !important; padding-bottom: 6px; display: block;' : 
                              s.sectionStyle === 'ডটেড লাইন' ? 'border-bottom: 1px dotted #000000 !important; padding-bottom: 6px; display: block;' : 
                              ''}
                              
                            /* Fallback to individual section settings */
                            ${(!s.sectionStyle || s.sectionStyle === 'সাধারণ') ? `
                                ${sec.nameBg ? `background-color: #000000 !important; color: #ffffff !important; padding: 6px 10px; border-radius: 4px; display: block;` : ''}
                                ${sec.nameDivider ? `border-bottom: 1px solid #000000; padding-bottom: 6px; display: block;` : ''}
                            ` : ''}
                            
                            ${sec.nameGap ? `margin-bottom: ${sec.nameGap}px !important; display: block;` : ''}
                        }
                        [data-section-id="${sec.id}"].section-name * {
                            ${s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড' || sec.nameBg ? `color: #ffffff !important;` : ''}
                        }
                    `}
                    ${sec.showConditions === false ? `[data-section-id="${sec.id}"].section-conditions { display: none !important; }` : `
                        [data-section-id="${sec.id}"].section-conditions {
                            font-weight: ${sec.condBold ? 'bold' : 'normal'};
                            font-style: ${sec.condItalic ? 'italic' : 'normal'};
                            text-decoration: ${sec.condUnderline ? 'underline' : 'none'};
                            ${sec.condFontSize ? `font-size: ${sec.condFontSize}px !important;` : ''}
                            ${sec.condBg ? `background-color: #000000 !important; color: #ffffff !important; padding: 6px 10px; border-radius: 4px; display: block;` : ''}
                            ${sec.condDivider ? `border-bottom: 1px solid #000000; padding-bottom: 6px; display: block;` : ''}
                            ${sec.condGap ? `margin-bottom: ${sec.condGap}px !important; display: block;` : ''}
                        }
                        [data-section-id="${sec.id}"].section-conditions * {
                            ${sec.condBg ? `color: #ffffff !important;` : ''}
                        }
                    `}
                    ${sec.showInstructions === false ? `[data-section-id="${sec.id}"].section-instructions { display: none !important; }` : `
                        [data-section-id="${sec.id}"].section-instructions {
                            font-weight: ${sec.instBold ? 'bold' : 'normal'};
                            font-style: ${sec.instItalic ? 'italic' : 'normal'};
                            text-decoration: ${sec.instUnderline ? 'underline' : 'none'};
                            ${sec.instFontSize ? `font-size: ${sec.instFontSize}px !important;` : ''}
                            ${sec.instBg ? `background-color: #000000 !important; color: #ffffff !important; padding: 6px 10px; border-radius: 4px; display: block;` : ''}
                            ${sec.instDivider ? `border-bottom: 1px solid #000000; padding-bottom: 6px; display: block;` : ''}
                            ${sec.instGap ? `margin-bottom: ${sec.instGap}px !important; display: block;` : ''}
                            line-height: ${Math.max(1.0, Number(sec.lineGap !== undefined && sec.lineGap !== '' ? sec.lineGap : (s.lineHeight || 1.5)))} !important;
                        }
                        [data-section-id="${sec.id}"].section-instructions * {
                            ${sec.instBg ? `color: #ffffff !important;` : ''}
                        }
                    `}
                    
                    /* Apply column-span to simple headers instead to avoid Chrome crashes */
                    [data-section-id="${sec.id}"] {
                        column-span: all;
                        line-height: ${Math.max(1.0, Number(sec.lineGap !== undefined && sec.lineGap !== '' ? sec.lineGap : (s.lineHeight || 1.5)))} !important;
                    }
                    
                    /* Hide Empty Nodes */
                    [data-section-id="${sec.id}"].section-conditions:empty,
                    [data-section-id="${sec.id}"].section-instructions:empty {
                        display: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Per Section Custom Styling */
                    [data-section-id="${sec.id}"] ~ [data-type="question-block"] {
                        font-size: ${ptToPx(sec.fontSize !== undefined && sec.fontSize !== '' ? sec.fontSize : (s.bodyFontSize || 14))}px !important;
                        line-height: ${Math.max(1.2, Number(sec.lineGap !== undefined && sec.lineGap !== '' ? sec.lineGap : (s.lineHeight || 1.5)))} !important;
                        text-align: ${sec.textAlign || 'left'} !important;
                    }

                    /* Ensure paragraphs inside question-block inherit alignment and line-height */
                    [data-section-id="${sec.id}"] ~ [data-type="question-block"] p,
                    [data-section-id="${sec.id}"] ~ [data-type="question-block"] div.text-slate-900 {
                        text-align: ${sec.textAlign || 'left'} !important;
                        line-height: ${Math.max(1.2, Number(sec.lineGap !== undefined && sec.lineGap !== '' ? sec.lineGap : (s.lineHeight || 1.5)))} !important;
                        font-size: ${ptToPx(sec.fontSize !== undefined && sec.fontSize !== '' ? sec.fontSize : (s.bodyFontSize || 14))}px !important;
                    }

                    /* Ensure Headers Span All Columns */
                    [data-section-id="${sec.id}"] {
                        column-span: all;
                    }

                    [data-section-id="${sec.id}"] ~ [data-type="question-block"] .options-grid {
                        row-gap: ${sec.optionGap !== undefined && sec.optionGap !== '' ? sec.optionGap : 8}px !important;
                    }
                    
                    /* Apply font-size to options as well if needed */
                    [data-section-id="${sec.id}"] ~ [data-type="question-block"] .options-grid > div {
                        font-size: ${ptToPx(sec.fontSize !== undefined && sec.fontSize !== '' ? sec.fontSize : (s.bodyFontSize || 14))}px !important;
                    }
                `).join('\n')}

                /* Auto Numbering via CSS Counters */
                [data-type="question-block"] {
                    counter-increment: question-counter;
                    margin-bottom: ${s.questionGap !== undefined && s.questionGap !== '' ? s.questionGap : 15}px;
                    padding-left: 2.6em !important; /* Explicit space for up to 3-digit numbers */
                    margin-left: 0 !important;
                    position: relative;
                }
                
                [data-type="question-block"]::before {
                    position: absolute;
                    left: 0; /* Start at the absolute left of the block */
                    top: 8px; /* Match the paddingTop of QuestionBlockNode for perfect vertical alignment */
                    font-weight: 700;
                    font-size: 1em; /* inherit the dynamic question font size */
                    color: #0f172a;
                    width: 2.2em; /* Safe width for 3 digits + dot */
                    text-align: right;
                    padding-right: 0.4em; /* Space between dot and text */
                    white-space: nowrap;
                }
                
                /* Reset paragraph margins inside editor to avoid prose inheritance */
                .ProseMirror p {
                    margin-top: 0 !important;
                    margin-bottom: 0 !important;
                }

                [data-type="question-block"][data-numberingstyle="bn"]::before,
                [data-type="question-block"]:not([data-numberingstyle])::before {
                    content: counter(question-counter, bengali) ".";
                }
                [data-type="question-block"][data-numberingstyle="en"]::before {
                    content: counter(question-counter, decimal) ".";
                }
                [data-type="question-block"][data-numberingstyle="roman"]::before {
                    content: counter(question-counter, lower-roman) ".";
                }
                [data-type="question-block"][data-numberingstyle="alpha"]::before {
                    content: counter(question-counter, lower-alpha) ")";
                }

                /* Strict Mode overrides */
                .strict-analytics-mode [data-type="question-block"] {
                    user-select: none;
                }
            `}} />
        </div>
        </div>
        </div>
    );
};

export default PaperCanvasV2;
