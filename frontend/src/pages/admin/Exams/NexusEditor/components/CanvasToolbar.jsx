import React from 'react';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, Sigma, Image as ImageIcon, Table as TableIcon } from 'lucide-react';

const CanvasToolbar = ({ editor, editorMode, hasMath, hasTable, hasImage }) => {
    if (editorMode !== 'DISCONNECTED_FREE_EDIT' || !editor) {
        return null;
    }

    return (
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
    );
};

export default CanvasToolbar;
