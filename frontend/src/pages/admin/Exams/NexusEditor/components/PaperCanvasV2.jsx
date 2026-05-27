import React, { useEffect, useState, useRef } from 'react';
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
const getDisplayQuestionText = (q) => {
    if (!q) return '';
    let text = q.questionText || '';
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

const PaperCanvasV2 = React.memo(({ 
    editorMode, rawContent, setRawContent, 
    docSettings, zoom = 100,
    editorConfig = null, workspaceTools = null, onPageCountChange,
    pendingInsertQuestion, onQuestionInserted,
    pendingSwapQuestion, onQuestionSwapped,
    setDocumentQuestions, documentQuestions = [],
    canvasTheme = 'white', uiLang = 'bn', setEditor
}) => {
    const s = docSettings || {};
    const lastEditorContentRef = useRef(rawContent);
    const editorUpdateTimeoutRef = useRef(null);
    const extractTimeoutRef = useRef(null);

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
            const html = editor.getHTML();
            lastEditorContentRef.current = html;
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
        }
        return () => {
            if (setEditor) {
                setEditor(null);
            }
        };
    }, [editor, setEditor]);

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
            if (extractTimeoutRef.current) clearTimeout(extractTimeoutRef.current);
            extractTimeoutRef.current = setTimeout(() => {
                const qs = [];
                editor.state.doc.descendants((node, pos) => {
                    if (node.type.name === 'questionBlock') {
                        qs.push({ pos, nodeSize: node.nodeSize, attrs: node.attrs });
                    }
                });
                if (setDocumentQuestions) setDocumentQuestions(qs);
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
                }
            }, 0);
            lastEditorContentRef.current = rawContent;
            return () => clearTimeout(timer);
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

    // Dynamically apply Question Setup settings to existing question nodes and upgrade legacy headers
    useCanvasSync(editor, s);

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
                className={`paper-canvas-container relative origin-top-left print:block print:m-0 print:p-0 theme-${canvasTheme}`}
                style={{ 
                    transform: `scale(${zoom / 100})`, 
                    width: `${w}px`, 
                    height: `${pageCount * totalH}px` 
                }}
            >
            
            {/* Background Pages Array */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none flex flex-col" style={{ gap: `${gap}px` }}>
                {Array.from({ length: pageCount }).map((_, i) => (
                    <div key={i} className="w-full relative overflow-hidden transition-colors duration-300" style={{ 
                        height: `${h}px`,
                        backgroundColor: canvasTheme === 'cream' ? '#fbf0d9' : canvasTheme === 'dark' ? '#1e293b' : '#ffffff',
                        border: s.outerBorder ? `${s.outerBorderWidth}px solid ${canvasBorderColor}` : 'none',
                        borderBottom: gap === 0 && i < pageCount - 1 ? (canvasTheme === 'dark' ? '1px dashed #475569' : '1px dashed #cbd5e1') : undefined,
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
                <div data-html2canvas-ignore="true" className="absolute -top-4 -right-4 bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm z-50 print:hidden">
                    Database Linked
                </div>
            )}
            
            <div className={`relative z-10 h-full w-full paper-content-wrapper ${s.columns > 1 ? 'global-columns-active' : ''}`} style={{
                paddingTop, paddingBottom, paddingLeft, paddingRight,
                color: canvasTextColor
            }}>
                {/* Native Header for Strict Mode */}
                {editorMode === 'STRICT_LINKED' && (
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
                        marginBottom: (s.headerStyle === 'ডাবল বর্ডার' || (s.showDivider && s.dividerStyle === 'double')) ? 12 : 20
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '28px', marginBottom: 4, width: '100%', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
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
                                    <div style={{fontSize: ptToPx(s.headerFontSize), fontWeight: s.boldInstitute ? 'bold' : 'normal', wordBreak: 'break-word', lineHeight: s.headerLineHeight || 1.2}}>
                                        {s.institute || 'প্রতিষ্ঠানের নাম'}
                                    </div>
                                )}
                            </div>

                            {/* Right: Set Code */}
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                                {(s.showSetCode !== false && s.setCode) && (
                                    <div style={{display: 'inline-block', border: '1px solid ' + canvasBorderColor, padding: '2px 8px', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                        {s.language === 'ENGLISH' ? 'Set Code' : 'সেট কোড'}: {convertDigits(s.setCode, s.language)}
                                    </div>
                                )}
                            </div>
                        </div>
                            <div style={{textAlign: 'center', fontSize: ptToPx(s.subHeaderFontSize), fontWeight: s.boldSubject ? 'bold' : 'normal', marginBottom: 8, lineHeight: s.headerLineHeight || 1.2}}>
                                {(s.showBoard !== false && s.board) && (
                                    <div style={{marginBottom: 2}}>
                                        {s.board} {s.language === 'ENGLISH' ? 'Board' : 'বอร์ด'}
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
                                <div style={{display:'flex', justifyContent:'space-between', fontSize: ptToPx((s.subHeaderFontSize || 14) * 0.85), fontWeight: 'bold', lineHeight: 1}}>
                                    <span>{s.showTime !== false ? `${s.language === 'ENGLISH' ? 'Time' : 'সময়'}: ${convertDigits(formatDurationString(s.time, s.language), s.language)}` : ''}</span>
                                    <span>{s.showTotalMarks !== false ? `${s.language === 'ENGLISH' ? 'Full Marks' : 'পূর্ণমান'}: ${convertDigits(s.totalMarks, s.language)}` : ''}</span>
                                </div>
                            )}
                        {(s.showName || s.showRoll || s.showReg) && (
                            <div style={{ marginTop: 12, fontSize: ptToPx(s.bodyFontSize) }}>
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
                                        {s.showName && <div style={{marginBottom: 8, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{flex: 1, borderBottom:'1px dashed ' + canvasBorderColor}}></span></div>}
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
                        {(s.headerStyle === 'ডাবল বর্ডার' || (s.headerStyle !== 'বক্স স্টাইল' && s.headerStyle !== 'থিক টপ লাইন' && s.showDivider && s.dividerStyle === 'double')) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginTop: '4px', marginBottom: '0px' }}>
                                <div style={{ borderTop: '1px solid ' + canvasBorderColor, width: '100%', height: '0px' }}></div>
                                <div style={{ borderTop: '1px solid ' + canvasBorderColor, width: '100%', height: '0px' }}></div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Tiptap Content */}
                <div className={`tiptap-content-wrapper ${(s.includeAnswerSheet && s.ansLayout !== 'compact') ? `show-answers-${s.ansLayout || 'highlighted'}` : ''}`}>
                    <EditorContent editor={editor} />
                </div>

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
                        <div className="nexus-compact-answer-sheet mt-12 pt-6 border-t-2 border-slate-800 break-inside-avoid print:break-before-page" style={{ fontFamily: s.fontFamily || 'Kalpurush' }}>
                            <h4 className="text-center font-bold mb-4" style={{ fontSize: ptToPx(s.subHeaderFontSize || 14) }}>
                                {s.language === 'ENGLISH' ? 'Answer Sheet' : 'উত্তরপত্র'}
                            </h4>
                            
                            {/* MCQ Answers Grid Table */}
                            {totalMcq > 0 && (
                                <table className="w-full border-collapse border-2 border-slate-800 text-center text-sm mb-6" style={{ fontSize: ptToPx(s.bodyFontSize || 12) }}>
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
                                                                <td className={`border border-slate-800 py-1.5 px-1 font-bold text-slate-700 bg-slate-50/50 ${colIdx > 0 ? 'border-l-2' : ''}`} style={{ fontSize: ptToPx(qFontSize) }}>
                                                                    {displayNum}
                                                                </td>
                                                                <td className="border border-slate-800 py-1.5 px-2 font-bold text-indigo-700" style={{ fontSize: ptToPx(qFontSize) }} dangerouslySetInnerHTML={{ __html: ansText }} />
                                                            </React.Fragment>
                                                        );
                                                    } else {
                                                        return (
                                                            <React.Fragment key={colIdx}>
                                                                <td className={`border border-slate-800 py-1.5 px-1 bg-slate-50/30 ${colIdx > 0 ? 'border-l-2' : ''}`}>-</td>
                                                                <td className="border border-slate-800 py-1.5 px-2">-</td>
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
                                                        <div className="font-semibold text-slate-800 inline-block" dangerouslySetInnerHTML={{ __html: content }} />
                                                    </div>
                                                    {hasSubParts ? (
                                                        <div className="pl-6 mt-1.5 space-y-2 text-indigo-700 font-bold">
                                                            {dynamicDataParsed.sub_parts.map((part, pIdx) => {
                                                                const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                                                return (
                                                                    <div key={pIdx} className="flex flex-col gap-0.5 pb-1 border-b border-indigo-50/30 last:border-0 last:pb-0">
                                                                        {part.answer && (
                                                                            <div className="flex items-start gap-1 font-bold">
                                                                                <span className="text-xs text-slate-800 font-bold shrink-0">({label}) {s.language === 'ENGLISH' ? 'Ans:' : 'উত্তর:'}</span>
                                                                                <div className="inline font-bold text-indigo-700" dangerouslySetInnerHTML={{ __html: part.answer }} />
                                                                            </div>
                                                                        )}
                                                                        {part.explanation && (
                                                                            <div className="flex items-start gap-1 pl-4 text-xs font-normal text-slate-600">
                                                                                <span className="font-semibold shrink-0 text-emerald-700">{!part.answer ? `(${label}) ` : ''}{s.language === 'ENGLISH' ? 'Explanation:' : 'ব্যাখ্যা:'}</span>
                                                                                <div className="inline text-slate-700 font-normal" dangerouslySetInnerHTML={{ __html: part.explanation }} />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="pl-6 mt-1 text-indigo-700 font-bold">
                                                            <span className="text-xs text-slate-500 font-normal mr-1.5">{s.language === 'ENGLISH' ? 'Ans:' : 'উত্তর:'}</span>
                                                            <div className="inline" dangerouslySetInnerHTML={{ __html: ansText }} />
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
