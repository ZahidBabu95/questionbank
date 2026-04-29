import React, { useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { X } from 'lucide-react';

const MathInlineView = ({ node, updateAttributes, editor }) => {
    const { latex } = node.attrs;
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');

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
                className={`katex-render-container rounded transition-colors ${isEditing ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'hover:bg-slate-100'}`}
                dangerouslySetInnerHTML={{ __html: html }} 
            />
            
            {isEditing && (
                <div 
                    contentEditable={false}
                    className="absolute z-[200] left-0 bottom-full mb-2 flex items-center bg-white shadow-2xl rounded-xl border border-indigo-200 p-3"
                    style={{ width: '320px' }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                >
                    <div className="flex flex-col w-full gap-2 font-outfit">
                         <div className="flex items-center justify-between">
                             <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Edit Equation (LaTeX)</span>
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
                             <button onClick={handleSave} className="px-3 py-1.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow-sm transition-colors">Apply Formula</button>
                         </div>
                    </div>
                </div>
            )}
        </NodeViewWrapper>
    );
};

export const MathNode = Node.create({
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
