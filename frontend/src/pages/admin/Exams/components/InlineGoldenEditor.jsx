import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Node, mergeAttributes } from '@tiptap/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Bold, Italic, Underline as UnderlineIcon, Code, X } from 'lucide-react';

// ─── MathNode: Custom Extension for KaTeX Mathematics ────────────────────────
const MathInlineView = ({ node, updateAttributes, editor }) => {
    const { latex } = node.attrs;
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const html = React.useMemo(() => {
        try {
            return katex.renderToString(latex || '\\text{Empty}', { throwOnError: false, displayMode: false });
        } catch (e) {
            return `<span style="color:red; font-size:10px;">Error: ${e.message}</span>`;
        }
    }, [latex]);

    const handleSave = () => {
        setIsEditing(false);
        updateAttributes({ latex: inputValue });
        requestAnimationFrame(() => {
            if (editor && !editor.isDestroyed) {
                editor.commands.focus();
            }
        });
    };

    return (
        <NodeViewWrapper 
            as="span" 
            style={{ display: 'inline-block', position: 'relative', cursor: 'pointer', margin: '0 4px' }}
            onClick={(e) => {
                if (!isEditing) {
                    e.preventDefault();
                    e.stopPropagation();
                    setInputValue(latex);
                    setIsEditing(true);
                }
            }}
        >
            <span 
                className={`katex-render-container rounded transition-colors ${isEditing ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'hover:bg-slate-100'}`}
                dangerouslySetInnerHTML={{ __html: html }} 
            />
            
            {isEditing && (
                <div 
                    contentEditable={false}
                    className="absolute z-[200] left-0 bottom-full mb-2 flex items-center bg-white shadow-2xl rounded-xl border border-indigo-200 p-3"
                    style={{ width: '300px' }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div className="flex flex-col w-full gap-2 font-outfit">
                         <div className="flex items-center justify-between">
                             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Edit Equation</span>
                             <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                         </div>
                         <textarea 
                             autoFocus
                             className="w-full text-xs border border-slate-300 rounded p-2 font-mono outline-none focus:border-indigo-500 resize-y"
                             rows={3}
                             value={inputValue}
                             onChange={e => setInputValue(e.target.value)}
                             onKeyDown={e => {
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                     e.preventDefault();
                                     handleSave();
                                 }
                                 if (e.key === 'Escape') setIsEditing(false);
                             }}
                         />
                         <div className="flex justify-end gap-2 text-xs mt-1">
                             <button onClick={handleSave} className="px-3 py-1.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-sm transition-colors">Apply</button>
                         </div>
                    </div>
                </div>
            )}
        </NodeViewWrapper>
    );
};

const MathNode = Node.create({
    name: 'mathInline',
    group: 'inline',
    inline: true,
    atom: true,
    addAttributes() { return { latex: { default: '' } }; },
    parseHTML() {
        return [{ tag: 'span[data-type="math"]', getAttrs: (dom) => ({ latex: decodeURIComponent(dom.getAttribute('data-latex') || '') }) }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'math', 'data-latex': encodeURIComponent(HTMLAttributes.latex) })];
    },
    addNodeView() { return ReactNodeViewRenderer(MathInlineView); },
});

// ─── Main InlineGoldenEditor Component ────────────────────────

const InlineGoldenEditor = ({ value, onChange, placeholder = "Type here...", className = "" }) => {
    const isUpdating = useRef(false);
    const [isFocused, setIsFocused] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            MathNode
        ],
        content: value,
        onUpdate: ({ editor }) => {
            isUpdating.current = true;
            onChange(editor.getHTML());
            // small delay to prevent cycle
            setTimeout(() => { isUpdating.current = false; }, 50);
        },
        onFocus: () => setIsFocused(true),
        onBlur: () => {
            setTimeout(() => { setIsFocused(false); }, 150);
        },
        editorProps: {
            attributes: {
                class: `outline-none min-h-[1.5em] cursor-text ${className}`,
            },
        },
    });

    // Update content if value changes from outside (e.g. template applied)
    useEffect(() => {
        if (editor && value !== editor.getHTML() && !isUpdating.current) {
            editor.commands.setContent(value, false);
        }
    }, [value, editor]);

    if (!editor) return null;

    return (
        <div className="relative group/editor">
            <style>{`
                .tiptap-question p {
                    margin-bottom: 0.4em;
                    min-height: 1em;
                }
                .tiptap-question p:last-child {
                    margin-bottom: 0;
                }
                .tiptap-question ul {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin-bottom: 0.4em;
                }
                .tiptap-question ol {
                    list-style-type: decimal;
                    padding-left: 1.5rem;
                    margin-bottom: 0.4em;
                }
                [data-lang="bn"] .tiptap-question ol {
                    list-style-type: none;
                    counter-reset: bng-counter;
                }
                [data-lang="bn"] .tiptap-question ol > li {
                    position: relative;
                }
                [data-lang="bn"] .tiptap-question ol > li::before {
                    counter-increment: bng-counter;
                    position: absolute;
                    left: -1.5rem;
                }
                [data-lang="bn"] .tiptap-question ol > li:nth-child(1)::before { content: "ক) "; }
                [data-lang="bn"] .tiptap-question ol > li:nth-child(2)::before { content: "খ) "; }
                [data-lang="bn"] .tiptap-question ol > li:nth-child(3)::before { content: "গ) "; }
                [data-lang="bn"] .tiptap-question ol > li:nth-child(4)::before { content: "ঘ) "; }
                [data-lang="bn"] .tiptap-question ol > li:nth-child(5)::before { content: "ঙ) "; }
                [data-lang="bn"] .tiptap-question ol > li:nth-child(6)::before { content: "চ) "; }
                [data-lang="bn"] .tiptap-question ol > li:nth-child(7)::before { content: "ছ) "; }
                [data-lang="bn"] .tiptap-question ol > li:nth-child(8)::before { content: "জ) "; }
                .tiptap-option p {
                    margin: 0;
                    display: inline;
                }
                .tiptap-footer p {
                    margin: 0;
                }
            `}</style>
            
            {isFocused && (
                <div 
                    className="absolute z-[100] left-0 -top-9 flex items-center bg-white shadow-xl border border-slate-300 rounded-md p-1 gap-1 animate-in fade-in duration-100"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <button
                        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
                        className={`p-1 rounded hover:bg-slate-100 ${editor.isActive('bold') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                        title="Bold"
                    >
                        <Bold size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
                        className={`p-1 rounded hover:bg-slate-100 ${editor.isActive('italic') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                        title="Italic"
                    >
                        <Italic size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run() }}
                        className={`p-1 rounded hover:bg-slate-100 ${editor.isActive('underline') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                        title="Underline"
                    >
                        <UnderlineIcon size={14} />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button
                        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
                        className={`p-1 rounded hover:bg-slate-100 ${editor.isActive('bulletList') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                        title="Bullet List"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
                        className={`p-1 rounded hover:bg-slate-100 ${editor.isActive('orderedList') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                        title="Numbered List"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            const latex = prompt('Enter LaTeX equation:', 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
                            if (latex) {
                                editor.chain().focus().insertContent(`<span data-type="math" data-latex="${encodeURIComponent(latex)}"></span>`).run();
                            }
                        }}
                        className="flex items-center gap-1 p-1 px-2 rounded hover:bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider"
                        title="Insert Math Equation"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        Math
                    </button>
                </div>
            )}
            
            {/* Fallback BubbleMenu just in case */}
            {editor && (
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center bg-white shadow-xl border border-slate-200 rounded-lg p-1 gap-1">
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded-md hover:bg-slate-100 ${editor.isActive('bold') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}><Bold size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded-md hover:bg-slate-100 ${editor.isActive('italic') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}><Italic size={14} /></button>
                    <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded-md hover:bg-slate-100 ${editor.isActive('underline') ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}><UnderlineIcon size={14} /></button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <button onClick={() => { const latex = prompt('LaTeX:', 'x=y'); if (latex) { editor.chain().focus().insertContent(`<span data-type="math" data-latex="${encodeURIComponent(latex)}"></span>`).run(); } }} className="flex items-center gap-1 p-1.5 px-2 rounded-md hover:bg-slate-100 text-slate-600 text-xs font-bold"><Code size={14} /> Math</button>
                </BubbleMenu>
            )}
            
            {editor.isEmpty && (
                <div className="absolute inset-0 pointer-events-none text-slate-300 italic">
                    {placeholder}
                </div>
            )}
            
            <EditorContent editor={editor} />
        </div>
    );
};

export default InlineGoldenEditor;
