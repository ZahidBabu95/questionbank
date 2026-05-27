import React, { useEffect, useState, useRef } from 'react';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { useExamManager } from '../../hooks/useExamManager';
import { X, FileText, DownloadCloud } from 'lucide-react';

const FilenameModal = () => {
    const { showFilenameModal, setShowFilenameModal, docSettings, uiLang } = useNexusEditor();
    const { handleDownloadPdf } = useExamManager();
    const [fileName, setFileName] = useState('');
    const [animationClass, setAnimationClass] = useState('opacity-0 scale-95');
    const inputRef = useRef(null);

    useEffect(() => {
        if (showFilenameModal) {
            // Prefill with docSettings.exam title
            setFileName(docSettings.exam || (uiLang === 'bn' ? 'পরীক্ষার প্রশ্নপত্র' : 'Exam Paper'));
            
            // Auto focus on input box
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);

            const timer = setTimeout(() => {
                setAnimationClass('opacity-100 scale-100');
            }, 30);
            return () => clearTimeout(timer);
        } else {
            setAnimationClass('opacity-0 scale-95');
        }
    }, [showFilenameModal, docSettings.exam, uiLang]);

    if (!showFilenameModal) return null;

    const handleConfirm = () => {
        const cleanName = fileName.trim() || (uiLang === 'bn' ? 'প্রশ্নপত্র' : 'Exam_Paper');
        setShowFilenameModal(false);
        // Start PDF generation with custom filename!
        handleDownloadPdf(false, cleanName);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            setShowFilenameModal(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
            {/* Modal Box */}
            <div className={`w-[92%] max-w-md bg-white/80 dark:bg-slate-900/85 border border-white/40 dark:border-slate-800/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-300 ease-out transform ${animationClass}`}>
                
                {/* Decorative Blur Background bubbles */}
                <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

                {/* Close Button */}
                <button 
                    onClick={() => setShowFilenameModal(false)}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all active:scale-90"
                >
                    <X size={16} />
                </button>

                <div className="flex flex-col gap-5">
                    {/* Header Block with Icon */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner shrink-0">
                            <FileText size={20} className="stroke-[2]" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                {uiLang === 'bn' ? 'পিডিএফ ফাইল ডাউনলোড' : 'Download PDF File'}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {uiLang === 'bn' ? 'ডাউনলোড করার আগে ফাইলের একটি নাম সেট করুন' : 'Enter a filename for your exam paper'}
                            </p>
                        </div>
                    </div>

                    {/* Input Field Box */}
                    <div className="text-left space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                            {uiLang === 'bn' ? 'ফাইলের নাম' : 'Filename'}
                        </label>
                        <div className="relative flex items-center">
                            <input 
                                ref={inputRef}
                                type="text"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={uiLang === 'bn' ? 'ফাইলের নাম লিখুন...' : 'Enter file name...'}
                                className="w-full pl-3 pr-12 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-transparent transition-all shadow-sm"
                            />
                            <span className="absolute right-3 text-[10px] font-bold text-slate-400/80">
                                .pdf
                            </span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 mt-1.5">
                        <button 
                            onClick={() => setShowFilenameModal(false)}
                            className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 flex-1"
                        >
                            {uiLang === 'bn' ? 'বাতিল করুন' : 'Cancel'}
                        </button>
                        
                        <button 
                            onClick={handleConfirm}
                            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 hover:scale-[1.02] active:scale-95 flex-1 flex items-center justify-center gap-1.5"
                        >
                            <DownloadCloud size={14} className="stroke-[2.5]" />
                            <span>{uiLang === 'bn' ? 'ডাউনলোড শুরু' : 'Start Download'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilenameModal;
