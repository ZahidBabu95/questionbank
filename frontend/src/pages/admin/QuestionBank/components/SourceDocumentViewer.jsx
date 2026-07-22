import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, RotateCw } from 'lucide-react';

const SourceDocumentViewer = ({ file, remoteUrl, remoteType, activeSourcePage = 1 }) => {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    if (!file && !remoteUrl) return null;

    const actualType = file ? file.type : remoteType || '';
    const isPdf = actualType === 'application/pdf';
    const isImage = actualType.startsWith('image/');
    
    // Convert backend stored file path to proxy endpoint if needed, or use createObjectURL
    const fileUrl = file ? URL.createObjectURL(file) : 
                    (remoteUrl.startsWith('http') || remoteUrl.startsWith('/')) ? remoteUrl : `/api/v1/storage?path=${encodeURIComponent(remoteUrl)}`;

    const fileName = file ? file.name : (remoteUrl.split('/').pop() || 'Remote Document');

    const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
    const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
    const handleReset = () => { setZoom(1); setRotation(0); };
    const handleRotate = () => setRotation(r => (r + 90) % 360);

    return (
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col h-full w-full">
            {/* Toolbar */}
            <div className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 p-3 flex items-center justify-between z-10">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <div className="flex flex-col">
                        <span className="text-white text-xs">সোর্স ফাইল ভিউয়ার</span>
                        <span className="text-slate-400 capitalize truncate max-w-[200px] tracking-normal font-medium">{fileName} {isPdf && activeSourcePage && `(পৃষ্ঠা: ${activeSourcePage})`}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                    <button onClick={handleZoomOut} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all active:scale-95" title="Zoom Out"><ZoomOut size={16} /></button>
                    <span className="text-[11px] font-bold text-slate-300 w-12 text-center font-mono bg-slate-800 py-1 rounded-md border border-slate-700">{Math.round(zoom * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all active:scale-95" title="Zoom In"><ZoomIn size={16} /></button>
                    <div className="w-px h-4 bg-slate-700 mx-1"></div>
                    {isImage && <button onClick={handleRotate} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all active:scale-95" title="Rotate"><RotateCw size={16} /></button>}
                    <button onClick={handleReset} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all active:scale-95" title="Reset View"><Maximize size={16} /></button>
                </div>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 overflow-auto bg-[#1e1e1e] flex items-center justify-center p-6 custom-scrollbar relative">
                
                {/* PDF overlay tooltip wrapper */}
                <div className="absolute top-4 right-4 bg-indigo-500/90 backdrop-blur-sm text-white text-[10px] px-3 py-1.5 rounded-full font-bold shadow-lg border border-indigo-400/50 z-20 flex items-center gap-1.5 animate-pulse">
                    💡 ডানদিকের প্রশ্নের সাথে মিলিয়ে প্রুফিং করুন
                </div>

                {isImage && (
                    <div className="relative transition-all duration-300 ease-out flex items-center justify-center" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: 'center' }}>
                        <img 
                            src={fileUrl} 
                            alt="Source Document" 
                            className="max-w-full h-auto shadow-2xl rounded-lg ring-1 ring-white/10" 
                            style={{ maxHeight: '180vh' }}
                        />
                    </div>
                )}
                
                {isPdf && (
                    <div className="w-full h-full relative transition-transform duration-200" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                        <iframe 
                            src={`${fileUrl}#page=${activeSourcePage}&view=fitH`} 
                            className="w-full h-full border-0 bg-transparent rounded-lg shadow-2xl"
                            title="PDF Viewer"
                        />
                    </div>
                )}

                {!isImage && !isPdf && (
                    <div className="text-slate-400 text-sm flex flex-col items-center">
                        <span className="text-4xl mb-2">📄</span>
                        এই ফাইলের প্রিভিউ সাপোর্টেড নয়
                    </div>
                )}
            </div>
            {/* Context Tooltip */}
            <div className="bg-indigo-50 border-t border-indigo-100 p-2 text-[11px] text-indigo-600 font-medium text-center">
                💡 ডান দিকের প্রশ্নের সাথে বাম দিকের পেজটি মিলিয়ে দেখুন।
            </div>
        </div>
    );
};

export default SourceDocumentViewer;
