import React from 'react';
import { FileText, ImageIcon, Upload } from 'lucide-react';

export default function FileUploadZone({ 
    dragging, 
    setDragging, 
    handleDrop, 
    processing, 
    fileInputRef, 
    handleFileSelect, 
    file, 
    isPdf, 
    activeTab, 
    setFile, 
    setExtractedQuestions, 
    setMetadata 
}) {
    return (
        <div className={`bg-white rounded-xl shadow-sm border-2 border-dashed transition-all p-8 text-center ${dragging ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300'}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setDragging(false); }}
            onDrop={handleDrop}
            onClick={() => !processing && fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
                onChange={e => { handleFileSelect(e.target.files[0]); e.target.value = ''; }} />
            {file ? (
                <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                        {isPdf ? <FileText size={28} className="text-violet-500" /> : <ImageIcon size={28} className="text-fuchsia-500" />}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-700">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB • {isPdf ? 'PDF' : 'Image'}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); setExtractedQuestions([]); setMetadata(null); }}
                        className="text-xs text-rose-500 hover:text-rose-700 font-medium z-10 relative">
                        ✕ ফাইল সরান
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <Upload size={28} className="text-slate-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-600">
                            {activeTab === 'scraper' ? 'প্রশ্নপত্রের PDF বা ছবি আপলোড করুন' : 'বইয়ের পৃষ্ঠার PDF বা ছবি আপলোড করুন'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">PDF, JPG, PNG, WebP • সর্বোচ্চ ২০MB</p>
                    </div>
                </div>
            )}
        </div>
    );
}
