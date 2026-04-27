import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { QuestionBlockNode } from '../extensions/QuestionBlockNode';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, Sigma, Image as ImageIcon, Table as TableIcon } from 'lucide-react';

// Custom Extension to handle "Locked Question Blocks" in Strict Mode
// In future, this will be expanded to a NodeView to render CQ/MCQ UI
const PaperCanvasV2 = ({ 
    editorMode, rawContent, setRawContent, 
    paperSize = 'A4', orientation = 'Portrait', margins = 'Normal', 
    columns = 1, fontFamily = 'Outfit', fontSize = '15px', zoom = 100,
    headerText = '', footerText = '', editorConfig = null
}) => {

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            QuestionBlockNode,
        ],
        content: rawContent || `
            <h1 style="text-align: center">Bangladesh High School</h1>
            <h3 style="text-align: center">Class 10 | Mathematics | Final Exam</h3>
            <p style="text-align: center">Time: 2 Hours &nbsp; | &nbsp; Full Marks: 100</p>
            <hr />
            <p><strong>Section A: Multiple Choice Questions</strong></p>
            
            <div data-type="question-block" 
                 type="MCQ" 
                 questiontext="What is the value of <b>sin(90°)</b>?" 
                 chaptername="Trigonometry 9.1" 
                 marks="1" 
                 data-options='[{"optionText":"0"}, {"optionText":"1"}, {"optionText":"-1"}, {"optionText":"Infinity"}]'>
            </div>
            
            <div data-type="question-block" 
                 type="CQ" 
                 questiontext="<p>A right-angled triangle has a base of 3cm and a height of 4cm.</p><br/><p><b>a)</b> Find the hypotenuse.</p><p><b>b)</b> Find the area.</p>" 
                 chaptername="Geometry" 
                 marks="10">
            </div>
        `,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[800px]',
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

    // Sync external rawContent changes (e.g., when a Template is clicked)
    useEffect(() => {
        if (editor && rawContent && rawContent !== editor.getHTML()) {
            editor.commands.setContent(rawContent);
        }
    }, [rawContent, editor]);

    if (!editor) {
        return <div className="animate-pulse h-[800px] bg-slate-100 rounded-lg w-full"></div>;
    }

    const dimensions = {
        'A4': { w: 794, h: 1123, gap: 32 },
        'Legal': { w: 816, h: 1344, gap: 32 },
        'Letter': { w: 816, h: 1056, gap: 32 },
        'A5': { w: 559, h: 794, gap: 32 }
    };
    let { w, h, gap } = dimensions[paperSize] || dimensions['A4'];
    
    // Handle Orientation
    if (orientation === 'Landscape') {
        const temp = w;
        w = h;
        h = temp;
    }
    const totalH = h + gap;

    const marginValues = {
        'Normal': 96,
        'Narrow': 48,
        'Wide': 144
    };
    const padding = marginValues[margins] || 96;

    const [pageCount, setPageCount] = useState(1);
    const containerRef = useRef(null);

    // Observer to calculate how many physical pages are needed
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // Determine the total scrollable height of the Tiptap editor
                const scrollH = entry.target.scrollHeight;
                const calculatedPages = Math.max(1, Math.ceil(scrollH / totalH));
                setPageCount(prev => (prev !== calculatedPages ? calculatedPages : prev));
            }
        });
        
        // Find the ProseMirror div to observe
        const pm = containerRef.current.querySelector('.ProseMirror');
        if (pm) observer.observe(pm);
        
        return () => observer.disconnect();
    }, [totalH, editor]);

    // Check dynamic config for toolbar features
    const hasMath = editorConfig?.toolbar_features?.includes('math_formula');
    const hasTable = editorConfig?.toolbar_features?.includes('table');
    const hasImage = editorConfig?.toolbar_features?.includes('image_upload');

    return (
        <div className="w-full h-full relative flex flex-col items-center">
            {/* Dynamic Sticky Toolbar */}
            {editorMode === 'DISCONNECTED_FREE_EDIT' && (
                <div className="sticky top-4 z-[100] mb-6 bg-white border border-slate-200 shadow-xl rounded-xl p-2 flex items-center gap-1">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-lg transition-all ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Bold size={16} /></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg transition-all ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Italic size={16} /></button>
                    <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded-lg transition-all ${editor.isActive('underline') ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><UnderlineIcon size={16} /></button>
                    
                    <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
                    
                    <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded-lg transition-all ${editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><AlignLeft size={16} /></button>
                    <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded-lg transition-all ${editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><AlignCenter size={16} /></button>
                    <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-2 rounded-lg transition-all ${editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><AlignRight size={16} /></button>

                    {(hasMath || hasTable || hasImage) && <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>}
                    
                    {hasMath && <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all" title="Insert Math Formula"><Sigma size={16} /></button>}
                    {hasTable && <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all" title="Insert Table"><TableIcon size={16} /></button>}
                    {hasImage && <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all" title="Upload Image"><ImageIcon size={16} /></button>}
                </div>
            )}

            {/* Canvas Container */}
            <div 
                className="flex justify-center transition-all duration-300 relative" 
                style={{ width: `${w * (zoom / 100)}px`, minHeight: `${(pageCount * totalH) * (zoom / 100)}px` }}
            >
            <div 
                ref={containerRef}
                className="paper-canvas-container relative origin-top-left" 
                style={{ transform: `scale(${zoom / 100})`, width: `${w}px`, height: `${pageCount * totalH}px` }}
            >
            
            {/* Background Pages Array */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none flex flex-col" style={{ gap: `${gap}px` }}>
                {Array.from({ length: pageCount }).map((_, i) => (
                    <div key={i} className="bg-white shadow-xl w-full" style={{ height: `${h}px` }}></div>
                ))}
            </div>

            {/* Editor Mode Indicator */}
            {editorMode === 'STRICT_LINKED' && (
                <div className="absolute -top-4 -right-4 bg-indigo-100 text-indigo-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm z-50">
                    Database Linked
                </div>
            )}
            
            {/* Header Overlay */}
            {headerText && (
                <div className="absolute top-8 left-0 w-full text-center font-black text-xl text-slate-800 z-10 opacity-50 pointer-events-none" style={{ fontFamily }}>
                    {headerText}
                </div>
            )}
            
            <div className="relative z-10 h-full w-full">
                <EditorContent editor={editor} />
            </div>

            {/* Footer Overlay */}
            {footerText && (
                <div className="absolute bottom-8 left-0 w-full text-center font-bold text-xs text-slate-400 z-10 opacity-50 pointer-events-none" style={{ fontFamily }}>
                    {footerText}
                </div>
            )}

            {/* Custom CSS for Tiptap in Paper Engine */}
            <style jsx global>{`
                .ProseMirror {
                    font-family: '${fontFamily}', sans-serif;
                    font-size: ${fontSize};
                    width: ${w}px !important;
                    min-height: ${h}px !important;
                    padding: ${padding}px !important;
                    margin: 0 auto;
                    background-color: transparent !important;
                    box-sizing: border-box;
                    outline: none;
                    
                    ${columns > 1 ? `
                    /* Column Support */
                    column-count: ${columns};
                    column-gap: 3rem;
                    column-rule: 1px solid #e2e8f0;
                    ` : ''}
                    
                    counter-reset: question-counter;
                }
                .ProseMirror:focus {
                    outline: none;
                }
                
                /* Auto Numbering via CSS Counters */
                [data-type="question-block"] {
                    counter-increment: question-counter;
                    position: relative;
                }
                [data-type="question-block"]::before {
                    content: counter(question-counter) ".";
                    position: absolute;
                    left: 1rem;
                    top: 1rem;
                    font-weight: 800;
                    font-size: 1.1rem;
                    color: #1e293b;
                }

                /* Styling for Question Blocks */
                .strict-analytics-mode [data-type="question-block"] {
                    user-select: none;
                    cursor: not-allowed;
                    border: 2px dashed transparent;
                    padding: 1rem 1rem 1rem 2.5rem; /* Space for the number */
                    border-radius: 0.5rem;
                    transition: all 0.2s;
                }
                .strict-analytics-mode [data-type="question-block"]:hover {
                    border-color: #818cf8;
                    background-color: #f8fafc;
                }
                .strict-analytics-mode [data-type="question-block"]::after {
                    content: "Click to Select / Swap";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #4f46e5;
                    color: white;
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    opacity: 0;
                    transition: opacity 0.2s;
                    pointer-events: none;
                }
                .strict-analytics-mode [data-type="question-block"]:hover::after {
                    opacity: 1;
                }
            `}</style>
        </div>
        </div>
        </div>
    );
};

export default PaperCanvasV2;
