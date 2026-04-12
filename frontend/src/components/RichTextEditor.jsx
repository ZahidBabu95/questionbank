import React, { useState, useRef, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'react-quill/dist/quill.bubble.css';
import 'katex/dist/katex.min.css';
import EquationEditorModal from './EquationEditorModal';

/**
 * RichTextEditor — A ReactQuill wrapper with KaTeX equation support.
 * 
 * Usage:
 *   <RichTextEditor value={val} onChange={setVal} placeholder="..." height="h-28" />
 *   <RichTextEditor value={val} onChange={setVal} theme="bubble" minimal />
 * 
 * Props:
 *   - value, onChange: controlled input
 *   - placeholder: hint text
 *   - height: Tailwind height class for editor (default: "h-28")
 *   - theme: "snow" (default) or "bubble"
 *   - minimal: if true, shows minimal toolbar (for options etc.)
 *   - showEquation: if true (default), show Σ equation button
 *   - className: additional CSS classes
 */
const RichTextEditor = ({
    value,
    onChange,
    placeholder = '',
    height = 'h-28',
    theme = 'snow',
    minimal = false,
    showEquation = true,
    className = '',
}) => {
    const [showEquationModal, setShowEquationModal] = useState(false);
    const quillRef = useRef(null);

    // Insert equation HTML at cursor position
    const handleEquationInsert = useCallback((html, latex) => {
        const quill = quillRef.current?.getEditor();
        if (!quill) {
            // Fallback: append to value
            onChange((value || '') + html);
            return;
        }
        const range = quill.getSelection(true);
        const index = range ? range.index : quill.getLength() - 1;

        // Use Quill's clipboard to paste the HTML
        quill.clipboard.dangerouslyPasteHTML(index, html, 'user');

        // Move cursor after inserted content
        setTimeout(() => {
            quill.setSelection(index + 1, 0);
        }, 0);
    }, [value, onChange]);

    // Toolbar configurations
    const fullToolbar = useMemo(() => [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'direction': 'rtl' }],
        ['clean'],
    ], []);

    const minimalToolbar = useMemo(() => [
        ['bold', 'italic', 'underline'],
        [{ 'script': 'sub' }, { 'script': 'super' }],
    ], []);

    const modules = useMemo(() => ({
        toolbar: theme === 'bubble' ? false : (minimal ? minimalToolbar : fullToolbar),
    }), [theme, minimal, fullToolbar, minimalToolbar]);

    const formats = useMemo(() => [
        'header', 'bold', 'italic', 'underline', 'strike', 'script',
        'list', 'bullet', 'direction', 'clean',
    ], []);

    return (
        <div className="relative">
            {/* Equation Button — appears above/right of editor */}
            {showEquation && (
                <div className="flex items-center gap-1.5 mb-1.5">
                    <button
                        type="button"
                        onClick={() => setShowEquationModal(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all active:scale-95"
                        title="সমীকরণ যোগ করুন (LaTeX)"
                    >
                        <span className="text-sm font-serif italic">Σ</span>
                        সমীকরণ
                    </button>
                    <span className="text-[10px] text-slate-400">
                        • গাণিতিক সূত্র, সমীকরণ, রাসায়নিক সংকেত
                    </span>
                </div>
            )}

            {/* Rich Text Editor */}
            <ReactQuill
                ref={quillRef}
                theme={theme}
                value={value}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
                className={`${height} ${theme === 'snow' ? 'mb-10' : ''} ${className}`}
            />

            {/* Equation Editor Modal */}
            <EquationEditorModal
                isOpen={showEquationModal}
                onClose={() => setShowEquationModal(false)}
                onInsert={handleEquationInsert}
            />
        </div>
    );
};

export default RichTextEditor;
