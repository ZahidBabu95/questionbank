import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, ImageIcon, Globe, Map, ChevronRight, AlertCircle, Calendar, Clock, User, Building, Share2 } from 'lucide-react';

export default function BookRegistryModal({
    isOpen,
    isEditMode,
    closeModal,
    formData,
    setFormData,
    isSaving,
    isUploadingCover,
    uploadCoverImage,
    handleCreateOrUpdateBook,
    handleCoverPaste,
    hierarchy,
    modalLevel,
    setModalLevel,
    modalStream,
    setModalStream,
    modalClass,
    setModalClass,
    filteredClassSubjectsForModal,
    subjectLanguageMap
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={closeModal}
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 40 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-5xl overflow-hidden shadow-2xl relative z-[110] flex flex-col max-h-[95vh] border border-white/20"
                    >
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
                                    <UploadCloud size={28} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {isEditMode ? 'Metadata Sync' : 'Intelligence Registration'}
                                    </h2>
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Knowledge Hub Core Registry</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="w-12 h-12 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateOrUpdateBook} onPaste={handleCoverPaste} className="flex-1 overflow-y-auto bg-white p-8 md:p-10 custom-scrollbar">
                            <div className="flex flex-col md:flex-row gap-12">
                                
                                {/* Left Shadow Box: Cover */}
                                <div className="w-full md:w-[280px] shrink-0">
                                    <div className="sticky top-0 space-y-6">
                                        <div className="relative group">
                                            <div className="aspect-[3/4.2] bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 overflow-hidden shadow-inner flex flex-col items-center justify-center text-center transition-all duration-500 group-hover:border-indigo-400 p-4">
                                                {formData.coverImageUrl ? (
                                                    <img src={formData.coverImageUrl} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                                                ) : (
                                                    <div className="p-4 flex flex-col items-center gap-3">
                                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-200">
                                                            <ImageIcon size={32} />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                                            Drop Image Here<br/>or Paste URL
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {/* Pro Upload Overlay */}
                                                <label className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm">
                                                    {isUploadingCover ? (
                                                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>
                                                            <div className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl mb-4 animate-bounce">
                                                                <UploadCloud size={28} />
                                                            </div>
                                                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white">Upload New Cover</span>
                                                        </>
                                                    )}
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files[0] && uploadCoverImage(e.target.files[0])} />
                                                </label>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Cover Link (Optional)</label>
                                            <input 
                                                type="text" 
                                                placeholder="https://..." 
                                                value={formData.coverImageUrl} 
                                                onChange={e => setFormData({...formData, coverImageUrl: e.target.value})} 
                                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-xs font-bold outline-none shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                 {/* Right Content Area */}
                                <div className="flex-1 space-y-10 pb-10">
                                    {/* Step 1: Version Selection */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                <Globe size={18} />
                                            </div>
                                            <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Book Version (ধাপ ১)</h3>
                                        </div>
                                        <div className="relative group">
                                            <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Language Version / সংস্করণ</label>
                                            <select 
                                                required 
                                                value={formData.language} 
                                                onChange={e => {
                                                    const lang = e.target.value;
                                                    setFormData({...formData, language: lang, classSubjectId: ''});
                                                }} 
                                                className="w-full px-6 py-5 bg-white border-2 border-indigo-500 rounded-3xl focus:border-indigo-600 text-base font-black text-slate-800 outline-none transition-all appearance-none cursor-pointer shadow-lg shadow-indigo-100/50"
                                            >
                                                <option value="">Select Version (ভার্সন নির্বাচন করুন)</option>
                                                <option value="Bangla">Bangla Version (বাংলা সংস্করণ)</option>
                                                <option value="English">English Version (ইংরেজি সংস্করণ)</option>
                                                <option value="Bilingual">Bilingual / Mixed Version (দ্বিভাষিক সংস্করণ)</option>
                                            </select>
                                        </div>
                                    </section>

                                    {/* Step 2: Curriculum Mapping */}
                                    <section className={`space-y-4 transition-all duration-300 ${!formData.language ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                                                <Map size={18} />
                                            </div>
                                            <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Curriculum Mapping (ধাপ ২)</h3>
                                        </div>
                                        
                                        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 space-y-5">
                                            <div className="flex items-center flex-wrap gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                <DriveRoot size={14}/> <span>Knowledge Root</span>
                                                {modalLevel && <><ChevronRight size={10}/> <span className="text-slate-900 bg-white px-2 py-1 rounded shadow-sm">{hierarchy.levels?.find(l=>l.id===modalLevel)?.name}</span></>}
                                                {modalStream && <><ChevronRight size={10}/> <span className="text-slate-900 bg-white px-2 py-1 rounded shadow-sm">{hierarchy.streams?.find(s=>s.id===modalStream)?.name}</span></>}
                                                {modalClass && <><ChevronRight size={10}/> <span className="text-slate-900 bg-white px-2 py-1 rounded shadow-sm">{hierarchy.classes?.find(c=>c.id===modalClass)?.name}</span></>}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <select disabled={!formData.language} value={modalLevel} onChange={e => {setModalLevel(e.target.value); setModalStream(''); setModalClass(''); setFormData({...formData, classSubjectId: ''});}} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer">
                                                    <option value="">Level</option>
                                                    {hierarchy.levels?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                                <select disabled={!formData.language || !modalLevel} value={modalStream} onChange={e => {setModalStream(e.target.value); setModalClass(''); setFormData({...formData, classSubjectId: ''});}} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer">
                                                    <option value="">Stream</option>
                                                    {hierarchy.streams?.filter(s => !modalLevel || s._levelId === modalLevel).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                                <select disabled={!formData.language || !modalLevel || (hierarchy.streams?.filter(s => s._levelId === modalLevel).length > 0 && !modalStream)} value={modalClass} onChange={e => {setModalClass(e.target.value); setFormData({...formData, classSubjectId: ''});}} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer">
                                                    <option value="">Class</option>
                                                    {hierarchy.classes?.filter(c => !modalStream || c._streamId === modalStream).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                <select disabled={!formData.language || !modalClass || filteredClassSubjectsForModal.length === 0} value={formData.classSubjectId} onChange={e => setFormData({...formData, classSubjectId: e.target.value})} className="w-full px-4 py-3 bg-indigo-600 border border-indigo-600 rounded-2xl text-[11px] font-black text-white outline-none shadow-lg shadow-indigo-100 transition-all disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer">
                                                    <option value="">Target Subject</option>
                                                     {filteredClassSubjectsForModal.map(cs => {
                                                         const subData = subjectLanguageMap[cs.id];
                                                         return (
                                                             <option key={cs.id} value={cs.id} className="text-slate-800 bg-white">
                                                                 {subData?.name || 'Unknown'} {subData?.isEnglish ? '[EN]' : '[BN]'}
                                                             </option>
                                                         );
                                                     })}
                                                </select>
                                            </div>
                                            {modalClass && filteredClassSubjectsForModal.length === 0 && (
                                                <p className="text-[10px] font-black text-rose-500 mt-2 px-2 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                                    <AlertCircle size={14} strokeWidth={2.5} /> No {formData.language} Version subjects mapped to this class! Map it in settings first.
                                                </p>
                                            )}
                                        </div>
                                    </section>

                                    {/* Step 3: Identity & Publication Details */}
                                    <section className={`space-y-6 transition-all duration-300 ${!formData.language ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                                <AlertCircle size={18} />
                                            </div>
                                            <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Base Identity (ধাপ ৩)</h3>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="relative group">
                                                <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Official Book Title</label>
                                                <input disabled={!formData.language} required type="text" placeholder="e.g. পদার্থবিজ্ঞান ১ম পত্র (Class 11)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-3xl focus:border-indigo-500 text-base font-black text-slate-800 outline-none transition-all shadow-sm group-hover:border-slate-200 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"/>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="relative group">
                                                    <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Asset Type</label>
                                                    <select disabled={!formData.language} value={formData.bookType} onChange={e => setFormData({...formData, bookType: e.target.value})} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 text-sm font-black text-slate-700 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed">
                                                        <option value="TEXTBOOK">Standard Textbook</option>
                                                        <option value="GUIDE">Ref Guide / Solution</option>
                                                        <option value="QUESTION_BANK">Question Repository</option>
                                                        <option value="LECTURE_SHEET">Lecture Materials</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className={`space-y-6 transition-all duration-300 ${!formData.language ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                                <Share2 size={18} />
                                            </div>
                                            <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Publication Intelligence (ধাপ ৪)</h3>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="relative group">
                                                <User size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                                <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Primary Author</label>
                                                <input disabled={!formData.language} type="text" placeholder="ড. শাহজাহান তপন" value={formData.authorName} onChange={e => setFormData({...formData, authorName: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-bold text-slate-800 outline-none shadow-sm disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"/>
                                            </div>
                                            <div className="relative group">
                                                <Building size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                                <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Publisher</label>
                                                <input disabled={!formData.language} type="text" placeholder="e.g. NCTB, হাসান বুকস" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-bold text-slate-800 outline-none shadow-sm disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"/>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="relative group">
                                                <Calendar size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                                <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Initial Year</label>
                                                <input disabled={!formData.language} type="text" placeholder="2015" value={formData.firstPublished} onChange={e => setFormData({...formData, firstPublished: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-bold text-slate-800 outline-none shadow-sm disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"/>
                                            </div>
                                            <div className="relative group">
                                                <Clock size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                                                <label className="absolute -top-2 left-4 bg-white px-2 text-[10px] font-black text-indigo-500 uppercase z-10">Active Edition</label>
                                                <input disabled={!formData.language} type="text" placeholder="25th Ed, 2024" value={formData.latestEdition} onChange={e => setFormData({...formData, latestEdition: e.target.value})} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 text-sm font-bold text-slate-800 outline-none shadow-sm disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed"/>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </form>

                        {/* Sticky Modal Footer */}
                        <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4 shrink-0">
                            <button type="button" onClick={closeModal} className="px-8 py-3.5 text-slate-500 hover:text-rose-500 font-black uppercase tracking-widest text-xs transition-colors cursor-pointer">Discard Changes</button>
                            <button type="submit" onClick={handleCreateOrUpdateBook} disabled={isSaving || isUploadingCover || !formData.title.trim() || !formData.language} className="flex items-center gap-3 px-10 py-4 bg-indigo-600 text-white font-black rounded-[1.5rem] hover:bg-slate-900 active:scale-95 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                                {isSaving ? <><span className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></span> Syncing...</> : (isEditMode ? 'Commit Updates' : 'Initialize Book')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

const DriveRoot = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M20 7L12 12L4 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2"/>
    </svg>
);
