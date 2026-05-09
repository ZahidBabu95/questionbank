import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
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
            if (window.extractTimeout) clearTimeout(window.extractTimeout);
            window.extractTimeout = setTimeout(() => {
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
                        padding: s.headerStyle === 'বক্স স্টাইল' ? '10px' : '0 0 4px 0',
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
                                    <div style={{fontSize: ptToPx(s.headerFontSize), fontWeight: s.boldInstitute ? 'bold' : 'normal', wordBreak: 'break-word', lineHeight: s.headerLineHeight || 1.2}}>
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
                            <div style={{textAlign: 'center', fontSize: ptToPx(s.subHeaderFontSize), fontWeight: s.boldSubject ? 'bold' : 'normal', marginBottom: 8, lineHeight: s.headerLineHeight || 1.2}}>
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
                                <div style={{display:'flex', justifyContent:'space-between', fontSize: ptToPx((s.subHeaderFontSize || 14) * 0.85), fontWeight: 'bold', lineHeight: 1}}>
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
                
                {/* Print Footer */}
                {s.showFooter && s.footerText && (
                    <div className="hidden print:block fixed bottom-[8mm] left-0 right-0 text-center" style={{ fontSize: ptToPx(10), fontFamily: s.fontFamily || 'Kalpurush', color: '#64748b' }}>
                        {s.footerText}
                    </div>
                )}
            </div>

            {/* Custom CSS for Tiptap in Paper Engine */}
            <CanvasStyleInjector s={s} ptToPx={ptToPx} mmToPx={mmToPx} />
        </div>
        </div>
        </div>
    );
};

export default PaperCanvasV2;
