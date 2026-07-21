import React from 'react';
import { X, Layers, ChevronDown, Settings2 } from 'lucide-react';

export default function SubjectSelectorModal({
    levels = [],
    streams = [],
    classes = [],
    filteredSubjects = [],
    selectedLevelId,
    setSelectedLevelId,
    selectedStreamId,
    setSelectedStreamId,
    selectedClassId,
    setSelectedClassId,
    selectedSubjectId,
    setSelectedSubjectId,
    handleExitMobileView,
    isSuperAdmin,
    setShowAllOverride
}) {
    return (
        <div className="absolute inset-0 z-[35] bg-slate-950/60 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500">
            {/* Stunning Gradient Ambient Glow Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-pink-500/20 to-purple-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-indigo-600/20 to-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

            <div className="bg-white/95 border border-white/60 rounded-[36px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.3)] p-7 sm:p-9 max-w-[490px] w-full flex flex-col items-center text-center gap-6 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative overflow-hidden">
                
                {/* Glowing Top Border Gradient Decorator */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600"></div>

                {/* Elegant floating Close/Back Button */}
                <button 
                    onClick={handleExitMobileView}
                    className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-full transition-all duration-300 hover:rotate-90 shadow-sm"
                    title="ফিরে যান"
                >
                    <X size={16} className="stroke-[2.5]" />
                </button>

                {/* Luxurious Glowing Icon Block */}
                <div className="relative group mt-2">
                    <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-600 rounded-3xl blur-md opacity-45 group-hover:opacity-75 transition-opacity duration-300 animate-pulse" />
                    <div className="relative w-16 h-16 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center text-white shadow-lg border border-white/20 transform hover:scale-105 transition-transform duration-300">
                        <Layers size={30} className="stroke-[1.8]" />
                    </div>
                </div>

                {/* Title and description with dynamic colors */}
                <div className="space-y-1 text-center">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight sm:text-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 bg-clip-text text-transparent">বিষয় নির্বাচন করুন</h3>
                </div>

                {/* Grid of beautifully styled inputs */}
                <div className="w-full bg-slate-50/70 border border-slate-150 p-5 rounded-3xl flex flex-col gap-4 shadow-sm backdrop-blur-md">
                    {/* Level Dropdown */}
                    {levels.length > 1 && (
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Level / স্তর
                            </label>
                            <div className="relative group">
                                <select 
                                    value={selectedLevelId} 
                                    onChange={(e) => setSelectedLevelId(e.target.value)} 
                                    className="appearance-none w-full h-11 px-4 pr-10 bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-[12px] font-bold text-slate-700 transition-all cursor-pointer shadow-sm focus:outline-none"
                                >
                                    <option value="">সব স্তর</option>
                                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={14} className="stroke-[2.5]" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stream Dropdown */}
                    {streams.length > 1 && (
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Stream / বিভাগ
                            </label>
                            <div className="relative group">
                                <select 
                                    value={selectedStreamId} 
                                    onChange={(e) => setSelectedStreamId(e.target.value)} 
                                    className="appearance-none w-full h-11 px-4 pr-10 bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl text-[12px] font-bold text-slate-700 transition-all cursor-pointer shadow-sm focus:outline-none"
                                >
                                    <option value="">সব বিভাগ</option>
                                    {streams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={14} className="stroke-[2.5]" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Class Dropdown */}
                    {classes.length > 1 && (
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Class / শ্রেণি
                            </label>
                            <div className="relative group">
                                <select 
                                    value={selectedClassId} 
                                    onChange={(e) => setSelectedClassId(e.target.value)} 
                                    className={`appearance-none w-full h-11 px-4 pr-10 bg-white hover:bg-slate-50/80 border rounded-2xl text-[12px] font-bold text-slate-700 transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 ${!selectedClassId ? 'border-indigo-300 animate-pulse hover:border-indigo-400 focus:border-indigo-500' : 'border-slate-200/80 hover:border-indigo-400 focus:border-indigo-500'}`}
                                >
                                    <option value="">সব শ্রেণি</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <ChevronDown size={14} className="stroke-[2.5]" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Subject Dropdown */}
                    <div className="flex flex-col gap-1.5 text-left">
                        <label className="text-[10px] font-extrabold text-primary uppercase tracking-widest pl-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> Subject / বিষয়
                        </label>
                        <div className="relative group">
                            <select 
                                value={selectedSubjectId} 
                                onChange={(e) => setSelectedSubjectId(e.target.value)} 
                                className={`appearance-none w-full h-11 px-4 pr-10 bg-white border-2 rounded-2xl text-[12px] font-black text-indigo-955 focus:outline-none transition-all cursor-pointer shadow-sm focus:ring-4 focus:ring-primary/10 ${selectedClassId && !selectedSubjectId ? 'border-primary shadow-[0_0_12px_rgba(233,30,140,0.25)] focus:border-primary' : 'border-slate-250 hover:border-primary/50 focus:border-primary'} disabled:opacity-60 disabled:cursor-not-allowed`}
                                disabled={filteredSubjects.length === 0}
                            >
                                {filteredSubjects.length === 0 ? (
                                    <option value="">শ্রেণি নির্বাচন করুন</option>
                                ) : (
                                    <>
                                        <option value="">বিষয় সিলেক্ট করুন</option>
                                        {filteredSubjects.map(s => <option key={s.classSubjectId} value={s.classSubjectId}>{s.subjectName}</option>)}
                                    </>
                                )}
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-primary transition-colors">
                                <ChevronDown size={14} className="stroke-[2.5]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exit/Back Button at bottom of Selector Modal */}
                <button
                    onClick={handleExitMobileView}
                    className="text-[11px] font-extrabold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50/80 px-4 py-2 rounded-2xl transition-all duration-300 flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                    <X size={13} className="stroke-[2.5]" />
                    <span>ফিরে যান / বন্ধ করুন</span>
                </button>

                {/* Super Admin Control Box */}
                {isSuperAdmin && (
                    <div className="w-full border-t border-slate-100/80 pt-4 mt-1 flex flex-col gap-2.5">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            <Settings2 size={12} className="animate-spin duration-3000" /> সুপার অ্যাডমিন কন্ট্রোল প্যানেল
                        </div>
                        <button 
                            onClick={() => setShowAllOverride(true)}
                            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-[11px] uppercase tracking-wider shadow-[0_8px_20px_-6px_rgba(99,102,241,0.5)] hover:shadow-[0_12px_28px_-4px_rgba(99,102,241,0.7)] transition-all active:scale-[0.97] hover:scale-[1.01] flex items-center justify-center gap-2 border border-white/10"
                        >
                            <Layers size={13} className="animate-pulse" /> সব প্রশ্ন লোড করুন (অফলাইন মোড)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
