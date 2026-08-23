import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Palette, FileText, ChevronLeft, ChevronRight, Sparkles, Keyboard } from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';

const CanvasControlBar = () => {
    const { 
        zoom, setZoom, 
        canvasTheme, setCanvasTheme, 
        pageCount, uiLang,
        setShowSpacingOptimizer,
        setShowShortcutsModal
    } = useNexusEditor();

    const handleZoomIn = () => {
        setZoom(prev => Math.min(200, prev + 10));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(50, prev - 10));
    };

    const handleZoomReset = () => {
        setZoom(100);
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 print:hidden transition-all duration-300 max-w-[95vw]">
            <div className="backdrop-blur-md bg-white/90 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-full py-1.5 px-3 sm:px-4 flex items-center gap-2 sm:gap-4 font-outfit">
                {/* Page Indicator */}
                <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs border-r border-slate-200/80 pr-2.5 sm:pr-3 shrink-0">
                    <FileText size={14} className="text-slate-400" />
                    <span>
                        {uiLang === 'bn' ? 'পেজ:' : 'Pages:'} <span className="text-indigo-600 font-black">{pageCount}</span>
                    </span>
                </div>

                {/* Smart Spacing Optimizer Trigger */}
                <button
                    onClick={() => setShowSpacingOptimizer(prev => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 text-indigo-700 border border-indigo-200/80 shadow-2xs transition-all active:scale-95 shrink-0"
                    title={uiLang === 'bn' ? 'স্মার্ট স্পেসিং অপ্টিমাইজার' : 'Smart Spacing Optimizer'}
                >
                    <Sparkles size={13} className="text-amber-500 animate-pulse" />
                    <span className="hidden xs:inline">{uiLang === 'bn' ? 'স্মার্ট স্পেস' : 'Auto-Fit'}</span>
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 sm:gap-2 border-l border-r border-slate-200/80 px-2 sm:px-3">
                    <button 
                        onClick={handleZoomOut} 
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                        title={uiLang === 'bn' ? 'জুম কমান (Ctrl + -)' : 'Zoom Out (Ctrl + -)'}
                    >
                        <ZoomOut size={14} />
                    </button>
                    <button 
                        onClick={handleZoomReset}
                        className="text-xs font-black text-slate-700 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                        title={uiLang === 'bn' ? 'রিসেট জুম (Ctrl + 0)' : 'Reset Zoom (Ctrl + 0)'}
                    >
                        {zoom}%
                    </button>
                    <button 
                        onClick={handleZoomIn} 
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                        title={uiLang === 'bn' ? 'জুম বাড়ান (Ctrl + +)' : 'Zoom In (Ctrl + +)'}
                    >
                        <ZoomIn size={14} />
                    </button>
                </div>

                {/* Canvas Background Theme Selector */}
                <div className="hidden sm:flex items-center gap-1.5 border-r border-slate-200/80 pr-3">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Palette size={12} />
                    </span>
                    <div className="flex bg-slate-100/80 p-0.5 rounded-full border border-slate-200/50">
                        {/* White Theme */}
                        <button 
                            onClick={() => setCanvasTheme('white')}
                            className={`w-4.5 h-4.5 rounded-full border transition-all ${canvasTheme === 'white' ? 'border-indigo-500 ring-2 ring-indigo-200 bg-white scale-110 shadow-sm' : 'border-slate-300 bg-white hover:scale-105'}`}
                            title={uiLang === 'bn' ? 'ক্লাসিক সাদা' : 'Classic White'}
                        />
                        {/* Cream/Eye Care Theme */}
                        <button 
                            onClick={() => setCanvasTheme('cream')}
                            className={`w-4.5 h-4.5 rounded-full border transition-all ml-1 ${canvasTheme === 'cream' ? 'border-amber-600 ring-2 ring-amber-200 bg-[#fbf0d9] scale-110 shadow-sm' : 'border-amber-300 bg-[#fbf0d9] hover:scale-105'}`}
                            title={uiLang === 'bn' ? 'আই-কেয়ার ক্রিম' : 'Eye-Care Cream'}
                        />
                        {/* Dark Theme */}
                        <button 
                            onClick={() => setCanvasTheme('dark')}
                            className={`w-4.5 h-4.5 rounded-full border transition-all ml-1 ${canvasTheme === 'dark' ? 'border-slate-800 ring-2 ring-slate-400 bg-slate-800 scale-110 shadow-sm' : 'border-slate-600 bg-slate-800 hover:scale-105'}`}
                            title={uiLang === 'bn' ? 'হাই-কন্ট্রাস্ট ডার্ক' : 'High-Contrast Dark'}
                        />
                    </div>
                </div>

                {/* Shortcuts Modal Guide Button */}
                <button
                    onClick={() => setShowShortcutsModal(prev => !prev)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-95"
                    title={uiLang === 'bn' ? 'কীবোর্ড শর্টকাটস (Ctrl + /)' : 'Keyboard Shortcuts (Ctrl + /)'}
                >
                    <Keyboard size={15} />
                </button>
            </div>
        </div>
    );
};

export default CanvasControlBar;

