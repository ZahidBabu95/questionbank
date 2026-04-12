import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { Node } from '@tiptap/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { mergeAttributes } from '@tiptap/core';
import { Image as BaseImage } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
    X, Maximize2, Minimize2, Bold, Italic, Underline as UnderlineIcon,
    List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    FileText, Save, Type, Grid3x3, Undo2, Redo2,
    Strikethrough, Code, Quote, Minus, Trash2,
    Image as ImageIcon, MoveHorizontal
} from 'lucide-react';

// ─── Resizable Image Node View ───────────────────────────────────────────────
const ResizableImageView = ({ node, updateAttributes, selected, deleteNode, editor, getPos }) => {
    const { src, alt, width, align } = node.attrs;
    const [localWidth, setLocalWidth] = useState(width || '50%');
    
    // Explicitly catch AI-generated dummy URLs like "null" or "undefined"
    const isBadSrc = !src || src.trim() === '' || src === 'null' || src === 'undefined' || src === '#';
    const [imgError, setImgError] = useState(isBadSrc);

    const imgRef = useRef(null);
    const startX = useRef(null);
    const startW = useRef(null);

    // Sync width from external updates
    useEffect(() => { setLocalWidth(width || '50%'); }, [width]);

    // Reset error boundary if src magically changes behind the scenes
    useEffect(() => { setImgError(isBadSrc); }, [src, isBadSrc]);

    const onResizeStart = (e) => {
        e.preventDefault();
        startX.current = e.clientX;
        startW.current = imgRef.current?.offsetWidth || 300;
        const onMove = (me) => {
            const dx = me.clientX - startX.current;
            const newPx = Math.max(80, startW.current + dx);
            setLocalWidth(`${newPx}px`);
        };
        const onUp = (me) => {
            const dx = me.clientX - startX.current;
            const newPx = Math.max(80, startW.current + dx);
            updateAttributes({ width: `${newPx}px` });
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // Help ProseMirror safely select this block node when clicked and maintain focus
    const handleImageClick = (e) => {
        // Prevent default to STOP ProseMirror from defaulting the native cursor to an adjacent table cell!
        e.preventDefault();
        e.stopPropagation();
        
        if (editor && typeof getPos === 'function') {
            // Strictly set the Node Selection ONLY. Do NOT call focus() here, 
            // as focus() forces the DOM cursor to the last known text position!
            editor.commands.setNodeSelection(getPos());
        }
    };

    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (editor && typeof getPos === 'function') {
            const pos = getPos();
            deleteNode();
            
            // Re-establish a strict text cursor EXACTLY where the image used to be,
            // so the editor doesn't lose its mind or blur unexpectedly!
            requestAnimationFrame(() => {
                if (!editor.isDestroyed) {
                    editor.chain().setTextSelection(pos).focus().run();
                }
            });
        } else {
            deleteNode();
        }
    };

    const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const justification = justifyMap[align] || 'flex-start';

    return (
        <NodeViewWrapper 
            style={{ display: 'flex', width: '100%', justifyContent: justification, margin: '1em 0' }}
            contentEditable={false}
            onMouseDown={handleImageClick}
        >
            <div style={{ position: 'relative', display: 'inline-block', width: imgError ? '120px' : 'auto', maxWidth: '100%' }}>
                
                {/* Professional UI Toolbar strictly tied to the `selected` prop */}
                {/* Anchored to the right edge so it safely expands left inside the table column without overflowing the screen */}
                {selected && (
                    <div 
                        className="flex items-center gap-2 px-2 py-1.5 bg-[#1e293b] text-white shadow-xl rounded-lg border border-slate-700"
                        style={{ position: 'absolute', top: '-44px', right: 0, zIndex: 50, whiteSpace: 'nowrap' }}
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                    >
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mx-1">Image</span>
                        
                        <div className="flex bg-[#0f172a] rounded overflow-hidden border border-slate-700">
                            {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([a, Icon]) => (
                                <button
                                    key={a}
                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ align: a }); }}
                                    className={`p-1 transition-colors ${align === a ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                                    title={`Align ${a}`}
                                >
                                    <Icon size={14} />
                                </button>
                            ))}
                        </div>
                        
                        <div className="w-px h-5 bg-slate-600 mx-1" />

                        <div className="flex items-center gap-1 text-xs">
                            <MoveHorizontal size={14} className="text-slate-400" />
                            {['25%', '50%', '75%', '100%'].map((w) => (
                                <button
                                    key={w}
                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); updateAttributes({ width: w }); }}
                                    className={`px-1.5 py-0.5 rounded transition-colors font-medium border border-transparent ${width === w ? 'bg-blue-600/30 text-blue-300 border-blue-500/50' : 'text-slate-300 bg-slate-800 hover:bg-slate-700'}`}
                                >
                                    {w}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-5 bg-slate-600 mx-1" />

                        <button
                            onMouseDown={handleDelete}
                            className="p-1 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                {!imgError ? (
                    <img
                        ref={imgRef}
                        src={src}
                        alt={alt || 'চিত্র'}
                        data-drag-handle=""
                        className="select-none"
                        onError={() => setImgError(true)}
                        style={{
                            width: localWidth,
                            minWidth: '60px',
                            maxWidth: '100%',
                            display: 'block',
                            borderRadius: '6px',
                            outline: selected ? '3px solid #3b82f6' : 'none',
                            outlineOffset: '2px',
                            cursor: 'pointer',
                            transition: 'outline 0.15s ease-in-out',
                        }}
                    />
                ) : (
                    <div
                        ref={imgRef}
                        data-drag-handle=""
                        className="select-none flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg text-slate-400"
                        style={{
                            width: '120px',
                            minHeight: '100px',
                            outline: selected ? '3px solid #3b82f6' : 'none',
                            outlineOffset: '2px',
                            cursor: 'pointer',
                        }}
                    >
                        <ImageIcon size={20} className="mb-2 opacity-50" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center px-1 overflow-hidden" style={{textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%'}}>
                            {alt || 'Image'}
                        </span>
                        <span className="text-[9px] opacity-70 mt-1 px-2 text-center leading-tight">Click to select<br/>& Crop ref</span>
                    </div>
                )}

                {selected && !imgError && (
                    <div
                        onMouseDown={onResizeStart}
                        style={{
                            position: 'absolute', bottom: -4, right: -4,
                            width: 14, height: 14, background: '#3b82f6',
                            borderRadius: '50%', cursor: 'nwse-resize',
                            border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            zIndex: 10,
                        }}
                        title="Drag to resize"
                    />
                )}
            </div>
        </NodeViewWrapper>
    );
};

// ─── Custom ResizableImage — extends @tiptap/extension-image (safest approach)
const ResizableImage = BaseImage.extend({
    // Make it block-level so it gets its own line (like MS Word images)
    inline: false,
    group: 'block',
    draggable: true,
    atom: true,

    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: '50%',
                renderHTML: (attrs) => ({ 'data-width': attrs.width }),
                parseHTML: (el) => el.getAttribute('data-width') || el.style.width || '50%',
            },
            align: {
                default: 'center',
                renderHTML: (attrs) => ({ 'data-align': attrs.align }),
                parseHTML: (el) => el.getAttribute('data-align') || 'center',
            },
        };
    },

    parseHTML() {
        return [
            // Direct <img> tags 
            {
                tag: 'img',
                getAttrs: (dom) => ({
                    src:   dom.getAttribute('src') || '',
                    alt:   dom.getAttribute('alt') || 'চিত্র',
                    width: dom.getAttribute('data-width') || dom.style.width || '50%',
                    align: dom.getAttribute('data-align') || 'center',
                }),
            },
            // Wrapper <div> containing <img>
            {
                tag: 'div[data-image-wrapper] img',
                getAttrs: (dom) => ({
                    src:   dom.getAttribute('src') || '',
                    alt:   dom.getAttribute('alt') || 'চিত্র',
                    width: dom.getAttribute('data-width') || dom.style.width || '50%',
                    align: dom.closest('[data-image-wrapper]')?.getAttribute('data-align') || 'center',
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { align, width, 'data-width': dw, 'data-align': da, ...rest } = HTMLAttributes;
        const resolvedAlign = align || da || 'left';
        const resolvedWidth = width || dw || '50%';
        const flex = resolvedAlign === 'center' ? 'center' : resolvedAlign === 'right' ? 'flex-end' : 'flex-start';
        return [
            'div',
            {
                'data-image-wrapper': '',
                'data-align': resolvedAlign,
                style: `display:flex;width:100%;justify-content:${flex};margin:0.75em 0`,
            },
            ['img', mergeAttributes(rest, {
                'data-width':  resolvedWidth,
                'data-align':  resolvedAlign,
                style: `width:${resolvedWidth};max-width:100%;border-radius:6px;display:block`,
            })],
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },

    addCommands() {
        return {
            // Override setImage so it uses our block-insert approach
            setImage: (attrs) => ({ chain }) =>
                chain()
                    .insertContent({ type: this.name, attrs })
                    .run(),
        };
    },
});

// ─── MathNode: Custom Extension for KaTeX Mathematics ────────────────────────
const MathInlineView = ({ node, updateAttributes, editor }) => {
    const { latex } = node.attrs;
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);

    const html = React.useMemo(() => {
        try {
            return katex.renderToString(latex || '\\text{Empty Equation}', { throwOnError: false, displayMode: false });
        } catch (e) {
            return `<span style="color:red; font-size:10px;">Error: ${e.message}</span>`;
        }
    }, [latex]);

    const handleSave = () => {
        setIsEditing(false);
        updateAttributes({ latex: inputValue });
    };

    return (
        <NodeViewWrapper 
            as="span" 
            style={{ display: 'inline-block', position: 'relative', cursor: 'pointer', margin: '0 4px' }}
            onMouseDown={(e) => {
                e.preventDefault(); 
                e.stopPropagation();
            }}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isEditing) {
                    setInputValue(latex);
                    setIsEditing(true);
                }
            }}
        >
            <span 
                className={`katex-render-container rounded transition-colors ${isEditing ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-slate-100'}`}
                dangerouslySetInnerHTML={{ __html: html }} 
            />
            
            {isEditing && (
                <div 
                    contentEditable={false}
                    className="absolute z-[200] left-0 bottom-full mb-2 flex items-center bg-white shadow-2xl rounded-xl border border-blue-200 p-3"
                    style={{ width: '320px' }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div className="flex flex-col w-full gap-2 font-satoshi">
                         <div className="flex items-center justify-between">
                             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Edit Equation (LaTeX)</span>
                             <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                         </div>
                         <textarea 
                             autoFocus
                             className="w-full text-xs border border-slate-300 rounded p-2 font-mono outline-none focus:border-blue-500 resize-y"
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
                             <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm transition-colors">Apply Formula</button>
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

    addAttributes() {
        return { latex: { default: '' } };
    },

    parseHTML() {
        return [{
            tag: 'span[data-type="math"]',
            getAttrs: (dom) => ({ latex: decodeURIComponent(dom.getAttribute('data-latex') || '') }),
        }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'math', 'data-latex': encodeURIComponent(HTMLAttributes.latex) })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(MathInlineView);
    },
});

// Enable correct GFM table parsing
marked.setOptions({
    gfm: true,
    breaks: true
});

function markdownToHtml(text) {
    if (!text || typeof text !== 'string') return '<p></p>';
    if (text.trim().startsWith('<')) return text; // already HTML
    
    // PRE-PROCESS LaTeX MATH INTO HTML HOOKS FOR TIPTAP!
    // Block math: $$ ... $$ -> we wrap in a centered div/p depending on your needs. A p is safer for tiptap inline nodes.
    let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (m, latex) => {
        return `<p style="text-align: center"><span data-type="math" data-latex="${encodeURIComponent(latex.trim())}"></span></p>`;
    });
    
    // Inline math: $ ... $
    processed = processed.replace(/\$([^$\n]+?)\$/g, (m, latex) => {
        return `<span data-type="math" data-latex="${encodeURIComponent(latex.trim())}"></span>`;
    });

    return marked.parse(processed);
}

// ─── Toolbar Button Helper ─────────────────────────────────────────────────
const TB = ({ onClick, active, title, children, className = '' }) => (
    <button
        onMouseDown={e => { e.preventDefault(); onClick(); }}
        title={title}
        className={`h-8 min-w-[32px] px-1.5 rounded flex items-center justify-center gap-1 text-sm transition-all select-none
            ${active
                ? 'bg-blue-100 text-blue-700 shadow-inner ring-1 ring-blue-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            } ${className}`}
    >
        {children}
    </button>
);

const Divider = () => <div className="h-7 w-px bg-slate-200 mx-1 shrink-0" />;

// ─── Main Component ────────────────────────────────────────────────────────
const GoldenEditor = ({ value, onChange, onSave, onClose, isSaving, setTiptapEditor }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1.0);
    const [wordCount, setWordCount] = useState(0);
    const [fontSize, setFontSize] = useState(16);
    const isSettingContent = useRef(false); // prevents onChange loop when programmatically setting content
    const valueRef = useRef(value);          // always holds latest value for the once-only load effect
    useEffect(() => { valueRef.current = value; }, [value]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Underline is registered separately below — exclude to prevent duplicate warning
                underline: false,
            }),
            ResizableImage,  // custom extension with floating toolbar + resize handle
            MathNode,        // custom LaTeX math node
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            TextAlign.configure({ types: ['heading', 'paragraph', 'blockquote'] }),
            Underline,
            TextStyle,
            Color,
        ],
        content: '<p></p>',
        onUpdate: ({ editor }) => {
            if (isSettingContent.current) return; // skip onChange during programmatic setContent
            const html = editor.getHTML();
            onChange(html);
            const text = editor.getText();
            setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
        },
        editorProps: {
            attributes: {
                class: 'outline-none w-full',
                spellcheck: 'true',
            },
        },
    });

    // Track editor instance with a ref to expose to image injector
    useEffect(() => {
        if (setTiptapEditor && editor) setTiptapEditor(editor);
    }, [editor, setTiptapEditor]);

    // Load initial content ONCE when both editor and a meaningful value are available
    const contentLoaded = useRef(false);
    useEffect(() => {
        if (!editor || contentLoaded.current) return;
        // Skip if value hasn't arrived yet (undefined/null), but accept empty string
        if (value === undefined || value === null) return;
        // If value is empty, don't mark as loaded yet — wait for the real content
        if (!value.trim()) return;
        contentLoaded.current = true;
        const targetHtml = markdownToHtml(value);
        // Defer setContent to NEXT animation frame —
        // avoids calling Tiptap's flushSync inside a React lifecycle (React 18 warning fix)
        requestAnimationFrame(() => {
            if (!editor || editor.isDestroyed) return;
            isSettingContent.current = true;
            editor.commands.setContent(targetHtml, false);
            isSettingContent.current = false;
            const text = editor.getText();
            setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
        });
    }, [editor, value]); // watch both so we catch whichever arrives last

    if (!editor) return (
        <div className="h-full flex items-center justify-center bg-slate-100">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
    );

    // ── Focus helpers ──────────────────────────────────────────────────
    // Restore focus WITHOUT changing selection (for things like zoom)
    const focusEditor = useCallback(() => {
        if (editor) editor.commands.focus();
    }, [editor]);

    // Save handler (also called via Ctrl+S)
    const handleSave = () => { if (!isSaving) onSave(); };

    // Save selection so dropdowns (which steal focus) don't lose it
    const savedSelection = useRef(null);
    const saveSelection = () => {
        if (editor) {
            savedSelection.current = {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
            };
        }
    };

    // Restore saved selection then run fn — SINGLE chain to avoid race conditions
    const applyWithSavedSelection = (fn) => {
        if (!editor) return;
        if (savedSelection.current) {
            const { from, to } = savedSelection.current;
            // Restore selection first, then let fn() build its own chain on top
            editor.chain()
                .focus()
                .setTextSelection({ from, to })
                .run();
        } else {
            editor.commands.focus();
        }
        fn();
        savedSelection.current = null;
    };

    return (
        <div
            className={`flex flex-col transition-all duration-200 ${isFullscreen
                ? 'fixed inset-0 z-[200] rounded-none'
                : 'h-full rounded-b-xl overflow-hidden'
            }`}
            style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#e8eaed' }}
            onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    handleSave();
                }
            }}
        >
            {/* ═══ Title Bar ═══════════════════════════════════════════════ */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e3a5f] shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-400 rounded flex items-center justify-center">
                        <FileText size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-blue-100 tracking-wide">Knowledge Document — WYSIWYG Editor</span>
                </div>
                <div className="flex items-center gap-1">
                    {/* Fullscreen: onMouseDown so editor keeps selection; focus restored after */}
                    <button
                        onMouseDown={e => {
                            e.preventDefault();
                            setIsFullscreen(f => !f);
                            setTimeout(focusEditor, 50);
                        }}
                        className="p-1 text-blue-200 hover:text-white hover:bg-blue-600 rounded transition-colors"
                        title={isFullscreen ? 'Minimize' : 'Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                    <button onClick={onClose}
                        className="p-1 text-blue-200 hover:text-white hover:bg-red-500 rounded transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* ═══ Ribbon Toolbar ══════════════════════════════════════════ */}
            <div className="flex items-center flex-wrap gap-1 px-3 py-2 bg-[#f3f6fb] border-b-2 border-blue-200 shrink-0 shadow-sm">

                {/* Undo / Redo */}
                <TB onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)"
                    active={false}>
                    <Undo2 size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)"
                    active={false}>
                    <Redo2 size={15} />
                </TB>

                <Divider />

                {/* Heading styles */}
                <select
                    value={
                        editor.isActive('heading', { level: 1 }) ? 'h1' :
                        editor.isActive('heading', { level: 2 }) ? 'h2' :
                        editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'
                    }
                    onMouseDown={saveSelection}
                    onFocus={saveSelection}
                    onChange={e => {
                        const val = e.target.value;
                        applyWithSavedSelection(() => {
                            if (val === 'p') editor.chain().focus().setParagraph().run();
                            else editor.chain().focus().toggleHeading({ level: parseInt(val[1]) }).run();
                        });
                    }}
                    className="h-8 px-2 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-300"
                >
                    <option value="p">Normal</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                </select>

                {/* Font Size — saves selection before focusing so it's restored */}
                <select
                    value={fontSize}
                    onMouseDown={saveSelection}
                    onFocus={saveSelection}
                    onChange={e => setFontSize(parseInt(e.target.value))}
                    className="h-8 px-2 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-300 w-16"
                >
                    {[10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                <Divider />

                {/* Bold, Italic, Underline, Strike */}
                <TB onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')} title="Bold (Ctrl+B)">
                    <Bold size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')} title="Italic (Ctrl+I)">
                    <Italic size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')} title="Underline (Ctrl+U)">
                    <UnderlineIcon size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={editor.isActive('strike')} title="Strikethrough">
                    <Strikethrough size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleCode().run()}
                    active={editor.isActive('code')} title="Inline Code">
                    <Code size={15} />
                </TB>

                <Divider />

                {/* Alignment */}
                <TB onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    active={editor.isActive({ textAlign: 'left' })} title="Align Left">
                    <AlignLeft size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    active={editor.isActive({ textAlign: 'center' })} title="Center">
                    <AlignCenter size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    active={editor.isActive({ textAlign: 'right' })} title="Align Right">
                    <AlignRight size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    active={editor.isActive({ textAlign: 'justify' })} title="Justify">
                    <AlignJustify size={15} />
                </TB>

                <Divider />

                {/* Lists */}
                <TB onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')} title="Bullet List">
                    <List size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')} title="Numbered List">
                    <ListOrdered size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    active={editor.isActive('blockquote')} title="Blockquote">
                    <Quote size={15} />
                </TB>
                <TB onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    active={false} title="Horizontal Rule">
                    <Minus size={15} />
                </TB>

                <Divider />

                {/* Table */}
                <TB onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    active={false} title="Insert Table">
                    <Grid3x3 size={15} />
                </TB>

                {/* Spacer + Save — onMouseDown keeps selection in editor */}
                <div className="ml-auto">
                    <button
                        onMouseDown={e => { e.preventDefault(); handleSave(); }}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow transition-colors disabled:opacity-50"
                    >
                        {isSaving
                            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Save size={13} />
                        }
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* ═══ Page Canvas ══════════════════════════════════════════════ */}
            <div className="flex-1 overflow-auto bg-[#525659] relative flex flex-col items-center py-8 px-4 pb-[200px]">
                <div
                    style={{
                        zoom: zoom,
                        transition: 'all 0.15s ease',
                        width: '794px',    /* A4 width in px at 96dpi */
                        minHeight: '1123px', /* A4 height */
                        background: 'white',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        padding: '72px 80px',
                        fontSize: `${fontSize}px`,
                        lineHeight: '1.85',
                        color: '#1a1a2e',
                        fontFamily: "'Noto Serif Bengali', 'Kalpurush', 'SutonnyMJ', Georgia, serif",
                        flexShrink: 0,
                    }}
                >
                    <style>{`
                        .tiptap p { margin: 0 0 0.75em 0; text-align: justify; }
                        .tiptap h1 { font-size: 1.8em; font-weight: 900; margin: 0 0 0.5em 0; color: #111; text-align: left; }
                        .tiptap h2 { font-size: 1.4em; font-weight: 700; margin: 1em 0 0.4em 0; color: #222; text-align: left; }
                        .tiptap h3 { font-size: 1.15em; font-weight: 600; margin: 0.8em 0 0.3em 0; color: #333; text-align: left; }
                        .tiptap ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
                        .tiptap ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
                        .tiptap li { margin: 0.3em 0; }
                        .tiptap blockquote { border-left: 3px solid #6b7280; padding-left: 1em; color: #4b5563; margin: 0.75em 0; font-style: italic; }
                        .tiptap table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                        .tiptap table td, .tiptap table th { border: 1px solid #d1d5db; padding: 0.5em 0.75em; }
                        .tiptap table th { background: #f3f4f6; font-weight: 700; }
                        .tiptap hr { border: none; border-top: 1px solid #d1d5db; margin: 1em 0; }
                        .tiptap code { background: #f3f4f6; padding: 0.15em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
                        .tiptap strong { font-weight: 700; }
                        .tiptap em { font-style: italic; }
                        .tiptap u { text-decoration: underline; }
                        .tiptap s { text-decoration: line-through; }
                        .tiptap img { max-width: 100%; height: auto; display: block; border-radius: 4px; }
                        /* Image float wrapping (wrap-left / wrap-right) */
                        .tiptap [data-image-wrapper] { display: flex; width: 100%; margin: 0.75em 0; }
                        .tiptap [data-image-wrapper][data-align="left"]   { justify-content: flex-start; }
                        .tiptap [data-image-wrapper][data-align="center"] { justify-content: center; }
                        .tiptap [data-image-wrapper][data-align="right"]  { justify-content: flex-end; }
                    `}</style>
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* ═══ Status Bar ══════════════════════════════════════════════ */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#1e3a5f] text-blue-100 text-xs shrink-0">
                <div className="flex items-center gap-4">
                    <span>Page 1 of 1</span>
                    <span className="text-blue-300">|</span>
                    <span>{wordCount} words</span>
                    <span className="text-blue-300">|</span>
                    <span>Font: {fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-blue-300">Zoom</span>
                    {/* Zoom buttons: onMouseDown + preventDefault keeps editor selection */}
                    <button
                        onMouseDown={e => { e.preventDefault(); setZoom(z => Math.max(0.4, parseFloat((z - 0.1).toFixed(1)))); }}
                        className="w-5 h-5 bg-blue-700 hover:bg-blue-600 rounded flex items-center justify-center font-bold select-none">−</button>
                    <input
                        type="range" min="0.4" max="2" step="0.05" value={zoom}
                        onChange={e => setZoom(parseFloat(e.target.value))}
                        onMouseUp={focusEditor}   /* restore editor focus after dragging */
                        onKeyUp={focusEditor}     /* restore after keyboard nudge */
                        className="w-28 h-1 cursor-pointer accent-blue-400"
                    />
                    <button
                        onMouseDown={e => { e.preventDefault(); setZoom(z => Math.min(2, parseFloat((z + 0.1).toFixed(1)))); }}
                        className="w-5 h-5 bg-blue-700 hover:bg-blue-600 rounded flex items-center justify-center font-bold select-none">+</button>
                    <span className="w-10 text-right font-bold text-blue-200">{Math.round(zoom * 100)}%</span>
                    <button
                        onMouseDown={e => { e.preventDefault(); setZoom(1.0); }}
                        className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-[10px] font-semibold select-none">Reset</button>
                </div>
            </div>
        </div>
    );
};

export default GoldenEditor;
