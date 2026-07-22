import React from 'react';
import { ImageIcon, UploadCloud, Loader2, Eye, RotateCw, Trash2, X } from 'lucide-react';

export default function ImageSidebar({
    imageUploading,
    fileInputRef,
    handleImageSelect,
    extractedSourceImages,
    setLightboxSrc,
    handleReCropExistingImage,
    reCroppingUrl,
    handleRemoveExtractedImage,
    lightboxSrc
}) {
    return (
        <div className="w-full lg:w-[420px] shrink-0 space-y-6 lg:sticky lg:top-20">
            {/* Image Fix Tool */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-sm border border-indigo-100 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                <div className="px-6 py-4 flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg shrink-0 mt-0.5"><ImageIcon size={20} className="text-indigo-600" /></div>
                    <div>
                        <h2 className="font-bold text-indigo-900 text-sm">Broken Image Extractor Fix</h2>
                        <p className="text-xs text-indigo-700/80 leading-relaxed mt-1">
                            Take a screenshot of the real PDF using <kbd className="bg-indigo-100 px-1 py-0.5 rounded border border-indigo-200 text-indigo-800">Win+Shift+S</kbd> then press <kbd className="bg-indigo-100 px-1 py-0.5 rounded border border-indigo-200 text-indigo-800">Ctrl+V</kbd> anywhere on this page to upload and crop it instantly!
                        </p>
                        <button type="button" onClick={() => !imageUploading && fileInputRef.current?.click()} className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-70">
                            {imageUploading ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : <><UploadCloud size={16} /> Advanced Upload / Crop</>}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </div>
                </div>
            </div>

            {/* Source Images Extracted */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
                <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between z-10 shadow-sm">
                    <div className="flex items-center gap-2">
                        <ImageIcon size={16} className="text-blue-400" />
                        <h2 className="font-bold text-sm tracking-wide">প্রশ্নের ছবিসমূহ</h2>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-700 px-2 py-0.5 rounded">
                        {extractedSourceImages.length}টি ছবি
                    </span>
                </div>
                
                <div className="p-4 overflow-y-auto bg-slate-50 flex-1 hide-scrollbar">
                    {extractedSourceImages.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">এই প্রশ্নে কোনো ছবি নেই।</p>
                            <p className="text-xs mt-1 text-slate-305">উপরে Upload / Crop বাটন ব্যবহার করে ছবি যোগ করুন।</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {extractedSourceImages.map((src, idx) => (
                                <div key={idx} className="relative aspect-square border border-slate-200 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center cursor-pointer shadow-sm group hover:border-indigo-500 hover:shadow-md transition-all">
                                    <img 
                                        src={src} 
                                        alt={`ছবি ${idx + 1}`}
                                        className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105"
                                        onClick={() => setLightboxSrc(src)}
                                    />
                                    <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1 z-10">
                                        <button 
                                            type="button"
                                            onClick={() => setLightboxSrc(src)}
                                            className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 hover:text-indigo-650 transition-colors shadow-sm"
                                            title="পূর্ণ আকারে দেখুন"
                                        >
                                            <Eye size={12} className="stroke-[2.5]" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleReCropExistingImage(src)}
                                            disabled={imageUploading}
                                            className="p-1 rounded bg-white hover:bg-slate-100 text-indigo-600 hover:text-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                                            title="পুনরায় ক্রপ করুন"
                                        >
                                            <RotateCw size={12} className="stroke-[2.5]" />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveExtractedImage(src)}
                                            className="p-1 rounded bg-white hover:bg-slate-100 text-red-500 hover:text-red-600 transition-colors shadow-sm"
                                            title="মুছে ফেলুন"
                                        >
                                            <Trash2 size={12} className="stroke-[2.5]" />
                                        </button>
                                    </div>
                                    <span className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-[2px] text-white text-[8px] font-black px-1.5 py-0.5 rounded leading-none">
                                        #{idx + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-start gap-2 text-[10px] text-indigo-600">
                        <RotateCw size={10} className="text-indigo-400 mt-0.5" />
                        <span>পুনরায় ক্রপ করতে 🔁 বাটনে ক্লিক করুন • পেস্ট করতে Ctrl+V চাপুন</span>
                    </div>
                </div>
            </div>

            {/* Lightbox fullscreen modal */}
            {lightboxSrc && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setLightboxSrc(null)}>
                    <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-sm font-medium"
                            onClick={() => setLightboxSrc(null)}>
                            <X size={18} /> বন্ধ করুন
                        </button>
                        <img src={lightboxSrc} alt="পূর্ণ আকার"
                            className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border-2 border-white/10" />
                        <div className="flex gap-3 mt-4 justify-center">
                            <button type="button"
                                onClick={() => { handleReCropExistingImage(lightboxSrc); setLightboxSrc(null); }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg">
                                <RotateCw size={15} /> পুনরায় ক্রপ করুন
                            </button>
                            <button type="button"
                                onClick={() => { handleRemoveExtractedImage(lightboxSrc); setLightboxSrc(null); }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg">
                                <Trash2 size={15} /> ছবি মুছুন
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
