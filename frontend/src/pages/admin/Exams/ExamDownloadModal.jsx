import React, { useState } from 'react';
import { FileDown, X, Loader2, CheckCircle, Eye, Shuffle, FileText, Droplets, AlertTriangle, FileText as FileWord } from 'lucide-react';
import { downloadExamPdf, downloadExamWord } from '../../../services/pdfService';

// ── Toggle Switch ─────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, description, icon: Icon }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
        <div
            onClick={() => onChange(!checked)}
            className={`relative mt-0.5 w-11 h-6 rounded-full transition-all flex-shrink-0 ${checked ? 'bg-primary' : 'bg-slate-300'}`}
        >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
        </div>
        <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700 group-hover:text-slate-900">
                {Icon && <Icon size={13} className="text-slate-400" />}
                {label}
            </div>
            {description && <div className="text-xs text-slate-400 mt-0.5">{description}</div>}
        </div>
    </label>
);

// ══════════════════════════════════════════════════════════════════════════════
//  DOWNLOAD MODAL (PDF + WORD)
// ══════════════════════════════════════════════════════════════════════════════
const ExamDownloadModal = ({ exam, onClose }) => {

    const [opts, setOpts] = useState({
        includeAnswers: false,
        includeAnswerSheet: false,
        includeWatermark: false,
        shuffleQuestions: false,
        shuffleOptions: false,
        paperSize: 'A4',
        template: 'default',
        fontSize: 11,
    });

    const [loadingPdf, setLoadingPdf] = useState(false);
    const [loadingWord, setLoadingWord] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState(null);

    const setOpt = (key, val) => setOpts(prev => ({ ...prev, [key]: val }));

    const handleDownloadPdf = async () => {
        setLoadingPdf(true);
        setError(null);
        setDone(false);
        try {
            await downloadExamPdf(exam.id, opts);
            setDone(true);
        } catch (e) {
            setError(e.response?.data?.message || 'PDF generation failed. Please try again.');
        } finally {
            setLoadingPdf(false);
        }
    };

    const handleDownloadWord = async () => {
        setLoadingWord(true);
        setError(null);
        setDone(false);
        try {
            await downloadExamWord(exam.id, opts);
            setDone(true);
        } catch (e) {
            setError(e.response?.data?.message || 'Word doc generation failed. Please try again.');
        } finally {
            setLoadingWord(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-secondary p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <FileDown size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Download Exam Paper</h2>
                                <p className="text-blue-100 text-xs mt-0.5 line-clamp-1">{exam?.title}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Options */}
                <div className="p-5 space-y-5">

                    {/* Paper Settings */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Settings</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Paper Size</label>
                                <select value={opts.paperSize} onChange={e => setOpt('paperSize', e.target.value)}
                                    className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400">
                                    <option value="A4">A4 (Standard)</option>
                                    <option value="LETTER">Letter (US)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Font Size</label>
                                <select value={opts.fontSize} onChange={e => setOpt('fontSize', parseFloat(e.target.value))}
                                    className="w-full p-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-400">
                                    <option value={9}>Small (9pt)</option>
                                    <option value={11}>Normal (11pt)</option>
                                    <option value={13}>Large (13pt)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Content Options */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Content Options</h3>
                        <div className="space-y-4">
                            <Toggle
                                checked={opts.includeAnswers}
                                onChange={v => setOpt('includeAnswers', v)}
                                label="Show Correct Answers"
                                description="Highlight correct MCQ options in the paper"
                                icon={Eye}
                            />
                            <Toggle
                                checked={opts.includeAnswerSheet}
                                onChange={v => setOpt('includeAnswerSheet', v)}
                                label="Include Answer Sheet"
                                description="Attach answers at the end of the document"
                                icon={FileText}
                            />
                            <Toggle
                                checked={opts.includeWatermark}
                                onChange={v => setOpt('includeWatermark', v)}
                                label="Add Watermark"
                                description="Watermark with exam title (PDF only)"
                                icon={Droplets}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Shuffle Options */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Randomization</h3>
                        <div className="space-y-4">
                            <Toggle
                                checked={opts.shuffleQuestions}
                                onChange={v => setOpt('shuffleQuestions', v)}
                                label="Shuffle Questions"
                                description="Randomly reorder questions in the document"
                                icon={Shuffle}
                            />
                            <Toggle
                                checked={opts.shuffleOptions}
                                onChange={v => setOpt('shuffleOptions', v)}
                                label="Shuffle MCQ Options"
                                description="Randomly reorder A/B/C/D options"
                                icon={Shuffle}
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {done && !error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                            <CheckCircle size={15} />
                            Document downloaded successfully!
                        </div>
                    )}

                    {/* Download Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleDownloadPdf}
                            disabled={loadingPdf || loadingWord}
                            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-all shadow-lg shadow-rose-200 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {loadingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                            Download PDF
                        </button>
                        <button
                            onClick={handleDownloadWord}
                            disabled={loadingPdf || loadingWord}
                            className="flex-1 py-3 rounded-xl bg-primary hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {loadingWord ? <Loader2 size={16} className="animate-spin" /> : <FileWord size={16} />}
                            Download Word (.docx)
                        </button>
                    </div>

                    <p className="text-center text-xs text-slate-400">
                        For Word, you can open and edit the file in Microsoft Word.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExamDownloadModal;
