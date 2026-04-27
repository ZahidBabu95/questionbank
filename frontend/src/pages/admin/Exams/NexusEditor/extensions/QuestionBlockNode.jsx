import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { RefreshCw, BookOpen, Trash2 } from 'lucide-react';

const QuestionComponent = ({ node, editor, deleteNode }) => {
    // Check if the editor is in strict mode by looking at the CSS class we injected
    const isStrict = editor.view.dom.classList.contains('strict-analytics-mode');
    
    return (
        <NodeViewWrapper className={`question-block-wrapper my-4`}>
            <div 
                className={`relative border-2 rounded-xl p-5 transition-all group ${isStrict ? 'border-indigo-100 bg-white shadow-sm hover:shadow-md hover:border-indigo-300' : 'border-slate-200 bg-slate-50'}`}
                contentEditable={false} // Absolute lock on content
            >
                {/* Block Header */}
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest ${node.attrs.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {node.attrs.type}
                        </span>
                        <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                            <BookOpen size={13}/> {node.attrs.chapterName}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold border-l border-slate-200 pl-3">
                            Marks: {node.attrs.marks}
                        </span>
                    </div>
                    
                    {/* Action Buttons (Visible only in Strict Mode on Hover) */}
                    {isStrict && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 absolute -top-3 -right-3 bg-white shadow-lg border border-slate-200 rounded-xl p-1 z-10">
                            <button className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-bold text-xs flex items-center gap-1" title="Swap Question">
                                <RefreshCw size={13} /> Swap
                            </button>
                            <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            <button onClick={deleteNode} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remove Question">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Question Text */}
                <div className="text-[1em] text-slate-800 font-medium leading-relaxed" 
                     dangerouslySetInnerHTML={{ __html: node.attrs.questionText }} 
                />
                
                {/* MCQ Options Rendering */}
                {node.attrs.type === 'MCQ' && node.attrs.options && node.attrs.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 mt-5 pt-4 border-t border-slate-100 border-dashed">
                        {node.attrs.options.map((opt, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-[0.9em] text-slate-600">
                                <span className="font-bold text-slate-800 mt-0.5">{String.fromCharCode(97 + idx)})</span>
                                <span dangerouslySetInnerHTML={{ __html: opt.optionText }} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Free Edit Warning overlay (optional) */}
                {!isStrict && (
                    <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border-2 border-dashed border-slate-400">
                        <span className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-md">
                            Convert to Plain Text to Edit
                        </span>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

export const QuestionBlockNode = Node.create({
    name: 'questionBlock',
    group: 'block',
    atom: true, // This makes the node an unbreakable, atomic unit in Tiptap

    addAttributes() {
        return {
            id: { default: null, parseHTML: el => el.getAttribute('id') },
            type: { default: 'MCQ', parseHTML: el => el.getAttribute('type') || 'MCQ' },
            questionText: { default: 'New Question', parseHTML: el => el.getAttribute('questiontext') || 'New Question' },
            chapterName: { default: 'Unknown Chapter', parseHTML: el => el.getAttribute('chaptername') || 'Unknown Chapter' },
            marks: { default: 1, parseHTML: el => parseInt(el.getAttribute('marks')) || 1 },
            options: { 
                default: [],
                parseHTML: element => {
                    try {
                        return JSON.parse(element.getAttribute('data-options') || '[]');
                    } catch(e) {
                        return [];
                    }
                },
                renderHTML: attributes => {
                    if (!attributes.options) return {};
                    return { 'data-options': JSON.stringify(attributes.options) };
                }
            }
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="question-block"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'question-block' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(QuestionComponent);
    },
});
