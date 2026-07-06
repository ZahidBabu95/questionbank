import React, { useState } from 'react';
import { 
    Settings, FileText, List, RotateCcw, Minus, Plus, Trash2, 
    Layout, Square, Sparkles, Bold, Italic, Underline, 
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Outdent, Indent, 
    Sigma, Image as ImageIcon, Palette, Type, Sliders, Upload
} from 'lucide-react';

const LectureRightProperties = ({
    rightPanelOpen,
    activeTab,
    selection,
    setSelection,
    lecture,
    setLecture,
    config,
    setConfig,
    handleFontFamilyChange,
    handleFontSizeChange,
    removeSection,
    handleAIAssist,
    aiGenerating,
    handleRemoveQuestion,
    showInstructions,
    setShowInstructions,
    highlightedSection,
    applyCommand,
    editorStyles = {},
    getFontFamilyClass = () => '',
    editor = null
}) => {
    const localFileInputRef = React.useRef(null);
    const logoInputRef = React.useRef(null);
    const bgImageInputRef = React.useRef(null);

    const handleBgImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig({ ...config, coverBgImage: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };


    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig({ ...config, coverLogo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const [customTemplates, setCustomTemplates] = useState(() => {
        try {
            const saved = localStorage.getItem('customCoverTemplates');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    const [newTemplateName, setNewTemplateName] = useState('');

    const applyTemplatePreset = (presetName) => {
        let presets = {};
        if (presetName === 'classic') {
            presets = {
                coverTemplate: 'classic',
                coverAccentColor: '#4f46e5',
                paperColor: '#ffffff',
                showPageBorder: true,
                instituteFontSize: 22,
                titleFontSize: 16
            };
        } else if (presetName === 'minimal') {
            presets = {
                coverTemplate: 'minimal',
                coverAccentColor: '#4f46e5',
                paperColor: '#fafaf9',
                showPageBorder: false,
                instituteFontSize: 18,
                titleFontSize: 20
            };
        } else if (presetName === 'modern') {
            presets = {
                coverTemplate: 'modern',
                coverAccentColor: '#0f172a',
                paperColor: '#ffffff',
                showPageBorder: true,
                instituteFontSize: 20,
                titleFontSize: 18
            };
        } else if (presetName === 'premium') {
            presets = {
                coverTemplate: 'premium',
                coverAccentColor: '#b45309',
                paperColor: '#fefcbf',
                showPageBorder: true,
                instituteFontSize: 24,
                titleFontSize: 22
            };
        }
        setConfig({ ...config, ...presets });
    };

    const saveCustomTemplate = () => {
        if (!newTemplateName.trim()) return;
        const newTemplate = {
            id: Date.now().toString(),
            name: newTemplateName.trim(),
            config: {
                coverTemplate: config.coverTemplate || 'classic',
                coverAccentColor: config.coverAccentColor || '#4f46e5',
                paperColor: config.paperColor || '#ffffff',
                showPageBorder: !!config.showPageBorder,
                pageBorderPreset: config.pageBorderPreset || 'double',
                showInstituteName: !!config.showInstituteName,
                showTitle: !!config.showTitle,
                instituteFontSize: config.instituteFontSize || 22,
                titleFontSize: config.titleFontSize || 16,
                metadataFontSize: config.metadataFontSize || 11,
                footerFontSize: config.footerFontSize || 9,
                watermark: !!config.watermark,
                coverBgImage: config.coverBgImage || null,
                coverBgLayout: config.coverBgLayout || 'full',
                coverBgOpacity: config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15,
                coverBgSize: config.coverBgSize || 300,
                coverBgBorder: !!config.coverBgBorder,

                watermarkText: config.watermarkText || 'Perfect Lecture',
                watermarkOpacity: config.watermarkOpacity || 10,
                watermarkSize: config.watermarkSize || 8,
                coverLogo: config.coverLogo || null,
                coverLogoSize: config.coverLogoSize || 64,
                coverFooterText: config.coverFooterText || '',
                coverAcademicYearText: config.coverAcademicYearText || '',
                showCoverFooterText: config.showCoverFooterText !== false,
                showCoverAcademicYearText: config.showCoverAcademicYearText !== false
            }
        };
        const updated = [...customTemplates, newTemplate];
        setCustomTemplates(updated);
        localStorage.setItem('customCoverTemplates', JSON.stringify(updated));
        setNewTemplateName('');
    };

    const applyCustomTemplate = (tmpl) => {
        setConfig({ ...config, ...tmpl.config });
    };

    const deleteCustomTemplate = (id) => {
        const updated = customTemplates.filter(t => t.id !== id);
        setCustomTemplates(updated);
        localStorage.setItem('customCoverTemplates', JSON.stringify(updated));
    };

    const activeSection = lecture?.sections?.find(s => s.id === selection.id);
    const activeQuestion = selection.type === 'question' 
        ? lecture?.sections?.find(s => s.id === selection.sectionId)?.questions?.find(q => (q.questionId || q.id) === selection.id)
        : null;

    const handleLocalImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const imgHtml = `<img src="${reader.result}" alt="inserted image" style="max-width: 100%; max-height: 250px; display: block; margin: 8px 0; border-radius: 4px;" />`;
                applyCommand('insertHTML', imgHtml);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerEquationModal = () => {
        // Trigger parent equation editor modal via standard click or window event
        const btn = document.getElementById('toolbar-equation-btn');
        if (btn) {
            btn.click();
        } else {
            // fallback if not mounted
            const event = new CustomEvent('open-equation-modal');
            window.dispatchEvent(event);
        }
    };

    const tabTitles = {
        home: { title: 'Home (লেখা ও হরফ)', icon: Type },
        insert: { title: 'Insert (সংযোজন প্যানেল)', icon: Plus },
        layout: { title: 'Layout (পৃষ্ঠা বিন্যাস)', icon: Layout },
        design: { title: 'Design (অলংকরণ ও জলছাপ)', icon: Palette },
        metadata: { title: 'Header & Meta (হেডার ও মেটা)', icon: FileText },
        settings: { title: 'Sheet Settings (শীট সেটিংস)', icon: Settings }
    };

    const activeTabInfo = tabTitles[activeTab] || { title: 'Properties', icon: Settings };
    const TabIcon = activeTabInfo.icon;

    return (
        <aside className={`${rightPanelOpen ? 'w-80' : 'w-0'} bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.05)] flex flex-col h-full z-20 shrink-0 transition-all duration-300 overflow-hidden font-outfit border-l border-slate-200`}>
            <style>{`
                @keyframes highlight-flash {
                    0% {
                        box-shadow: 0 0 0 0px rgba(99, 102, 241, 0);
                        border-color: rgb(226, 232, 240);
                    }
                    10% {
                        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3);
                        border-color: rgb(99, 102, 241);
                        background-color: rgba(99, 102, 241, 0.05);
                    }
                    90% {
                        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.3);
                        border-color: rgb(99, 102, 241);
                        background-color: rgba(99, 102, 241, 0.05);
                    }
                    100% {
                        box-shadow: 0 0 0 0px rgba(99, 102, 241, 0);
                        border-color: rgb(226, 232, 240);
                    }
                }
                .highlight-flash-active {
                    animation: highlight-flash 2s ease-in-out;
                }
            `}</style>
            {/* Properties Panel Tab Header */}
            <div className="p-3 border-b border-slate-200 flex items-center justify-center bg-slate-50 gap-2 select-none">
                <TabIcon size={14} className="text-indigo-600 animate-pulse" />
                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">{activeTabInfo.title}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                {/* Context Selection Header (Only shown if a user explicitly selects a Section or Question on Canvas) */}
                {selection.type !== 'page' && (
                    <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 shrink-0 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-indigo-600 rounded text-white shadow-sm">
                                {selection.type === 'question' ? <List size={14} /> : <Layout size={14} />}
                            </div>
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                                {selection.type === 'question' ? `কোশ্চেন কনটেক্সট` : 'সেকশন কনটেক্সট'}
                            </span>
                        </div>
                        <h2 className="text-[13px] font-bold text-slate-800 truncate">
                            {selection.type === 'question' 
                                ? `Exercise Question` 
                                : activeSection?.sectionTitle || 'Section Settings'}
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
                    
                    {/* ALWAYS show Selection context actions at the very top if active */}
                    {selection.type === 'section' && activeSection && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in slide-in-from-right-4 duration-300">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">সেকশন অ্যাকশন</span>
                            <button
                                onClick={() => handleAIAssist(activeSection)}
                                disabled={aiGenerating}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-xl text-xs font-bold border border-indigo-100 transition-all disabled:opacity-50"
                            >
                                <Sparkles size={13} className={aiGenerating ? 'animate-spin' : ''} />
                                {aiGenerating ? 'ব্যাখ্যা তৈরি হচ্ছে...' : '✨ এআই রাইট অ্যাসিস্ট'}
                            </button>
                            <button
                                onClick={() => {
                                    removeSection(selection.id);
                                    setSelection({ type: 'page', id: null });
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all border border-rose-100"
                            >
                                <Trash2 size={13} /> সেকশন মুছে ফেলুন
                            </button>
                        </div>
                    )}

                    {selection.type === 'question' && activeQuestion && (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in slide-in-from-right-4 duration-300">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">প্রশ্ন অ্যাকশন</span>
                            <div className="text-[11px] text-slate-500 font-medium space-y-1">
                                <p>টাইপ: {activeQuestion.type === 'MCQ' ? 'বহুনির্বাচনী (MCQ)' : 'লিখিত/সৃজনশীল'}</p>
                                <p>মান (Marks): {activeQuestion.marks}</p>
                            </div>
                            <button
                                onClick={() => {
                                    handleRemoveQuestion(selection.sectionId, selection.id);
                                    setSelection({ type: 'page', id: null });
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all border border-rose-100"
                            >
                                <Trash2 size={13} /> লেকচার থেকে বাদ দিন
                            </button>
                        </div>
                    )}

                    {/* DYNAMIC TAB CONTROLS */}
                    
                    {/* HOME TAB PROPERTIES */}
                    {activeTab === 'home' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Instructions Box */}
                            <div className={`p-4 bg-amber-50/40 border border-amber-100/60 rounded-2xl space-y-3 ${highlightedSection === 'instructions' ? 'highlight-flash-active' : ''}`}>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block font-outfit">নির্দেশিকা (Instructions)</span>
                                    <button
                                        onClick={() => setShowInstructions(!showInstructions)}
                                        className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-all uppercase tracking-wider"
                                    >
                                        {showInstructions ? 'লুকান' : 'দেখুন'}
                                    </button>
                                </div>
                                {showInstructions && (
                                    <div className="text-[11px] text-slate-600 leading-relaxed space-y-2 animate-in fade-in duration-300">
                                        <p className="font-bold text-slate-800">📖 টপিক সারসংক্ষেপ ও ব্যাখ্যা:</p>
                                        <p>এই টপিকের ওপর আলোচনা ও ব্যাখ্যা ক্যানভাসে লিখুন। এআই রাইট অ্যাসিস্ট বাটনে ক্লিক করে গোল্ডেন মেটেরিয়াল সোর্স বুক ব্যবহার করে চমৎকার ব্যাখ্যা স্বয়ংক্রিয়ভাবে লিখে নিতে পারেন।</p>
                                    </div>
                                )}
                            </div>

                            {/* Font Styles Box */}
                            <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 ${highlightedSection === 'font' || highlightedSection === 'paragraph' ? 'highlight-flash-active' : ''}`}>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">লেখা ফরম্যাটিং</span>
                                
                                <div className="grid grid-cols-3 gap-2">
                                    <button 
                                        onClick={() => applyCommand('bold')} 
                                        disabled={editorStyles.isSelectionEmpty}
                                        className={`py-2.5 rounded-xl border flex items-center justify-center font-bold text-xs transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                                            editorStyles.bold 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <Bold size={14} />
                                    </button>
                                    <button 
                                        onClick={() => applyCommand('italic')} 
                                        disabled={editorStyles.isSelectionEmpty}
                                        className={`py-2.5 rounded-xl border flex items-center justify-center italic text-xs transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                                            editorStyles.italic 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <Italic size={14} />
                                    </button>
                                    <button 
                                        onClick={() => applyCommand('underline')} 
                                        disabled={editorStyles.isSelectionEmpty}
                                        className={`py-2.5 rounded-xl border flex items-center justify-center underline text-xs transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                                            editorStyles.underline 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <Underline size={14} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    <button 
                                        onClick={() => applyCommand('justifyLeft')} 
                                        disabled={editorStyles.isSelectionEmpty}
                                        className={`py-2 rounded-xl border flex items-center justify-center transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                                            editorStyles.textAlign === 'left' 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                                        }`}
                                    >
                                        <AlignLeft size={14} />
                                    </button>
                                    <button 
                                        onClick={() => applyCommand('justifyCenter')} 
                                        disabled={editorStyles.isSelectionEmpty}
                                        className={`py-2 rounded-xl border flex items-center justify-center transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                                            editorStyles.textAlign === 'center' 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                                        }`}
                                    >
                                        <AlignCenter size={14} />
                                    </button>
                                    <button 
                                        onClick={() => applyCommand('justifyRight')} 
                                        disabled={editorStyles.isSelectionEmpty}
                                        className={`py-2 rounded-xl border flex items-center justify-center transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                                            editorStyles.textAlign === 'right' 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                                        }`}
                                    >
                                        <AlignRight size={14} />
                                    </button>
                                    <button 
                                        onClick={() => applyCommand('justifyFull')} 
                                        disabled={editorStyles.isSelectionEmpty}
                                        className={`py-2 rounded-xl border flex items-center justify-center transition-all disabled:opacity-45 disabled:cursor-not-allowed ${
                                            editorStyles.textAlign === 'justify' 
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-650'
                                        }`}
                                    >
                                        <AlignJustify size={14} />
                                    </button>
                                </div>

                                <div className="flex justify-between gap-2">
                                    <button onClick={() => applyCommand('outdent')} disabled={editorStyles.isSelectionEmpty} className="flex-1 py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-[10px] text-slate-600 flex items-center justify-center gap-1 font-bold disabled:opacity-45 disabled:cursor-not-allowed"><Outdent size={12} /> Indent -</button>
                                    <button onClick={() => applyCommand('indent')} disabled={editorStyles.isSelectionEmpty} className="flex-1 py-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-[10px] text-slate-600 flex items-center justify-center gap-1 font-bold disabled:opacity-45 disabled:cursor-not-allowed"><Indent size={12} /> Indent +</button>
                                </div>
                            </div>

                            {/* Typography Details */}
                            <div className={`p-4 bg-indigo-50/40 border border-indigo-100/60 rounded-2xl space-y-4 ${highlightedSection === 'font' || highlightedSection === 'spacing' ? 'highlight-flash-active' : ''}`}>
                                <span className="text-[10px] font-black text-indigo-550 uppercase tracking-widest block font-outfit">টাইপোগ্রাফি ও হরফ</span>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5 font-outfit">বাংলা/ইংরেজি ফন্ট ফ্যামিলি</label>
                                    <select
                                        value={getFontFamilyClass(editorStyles.fontFamily) || config.fontFamily}
                                        onChange={e => handleFontFamilyChange(e.target.value)}
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
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">হরফের সাইজ</p>
                                        <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                            <button 
                                                onClick={() => {
                                                    const curSize = editorStyles.fontSize || config.fontSize;
                                                    handleFontSizeChange(Math.max(8, curSize - 1));
                                                }} 
                                                className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="flex-1 text-center text-xs font-bold text-slate-800">{editorStyles.fontSize || config.fontSize}pt</span>
                                            <button 
                                                onClick={() => {
                                                    const curSize = editorStyles.fontSize || config.fontSize;
                                                    handleFontSizeChange(Math.min(36, curSize + 1));
                                                }} 
                                                className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase px-1 font-outfit">লাইন স্পেসিং</p>
                                        <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                            <button onClick={() => setConfig({ ...config, lineSpacing: Math.max(1, config.lineSpacing - 0.1) })} className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12} /></button>
                                            <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.lineSpacing.toFixed(1)}</span>
                                            <button onClick={() => setConfig({ ...config, lineSpacing: Math.min(3, config.lineSpacing + 0.1) })} className="px-2.5 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12} /></button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-indigo-400 uppercase px-1 font-outfit">অক্ষরের ব্যবধান (Char Gap)</p>
                                    <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                        <button onClick={() => setConfig({ ...config, letterSpacing: Math.max(-1, config.letterSpacing - 0.5) })} className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12} /></button>
                                        <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.letterSpacing.toFixed(1)}px</span>
                                        <button onClick={() => setConfig({ ...config, letterSpacing: Math.min(5, config.letterSpacing + 0.5) })} className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12} /></button>
                                    </div>
                                </div>

                                {/* Text and Highlight Swatch Colors */}
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-100/50">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">টেক্সট কালার</p>
                                        <div className="flex items-center gap-1.5 flex-wrap bg-white border border-indigo-100 rounded-xl p-2 min-h-[38px] justify-start shadow-sm">
                                            {[
                                                { name: 'Default', code: '#1e293b' },
                                                { name: 'Red', code: '#ef4444' },
                                                { name: 'Blue', code: '#3b82f6' },
                                                { name: 'Green', code: '#22c55e' },
                                                { name: 'Purple', code: '#a855f7' }
                                            ].map(c => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    disabled={editorStyles.isSelectionEmpty}
                                                    title={c.name}
                                                    onClick={() => applyCommand('foreColor', c.code)}
                                                    className={`w-4 h-4 rounded-full border shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                                        (editorStyles.textColor === c.code || (!editorStyles.textColor && c.code === '#1e293b'))
                                                            ? 'ring-2 ring-indigo-550 scale-110' 
                                                            : 'hover:scale-110 border-slate-200 hover:border-slate-350'
                                                    }`}
                                                    style={{ backgroundColor: c.code }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">হাইলাইট</p>
                                        <div className="flex items-center gap-1.5 flex-wrap bg-white border border-indigo-100 rounded-xl p-2 min-h-[38px] justify-start shadow-sm">
                                            {[
                                                { name: 'None', code: 'transparent' },
                                                { name: 'Yellow', code: '#fef08a' },
                                                { name: 'Green', code: '#bbf7d0' },
                                                { name: 'Blue', code: '#bfdbfe' },
                                                { name: 'Pink', code: '#fbcfe8' }
                                            ].map(c => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    disabled={editorStyles.isSelectionEmpty}
                                                    title={c.name}
                                                    onClick={() => {
                                                        if (c.code === 'transparent') {
                                                            applyCommand('unsetHighlightColor');
                                                        } else {
                                                            applyCommand('hiliteColor', c.code);
                                                        }
                                                    }}
                                                    className={`w-4 h-4 rounded-full border shadow-sm transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                                                        (editorStyles.highlightColor === c.code || (!editorStyles.highlightColor && c.code === 'transparent'))
                                                            ? 'ring-2 ring-indigo-550 scale-110' 
                                                            : 'hover:scale-110 border-slate-200 hover:border-slate-350'
                                                    }`}
                                                    style={{ backgroundColor: c.code }}
                                                >
                                                    {c.code === 'transparent' && <span className="text-[8px] text-slate-400 font-bold">❌</span>}
                                                </button>
                                            ))}
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
                            <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 ${highlightedSection === 'content' ? 'highlight-flash-active' : ''}`}>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">লেকচার কন্টেন্ট সংযোজন</span>

                                <button
                                    onClick={() => {
                                        const btn = document.querySelector('[title="New Section"]') || document.querySelector('button[onClick*="addSection"]');
                                        if (btn) btn.click();
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><Layout size={16} /></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">নতুন সেকশন যুক্ত করুন</p>
                                            <p className="text-[9px] text-slate-400">লেকচারের নতুন টপিক বা অধ্যায় শুরু</p>
                                        </div>
                                    </div>
                                    <Plus size={14} className="text-slate-400" />
                                </button>

                                <button
                                    onClick={() => {
                                        const btn = document.querySelector('[title="Add MCQ"]') || document.querySelector('button[onClick*="MCQ"]');
                                        if (btn) btn.click();
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-all"><List size={16} /></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">MCQ প্রশ্ন যুক্ত করুন</p>
                                            <p className="text-[9px] text-slate-400">বহুনির্বাচনী অনুশীলনী সংযোজন</p>
                                        </div>
                                    </div>
                                    <Plus size={14} className="text-slate-400" />
                                </button>

                                <button
                                    onClick={() => {
                                        const btn = document.querySelector('[title="Add Written"]') || document.querySelector('button[onClick*="CQ"]');
                                        if (btn) btn.click();
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl hover:shadow-sm transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all"><FileText size={16} /></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">লিখিত/সৃজনশীল প্রশ্ন</p>
                                            <p className="text-[9px] text-slate-400">লিখিত পরীক্ষা বা হোমওয়ার্ক প্রশ্ন</p>
                                        </div>
                                    </div>
                                    <Plus size={14} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Media Files */}
                            <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 ${highlightedSection === 'media' ? 'highlight-flash-active' : ''}`}>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">মিডিয়া ও সমীকরণ</span>

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
                                        <span className="text-[10px] font-bold text-slate-700">গণিত সমীকরণ</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LAYOUT TAB PROPERTIES */}
                    {activeTab === 'layout' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Page Setup */}
                            <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 ${highlightedSection === 'paper' ? 'highlight-flash-active' : ''}`}>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">পৃষ্ঠার আকার ও ওরিয়েন্টেশন</span>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">পৃষ্ঠার সাইজ (Page Size)</label>
                                    <select
                                        value={config.paperSize}
                                        onChange={e => setConfig({ ...config, paperSize: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold outline-none cursor-pointer"
                                    >
                                        <option value="A4">A4 Standard</option>
                                        <option value="Legal">Legal (দলিল সাইজ)</option>
                                        <option value="Letter">Letter Standard</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">পৃষ্ঠার ওরিয়েন্টেশন</label>
                                    <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                        <button
                                            onClick={() => setConfig({ ...config, orientation: 'portrait' })}
                                            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all ${config.orientation === 'portrait' ? 'bg-indigo-650 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <Square size={12} /> Portrait
                                        </button>
                                        <button
                                            onClick={() => setConfig({ ...config, orientation: 'landscape' })}
                                            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[11px] font-bold transition-all ${config.orientation === 'landscape' ? 'bg-indigo-650 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <Square size={12} className="rotate-90" /> Landscape
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Margins */}
                            <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 ${highlightedSection === 'paper' ? 'highlight-flash-active' : ''}`}>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">পৃষ্ঠার মার্জিন (Margins)</span>

                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'narrow', name: 'Narrow (0.5")', desc: 'কম ফাঁকা জায়গা' },
                                        { id: 'moderate', name: 'Moderate (0.75")', desc: 'মাঝারি ফাঁকা' },
                                        { id: 'normal', name: 'Normal (1.0")', desc: 'স্ট্যান্ডার্ড ফাঁকা' },
                                        { id: 'wide', name: 'Wide (1.5")', desc: 'বেশি ফাঁকা জায়গা' }
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

                            {/* Page Columns */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">পৃষ্ঠার কলাম বিন্যাস (Columns)</span>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 1, name: '১ কলাম (1 Column)', desc: 'সাধারন একক কলাম লেআউট' },
                                        { id: 2, name: '২ কলাম (2 Columns)', desc: 'দ্বি-কলাম বিশিষ্ট বইয়ের লেআউট' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setConfig({ ...config, columns: item.id })}
                                            className={`p-2.5 rounded-xl border text-left transition-all ${(config.columns || 1) === item.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'}`}
                                        >
                                            <p className="text-[10px] font-black uppercase">{item.name}</p>
                                            <p className={`text-[8px] mt-0.5 ${(config.columns || 1) === item.id ? 'text-indigo-100' : 'text-slate-400'}`}>{item.desc}</p>
                                        </button>
                                    ))}
                                </div>

                                {/* Advanced Column Settings - only show when columns === 2 */}
                                {config.columns === 2 && (
                                    <div className="space-y-4 pt-3 border-t border-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block font-outfit">কলামের উন্নত সেটিংস</span>
                                        
                                        {/* Column Gap Spacing */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                <span>কলামের মধ্যবর্তী গ্যাপ</span>
                                                <span className="text-indigo-600 font-bold">{config.columnGap || 32}px</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="range" 
                                                    min="16" 
                                                    max="64" 
                                                    step="4"
                                                    value={config.columnGap || 32} 
                                                    onChange={e => setConfig({ ...config, columnGap: parseInt(e.target.value) })}
                                                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                        </div>

                                        {/* Show Column Divider Toggle */}
                                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-700 block">কলাম ডিভাইডার লাইন দেখান</span>
                                                <span className="text-[9px] text-slate-400">কলামগুলোর মাঝে একটি বিভাজক রেখা</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, showColumnDivider: !config.showColumnDivider })}
                                                className={`w-9 h-5 rounded-full relative transition-all shrink-0 ${config.showColumnDivider !== false ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.showColumnDivider !== false ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>

                                        {/* Divider Details - only show if divider is enabled */}
                                        {config.showColumnDivider !== false && (
                                            <div className="space-y-3 p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl animate-in fade-in duration-200">
                                                {/* Divider Width / Thickness */}
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-indigo-700 uppercase block">ডিভাইডারের পুরুত্ব</label>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        {[1, 2, 3].map(w => (
                                                            <button
                                                                key={w}
                                                                onClick={() => setConfig({ ...config, columnDividerWidth: w })}
                                                                className={`py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                                                                    (config.columnDividerWidth || 1) === w
                                                                        ? 'bg-white text-indigo-600 border-indigo-200 shadow-sm'
                                                                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-650'
                                                                }`}
                                                            >
                                                                {w}px
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Divider Line Style */}
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-indigo-700 uppercase block">ডিভাইডারের স্টাইল</label>
                                                    <div className="grid grid-cols-3 gap-1">
                                                        {[
                                                            { id: 'solid', name: 'Solid' },
                                                            { id: 'dashed', name: 'Dashed' },
                                                            { id: 'dotted', name: 'Dotted' }
                                                        ].map(style => (
                                                            <button
                                                                key={style.id}
                                                                onClick={() => setConfig({ ...config, columnDividerStyle: style.id })}
                                                                className={`py-1.5 text-[10px] font-black rounded-lg border transition-all ${
                                                                    (config.columnDividerStyle || 'solid') === style.id
                                                                        ? 'bg-white text-indigo-600 border-indigo-200 shadow-sm'
                                                                        : 'bg-transparent text-slate-400 border-transparent hover:text-slate-650'
                                                                }`}
                                                            >
                                                                {style.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Divider Color Picker */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black text-indigo-700 uppercase block">ডিভাইডারের রং (Color)</label>
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {[
                                                            { code: '#e2e8f0', name: 'Default Gray' },
                                                            { code: '#cbd5e1', name: 'Slate Gray' },
                                                            { code: '#4f46e5', name: 'Indigo' },
                                                            { code: '#94a3b8', name: 'Cool Slate' },
                                                            { code: '#f59e0b', name: 'Amber' },
                                                            { code: '#10b981', name: 'Green' }
                                                        ].map(color => (
                                                            <button
                                                                key={color.code}
                                                                onClick={() => setConfig({ ...config, columnDividerColor: color.code })}
                                                                className={`w-5 h-5 rounded-full border shadow-sm transition-all relative flex items-center justify-center ${
                                                                    (config.columnDividerColor || '#cbd5e1') === color.code
                                                                        ? 'ring-2 ring-indigo-500 scale-110'
                                                                        : 'hover:scale-105'
                                                                }`}
                                                                style={{ backgroundColor: color.code }}
                                                                title={color.name}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Layout View Mode */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">এডিটর ভিউ মোড</span>
                                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                    <button
                                        onClick={() => setConfig({ ...config, pageView: 'paginated' })}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.pageView === 'paginated' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                                    >
                                        পৃষ্ঠা ভিত্তিক (A4)
                                    </button>
                                    <button
                                        onClick={() => setConfig({ ...config, pageView: 'continuous' })}
                                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.pageView === 'continuous' ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                                    >
                                        টানা স্ক্রল (Continuous)
                                    </button>
                                </div>
                            </div>


                        </div>
                    )}

                    {/* DESIGN TAB PROPERTIES */}
                    {activeTab === 'design' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Cover Page Templates */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">কভার পেজ ডিজাইন টেমপ্লেট</span>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'classic', name: 'Classic Academic', desc: 'ঐতিহ্যবাহী ও ফরমাল' },
                                        { id: 'minimal', name: 'Minimalist Modern', desc: 'আধুনিক ও মিনিমাল' },
                                        { id: 'modern', name: 'Modern Creative', desc: 'সৃজনশীল ও রঙিন' },
                                        { id: 'premium', name: 'Premium Elegant', desc: 'এলিজেন্ট ও প্রিমিয়াম' }
                                    ].map(tmpl => {
                                        const isSelected = (config.coverTemplate || 'classic') === tmpl.id;
                                        return (
                                            <button
                                                key={tmpl.id}
                                                onClick={() => applyTemplatePreset(tmpl.id)}
                                                className={`p-2.5 rounded-xl border text-left transition-all ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-105' : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'}`}
                                            >
                                                <p className="text-[10px] font-black uppercase">{tmpl.name}</p>
                                                <p className={`text-[8px] mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{tmpl.desc}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Accent Color Picker */}
                                <div className="space-y-2 pt-1 border-t border-slate-200/50 animate-in fade-in duration-200">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">থিম অ্যাকসেন্ট কালার</label>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {[
                                            { code: '#4f46e5', name: 'Indigo' },
                                            { code: '#0f172a', name: 'Slate' },
                                            { code: '#059669', name: 'Green' },
                                            { code: '#dc2626', name: 'Red' },
                                            { code: '#b45309', name: 'Amber' },
                                            { code: '#7c3aed', name: 'Purple' }
                                        ].map(color => {
                                            const isColorSelected = config.coverAccentColor === color.code;
                                            return (
                                                <button
                                                    key={color.code}
                                                    onClick={() => setConfig({ ...config, coverAccentColor: color.code })}
                                                    className={`w-6 h-6 rounded-full border shadow-sm transition-all relative flex items-center justify-center ${isColorSelected ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                                                    style={{ backgroundColor: color.code }}
                                                    title={color.name}
                                                >
                                                    {isColorSelected && <span className="text-[10px] text-white">✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Save as Custom Template */}
                                <div className="pt-3 border-t border-slate-200/50 space-y-2">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">কাস্টম টেমপ্লেট হিসেবে সেভ করুন</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newTemplateName}
                                            onChange={e => setNewTemplateName(e.target.value)}
                                            className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                                            placeholder="যেমন: আমার কাস্টম কভার ১"
                                        />
                                        <button
                                            onClick={saveCustomTemplate}
                                            disabled={!newTemplateName.trim()}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-bold px-3 py-1 rounded-xl text-[11px] transition-colors"
                                        >
                                            সেভ করুন
                                        </button>
                                    </div>
                                </div>

                                {/* Custom Templates List */}
                                {customTemplates.length > 0 && (
                                    <div className="pt-3 border-t border-slate-200/50 space-y-2">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">আমার কাস্টম কভার ডিজাইনসমূহ</label>
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                            {customTemplates.map(tmpl => (
                                                <div key={tmpl.id} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                                                    <button
                                                        onClick={() => applyCustomTemplate(tmpl)}
                                                        className="text-[10px] font-bold text-slate-700 hover:text-indigo-600 text-left truncate flex-1"
                                                    >
                                                        {tmpl.name} <span className="text-[8px] text-slate-400 font-normal">({tmpl.config.coverTemplate})</span>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteCustomTemplate(tmpl.id)}
                                                        className="text-rose-500 hover:text-rose-700 p-1 transition-colors"
                                                        title="মুছে ফেলুন"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Logo Upload Component */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">প্রতিষ্ঠান লোগো (Cover Logo)</span>
                                
                                {config.coverLogo ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center p-4 bg-white border border-slate-200 rounded-xl relative group">
                                            <img src={config.coverLogo} alt="Uploaded Logo" className="max-h-20 object-contain" />
                                            <button
                                                onClick={() => setConfig({ ...config, coverLogo: null })}
                                                className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                                                title="লোগো মুছে ফেলুন"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => logoInputRef.current?.click()}
                                            className="w-full py-2 bg-slate-200/50 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Upload size={13} /> লোগো পরিবর্তন করুন
                                        </button>
                                        <div className="space-y-1 pt-2 border-t border-slate-200/50">
                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase px-0.5">
                                                <span>লোগোর আকার (Size)</span>
                                                <span>{config.coverLogoSize || 64}px</span>
                                            </div>
                                            <input
                                                type="range" min="30" max="250" step="5" value={config.coverLogoSize || 64}
                                                onChange={e => setConfig({ ...config, coverLogoSize: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => logoInputRef.current?.click()}
                                        className="w-full py-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl bg-white hover:bg-slate-50/50 transition-all flex flex-col items-center justify-center gap-2 group"
                                    >
                                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                                            <Upload size={18} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[11px] font-black text-slate-700">লোগো ইমেজ আপলোড করুন</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">JPEG / PNG ফরম্যাট (সর্বোচ্চ ২ এমবি)</p>
                                        </div>
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={logoInputRef}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/jpg"
                                    onChange={handleLogoUpload}
                                />
                            </div>

                            {/* Background Image Upload Component */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">কভার ব্যাকগ্রাউন্ড (Cover Background)</span>
                                
                                {config.coverBgImage ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center p-4 bg-white border border-slate-200 rounded-xl relative group">
                                            <img src={config.coverBgImage} alt="Uploaded Background" className="max-h-20 object-contain" />
                                            <button
                                                onClick={() => setConfig({ ...config, coverBgImage: null })}
                                                className="absolute top-2 right-2 p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                                                title="ব্যাকগ্রাউন্ড মুছে ফেলুন"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => bgImageInputRef.current?.click()}
                                            className="w-full py-2 bg-slate-200/50 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Upload size={13} /> ব্যাকগ্রাউন্ড পরিবর্তন করুন
                                        </button>
                                        
                                        {/* Background Layout */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                                            <label className="text-[9px] font-bold text-slate-500 px-0.5">ব্যাকগ্রাউন্ড পজিশন/লেআউট</label>
                                            <select
                                                value={config.coverBgLayout || 'full'}
                                                onChange={e => setConfig({ ...config, coverBgLayout: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-550/15"
                                            >
                                                <option value="full">সম্পূর্ণ পৃষ্ঠা (Full Page)</option>
                                                <option value="under_topics">টপিকসমূহের নিচে (Under Topics Card)</option>
                                                <option value="partial">আংশিক/মাঝখানে (Partial / Center)</option>
                                            </select>
                                        </div>

                                        {/* Background Size Slider (Only shown for non-full page layouts) */}
                                        {(config.coverBgLayout === 'partial' || config.coverBgLayout === 'under_topics') && (
                                            <div className="space-y-1 pt-1 animate-in fade-in duration-200">
                                                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase px-0.5">
                                                    <span>ব্যাকগ্রাউন্ড ছবির আকার (Size)</span>
                                                    <span>{config.coverBgSize || 300}px</span>
                                                </div>
                                                <input
                                                    type="range" min="100" max="600" step="10" value={config.coverBgSize || 300}
                                                    onChange={e => setConfig({ ...config, coverBgSize: parseInt(e.target.value) })}
                                                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                        )}

                                        {/* Background Border Toggle (Only shown for non-full page layouts) */}
                                        {(config.coverBgLayout === 'partial' || config.coverBgLayout === 'under_topics') && (
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-200/30 animate-in fade-in duration-200">
                                                <span className="text-[11px] font-bold text-slate-700 block">চারপাশে আকর্ষণীয় বর্ডার দিন</span>
                                                <button
                                                    onClick={() => setConfig({ ...config, coverBgBorder: !config.coverBgBorder })}
                                                    className={`w-9 h-5 rounded-full relative transition-all ${config.coverBgBorder ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.coverBgBorder ? 'left-5' : 'left-1'}`}></div>
                                                </button>
                                            </div>
                                        )}

                                        {/* Background Opacity */}
                                        <div className="space-y-1 pt-1">
                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase px-0.5">
                                                <span>ব্যাকগ্রাউন্ড অস্বচ্ছতা (Opacity)</span>
                                                <span>{config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15}%</span>
                                            </div>
                                            <input
                                                type="range" min="5" max="100" step="5" value={config.coverBgOpacity !== undefined ? config.coverBgOpacity : 15}
                                                onChange={e => setConfig({ ...config, coverBgOpacity: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => bgImageInputRef.current?.click()}
                                        className="w-full py-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl bg-white hover:bg-slate-50/50 transition-all flex flex-col items-center justify-center gap-2 group"
                                    >
                                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                                            <Upload size={18} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[11px] font-black text-slate-700">ব্যাকগ্রাউন্ড ইমেজ আপলোড করুন</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">JPEG / PNG ফরম্যাট (সর্বোচ্চ ৩ এমবি)</p>
                                        </div>
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={bgImageInputRef}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/jpg"
                                    onChange={handleBgImageUpload}
                                />
                            </div>



                            {/* Watermark Details */}
                            <div className={`p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 ${highlightedSection === 'watermark' ? 'highlight-flash-active' : ''}`}>
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
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase px-0.5">
                                                <span>আকার (Font Size)</span>
                                                <span>{config.watermarkSize || 8}rem</span>
                                            </div>
                                            <input
                                                type="range" min="3" max="16" step="0.5" value={config.watermarkSize || 8}
                                                onChange={e => setConfig({ ...config, watermarkSize: parseFloat(e.target.value) })}
                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cover Footer Settings */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in duration-300">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">কভার ফুটর কাস্টমাইজ</span>

                                {/* Publisher Footer */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-slate-700 block">পাবলিশার টেক্সট দেখান</span>
                                        <button
                                            onClick={() => setConfig({ ...config, showCoverFooterText: config.showCoverFooterText === false ? true : false })}
                                            className={`w-9 h-5 rounded-full relative transition-all ${config.showCoverFooterText !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.showCoverFooterText !== false ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    {config.showCoverFooterText !== false && (
                                        <div className="space-y-1 animate-in fade-in duration-200">
                                            <label className="text-[9px] font-bold text-slate-500 px-0.5">পাবলিশার লেখার টেক্সট</label>
                                            <input
                                                type="text"
                                                value={config.coverFooterText !== undefined && config.coverFooterText !== null ? config.coverFooterText : ''}
                                                onChange={e => setConfig({ ...config, coverFooterText: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-550/15"
                                                placeholder="जैसे: Perfect Academic Publication"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Academic Year Footer */}
                                <div className="space-y-3 pt-3 border-t border-slate-200/50">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[11px] font-bold text-slate-700 block">শিক্ষাবর্ষ টেক্সট দেখান</span>
                                        <button
                                            onClick={() => setConfig({ ...config, showCoverAcademicYearText: config.showCoverAcademicYearText === false ? true : false })}
                                            className={`w-9 h-5 rounded-full relative transition-all ${config.showCoverAcademicYearText !== false ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.showCoverAcademicYearText !== false ? 'left-5' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    {config.showCoverAcademicYearText !== false && (
                                        <div className="space-y-1 animate-in fade-in duration-200">
                                            <label className="text-[9px] font-bold text-slate-500 px-0.5">শিক্ষাবর্ষ লেখার টেক্সট</label>
                                            <input
                                                type="text"
                                                value={config.coverAcademicYearText !== undefined && config.coverAcademicYearText !== null ? config.coverAcademicYearText : ''}
                                                onChange={e => setConfig({ ...config, coverAcademicYearText: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-550/15"
                                                placeholder="যেমন: শিক্ষাবর্ষ: ২০২৬-২০২৭"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cover Font Settings */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in duration-300">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">কভার ফন্ট কাস্টমাইজ</span>
                                
                                {/* Institute Name Font Size */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase px-0.5">
                                        <span>প্রতিষ্ঠানের নাম (Institute Name)</span>
                                        <span>{config.instituteFontSize || 22}pt</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="36" value={config.instituteFontSize || 22}
                                        onChange={e => setConfig({ ...config, instituteFontSize: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                {/* Title / Topics Font Size */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase px-0.5">
                                        <span>শিরোনাম / টপিক (Title / Topics)</span>
                                        <span>{config.titleFontSize || 16}pt</span>
                                    </div>
                                    <input
                                        type="range" min="10" max="36" value={config.titleFontSize || 16}
                                        onChange={e => setConfig({ ...config, titleFontSize: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                {/* Metadata Font Size */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase px-0.5">
                                        <span>শ্রেণী ও বিষয় (Metadata Info)</span>
                                        <span>{config.metadataFontSize || 11}pt</span>
                                    </div>
                                    <input
                                        type="range" min="8" max="20" value={config.metadataFontSize || 11}
                                        onChange={e => setConfig({ ...config, metadataFontSize: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                {/* Footer Font Size */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase px-0.5">
                                        <span>পাবলিশার ও শিক্ষাবর্ষ (Footer Text)</span>
                                        <span>{config.footerFontSize || 9}pt</span>
                                    </div>
                                    <input
                                        type="range" min="6" max="16" value={config.footerFontSize || 9}
                                        onChange={e => setConfig({ ...config, footerFontSize: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>



                            {/* Page Borders & Layout Preset */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">বর্ডার ও পেপার কালার</span>

                                <button
                                    onClick={() => setConfig({ ...config, showPageBorder: !config.showPageBorder })}
                                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${config.showPageBorder ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                >
                                    <Square size={13} className={config.showPageBorder ? "fill-white/20" : ""} /> 
                                    {config.showPageBorder ? 'পৃষ্ঠার চারপাশের বর্ডার সরান' : 'পৃষ্ঠায় আকর্ষণীয় বর্ডার দিন'}
                                </button>

                                {config.showPageBorder && (
                                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                                        <label className="text-[9px] font-bold text-slate-500 px-0.5">বর্ডার ডিজাইন স্টাইল</label>
                                        <select
                                            value={config.pageBorderPreset || 'double'}
                                            onChange={e => setConfig({ ...config, pageBorderPreset: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                                        >
                                            <option value="double">ডাবল অর্নামেন্টাল বর্ডার (Double Accent)</option>
                                            <option value="solid">একক সলিড মার্জিন বর্ডার (Solid Accent)</option>
                                            <option value="minimal">হালকা চিকন বর্ডার (Minimal Slate)</option>
                                            <option value="none">বর্ডার ছাড়া পেজ (No Border)</option>
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">পৃষ্ঠার ব্যাকগ্রাউন্ড কালার</label>
                                    <div className="flex gap-2">
                                        {[
                                            { code: '#ffffff', name: 'White' },
                                            { code: '#fafaf9', name: 'Warm' },
                                            { code: '#fefcbf', name: 'Ivory' },
                                            { code: '#f0fdf4', name: 'Mint' }
                                        ].map(color => (
                                            <button
                                                key={color.code}
                                                onClick={() => setConfig({ ...config, paperColor: color.code })}
                                                className={`w-8 h-8 rounded-full border shadow-sm transition-all ${config.paperColor === color.code ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                                                style={{ backgroundColor: color.code }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HEADER & METADATA TAB PROPERTIES */}
                    {activeTab === 'metadata' && (
                        <div className="space-y-5 animate-in fade-in duration-300 font-outfit">
                            {/* Metadata Editor Forms */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">নথির মূল মেটাডেটা এডিট</span>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">প্রতিষ্ঠানের নাম (Institute Name)</label>
                                    <input
                                        type="text"
                                        value={lecture.instituteName || ''}
                                        onChange={e => setLecture(prev => ({ ...prev, instituteName: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        placeholder="Perfect Academy"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">লেকচার শিট শিরোনাম (Lecture Title)</label>
                                    <input
                                        type="text"
                                        value={lecture.title || ''}
                                        onChange={e => setLecture(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        placeholder="লেকচার শিট শিরোনাম..."
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">টপিক নেম (Topic Name)</label>
                                    <input
                                        type="text"
                                        value={lecture.topicName || ''}
                                        onChange={e => setLecture(prev => ({ ...prev, topicName: e.target.value }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        placeholder="টপিক নেম..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">শ্রেণী (Class)</label>
                                        <input
                                            type="text"
                                            value={lecture.className || ''}
                                            onChange={e => setLecture(prev => ({ ...prev, className: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                            placeholder="যেমন: ১০ম শ্রেণী"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">বিষয় (Subject)</label>
                                        <input
                                            type="text"
                                            value={lecture.subjectName || ''}
                                            onChange={e => setLecture(prev => ({ ...prev, subjectName: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                            placeholder="যেমন: পদার্থবিজ্ঞান"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">কঠিনতার স্তর</label>
                                        <select
                                            value={lecture.difficultyLevel || 'EASY'}
                                            onChange={e => setLecture(prev => ({ ...prev, difficultyLevel: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                                        >
                                            <option value="EASY">সহ সহজ (Easy)</option>
                                            <option value="MEDIUM">মধ্যম (Medium)</option>
                                            <option value="HARD">কঠিন (Hard)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 px-0.5">ভাষা (Language)</label>
                                        <select
                                            value={lecture.language || 'Bangla'}
                                            onChange={e => setLecture(prev => ({ ...prev, language: e.target.value }))}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                                        >
                                            <option value="Bangla">বাংলা</option>
                                            <option value="English">ইংরেজি</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">লেকচার ক্লাসের সময় (মিনিট)</label>
                                    <input
                                        type="number"
                                        value={lecture.lectureTimeMinutes || 45}
                                        onChange={e => setLecture(prev => ({ ...prev, lectureTimeMinutes: parseInt(e.target.value) || 0 }))}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        placeholder="যেমন: ৪৫"
                                    />
                                </div>
                            </div>

                            {/* Cover Page Settings Group */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">কভার পেজ ভিজিবিলিটি সেটিংস</span>

                                <div className="space-y-2">
                                    {[
                                        { key: 'showInstituteName', label: 'প্রতিষ্ঠানের নাম দেখান (Institute Name)' },
                                        { key: 'showTitle', label: 'লেকচার টাইটেল দেখান (Lecture Title)' }
                                    ].map(item => (
                                        <div key={item.key} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <span className="text-[11px] font-bold text-slate-650">{item.label}</span>
                                            <button
                                                onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                                                className={`w-9 h-5 rounded-full relative transition-all ${config[item.key] ? 'bg-indigo-650' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config[item.key] ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Header & Footer Book Style Settings */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">হেডার ও ফুটার সেটিংস (বই স্টাইল)</span>
                                
                                {/* Global Master Toggle */}
                                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-700 block">হেডার ও ফুটার সক্রিয় করুন</span>
                                        <span className="text-[9px] text-slate-400">সম্পূর্ণ লেকচার শিটে হেডার ও ফুটার চালু করুন</span>
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, enableHeaderFooter: !config.enableHeaderFooter })}
                                        className={`w-9 h-5 rounded-full relative transition-all shrink-0 ${config.enableHeaderFooter ? 'bg-indigo-650' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.enableHeaderFooter ? 'left-5' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                {/* Conditional Sub-options */}
                                {config.enableHeaderFooter && (
                                    <div className="space-y-4 pt-3 border-t border-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-350">
                                        {/* Show Page Numbers */}
                                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-750 block">পৃষ্ঠা নম্বর দেখান (Page Numbers)</span>
                                                <span className="text-[9px] text-slate-400">প্রতিটি পাতার নিচে পৃষ্ঠা নম্বর প্রদর্শন</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, showPageNumbers: !config.showPageNumbers })}
                                                className={`w-9 h-5 rounded-full relative transition-all shrink-0 ${config.showPageNumbers ? 'bg-indigo-650' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.showPageNumbers ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>

                                        {/* Page Number Language */}
                                        {config.showPageNumbers && (
                                            <div className="space-y-2 p-3 bg-white border border-slate-100 rounded-xl shadow-sm animate-in fade-in duration-200">
                                                <label className="text-[10px] font-bold text-slate-500 block">পৃষ্ঠা নম্বরের ভাষা (Language)</label>
                                                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                                                    <button
                                                        onClick={() => setConfig({ ...config, pageNumberLanguage: 'en' })}
                                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${config.pageNumberLanguage !== 'bn' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                                                    >
                                                        English (1, 2, 3)
                                                    </button>
                                                    <button
                                                        onClick={() => setConfig({ ...config, pageNumberLanguage: 'bn' })}
                                                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${config.pageNumberLanguage === 'bn' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-400 hover:text-slate-650'}`}
                                                    >
                                                        বাংলা (১, ২, ৩)
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Show Page Header */}
                                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-750 block">পৃষ্ঠার হেডার দেখান (Page Header)</span>
                                                <span className="text-[9px] text-slate-400">পাতার উপরে বিষয় ও অধ্যায়ের নাম</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, showPageHeader: !config.showPageHeader })}
                                                className={`w-9 h-5 rounded-full relative transition-all shrink-0 ${config.showPageHeader ? 'bg-indigo-650' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.showPageHeader ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>

                                        {/* Header Text Input (only if enabled) */}
                                        {config.showPageHeader && (
                                            <div className="space-y-2 p-3 bg-white border border-slate-100 rounded-xl shadow-sm animate-in fade-in duration-200">
                                                <label className="text-[10px] font-bold text-slate-500 block">হেডার টেক্সট (বাছাইকৃত)</label>
                                                <input
                                                    type="text"
                                                    value={config.pageHeaderText !== undefined ? config.pageHeaderText : (lecture.title || '')}
                                                    onChange={e => setConfig({ ...config, pageHeaderText: e.target.value })}
                                                    placeholder="যেমন: অধ্যায় ১: তথ্য প্রযুক্তি"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                />
                                            </div>
                                        )}

                                        {/* Show Page Footer Text */}
                                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-750 block">কাস্টম ফুটার লেখা (Footer Text)</span>
                                                <span className="text-[9px] text-slate-400">পৃষ্ঠার নিচে প্রকাশনী বা কাস্টম নাম</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, showPageFooterText: !config.showPageFooterText })}
                                                className={`w-9 h-5 rounded-full relative transition-all shrink-0 ${config.showPageFooterText ? 'bg-indigo-650' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.showPageFooterText ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>

                                        {/* Footer Text Input (only if enabled) */}
                                        {config.showPageFooterText && (
                                            <div className="space-y-2 p-3 bg-white border border-slate-100 rounded-xl shadow-sm animate-in fade-in duration-200">
                                                <label className="text-[10px] font-bold text-slate-500 block">ফুটার টেক্সট</label>
                                                <input
                                                    type="text"
                                                    value={config.pageFooterText !== undefined ? config.pageFooterText : 'Perfect Academic Publication'}
                                                    onChange={e => setConfig({ ...config, pageFooterText: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    {/* SETTINGS TAB PROPERTIES */}
                    {activeTab === 'settings' && (
                        <div className="space-y-5 animate-in fade-in duration-300">
                            {/* Question & Layout Display settings */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">প্রশ্ন ও লেআউট সেটিংস</span>

                                <div className="space-y-2">
                                    {[
                                        { key: 'showQuestionNumbers', label: 'প্রশ্নের ক্রমিক নম্বর দেখান', desc: 'প্রতিটি প্রশ্নের শুরুতেই তার সিরিয়াল নম্বর' },
                                        { key: 'showMarks', label: 'প্রশ্নের মান (Marks) দেখান', desc: 'প্রশ্নের ডানপাশে ব্র্যাকেটে মার্কস' },
                                        { key: 'questionsAtEnd', label: '📖 সকল প্রশ্ন শেষে দেখান', desc: 'লেখার মাঝে প্রশ্ন না দেখিয়ে শেষে অনুশীলন সেকশন' }
                                    ].map(item => (
                                        <div key={item.key} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-700 block">{item.label}</span>
                                                <span className="text-[9px] text-slate-400">{item.desc}</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                                                className={`w-9 h-5 rounded-full relative transition-all shrink-0 ${config[item.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config[item.key] ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1 pt-2 border-t border-slate-200/50">
                                    <label className="text-[10px] font-bold text-slate-500 px-0.5">MCQ অপশন কলাম বিন্যাস</label>
                                    <select
                                        value={config.optionCols || 'auto'}
                                        onChange={e => setConfig({ ...config, optionCols: e.target.value === 'auto' ? 'auto' : parseInt(e.target.value) })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer"
                                    >
                                        <option value="auto">অটো ফিট (Auto Fit)</option>
                                        <option value={1}>১ কলাম (Vertical)</option>
                                        <option value={2}>২ কলাম (Grid 2x2)</option>
                                        <option value={4}>৪ কলাম (Horizontal)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Question Numbering Reset Settings */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-outfit">নম্বরক্রম রিসেট লজিক</span>
                                <p className="text-[9px] text-slate-400 leading-relaxed">নম্বর পুনরায় ১ থেকে শুরু করার শর্তসমূহ সেট করুন।</p>

                                <div className="space-y-2">
                                    {[
                                        { key: 'resetNumberingByType', label: 'টাইপ অনুযায়ী নম্বরক্রম রিসেট', desc: 'MCQ ও সৃজনশীল আলাদা নম্বর পাবে' },
                                        { key: 'resetNumberingBySection', label: 'সেকশন অনুযায়ী নম্বরক্রম রিসেট', desc: 'নতুন সেকশনে পুনরায় ১ থেকে শুরু হবে' }
                                    ].map(item => (
                                        <div key={item.key} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-700 block">{item.label}</span>
                                                <span className="text-[9px] text-slate-400">{item.desc}</span>
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                                                className={`w-9 h-5 rounded-full relative transition-all shrink-0 ${config[item.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config[item.key] ? 'left-5' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Answer & Explanation Display Controls */}
                            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">উত্তর ও ব্যাখ্যা প্রদর্শন</span>
                                </div>
                                <p className="text-[9px] text-emerald-600 leading-relaxed">প্রতিটি প্রশ্নের নিচে সরাসরি উত্তর ও ব্যাখ্যা দেখানো নিয়ন্ত্রণ করুন।</p>

                                <div className="space-y-2">
                                    {[
                                        { key: 'showAnswers', label: '✅ সঠিক উত্তর দেখান', desc: 'প্রতিটি প্রশ্নের নিচে উত্তর' },
                                        { key: 'showExplanations', label: '📖 ব্যাখ্যা দেখান', desc: 'বিস্তারিত ব্যাখ্যা প্রদর্শন' },
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

export default LectureRightProperties;
