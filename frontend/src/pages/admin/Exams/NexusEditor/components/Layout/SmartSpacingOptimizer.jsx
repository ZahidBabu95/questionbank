import React, { useState } from 'react';
import { Sparkles, Sliders, RotateCcw, Check, ArrowDownUp, Minimize2, Maximize2, X } from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';

const SmartSpacingOptimizer = () => {
    const { 
        docSettings, 
        updateMultiSettings, 
        pageCount, 
        uiLang, 
        addToast,
        showSpacingOptimizer,
        setShowSpacingOptimizer
    } = useNexusEditor();

    const [appliedPreset, setAppliedPreset] = useState(null); // 'compact' | 'balanced' | 'relaxed'

    if (!showSpacingOptimizer) return null;

    const handleApplyCompact = () => {
        updateMultiSettings({
            lineHeight: 1.35,
            questionSpacing: 8,
            optionSpacing: 4,
            sectionSpacing: 10,
            fontSize: Math.max(12, (docSettings.fontSize || 14) - 0.5)
        });
        setAppliedPreset('compact');
        addToast(
            uiLang === 'bn' 
                ? 'কম্প্যাক্ট লেআউট প্রয়োগ করা হয়েছে! পেজের অতিরিক্ত জায়গা সাশ্রয় হবে।' 
                : 'Compact spacing applied to reduce page count.',
            'success'
        );
    };

    const handleApplyBalanced = () => {
        updateMultiSettings({
            lineHeight: 1.5,
            questionSpacing: 12,
            optionSpacing: 6,
            sectionSpacing: 14,
            fontSize: 14
        });
        setAppliedPreset('balanced');
        addToast(
            uiLang === 'bn' 
                ? 'ব্যালেন্সড লেআউট প্রয়োগ করা হয়েছে।' 
                : 'Balanced spacing applied.',
            'success'
        );
    };

    const handleApplyRelaxed = () => {
        updateMultiSettings({
            lineHeight: 1.7,
            questionSpacing: 18,
            optionSpacing: 8,
            sectionSpacing: 20,
            fontSize: Math.min(16, (docSettings.fontSize || 14) + 0.5)
        });
        setAppliedPreset('relaxed');
        addToast(
            uiLang === 'bn' 
                ? 'রিলাক্সড/খোলামেলা লেআউট প্রয়োগ করা হয়েছে।' 
                : 'Relaxed spacing applied.',
            'success'
        );
    };

    const handleReset = () => {
        updateMultiSettings({
            lineHeight: 1.6,
            questionSpacing: 14,
            optionSpacing: 6,
            sectionSpacing: 16,
            fontSize: 14
        });
        setAppliedPreset(null);
        addToast(
            uiLang === 'bn' 
                ? 'ডিফল্ট স্পেসিং রিসেট করা হয়েছে।' 
                : 'Default spacing restored.',
            'info'
        );
    };

    return (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 print:hidden animate-in fade-in slide-in-from-bottom-4 duration-200 font-outfit max-w-[95vw] sm:max-w-md w-full">
            <div className="backdrop-blur-xl bg-white/95 border border-indigo-100 shadow-[0_12px_40px_-5px_rgba(99,102,241,0.15)] rounded-3xl p-4 sm:p-5 space-y-4 relative">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25">
                            <Sparkles size={16} className="text-amber-300 animate-pulse" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                <span>{uiLang === 'bn' ? 'স্মার্ট স্পেসিং অপ্টিমাইজার' : 'Smart Spacing Optimizer'}</span>
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.2 rounded-full border border-indigo-100">
                                    {pageCount} {uiLang === 'bn' ? 'পেজ' : 'Pages'}
                                </span>
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium">
                                {uiLang === 'bn' 
                                    ? '১-ক্লিকে প্রশ্নপত্রের স্পেসিং ও পেজ সংখ্যা অপ্টিমাইজ করুন।' 
                                    : 'Auto-calibrate line-height and padding in 1-click.'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSpacingOptimizer(false)}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Quick Presets Grid */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Compact Preset */}
                    <button
                        onClick={handleApplyCompact}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 group active:scale-95 ${
                            appliedPreset === 'compact'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs'
                                : 'bg-slate-50 hover:bg-white border-slate-200/80 text-slate-700 hover:border-indigo-200'
                        }`}
                    >
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 shadow-2xs">
                            <Minimize2 size={13} />
                        </div>
                        <span className="text-[11px] font-black">{uiLang === 'bn' ? 'কম্প্যাক্ট' : 'Compact'}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{uiLang === 'bn' ? 'পেজ সাশ্রয়ী' : 'Save Pages'}</span>
                    </button>

                    {/* Balanced Preset */}
                    <button
                        onClick={handleApplyBalanced}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 group active:scale-95 ${
                            appliedPreset === 'balanced'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs'
                                : 'bg-slate-50 hover:bg-white border-slate-200/80 text-slate-700 hover:border-indigo-200'
                        }`}
                    >
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 shadow-2xs">
                            <ArrowDownUp size={13} />
                        </div>
                        <span className="text-[11px] font-black">{uiLang === 'bn' ? 'ব্যালেন্সড' : 'Balanced'}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{uiLang === 'bn' ? 'স্ট্যান্ডার্ড' : 'Standard'}</span>
                    </button>

                    {/* Relaxed Preset */}
                    <button
                        onClick={handleApplyRelaxed}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 group active:scale-95 ${
                            appliedPreset === 'relaxed'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-xs'
                                : 'bg-slate-50 hover:bg-white border-slate-200/80 text-slate-700 hover:border-indigo-200'
                        }`}
                    >
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 shadow-2xs">
                            <Maximize2 size={13} />
                        </div>
                        <span className="text-[11px] font-black">{uiLang === 'bn' ? 'খোলামেলা' : 'Relaxed'}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{uiLang === 'bn' ? 'প্রশস্ত' : 'Roomy'}</span>
                    </button>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <button
                        onClick={handleReset}
                        className="text-slate-500 hover:text-slate-700 font-bold flex items-center gap-1.5 transition-colors"
                    >
                        <RotateCcw size={12} />
                        <span>{uiLang === 'bn' ? 'ডিফল্ট স্পেস' : 'Reset Default'}</span>
                    </button>

                    <button
                        onClick={() => setShowSpacingOptimizer(false)}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-xs active:scale-95"
                    >
                        {uiLang === 'bn' ? 'সম্পন্ন' : 'Done'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmartSpacingOptimizer;
