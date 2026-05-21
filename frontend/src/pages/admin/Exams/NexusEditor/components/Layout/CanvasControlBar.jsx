import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Palette, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';

const CanvasControlBar = () => {
    const { 
        zoom, setZoom, 
        canvasTheme, setCanvasTheme, 
        pageCount, uiLang 
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 print:hidden transition-all duration-300">
            <div className="backdrop-blur-md bg-white/85 border border-slate-200/60 shadow-xl rounded-full py-2 px-5 flex items-center gap-5">
                {/* Page Indicator */}
                <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs border-r border-slate-200/80 pr-4">
                    <FileText size={14} className="text-slate-400" />
                    <span>
                        {uiLang === 'bn' ? 'মোট পেজ:' : 'Pages:'} <span className="text-indigo-600 font-extrabold">{pageCount}</span>
                    </span>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2 border-r border-slate-200/80 pr-4">
                    <button 
                        onClick={handleZoomOut} 
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                        title={uiLang === 'bn' ? 'জুম কমান' : 'Zoom Out'}
                    >
                        <ZoomOut size={15} />
                    </button>
                    <button 
                        onClick={handleZoomReset}
                        className="text-xs font-black text-slate-600 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                        title={uiLang === 'bn' ? 'রিসেট জুম' : 'Reset Zoom'}
                    >
                        {zoom}%
                    </button>
                    <button 
                        onClick={handleZoomIn} 
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95"
                        title={uiLang === 'bn' ? 'জুম বাড়ান' : 'Zoom In'}
                    >
                        <ZoomIn size={15} />
                    </button>
                </div>

                {/* Canvas Background Theme Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Palette size={12} />
                        {uiLang === 'bn' ? 'থিম:' : 'Theme:'}
                    </span>
                    <div className="flex bg-slate-100/80 p-0.5 rounded-full border border-slate-200/50">
                        {/* White Theme */}
                        <button 
                            onClick={() => setCanvasTheme('white')}
                            className={`w-5 h-5 rounded-full border transition-all ${canvasTheme === 'white' ? 'border-indigo-500 ring-2 ring-indigo-200 bg-white scale-110 shadow-sm' : 'border-slate-300 bg-white hover:scale-105'}`}
                            title={uiLang === 'bn' ? 'ক্লাসিক সাদা' : 'Classic White'}
                        />
                        {/* Cream/Eye Care Theme */}
                        <button 
                            onClick={() => setCanvasTheme('cream')}
                            className={`w-5 h-5 rounded-full border transition-all ml-1 ${canvasTheme === 'cream' ? 'border-amber-600 ring-2 ring-amber-200 bg-[#fbf0d9] scale-110 shadow-sm' : 'border-amber-300 bg-[#fbf0d9] hover:scale-105'}`}
                            title={uiLang === 'bn' ? 'আই-কেয়ার ক্রিম' : 'Eye-Care Cream'}
                        />
                        {/* Dark Theme */}
                        <button 
                            onClick={() => setCanvasTheme('dark')}
                            className={`w-5 h-5 rounded-full border transition-all ml-1 ${canvasTheme === 'dark' ? 'border-slate-800 ring-2 ring-slate-400 bg-slate-800 scale-110 shadow-sm' : 'border-slate-600 bg-slate-800 hover:scale-105'}`}
                            title={uiLang === 'bn' ? 'হাই-কন্ট্রাস্ট ডার্ক' : 'High-Contrast Dark'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CanvasControlBar;
