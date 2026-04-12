import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, ChevronDown } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ═══ Common Math Symbols & Templates ═══
const SYMBOL_GROUPS = [
    {
        label: 'মৌলিক',
        symbols: [
            { latex: '+', display: '+' }, { latex: '-', display: '−' }, { latex: '\\times', display: '×' },
            { latex: '\\div', display: '÷' }, { latex: '\\pm', display: '±' }, { latex: '=', display: '=' },
            { latex: '\\neq', display: '≠' }, { latex: '\\approx', display: '≈' }, { latex: '\\leq', display: '≤' },
            { latex: '\\geq', display: '≥' }, { latex: '<', display: '<' }, { latex: '>', display: '>' },
            { latex: '\\infty', display: '∞' }, { latex: '\\%', display: '%' },
        ]
    },
    {
        label: 'গ্রিক',
        symbols: [
            { latex: '\\alpha', display: 'α' }, { latex: '\\beta', display: 'β' }, { latex: '\\gamma', display: 'γ' },
            { latex: '\\delta', display: 'δ' }, { latex: '\\theta', display: 'θ' }, { latex: '\\lambda', display: 'λ' },
            { latex: '\\mu', display: 'μ' }, { latex: '\\pi', display: 'π' }, { latex: '\\sigma', display: 'σ' },
            { latex: '\\phi', display: 'φ' }, { latex: '\\omega', display: 'ω' }, { latex: '\\rho', display: 'ρ' },
            { latex: '\\epsilon', display: 'ε' }, { latex: '\\eta', display: 'η' },
            { latex: '\\Delta', display: 'Δ' }, { latex: '\\Sigma', display: 'Σ' },
            { latex: '\\Omega', display: 'Ω' }, { latex: '\\Theta', display: 'Θ' },
        ]
    },
    {
        label: 'গণিত',
        symbols: [
            { latex: '\\sqrt{x}', display: '√x' }, { latex: '\\sqrt[n]{x}', display: 'ⁿ√x' },
            { latex: '\\frac{a}{b}', display: 'a/b' }, { latex: 'x^{n}', display: 'xⁿ' },
            { latex: 'x_{n}', display: 'xₙ' }, { latex: 'x^{2}', display: 'x²' },
            { latex: '\\log', display: 'log' }, { latex: '\\ln', display: 'ln' },
            { latex: '\\sin', display: 'sin' }, { latex: '\\cos', display: 'cos' },
            { latex: '\\tan', display: 'tan' }, { latex: '\\cot', display: 'cot' },
            { latex: '\\lim_{x \\to a}', display: 'lim' },
            { latex: '\\sum_{i=1}^{n}', display: 'Σ' }, { latex: '\\prod_{i=1}^{n}', display: 'Π' },
            { latex: '\\int_{a}^{b}', display: '∫' },
        ]
    },
    {
        label: 'পদার্থ/রসায়ন',
        symbols: [
            { latex: '\\vec{F}', display: 'F⃗' }, { latex: '\\hat{n}', display: 'n̂' },
            { latex: '\\dot{x}', display: 'ẋ' }, { latex: '\\ddot{x}', display: 'ẍ' },
            { latex: '\\bar{x}', display: 'x̄' },
            { latex: '\\rightarrow', display: '→' }, { latex: '\\leftarrow', display: '←' },
            { latex: '\\leftrightarrow', display: '↔' }, { latex: '\\uparrow', display: '↑' },
            { latex: '\\downarrow', display: '↓' },
            { latex: '\\degree', display: '°' }, { latex: '\\circ', display: '∘' },
            { latex: '\\partial', display: '∂' }, { latex: '\\nabla', display: '∇' },
            { latex: '\\hbar', display: 'ℏ' },
        ]
    },
];

const TEMPLATES = [
    { label: 'ভগ্নাংশ', latex: '\\frac{a}{b}' },
    { label: 'বর্গমূল', latex: '\\sqrt{x}' },
    { label: 'সূচক', latex: 'x^{n}' },
    { label: 'সাবস্ক্রিপ্ট', latex: 'x_{n}' },
    { label: 'যোগফল', latex: '\\sum_{i=1}^{n} x_i' },
    { label: 'সমাকলন', latex: '\\int_{a}^{b} f(x) \\, dx' },
    { label: 'লিমিট', latex: '\\lim_{x \\to \\infty} f(x)' },
    { label: 'ম্যাট্রিক্স 2×2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { label: 'ম্যাট্রিক্স 3×3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}' },
    { label: 'দ্বিপদী সূত্র', latex: '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k' },
    { label: 'পিথাগোরাস', latex: 'a^2 + b^2 = c^2' },
    { label: 'দ্বিঘাত সূত্র', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
    { label: 'নিউটন F=ma', latex: 'F = ma' },
    { label: 'আইনস্টাইন', latex: 'E = mc^2' },
    { label: 'সমীকরণ সিস্টেম', latex: '\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}' },
    { label: 'রাসায়নিক সমীকরণ', latex: '2H_2 + O_2 \\rightarrow 2H_2O' },
    { label: 'তাপগতিবিদ্যা', latex: '\\Delta G = \\Delta H - T\\Delta S' },
    { label: 'ভেক্টর', latex: '\\vec{F} = m\\vec{a}' },
];

const EquationEditorModal = ({ isOpen, onClose, onInsert }) => {
    const [latex, setLatex] = useState('');
    const [error, setError] = useState('');
    const [activeGroup, setActiveGroup] = useState(0);
    const previewRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (isOpen) { setLatex(''); setError(''); }
    }, [isOpen]);

    // Live preview
    useEffect(() => {
        if (!previewRef.current) return;
        if (!latex.trim()) {
            previewRef.current.innerHTML = '<span style="color:#94a3b8;font-size:14px;">সমীকরণের প্রিভিউ এখানে দেখা যাবে...</span>';
            setError('');
            return;
        }
        try {
            previewRef.current.innerHTML = katex.renderToString(latex, {
                throwOnError: true,
                displayMode: true,
                output: 'html',
            });
            setError('');
        } catch (e) {
            setError(e.message.replace('KaTeX parse error: ', ''));
        }
    }, [latex]);

    const insertSymbol = useCallback((sym) => {
        const input = inputRef.current;
        if (!input) { setLatex(prev => prev + sym); return; }
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const newLatex = latex.substring(0, start) + sym + latex.substring(end);
        setLatex(newLatex);
        setTimeout(() => {
            input.focus();
            const pos = start + sym.length;
            input.setSelectionRange(pos, pos);
        }, 0);
    }, [latex]);

    const handleInsert = () => {
        if (!latex.trim() || error) return;
        try {
            const html = katex.renderToString(latex, {
                throwOnError: true,
                displayMode: false,
                output: 'html',
            });
            // Wrap in a span with data-latex attribute for re-editing
            const wrappedHtml = `<span class="math-equation" data-latex="${encodeURIComponent(latex)}" contenteditable="false">${html}</span>`;
            onInsert(wrappedHtml, latex);
            setLatex('');
            onClose();
        } catch (e) {
            setError(e.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-between">
                    <div>
                        <h2 className="text-white font-bold text-base">সমীকরণ সম্পাদক</h2>
                        <p className="text-white/70 text-[11px]">LaTeX ব্যবহার করে গাণিতিক সমীকরণ লিখুন</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* Preview */}
                    <div className="bg-slate-50 rounded-xl border-2 border-slate-200 p-5 min-h-[80px] flex items-center justify-center">
                        <div ref={previewRef} className="text-center" />
                    </div>
                    {error && (
                        <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600">{error}</div>
                    )}

                    {/* LaTeX Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">LaTeX কোড</label>
                        <textarea
                            ref={inputRef}
                            value={latex}
                            onChange={(e) => setLatex(e.target.value)}
                            className="w-full h-20 p-3 font-mono text-sm bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none placeholder-slate-600"
                            placeholder="যেমন: \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleInsert(); }}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Ctrl+Enter চেপে সরাসরি যোগ করুন</p>
                    </div>

                    {/* Quick Templates */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">প্রস্তুত টেমপ্লেট</label>
                        <div className="flex flex-wrap gap-1.5">
                            {TEMPLATES.map((t, i) => (
                                <button key={i} type="button" onClick={() => setLatex(t.latex)}
                                    className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors whitespace-nowrap">
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Symbol Palette */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">চিহ্ন প্যালেট</label>
                        <div className="flex gap-1 mb-2">
                            {SYMBOL_GROUPS.map((group, i) => (
                                <button key={i} type="button" onClick={() => setActiveGroup(i)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${activeGroup === i
                                        ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                    {group.label}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 sm:grid-cols-9 gap-1">
                            {SYMBOL_GROUPS[activeGroup].symbols.map((sym, i) => (
                                <button key={i} type="button" onClick={() => insertSymbol(sym.latex)}
                                    className="h-9 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-base font-medium text-slate-700 flex items-center justify-center transition-all active:scale-95"
                                    title={sym.latex}>
                                    {sym.display}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                        <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono">Ctrl+Enter</kbd> সরাসরি যোগ করুন
                    </p>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium">
                            বাতিল
                        </button>
                        <button type="button" onClick={handleInsert} disabled={!latex.trim() || !!error}
                            className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                            সমীকরণ যোগ করুন
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EquationEditorModal;
