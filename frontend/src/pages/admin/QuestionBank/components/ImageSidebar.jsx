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
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-700 px-2 py-0.5 rounded">{extractedSourceImages.length}টি ছবি</span>
                </div>

                <div className="p-4 overflow-y-auto bg-slate-50 flex-1 hide-scrollbar space-y-4">
                    {extractedSourceImages.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">এই প্রশ্নে কোনো ছবি নেই।</p>
                            <p className="text-xs mt-1 text-slate-300">উপরে Upload / Crop বাটন ব্যবহার করে ছবি যোগ করুন।</p>
                        </div>
                    ) : (
                        extractedSourceImages.map((src, idx) => (
                            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-300 hover:shadow-indigo-100 transition-all">
                                {/* Image header */}
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">ছবি {idx + 1}</span>
                                    <div className="flex items-center gap-1">
                                        {/* Fullscreen preview */}
                                        <button type="button"
                                            onClick={() => setLightboxSrc(src)}
                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-colors"
                                            title="পূর্ণ আকারে দেখুন">
                                            <Eye size={13} />
                                        </button>
                                        {/* Re-crop button */}
                                        <button type="button"
                                            onClick={() => handleReCropExistingImage(src)}
                                            disabled={imageUploading}
                                            className="p-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-400 transition-colors disabled:opacity-50"
                                            title="এই ছবিটি পুনরায় ক্রপ করুন">
                                            {imageUploading && reCroppingUrl === src
                                                ? <Loader2 size={13} className="animate-spin" />
                                                : <RotateCw size={13} />}
                                        </button>
                                        {/* Remove */}
                                        <button type="button"
                                            onClick={() => handleRemoveExtractedImage(src)}
                                            className="p-1.5 rounded-lg bg-white border border-red-200 text-red-400 hover:bg-red-50 hover:border-red-400 transition-colors"
                                            title="এই ছবিটি প্রশ্ন থেকে সরান">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                                {/* Image preview — click to fullscreen */}
                                <div
                                    className="bg-slate-900 flex items-center justify-center min-h-[120px] max-h-[280px] overflow-hidden cursor-zoom-in"
                                    onClick={() => setLightboxSrc(src)}
                                    title="ক্লিক করুন পূর্ণ আকারে দেখতে">
                                    <img src={src} alt={`প্রশ্নের ছবি ${idx + 1}`}
                                        className="max-w-full max-h-[280px] object-contain transition-transform hover:scale-[1.02]"
                                    />
                                </div>
                                {/* Action hint */}
                                <div className="px-3 py-2 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5">
                                    <RotateCw size={10} className="text-indigo-400" />
                                    পুনরায় ক্রপ করতে 🔁 বাটনে ক্লিক করুন • পেস্ট করতে Ctrl+V চাপুন
                                </div>
                            </div>
                        ))
                    )}
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
