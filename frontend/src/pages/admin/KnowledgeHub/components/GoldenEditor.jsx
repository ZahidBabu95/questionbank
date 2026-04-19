import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { marked } from 'marked';
import { Node } from '@tiptap/core';
import { Plugin, NodeSelection } from '@tiptap/pm/state';
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
    Image as ImageIcon, MoveHorizontal,
    PanelLeft, PanelRight, Search, Sparkles, MessageSquareDiff, Languages
} from 'lucide-react';

// ─── Resizable Image Node View ───────────────────────────────────────────────
// RULES:
//  1. NodeViewWrapper has contentEditable={false} → ProseMirror auto-creates
//     NodeSelection when user clicks on the wrapper. DO NOT override this.
//  2. NO pointerEvents manipulation — that blocks ProseMirror's own click detection.
//  3. NO manual setNodeSelection calls — they cause the cursor-jump bug.
//  4. All image controls (align/size/delete) live in the main toolbar context bar.
const ResizableImageView = ({ node, updateAttributes, selected, deleteNode, editor, getPos }) => {
    const { src, alt, width, align } = node.attrs;
    const [localWidth, setLocalWidth] = useState(width || '50%');

    const isBadSrc = !src || src.trim() === '' || src === 'null' || src === 'undefined' || src === '#';
    const [imgError, setImgError] = useState(isBadSrc);

    const imgRef   = useRef(null);
    const innerWrapperRef = useRef(null);
    const startX   = useRef(null);
    const startW   = useRef(null);
    const resizing = useRef(false);

    useEffect(() => { setLocalWidth(width || '50%'); }, [width]);
    useEffect(() => { setImgError(isBadSrc); }, [isBadSrc]);

    // ── NATIVE CAPTURE EVENT LISTENER ─────────────────────────────────────────
    // This is the ONLY reliable way to select Tiptap image node views without
    // the browser shifting the text cursor. It fires before ProseMirror and React.
    useEffect(() => {
        const el = innerWrapperRef.current;
        if (!el || !editor || typeof getPos !== 'function') return;

        const handleMouseDown = (e) => {
            if (resizing.current) return;
            
            e.preventDefault();   // Stops browser from planting text cursor
            e.stopPropagation();  // Stops ProseMirror's default text selection

            // Force NodeSelection directly using the exact position
            const pos = getPos();
            if (typeof pos === 'number') {
                editor.commands.setNodeSelection(pos);
            }
        };

        // Use capture: true so we intercept the click BEFORE it bubbles anywhere
        el.addEventListener('mousedown', handleMouseDown, { capture: true });
        return () => {
            el.removeEventListener('mousedown', handleMouseDown, { capture: true });
        };
    }, [editor, getPos, selected, imgError]); // re-bind when state changes to avoid stale closures

    // ── Resize drag ───────────────────────────────────────────────────────────
    const onResizeStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        resizing.current = true;
        startX.current = e.clientX;
        startW.current = imgRef.current?.offsetWidth || 300;

        const onMove = (mv) => {
            if (!resizing.current) return;
            setLocalWidth(`${Math.max(60, startW.current + mv.clientX - startX.current)}px`);
        };
        const onUp = (mu) => {
            resizing.current = false;
            updateAttributes({ width: `${Math.max(60, startW.current + mu.clientX - startX.current)}px` });
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    // ── Alignment → outer wrapper style ──────────────────────────────────────
    const outerStyle = {
        left:         { display: 'flex', justifyContent: 'flex-start', margin: '0.75em 0', width: '100%' },
        center:       { display: 'flex', justifyContent: 'center',      margin: '0.75em 0', width: '100%' },
        right:        { display: 'flex', justifyContent: 'flex-end',    margin: '0.75em 0', width: '100%' },
        'wrap-left':  { float: 'left',  marginRight: '1em', marginBottom: '0.5em' },
        'wrap-right': { float: 'right', marginLeft:  '1em', marginBottom: '0.5em' },
    }[align] ?? { display: 'flex', justifyContent: 'center', margin: '0.75em 0', width: '100%' };

    // ── Selection ring style ──────────────────────────────────────────────────
    const ring = selected
        ? { outline: '2.5px solid #3b82f6', outlineOffset: '2px' }
        : { outline: '2px solid transparent', outlineOffset: '2px' };

    return (
        <NodeViewWrapper as="div" style={outerStyle} contentEditable={false}>
            <div
                ref={innerWrapperRef}
                title={selected ? "Selected" : "Click to select"}
                style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', cursor: 'pointer' }}
            >
                {!imgError ? (
                    <img
                        ref={imgRef}
                        src={src}
                        alt={alt || 'চিত্র'}
                        draggable={false}
                        onError={() => setImgError(true)}
                        style={{
                            display: 'block',
                            width: localWidth,
                            minWidth: '60px',
                            maxWidth: '100%',
                            borderRadius: '4px',
                            userSelect: 'none',
                            ...ring,
                            transition: 'outline 0.12s',
                        }}
                    />
                ) : (
                    <div
                        ref={imgRef}
                        style={{

                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: localWidth || '120px',
                            minHeight: '90px',
                            background: '#f8fafc',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '8px',
                            color: '#94a3b8',
                            userSelect: 'none',
                            // removed pointerEvents: none
                            ...ring,
                        }}
                    >
                        <ImageIcon size={20} style={{ marginBottom: 4, opacity: 0.5 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', padding: '0 6px' }}>
                            {alt || 'Image'}
                        </span>
                        <span style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>click to select</span>
                    </div>
                )}

                {/* Resize handle — SE corner, stopPropagation so PM plugin ignores it */}
                {selected && !imgError && (
                    <div
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e); }}
                        title="Drag to resize"
                        style={{
                            position: 'absolute', bottom: -5, right: -5,
                            width: 13, height: 13,
                            background: '#3b82f6',
                            borderRadius: '50%',
                            border: '2.5px solid #fff',
                            boxShadow: '0 1px 4px rgba(0,0,0,.4)',
                            cursor: 'nwse-resize',
                            zIndex: 10,
                        }}
                    />
                )}
            </div>
        </NodeViewWrapper>
    );
};

// ─── Custom ResizableImage — extends @tiptap/extension-image
const ResizableImage = BaseImage.extend({
    name: 'image',          // explicit — BaseImage.extend inherits 'image' anyway
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
            // Wrapper <div> or <span> containing <img> (High Priority)
            {
                tag: 'div[data-image-wrapper] img, span[data-image-wrapper] img',
                priority: 100,
                getAttrs: (dom) => {
                    const wrapperAlign = dom.parentElement ? dom.parentElement.getAttribute('data-align') : null;
                    return {
                        src:   dom.getAttribute('src') || '',
                        alt:   dom.getAttribute('alt') || 'চিত্র',
                        width: dom.getAttribute('data-width') || dom.style.width || '50%',
                        align: dom.getAttribute('data-align') || wrapperAlign || 'center',
                    };
                },
            },
            // Direct <img> tags (Fallback)
            {
                tag: 'img',
                priority: 50,
                getAttrs: (dom) => ({
                    src:   dom.getAttribute('src') || '',
                    alt:   dom.getAttribute('alt') || 'চিত্র',
                    width: dom.getAttribute('data-width') || dom.style.width || '50%',
                    align: dom.getAttribute('data-align') || 'center',
                }),
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { align, width, 'data-width': dw, 'data-align': da, ...rest } = HTMLAttributes;
        const resolvedAlign = align || da || 'center';
        const resolvedWidth = width || dw || '50%';
        
        let style = '';
        if (resolvedAlign === 'wrap-left') {
            style = `float:left;margin-right:1.5em;margin-bottom:0.5em;`;
        } else if (resolvedAlign === 'wrap-right') {
            style = `float:right;margin-left:1.5em;margin-bottom:0.5em;`;
        } else if (resolvedAlign === 'inline') {
            style = `display:inline-block;margin:0 0.5em;`;
        } else {
            const flex = resolvedAlign === 'center' ? 'center' : resolvedAlign === 'right' ? 'flex-end' : 'flex-start';
            style = `display:flex;width:100%;justify-content:${flex};margin:0.75em 0`;
        }

        return [
            'div',
            {
                'data-image-wrapper': '',
                'data-align': resolvedAlign,
                style: style,
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
            setImage: (options) => ({ chain }) => {
                return chain().insertContent({
                    type: this.name,
                    attrs: options,
                }).run();
            },
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
    const [lineHeight, setLineHeight] = useState(1.85);
    // Tick counter — incremented on every selection/update so toolbar always reflects current state
    const [editorTick, setEditorTick] = useState(0);

    // AI Tooltip State
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null); // { text, action, from, to }
    
    // Find & Replace State
    const [showFindReplace, setShowFindReplace] = useState(false);
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');

    // Slash Menu State
    const [slashMenuData, setSlashMenuData] = useState({ open: false, query: '', pos: 0, len: 0, rect: null });
    const [slashIndex, setSlashIndex] = useState(0);

    // AI Custom Menu State
    const [aiMenuData, setAiMenuData] = useState({ open: false, rect: null, text: '' });

    const isSettingContent = useRef(false); // prevents onChange loop when programmatically setting content
    const valueRef = useRef(value);          // always holds latest value for the once-only load effect
    useEffect(() => { valueRef.current = value; }, [value]);

    const handleReplace = (replaceAll = false) => {
        if (!editor || !findText) return;

        const { doc, tr } = editor.state;
        const matches = [];

        doc.descendants((node, pos) => {
            if (node.isText && node.text) {
                let match;
                // Safe regex escape
                const regex = new RegExp(findText.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                while ((match = regex.exec(node.text)) !== null) {
                    matches.push({
                        from: pos + match.index,
                        to: pos + match.index + match[0].length
                    });
                }
            }
        });

        if (matches.length === 0) {
            alert('No matches found.');
            return;
        }

        // Apply backwards so positions don't shift!
        matches.reverse();
        
        let replacedCount = 0;
        if (!replaceAll) {
            const match = matches.pop(); // The first match visually
            tr.insertText(replaceText, match.from, match.to);
            replacedCount = 1;
        } else {
            matches.forEach(match => {
                tr.insertText(replaceText, match.from, match.to);
            });
            replacedCount = matches.length;
        }

        editor.view.dispatch(tr);
        // Force the debouncer to fire so changes instantly reflect in the UI & saves
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        onChange(editor.getHTML());
        
        // Notify user
        // We can just set a toast, but an alert is simple. Or just silently handle single replace.
        if (replaceAll) alert(`${replacedCount} replacement(s) made.`);
    };

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
            
            // Check for Slash Menu
            const { $head } = editor.state.selection;
            if ($head && $head.parent.isTextblock) {
                const textBeforeCount = $head.parent.textContent.slice(0, $head.parentOffset);
                // Matches " /something" or starting the line with "/something"
                const match = /(?:^|\s)\/([a-zA-Z0-9]*)$/.exec(textBeforeCount);
                if (match) {
                    try {
                        const coords = editor.view.coordsAtPos($head.pos); // gets screen coords of cursor
                        setSlashMenuData({ open: true, query: match[1], pos: $head.pos - match[1].length - 1, len: match[1].length + 1, rect: coords });
                        setSlashIndex(0); // reset selection
                    } catch(e) {}
                } else {
                    setSlashMenuData(prev => prev.open ? { ...prev, open: false } : prev);
                }
            } else {
                setSlashMenuData(prev => prev.open ? { ...prev, open: false } : prev);
            }

            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                const html = editor.getHTML();
                onChange(html);
                const text = editor.getText();
                setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
            }, 600); // 600ms debounce prevents lag on every keystroke
        },
        onSelectionUpdate: ({ editor }) => {
            // Force toolbar re-render on every selection change (needed for image context bar)
            setEditorTick(t => t + 1);

            const { from, to, empty } = editor.state.selection;
            if (!empty && from !== to && !editor.isActive('image') && !editor.isActive('table')) {
                try {
                    const coords = editor.view.coordsAtPos(from);
                    setAiMenuData({
                        open: true,
                        rect: coords,
                        text: editor.state.doc.textBetween(from, to, ' ')
                    });
                } catch(e) {
                    setAiMenuData({ open: false, rect: null, text: '' });
                }
            } else {
                setAiMenuData({ open: false, rect: null, text: '' });
            }
        },
        editorProps: {
            attributes: {
                class: 'outline-none w-full',
                spellcheck: 'true',
            },
            // Backup: if mousedown plugin missed the image (e.g. posAtCoords edge case),
            // handleClickOn catches it on the click event (fires after mouseup).
            handleClickOn(view, pos, node, nodePos, event, direct) {
                if (direct && node && node.type && node.type.name === 'image') {
                    try {
                        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)));
                    } catch (_) {}
                    return true;
                }
                return false;
            },
        },
    });

    const debounceTimer = useRef(null);
    useEffect(() => {
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, []);

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
    const handleSave = () => { 
        if (!isSaving) {
            // Forcefully flush any pending keystrokes before executing save action
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                debounceTimer.current = null;
                const html = editor.getHTML();
                onChange(html);
                const text = editor.getText();
                setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
            }
            onSave(); 
        } 
    };

    // ── AI Edit Helper ─────────────────────────────────────────────────────
    const callAiEdit = async (action) => {
        if (!editor || !aiMenuData.text) return;
        const { from, to } = editor.state.selection;
        setAiLoading(true);
        setAiResult(null);
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch('/api/v1/knowledge-hub/ai/edit-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ action, text: aiMenuData.text })
            });
            if (!resp.ok) throw new Error(`Server error ${resp.status}`);
            const data = await resp.json();
            if (data.result) {
                setAiResult({ text: data.result, action, from, to });
            }
        } catch (e) {
            alert('AI Error: ' + e.message);
        } finally {
            setAiLoading(false);
        }
    };

    const acceptAiResult = () => {
        if (!editor || !aiResult) return;
        editor.chain().focus().setTextSelection({ from: aiResult.from, to: aiResult.to })
            .insertContent(aiResult.text).run();
        // Flush so the change is saved
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        onChange(editor.getHTML());
        setAiResult(null);
        setAiMenuData({ open: false, rect: null, text: '' });
    };

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

    // ── Slash Commands Defs ──────────────────────────────────────────────
    const SLASH_COMMANDS = [
        { id: 'h1', title: 'Heading 1', icon: <Type size={14}/>, run: (ed, pos, len) => ed.chain().deleteRange({from: pos, to: pos+len}).setHeading({ level: 1 }).run() },
        { id: 'h2', title: 'Heading 2', icon: <Type size={14}/>, run: (ed, pos, len) => ed.chain().deleteRange({from: pos, to: pos+len}).setHeading({ level: 2 }).run() },
        { id: 'h3', title: 'Heading 3', icon: <Type size={14}/>, run: (ed, pos, len) => ed.chain().deleteRange({from: pos, to: pos+len}).setHeading({ level: 3 }).run() },
        { id: 'bullet', title: 'Bullet List', icon: <List size={14}/>, run: (ed, pos, len) => ed.chain().deleteRange({from: pos, to: pos+len}).toggleBulletList().run() },
        { id: 'number', title: 'Numbered List', icon: <ListOrdered size={14}/>, run: (ed, pos, len) => ed.chain().deleteRange({from: pos, to: pos+len}).toggleOrderedList().run() },
        { id: 'table', title: 'Insert Table', icon: <Grid3x3 size={14}/>, run: (ed, pos, len) => ed.chain().deleteRange({from: pos, to: pos+len}).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
        { id: 'math', title: 'Math (Formula)', icon: <Quote size={14}/>, run: (ed, pos, len) => ed.chain().deleteRange({from: pos, to: pos+len}).insertContent('<span data-type="math"></span>').run() },
        { id: 'hr', title: 'Divider (HR)', icon: <Minus size={14}/>, run: (ed, pos, len) => ed.chain().deleteRange({from: pos, to: pos+len}).setHorizontalRule().run() }
    ];

    const filteredSlashCommands = SLASH_COMMANDS.filter(c => c.title.toLowerCase().includes((slashMenuData.query || '').toLowerCase()));

    const runSlashCommand = (cmd) => {
        cmd.run(editor, slashMenuData.pos, slashMenuData.len);
        setSlashMenuData({ open: false, query: '', pos: 0, len: 0, rect: null });
        editor.commands.focus();
    };

    return (
        <div
            className={`flex flex-col transition-all duration-200 ${isFullscreen
                ? 'fixed inset-0 z-[200] rounded-none'
                : 'h-full rounded-b-xl overflow-hidden relative'
            }`}
            style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#e8eaed' }}
            onKeyDown={e => {
                if (slashMenuData.open && filteredSlashCommands.length > 0) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => (i + 1) % filteredSlashCommands.length); return; }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => (i - 1 + filteredSlashCommands.length) % filteredSlashCommands.length); return; }
                    if (e.key === 'Enter') { 
                        e.preventDefault(); 
                        const cmd = filteredSlashCommands[slashIndex];
                        if (cmd) runSlashCommand(cmd);
                        return; 
                    }
                    if (e.key === 'Escape') { e.preventDefault(); setSlashMenuData(p => ({...p, open: false})); return; }
                }

                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    handleSave();
                }
            }}
        >
            {/* Slash Menu Floating Overlay */}
            {slashMenuData.open && filteredSlashCommands.length > 0 && slashMenuData.rect && (
                <div 
                    className="fixed z-[300] bg-white border border-slate-200 shadow-2xl rounded-lg py-1 w-56 max-h-[250px] overflow-y-auto"
                    style={{ top: slashMenuData.rect.bottom + 5, left: slashMenuData.rect.left }}
                >
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">Slash Commands</div>
                    {filteredSlashCommands.map((cmd, i) => (
                        <button
                            key={cmd.id}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-xs text-left transition-colors ${slashIndex === i ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                            onMouseEnter={() => setSlashIndex(i)}
                            onMouseDown={e => { e.preventDefault(); runSlashCommand(cmd); }}
                        >
                            <span className={slashIndex === i ? 'text-blue-600' : 'text-slate-400'}>{cmd.icon}</span>
                            {cmd.title}
                        </button>
                    ))}
                </div>
            )}
            {/* ═══ Title Bar ═══════════════════════════════════════════════ */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e3a5f] shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-blue-400 rounded flex items-center justify-center">
                        <FileText size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-blue-100 tracking-wide">Knowledge Document — GoldenEditor <span className="text-blue-400 font-normal">(Tiptap)</span></span>
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
            {/* data-tick forces re-render when selection changes so isActive() calls refresh */}
            <div data-tick={editorTick} className="flex items-center flex-wrap gap-1 px-3 py-2 bg-[#f3f6fb] border-b-2 border-blue-200 shrink-0 shadow-sm">

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

                {/* Line Height */}
                <select
                    value={lineHeight}
                    onMouseDown={saveSelection}
                    onFocus={saveSelection}
                    onChange={e => setLineHeight(parseFloat(e.target.value))}
                    title="Line Height / Line Spacing"
                    className="h-8 px-2 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-300 w-20"
                >
                    {[1.0, 1.15, 1.3, 1.5, 1.75, 1.85, 2.0, 2.25, 2.5, 3.0].map(lh => (
                        <option key={lh} value={lh}>↕ {lh}</option>
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

                {/* ─── Image Context Bar ─────────────────────────────────────────── */}
                {editor.isActive('image') && (() => {
                    const attrs = editor.getAttributes('image');
                    const curAlign = attrs.align || 'center';
                    const curWidth = attrs.width || '50%';
                    return (
                        <div className="flex items-center gap-0.5 bg-gradient-to-r from-blue-900 to-cyan-900 p-1 rounded-lg border border-blue-700 shadow-lg">
                            <ImageIcon size={12} className="text-blue-300 ml-1" />
                            <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest mx-1">Image</span>
                            <div className="w-px h-5 bg-blue-600 mx-0.5" />

                            {/* Alignment */}
                            {[
                                ['left',       '↤', 'Float Left'],
                                ['wrap-left',  '◧', 'Wrap Left'],
                                ['center',     '⊕', 'Center'],
                                ['wrap-right', '◨', 'Wrap Right'],
                                ['right',      '↦', 'Float Right'],
                            ].map(([a, icon, label]) => (
                                <button key={a}
                                    onMouseDown={e => { e.preventDefault(); editor.commands.updateAttributes('image', { align: a }); }}
                                    className={`px-2 py-1 text-[11px] font-bold rounded transition-colors ${curAlign === a ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-700'}`}
                                    title={label}
                                >{icon}</button>
                            ))}

                            <div className="w-px h-5 bg-blue-600 mx-0.5" />

                            {/* Width presets */}
                            {['25%', '50%', '75%', '100%'].map(w => (
                                <button key={w}
                                    onMouseDown={e => { e.preventDefault(); editor.commands.updateAttributes('image', { width: w }); }}
                                    className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${curWidth === w ? 'bg-cyan-500 text-white' : 'text-blue-200 hover:bg-blue-800'}`}
                                    title={`Width ${w}`}
                                >{w}</button>
                            ))}

                            <div className="w-px h-5 bg-blue-600 mx-0.5" />

                            {/* Delete */}
                            <button
                                onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteSelection().run(); }}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors"
                                title="Delete Image"
                            >
                                <Trash2 size={11}/> Delete
                            </button>
                        </div>
                    );
                })()}

                {/* ─── Table Insert / Controls ─────────────────────────────────────── */}
                {/* Table */}
                {!editor.isActive('table') && (
                    <TB onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                        active={false} title="Insert Table">
                        <Grid3x3 size={15} />
                    </TB>
                )}
                {editor.isActive('table') && (
                    <div className="flex items-center gap-0.5 bg-gradient-to-r from-indigo-900 to-blue-900 p-1 rounded-lg border border-indigo-700 shadow-lg">
                        <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest ml-2 mr-1.5">⊞ Table</span>
                        <div className="w-px h-5 bg-indigo-600 mx-0.5" />

                        {/* Column controls */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-indigo-200 hover:bg-indigo-700 rounded font-medium transition-colors" title="Add Column Before">
                            ← Col
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-indigo-200 hover:bg-indigo-700 rounded font-medium transition-colors" title="Add Column After">
                            Col →
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-300 hover:bg-red-900/50 rounded font-medium transition-colors" title="Delete Column">
                            ✕ Col
                        </button>

                        <div className="w-px h-5 bg-indigo-600 mx-0.5" />

                        {/* Row controls */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-indigo-200 hover:bg-indigo-700 rounded font-medium transition-colors" title="Add Row Before">
                            ↑ Row
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-indigo-200 hover:bg-indigo-700 rounded font-medium transition-colors" title="Add Row After">
                            Row ↓
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-300 hover:bg-red-900/50 rounded font-medium transition-colors" title="Delete Row">
                            ✕ Row
                        </button>

                        <div className="w-px h-5 bg-indigo-600 mx-0.5" />

                        {/* Merge / Split */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().mergeCells().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-yellow-300 hover:bg-yellow-900/40 rounded font-medium transition-colors" title="Merge Cells">
                            ⊔ Merge
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().splitCell().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-yellow-300 hover:bg-yellow-900/40 rounded font-medium transition-colors" title="Split Cell">
                            ⊓ Split
                        </button>
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeaderRow().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-blue-300 hover:bg-blue-900/50 rounded font-medium transition-colors" title="Toggle Header Row">
                            H Row
                        </button>

                        <div className="w-px h-5 bg-indigo-600 mx-0.5" />

                        {/* Delete table */}
                        <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors" title="Delete Entire Table">
                            <Trash2 size={11}/> Table
                        </button>
                    </div>
                )}

                {/* Spacer + Save / Extras */}
                <div className="ml-auto flex items-center gap-3 relative">
                    
                    <div className="flex items-center gap-1">
                        <TB onClick={() => setShowFindReplace(p => !p)} active={showFindReplace} title="Find & Replace (Ctrl+F workaround)">
                            <Search size={15} />
                        </TB>
                    </div>

                    {/* Floating Find & Replace Dialog */}
                    {showFindReplace && (
                        <div className="absolute top-10 right-0 z-50 bg-white p-3 rounded-lg shadow-xl border border-slate-200 w-64 flex flex-col gap-2 text-sm">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Find & Replace</span>
                                <button onClick={() => setShowFindReplace(false)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                            </div>
                            <input 
                                type="text" placeholder="Find text..." 
                                value={findText} onChange={e => setFindText(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <input 
                                type="text" placeholder="Replace with..." 
                                value={replaceText} onChange={e => setReplaceText(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <div className="flex gap-2 justify-end mt-1">
                                <button onMouseDown={e => { e.preventDefault(); handleReplace(false); }} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] uppercase font-bold rounded transition-colors">Replace First</button>
                                <button onMouseDown={e => { e.preventDefault(); handleReplace(true); }} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-bold rounded transition-colors">Replace All</button>
                            </div>
                        </div>
                    )}

                    <div className="w-px h-6 bg-slate-300" />

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
            <div className="flex-1 overflow-auto bg-[#525659] relative flex flex-col items-center py-4 md:py-8 px-2 md:px-4 pb-[200px] custom-scrollbar">
                
                {/* AI Tooltip — rendered in document.body via portal to avoid all z-index/clip issues */}
                {aiMenuData.open && aiMenuData.rect && !aiLoading && ReactDOM.createPortal(
                    <div 
                        style={{ 
                            position: 'fixed',
                            zIndex: 999999,
                            top:  Math.max(8, aiMenuData.rect.top - 8),
                            left: Math.max(8, aiMenuData.rect.left + (aiMenuData.rect.width || 0) / 2),
                            transform: 'translateX(-50%) translateY(-100%)',
                            pointerEvents: 'auto',
                        }}
                        className="flex items-center bg-white rounded-lg shadow-2xl border border-blue-300 divide-x divide-slate-100"
                    >
                        <button 
                            onMouseDown={e => { e.preventDefault(); callAiEdit('fix_grammar'); }}
                            className="flex items-center gap-1.5 px-3 py-2 hover:bg-violet-50 text-violet-700 text-[11px] font-bold uppercase rounded-l-lg transition-colors whitespace-nowrap"
                        >
                            <Sparkles size={13}/> Fix Grammar
                        </button>
                        <button 
                            onMouseDown={e => { e.preventDefault(); callAiEdit('rewrite'); }}
                            className="flex items-center gap-1.5 px-3 py-2 hover:bg-blue-50 text-blue-700 text-[11px] font-bold uppercase transition-colors whitespace-nowrap"
                        >
                            <MessageSquareDiff size={13}/> Rewrite
                        </button>
                        <button 
                            onMouseDown={e => { e.preventDefault(); callAiEdit('translate_en'); }}
                            className="flex items-center gap-1.5 px-3 py-2 hover:bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase rounded-r-lg transition-colors whitespace-nowrap"
                        >
                            <Languages size={13}/> Translate
                        </button>
                    </div>,
                    document.body
                )}

                {/* AI Result Preview Panel */}
                {aiResult && (
                    <div className="fixed z-[400] bottom-8 left-1/2 -translate-x-1/2 w-[560px] max-w-[90vw] bg-white rounded-xl shadow-2xl border border-blue-200 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600">
                            <Sparkles size={14} className="text-white"/>
                            <span className="text-xs font-bold text-white uppercase tracking-wide">
                                AI Result — {aiResult.action === 'fix_grammar' ? 'Grammar Fixed' : aiResult.action === 'rewrite' ? 'Rewritten' : 'Translated'}
                            </span>
                        </div>
                        <div className="p-4 text-sm text-slate-700 max-h-40 overflow-y-auto border-b border-slate-100" style={{fontFamily: "'Noto Serif Bengali', serif", lineHeight: 1.7}}>
                            {aiResult.text}
                        </div>
                        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-slate-50">
                            <button
                                onClick={() => { setAiResult(null); setAiMenuData({ open: false, rect: null, text: '' }); }}
                                className="px-4 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                            >✕ Discard</button>
                            <button
                                onClick={acceptAiResult}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >✓ Accept &amp; Replace</button>
                        </div>
                    </div>
                )}

                {/* AI Loading Indicator */}
                {aiLoading && (
                    <div className="fixed z-[400] bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white px-6 py-3 rounded-xl shadow-xl border border-blue-200">
                        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-600 rounded-full animate-spin"/>
                        <span className="text-sm font-semibold text-blue-700">AI is processing...</span>
                    </div>
                )}

                <div
                    className="bg-white shadow-[0_4px_20px_rgba(0,0,0,0.4)] w-full max-w-[794px] min-h-[max(800px,80vh)] md:min-h-[1123px] px-5 py-8 md:px-[80px] md:py-[72px] shrink-0"
                    style={{
                        zoom: zoom,
                        transition: 'all 0.15s ease',
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight,
                        color: '#1a1a2e',
                        fontFamily: "'Noto Serif Bengali', 'Kalpurush', 'SutonnyMJ', Georgia, serif",
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
