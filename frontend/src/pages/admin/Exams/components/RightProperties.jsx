import React from 'react';
import {
    Settings, LayoutGrid, FileText, List, RotateCcw,
    Minus, Plus, RotateCw, Trash2, Layout, Square,
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    Outdent, Indent, Sigma, Image as ImageIcon, Sparkles, Palette, Type
} from 'lucide-react';

const RightProperties = ({
    rightPanelOpen,
    activeTab,
    selection,
    setSelection,
    exam,
    setExam,
    config,
    setConfig,
    updateQuestion,
    deleteQuestion,
    MATH_SSC_TEMPLATE
}) => {
    const localFileInputRef = React.useRef(null);

    const applyCommand = (command, value = null) => {
        document.execCommand(command, false, value);
    };

    const handleLocalImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imgHtml = `<img src="${reader.result}" alt="inserted image" style="max-width: 100%; max-height: 250px; display: block; margin: 8px 0; border-radius: 4px;" />`;
                document.execCommand('insertHTML', false, imgHtml);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerEquationModal = () => {
        const btn = document.getElementById('toolbar-equation-btn');
        if (btn) {
            btn.click();
        } else {
            const event = new CustomEvent('open-equation-modal');
            window.dispatchEvent(event);
        }
    };

    const triggerBankModal = () => {
        const btn = document.getElementById('toolbar-bank-btn');
        if (btn) {
            btn.click();
        } else {
            const event = new CustomEvent('open-bank-modal');
            window.dispatchEvent(event);
        }
    };

    const tabTitles = {
        home: { title: 'Home (লেখা ও হরফ)', icon: Type },
        insert: { title: 'Insert (প্রশ্ন ও মিডিয়া)', icon: Plus },
        layout: { title: 'Layout (পৃষ্ঠা লেআউট)', icon: Layout },
        design: { title: 'Design (অলংকরণ ও থিম)', icon: Palette },
        metadata: { title: 'Header & Meta (হেডার ও মেটা)', icon: FileText }
    };

    const activeTabInfo = tabTitles[activeTab] || { title: 'Properties', icon: Settings };
    const TabIcon = activeTabInfo.icon;

    return (
        <aside className={`${rightPanelOpen ? 'w-80' : 'w-0'} bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.05)] flex flex-col h-full z-20 shrink-0 transition-all duration-300 overflow-hidden font-outfit border-l border-slate-200`}>
            {/* Properties Panel Tab Header */}
            <div className="p-3 border-b border-slate-200 flex items-center justify-center bg-slate-50 gap-2 select-none">
                <TabIcon size={14} className="text-indigo-600 animate-pulse" />
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">{activeTabInfo.title}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                {/* Context Selection Header */}
                {selection.type !== 'page' && (
                    <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 shrink-0 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-indigo-600 rounded text-white shadow-sm">
                                {selection.type === 'question' ? <List size={14} /> : <LayoutGrid size={14} />}
                            </div>
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                                {selection.type === 'question' ? `প্রশ্ন কনটেক্সট` : 'হেডার কনটেক্সট'}
                            </span>
                        </div>
                        <h2 className="text-[13px] font-bold text-slate-800 truncate">
                            {selection.type === 'question' 
                                ? `Editing Question #${exam?.questions?.findIndex(q => q.id === selection.id) + 1}` 
                                : exam?.instituteName || 'Header Editor'}
                        </h2>
                        <button
                            onClick={() => setSelection({ type: 'page', id: null })}
                            className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                            <RotateCcw size={10} /> Selection রিসেট করুন
                        </button>
                    </div>
                )}

                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-20">
                    
                    {/* Context Question Actions */}
                    {selection.type === 'question' && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">সিলেক্টেড প্রশ্ন অ্যাকশন</span>
                            
                            <div>
                                <label className="text-[10.5px] font-bold text-slate-500 mb-2 block flex justify-between">
                                    <span>প্রশ্নের মান (Point Weight)</span>
                                    <span className="text-indigo-650 font-black">{exam?.questions?.find(q => q.id === selection.id)?.marks || 0} pts</span>
                                </label>
                                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                                    <button onClick={() => updateQuestion(selection.id, 'marks', Math.max(0, (exam?.questions?.find(q => q.id === selection.id)?.marks || 0) - 1))} className="px-3 py-2 text-slate-400 hover:text-indigo-600 transition-colors"><Minus size={14} /></button>
                                    <input
                                        type="number"
                                        value={exam?.questions?.find(q => q.id === selection.id)?.marks || 0}
                                        onChange={(e) => updateQuestion(selection.id, 'marks', parseInt(e.target.value) || 0)}
                                        className="flex-1 bg-transparent text-center text-xs font-bold text-slate-800 outline-none w-10"
                                    />
                                    <button onClick={() => updateQuestion(selection.id, 'marks', (exam?.questions?.find(q => q.id === selection.id)?.marks || 0) + 1)} className="px-3 py-2 text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={14} /></button>
                                </div>
                            </div>

                            {exam?.questions?.find(q => q.id === selection.id)?.type === 'MCQ' && (
                                <button
                                    onClick={() => updateQuestion(selection.id, 'shuffleOptions', !exam?.questions?.find(q => q.id === selection.id)?.shuffleOptions)}
                                    className={`w-full py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${exam?.questions?.find(q => q.id === selection.id)?.shuffleOptions ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-650 border-slate-200 hover:border-indigo-300'}`}
                                >
                                    <RotateCw size={13} /> {exam?.questions?.find(q => q.id === selection.id)?.shuffleOptions ? 'অপশন এলোমেলো করা হবে' : 'অপশন লক করা আছে'}
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    deleteQuestion(selection.id);
                                    setSelection({ type: 'page', id: null });
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all border border-rose-100"
                            >
                                <Trash2 size={13} /> প্রশ্নটি ডিলিট করুন
                            </button>
                        </div>
                    )}

                    {/* DYNAMIC TAB CONTROLS */}

                    {/* HOME TAB PROPERTIES */}
                    {activeTab === 'home' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Formatting Box */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">লেখা ফরম্যাটিং</span>

                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => applyCommand('bold')} className="py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center font-bold text-xs"><Bold size={14} /></button>
                                    <button onClick={() => applyCommand('italic')} className="py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center italic text-xs"><Italic size={14} /></button>
                                    <button onClick={() => applyCommand('underline')} className="py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center underline text-xs"><Underline size={14} /></button>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => applyCommand('justifyLeft')} className="py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 flex items-center justify-center"><AlignLeft size={14} /></button>
                                    <button onClick={() => applyCommand('justifyCenter')} className="py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 flex items-center justify-center"><AlignCenter size={14} /></button>
                                    <button onClick={() => applyCommand('justifyRight')} className="py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 flex items-center justify-center"><AlignRight size={14} /></button>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <button onClick={() => applyCommand('outdent')} className="flex-1 py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-[10px] text-slate-650 flex items-center justify-center gap-1 font-bold"><Outdent size={12} /> Indent -</button>
                                    <button onClick={() => applyCommand('indent')} className="flex-1 py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-[10px] text-slate-650 flex items-center justify-center gap-1 font-bold"><Indent size={12} /> Indent +</button>
                                </div>
                            </div>

                            {/* Typography Box */}
                            <div className="p-4 bg-indigo-50/40 border border-indigo-100/60 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-indigo-550 uppercase tracking-widest block">টাইপোগ্রাফি ও হরফ</span>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">ফন্ট ফ্যামিলি</label>
                                    <select
                                        value={config.fontFamily}
                                        onChange={e => setConfig({ ...config, fontFamily: e.target.value })}
                                        className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-550/10 cursor-pointer"
                                    >
                                        <option value="font-serif">Classic Serif (English)</option>
                                        <option value="font-sans">Modern Sans (English)</option>
                                        <option value="font-tiro text-lg">Tiro Bangla (Unicode)</option>
                                        <option value="font-hind text-lg">Hind Siliguri (Unicode)</option>
                                        <option value="font-noto text-lg">Noto Sans Bengali</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">বেস হরফ সাইজ</p>
                                        <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                            <button onClick={() => setConfig({ ...config, fontSize: Math.max(8, config.fontSize - 1) })} className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12} /></button>
                                            <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.fontSize}pt</span>
                                            <button onClick={() => setConfig({ ...config, fontSize: Math.min(24, config.fontSize + 1) })} className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12} /></button>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">লাইন স্পেসিং</p>
                                        <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                            <button onClick={() => setConfig({ ...config, lineSpacing: Math.max(1, config.lineSpacing - 0.1) })} className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12} /></button>
                                            <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.lineSpacing.toFixed(1)}</span>
                                            <button onClick={() => setConfig({ ...config, lineSpacing: Math.min(3, config.lineSpacing + 0.1) })} className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12} /></button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">প্রশ্ন ব্যবধান (Q. Gap)</p>
                                        <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                            <button onClick={() => setConfig({ ...config, questionGap: Math.max(0.5, config.questionGap - 0.2) })} className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12} /></button>
                                            <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.questionGap.toFixed(1)}</span>
                                            <button onClick={() => setConfig({ ...config, questionGap: Math.min(4, config.questionGap + 0.2) })} className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12} /></button>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">অক্ষর ব্যবধান (Char)</p>
                                        <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                            <button onClick={() => setConfig({ ...config, letterSpacing: Math.max(-1, config.letterSpacing - 0.5) })} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12} /></button>
                                            <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.letterSpacing.toFixed(1)}</span>
                                            <button onClick={() => setConfig({ ...config, letterSpacing: Math.min(5, config.letterSpacing + 0.5) })} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INSERT TAB PROPERTIES */}
                    {activeTab === 'insert' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Insert Elements */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">পরীক্ষার প্রশ্ন সংযোজন</span>

                                <button
                                    onClick={() => {
                                        const btn = document.querySelector('[title="MCQ"]') || document.querySelector('button[onClick*="addQuestion"]');
                                        if (btn) btn.click();
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><List size={16} /></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">MCQ প্রশ্ন যুক্ত করুন</p>
                                            <p className="text-[9px] text-slate-400">বহুনির্বাচনী প্রশ্নের খসড়া তৈরি</p>
                                        </div>
                                    </div>
                                    <Plus size={14} className="text-slate-400" />
                                </button>

                                <button
                                    onClick={() => {
                                        const btn = document.querySelector('[title="Written"]') || document.querySelector('button[onClick*="CQ"]');
                                        if (btn) btn.click();
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all"><FileText size={16} /></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">লিখিত/সৃজনশীল প্রশ্ন</p>
                                            <p className="text-[9px] text-slate-400">নতুন লিখিত উদ্দীপক ও কন্টেন্ট</p>
                                        </div>
                                    </div>
                                    <Plus size={14} className="text-slate-400" />
                                </button>

                                <button
                                    onClick={triggerBankModal}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 text-white rounded-lg"><Sparkles size={16} /></div>
                                        <div>
                                            <p className="text-xs font-bold">প্রশ্ন ব্যাংক (Question Bank)</p>
                                            <p className="text-[9px] text-indigo-200">সংরক্ষিত ব্যাংক থেকে প্রশ্ন খুঁজুন</p>
                                        </div>
                                    </div>
                                    <Plus size={14} className="text-indigo-100" />
                                </button>
                            </div>

                            {/* Media Files */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">মিডিয়া ও গাণিতিক প্রতীক</span>

                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => localFileInputRef.current?.click()}
                                        className="py-3 px-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center"
                                    >
                                        <ImageIcon size={18} className="text-slate-500" />
                                        <span className="text-[10px] font-bold text-slate-700">ছবি আপলোড</span>
                                    </button>
                                    <input type="file" ref={localFileInputRef} className="hidden" accept="image/*" onChange={handleLocalImageSelect} />

                                    <button 
                                        onClick={triggerEquationModal}
                                        className="py-3 px-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center gap-1.5 transition-all text-center"
                                    >
                                        <Sigma size={18} className="text-blue-500" />
                                        <span className="text-[10px] font-bold text-slate-700">সমীকরণ (Equation)</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LAYOUT TAB PROPERTIES */}
                    {activeTab === 'layout' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Page Setup */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">পৃষ্ঠার আকার ও ওরিয়েন্টেশন</span>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">পৃষ্ঠার সাইজ (Page Size)</label>
                                    <select
                                        value={config.paperSize}
                                        onChange={e => setConfig({ ...config, paperSize: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none cursor-pointer"
                                    >
                                        <option value="A4">A4 Standard</option>
                                        <option value="Legal">Legal</option>
                                        <option value="Letter">Letter</option>
                                        <option value="A3">A3 Large</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">পৃষ্ঠার ওরিয়েন্টেশন</label>
                                    <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                        <button
                                            onClick={() => setConfig({ ...config, orientation: 'portrait' })}
                                            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all ${config.orientation === 'portrait' ? 'bg-indigo-650 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
                                        >
                                            <Square size={12} /> Portrait
                                        </button>
                                        <button
                                            onClick={() => setConfig({ ...config, orientation: 'landscape' })}
                                            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all ${config.orientation === 'landscape' ? 'bg-indigo-650 text-white shadow-md' : 'text-slate-400 hover:text-slate-650'}`}
                                        >
                                            <Square size={12} className="rotate-90" /> Landscape
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Columns Setup */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">কলাম সংখ্যা (Columns)</span>
                                    <button
                                        onClick={() => setConfig({ ...config, showColumnDivider: !config.showColumnDivider })}
                                        className={`text-[9px] font-bold px-2 py-0.5 rounded transition-all ${config.showColumnDivider ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                                    >
                                        মাঝখানের বর্ডার
                                    </button>
                                </div>

                                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                    {[1, 2, 3].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setConfig({ ...config, columns: c })}
                                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ${config.columns === c ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {c} কলাম
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">কলামের প্রবাহ দিক</label>
                                    <select
                                        value={config.columnLayout}
                                        onChange={e => setConfig({ ...config, columnLayout: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                                    >
                                        <option value="vertical">কলাম অনুযায়ী উপর-নিচ (Column Flow)</option>
                                        <option value="horizontal">জিগজ্যাগ অনুযায়ী পাশাপাশি (Zigzag Flow)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Margins */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">পৃষ্ঠার মার্জিন (Margins)</span>

                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'narrow', name: 'Narrow (0.5")', desc: 'কম ফাঁকা' },
                                        { id: 'moderate', name: 'Moderate (0.75")', desc: 'মাঝারি ফাঁকা' },
                                        { id: 'normal', name: 'Normal (1.0")', desc: 'স্ট্যান্ডার্ড' },
                                        { id: 'wide', name: 'Wide (1.5")', desc: 'বেশি ফাঁকা' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setConfig({ ...config, margins: item.id })}
                                            className={`p-2.5 rounded-xl border text-left transition-all ${config.margins === item.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'}`}
                                        >
                                            <p className="text-[10px] font-black uppercase">{item.name}</p>
                                            <p className={`text-[8px] mt-0.5 ${config.margins === item.id ? 'text-indigo-100' : 'text-slate-400'}`}>{item.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Editor Mode */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ভিউ মোড</span>
                                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                    <button
                                        onClick={() => setConfig({ ...config, pageView: 'paginated' })}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.pageView === 'paginated' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                                    >
                                        পৃষ্ঠা ভিউ (A4)
                                    </button>
                                    <button
                                        onClick={() => setConfig({ ...config, pageView: 'continuous' })}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.pageView === 'continuous' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                                    >
                                        স্ক্রল ভিউ (Continuous)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DESIGN TAB PROPERTIES */}
                    {activeTab === 'design' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Watermark Details */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">জলছাপ (Watermark)</span>
                                    <button
                                        onClick={() => setConfig({ ...config, watermark: !config.watermark })}
                                        className={`w-9 h-5 rounded-full relative transition-all ${config.watermark ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.watermark ? 'left-5' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                {config.watermark && (
                                    <div className="space-y-3 animate-in fade-in duration-200">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-slate-500 px-0.5">জলছাপের লেখা</label>
                                            <input
                                                type="text"
                                                value={config.watermarkText}
                                                onChange={e => setConfig({ ...config, watermarkText: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-550/15"
                                                placeholder="Watermark Text..."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase px-0.5">
                                                <span>স্বচ্ছতা (Opacity)</span>
                                                <span>{config.watermarkOpacity}%</span>
                                            </div>
                                            <input
                                                type="range" min="5" max="60" value={config.watermarkOpacity}
                                                onChange={e => setConfig({ ...config, watermarkOpacity: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Page Border */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">পৃষ্ঠার চারপাশের সীমানা</span>
                                <button
                                    onClick={() => setConfig({ ...config, showPageBorder: !config.showPageBorder })}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${config.showPageBorder ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                >
                                    <Square size={13} className={config.showPageBorder ? "fill-white/20" : ""} /> 
                                    {config.showPageBorder ? 'বর্ডার রিমুভ করুন' : 'আকর্ষণীয় পেজ বর্ডার দিন'}
                                </button>
                            </div>

                            {/* Layout Templates */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">নমুনা লেআউট টেমপ্লেট</span>

                                <div
                                    onClick={() => setExam(MATH_SSC_TEMPLATE)}
                                    className="group cursor-pointer border border-slate-200 hover:border-indigo-400 rounded-xl overflow-hidden transition-all hover:shadow-md bg-white"
                                >
                                    <div className="bg-slate-50 m-2 p-2 aspect-[4/3] flex flex-col items-center gap-1.5 overflow-hidden relative rounded-lg border border-slate-100">
                                        <div className="w-full h-1 bg-slate-200 rounded"></div>
                                        <div className="w-16 h-1 bg-slate-150 rounded"></div>
                                        <div className="flex gap-1.5 w-full mt-1">
                                            <div className="flex-1 space-y-1">
                                                <div className="w-full h-0.5 bg-slate-150 rounded"></div>
                                                <div className="w-full h-0.5 bg-slate-150 rounded"></div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="w-full h-0.5 bg-slate-150 rounded"></div>
                                                <div className="w-full h-0.5 bg-slate-150 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-all flex items-center justify-center">
                                            <Plus size={20} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-110" />
                                        </div>
                                    </div>
                                    <div className="p-2.5 bg-white border-t border-slate-100 group-hover:bg-indigo-50/50 transition-colors">
                                        <h4 className="text-[11px] font-black text-slate-800">SSC Math Model Test</h4>
                                        <p className="text-[9px] text-slate-400 font-medium">২-কলাম বাংলা ইউনিকোড সম্বলিত লেআউট</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HEADER & METADATA TAB PROPERTIES */}
                    {activeTab === 'metadata' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Metadata Editor Forms */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">পরীক্ষার মেটাডাটা ও তথ্য</span>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">প্রতিষ্ঠানের নাম</label>
                                    <input
                                        type="text"
                                        value={exam?.instituteName || ''}
                                        onChange={e => setExam(prev => ({ ...prev, instituteName: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        placeholder="প্রতিষ্ঠানের নাম..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">পরীক্ষার শিরোনাম (Title)</label>
                                    <input
                                        type="text"
                                        value={exam?.title || ''}
                                        onChange={e => setExam(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        placeholder="পরীক্ষার নাম..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">শ্রেণী (Class)</label>
                                        <input
                                            type="text"
                                            value={exam?.className || ''}
                                            onChange={e => setExam(prev => ({ ...prev, className: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                            placeholder="যেমন: SSC"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">বিষয় (Subject)</label>
                                        <input
                                            type="text"
                                            value={exam?.subjectName || ''}
                                            onChange={e => setExam(prev => ({ ...prev, subjectName: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                            placeholder="যেমন: গণিত"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">পরীক্ষার সময় (মিনিট)</label>
                                        <input
                                            type="number"
                                            value={exam?.durationMinutes || 0}
                                            onChange={e => setExam(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 0 }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">মোট নম্বর (Total Marks)</label>
                                        <input
                                            type="number"
                                            value={exam?.totalMarks || 0}
                                            onChange={e => setExam(prev => ({ ...prev, totalMarks: parseInt(e.target.value) || 0 }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">সেট কোড (Set Code)</label>
                                        <input
                                            type="text"
                                            value={exam?.setName || ''}
                                            onChange={e => setExam(prev => ({ ...prev, setName: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                            placeholder="যেমন: ক সেট"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">অধ্যায়/টপিক (Chapter)</label>
                                        <input
                                            type="text"
                                            value={exam?.chapterName || ''}
                                            onChange={e => setExam(prev => ({ ...prev, chapterName: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                            placeholder="যেমন: ২.১"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">পরীক্ষার্থীদের জন্য নির্দেশনা</label>
                                    <textarea
                                        value={exam?.instructions || ''}
                                        onChange={e => setExam(prev => ({ ...prev, instructions: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 h-16 resize-none"
                                        placeholder="নির্দেশনা..."
                                    />
                                </div>
                            </div>

                            {/* Header Visibilities */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">হেডার কাস্টমাইজ সেটিংস</span>

                                <div className="space-y-2">
                                    {[
                                        { key: 'showInstituteName', label: 'প্রতিষ্ঠানের নাম দেখান' },
                                        { key: 'showTitle', label: 'পরীক্ষার টাইটেল দেখান' },
                                        { key: 'showStudentInfo', label: 'শিক্ষার্থীর তথ্য লেখার ছক দেখান' },
                                        { key: 'showInstructions', label: 'নির্দেশনা লেখা দেখান' }
                                    ].map(item => (
                                        <div key={item.key} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm animate-in fade-in">
                                            <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                                            <button
                                                onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                                                className={`w-9 h-5 rounded-full relative transition-all ${config[item.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config[item.key] ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Header Font Scalers */}
                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">হেডার টেক্সট সাইজ (Scale)</span>
                                
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold text-indigo-900 mb-1">
                                            <span>ইনস্টিটিউট নাম সাইজ</span>
                                            <span>{config.instituteFontSize}pt</span>
                                        </div>
                                        <input
                                            type="range" min="14" max="42" value={config.instituteFontSize}
                                            onChange={e => setConfig({ ...config, instituteFontSize: parseInt(e.target.value) })}
                                            className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold text-indigo-900 mb-1">
                                            <span>পরীক্ষার টাইটেল সাইজ</span>
                                            <span>{config.titleFontSize}pt</span>
                                        </div>
                                        <input
                                            type="range" min="12" max="32" value={config.titleFontSize}
                                            onChange={e => setConfig({ ...config, titleFontSize: parseInt(e.target.value) })}
                                            className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Question Visibility Details */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">প্রশ্ন ভিজিবিলিটি সেটিংস</span>

                                <div className="space-y-2">
                                    {[
                                        { key: 'showQuestionNumbers', label: 'প্রশ্নের ক্রমিক নম্বর দেখান' },
                                        { key: 'showMarks', label: 'প্রশ্নের মান (Marks) দেখান' },
                                        { key: 'includeAnswers', label: 'উত্তর হাইলাইট করে রাখুন' }
                                    ].map(item => (
                                        <div key={item.key} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-[11px] font-bold text-slate-655">{item.label}</span>
                                            <button
                                                onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                                                className={`w-9 h-5 rounded-full relative transition-all ${config[item.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config[item.key] ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">MCQ অপশন কলাম বিন্যাস</label>
                                    <select
                                        value={config.optionCols || 2}
                                        onChange={e => setConfig({ ...config, optionCols: parseInt(e.target.value) })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                                    >
                                        <option value={1}>১ কলাম (Vertical)</option>
                                        <option value={2}>২ কলাম (Grid)</option>
                                        <option value={4}>৪ কলাম (Horizontal)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Answer & Explanation Display Controls */}
                            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">উত্তর ও ব্যাখ্যা প্রদর্শন</span>
                                </div>
                                <p className="text-[9px] text-emerald-600 leading-relaxed">প্রতিটি প্রশ্নের নিচে সরাসরি উত্তর ও ব্যাখ্যা দেখানো নিয়ন্ত্রণ করুন। শিক্ষকের গাইড বা সমাধানপত্র তৈরিতে ব্যবহার করুন।</p>

                                <div className="space-y-2">
                                    {[
                                        { key: 'showAnswersInline', label: '✅ সঠিক উত্তর দেখান', desc: 'প্রতিটি প্রশ্নের নিচে উত্তর' },
                                        { key: 'showExplanationInline', label: '📖 ব্যাখ্যা দেখান', desc: 'বিস্তারিত ব্যাখ্যা প্রদর্শন' },
                                        { key: 'showSources', label: '🔖 সোর্স/অধ্যায় দেখান', desc: 'প্রশ্নের পাশে উৎস দেখাবে' }
                                    ].map(item => (
                                        <div key={item.key} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-emerald-100 shadow-sm">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-700 block">{item.label}</span>
                                                <span className="text-[9px] text-slate-400">{item.desc}</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                                                className={`w-9 h-5 rounded-full relative transition-all shrink-0 ${config[item.key] ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config[item.key] ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default RightProperties;
