import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
    PanelLeft, PanelRight, ShieldCheck, Unlock, 
    Settings2, FileText, Copy, Loader2, Printer, 
    FileDown, LayoutTemplate, Save, Languages, Cloud,
    ClipboardList, HelpCircle, Sliders, Palette, CheckSquare,
    Image as ImageIcon, MoreVertical
} from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { useExamManager } from '../../hooks/useExamManager';

const NexusHeader = () => {
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const { id } = useParams();
    const { 
        uiLang, setUiLang, t, isMobileApp,
        isLeftPanelOpen, setIsLeftPanelOpen,
        isRightPanelOpen, setIsRightPanelOpen,
        editorMode, setEditorMode,
        pageCount, zoom,
        activeTab, setActiveTab,
        isSavingDocument, addToast,
        setShowFilenameModal
    } = useNexusEditor();
 
    const { handleSaveDocument, handleSaveAs, handleSaveTemplate, isSavingTemplate, handleDownloadPdf, isDownloadingPdf } = useExamManager();

    return (
        <header className="backdrop-blur-md bg-white/80 border-b border-slate-200 shrink-0 z-20 shadow-sm flex flex-col justify-between px-4 pt-2 print:hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Language Toggle - Desktop Only */}
                    <div className="hidden sm:flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                        <div className="pl-2 pr-1.5 flex items-center text-slate-400">
                            <Languages size={13} />
                        </div>
                        <button onClick={() => setUiLang('bn')} className={`px-2 py-0.5 rounded transition-all ${uiLang === 'bn' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>বাংলা</button>
                        <button onClick={() => setUiLang('en')} className={`px-2 py-0.5 rounded transition-all ${uiLang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>EN</button>
                    </div>

                    {/* Active Mode / Dynamic Indicator Badges */}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50/50 border border-emerald-100/80 rounded-lg text-[10px] text-emerald-700 font-semibold shadow-sm">
                        <div className="relative flex items-center justify-center">
                            <Cloud size={13} className="text-emerald-500" />
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full border border-white animate-pulse"></span>
                        </div>
                        <span className="hidden xs:inline">Auto Sync</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-xs font-bold shadow-sm">
                        <button 
                            onClick={() => setEditorMode('STRICT_LINKED')}
                            title={t.strictMode}
                            className={`px-2 sm:px-3 py-1 rounded transition-all flex items-center gap-1 sm:gap-1.5 ${editorMode === 'STRICT_LINKED' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ShieldCheck size={14} className={editorMode === 'STRICT_LINKED' ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className="text-[10px] sm:text-xs">{uiLang === 'bn' ? 'স্ট্রিক্ট' : 'Strict'}</span>
                        </button>
                        <button 
                            onClick={() => setEditorMode('FREE_EDIT')}
                            title={t.freeMode}
                            className={`px-2 sm:px-3 py-1 rounded transition-all flex items-center gap-1 sm:gap-1.5 ${editorMode === 'FREE_EDIT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Unlock size={14} className={editorMode === 'FREE_EDIT' ? 'text-indigo-600' : 'text-slate-400'} />
                            <span className="text-[10px] sm:text-xs">{uiLang === 'bn' ? 'রিভাইজ' : 'Revise'}</span>
                        </button>
                    </div>

                    {/* Desktop Actions (Width >= 1024px) */}
                    <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 pl-3">
                        {/* Print Button */}
                        {!isMobileApp && (
                            <button 
                                onClick={() => window.print()}
                                className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                                title={uiLang === 'bn' ? 'ডকুমেন্ট প্রিন্ট করুন' : 'Print Document'}
                            >
                                <Printer size={14} className="text-slate-600" />
                                <span>{uiLang === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
                            </button>
                        )}
 
                        {/* PDF Download Button */}
                        <button 
                            onClick={() => setShowFilenameModal(true)}
                            disabled={isDownloadingPdf}
                            className={`px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold shadow-sm transition-all hover:bg-rose-100 hover:border-rose-300 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 ${isDownloadingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={uiLang === 'bn' ? 'PDF হিসেবে ডাউনলোড করুন' : 'Download PDF'}
                        >
                            {isDownloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                            <span>{uiLang === 'bn' ? 'PDF ডাউনলোড' : 'PDF'}</span>
                        </button>

                        <div className="w-[1px] h-5 bg-slate-200 mx-0.5"></div>

                        {/* Save Template Button */}
                        <button 
                            onClick={handleSaveTemplate}
                            disabled={isSavingTemplate}
                            className={`px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${isSavingTemplate ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02] active:scale-95'}`}
                            title={uiLang === 'bn' ? 'টেমপ্লেট হিসেবে সেভ করুন' : 'Save as Template'}
                        >
                            {isSavingTemplate ? <Loader2 size={14} className="animate-spin" /> : <LayoutTemplate size={14} className="text-slate-600" />}
                            <span>{uiLang === 'bn' ? 'টেমপ্লেট সেভ' : 'Template'}</span>
                        </button>

                        {/* Save Document Button */}
                        <button 
                            onClick={handleSaveDocument}
                            disabled={isSavingDocument}
                            className={`px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-100 hover:border-indigo-300 hover:scale-[1.02] active:scale-95'}`}
                            title={uiLang === 'bn' ? 'ডকুমেন্ট সেভ করুন' : 'Save Document'}
                        >
                            {isSavingDocument ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            <span>{uiLang === 'bn' ? 'সেভ করুন' : 'Save'}</span>
                        </button>

                        {/* Save As Button */}
                        {id && (
                            <button 
                                onClick={handleSaveAs}
                                disabled={isSavingDocument}
                                className={`px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-100 hover:border-emerald-300 hover:scale-[1.02] active:scale-95'}`}
                                      title={uiLang === 'bn' ? 'নতুন নামে সেভ করুন' : 'Save As'}
                            >
                                <Copy size={14} />
                                <span>{uiLang === 'bn' ? 'নতুন সেভ' : 'Save As'}</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile & Tablet Actions (Width < 1024px) */}
                    <div className="flex lg:hidden items-center gap-1.5 border-l border-slate-200 pl-2 relative">
                        {/* Compact Save Button */}
                        <button 
                            onClick={handleSaveDocument}
                            disabled={isSavingDocument}
                            className={`px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={uiLang === 'bn' ? 'ডকুমেন্ট সেভ করুন' : 'Save Document'}
                        >
                            {isSavingDocument ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            <span className="text-[10px]">{uiLang === 'bn' ? 'সেভ' : 'Save'}</span>
                        </button>

                        {/* Direct PDF Download Button on Mobile */}
                        <button 
                            onClick={() => setShowFilenameModal(true)}
                            disabled={isDownloadingPdf}
                            className={`px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1 ${isDownloadingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={uiLang === 'bn' ? 'PDF হিসেবে ডাউনলোড করুন' : 'Download PDF'}
                        >
                            {isDownloadingPdf ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                            <span className="text-[10px]">{uiLang === 'bn' ? 'ডাউনলোড' : 'PDF'}</span>
                        </button>

                        {/* Three-Dot Trigger */}
                        <button 
                            onClick={() => setShowMoreMenu(prev => !prev)}
                            className={`p-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-all active:scale-95 shadow-sm ${showMoreMenu ? 'bg-slate-100 border-indigo-400 text-indigo-600' : 'bg-white'}`}
                            title="More Actions"
                        >
                            <MoreVertical size={13} className="stroke-[2.5]" />
                        </button>

                        {/* Dropdown Menu */}
                        {showMoreMenu && (
                            <>
                                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowMoreMenu(false)} />
                                <div className="absolute right-0 top-9 bg-white border border-slate-200/80 shadow-2xl rounded-xl p-1.5 min-w-[160px] flex flex-col gap-0.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                    {/* Language Selection in Dropdown on Mobile */}
                                    <div className="sm:hidden px-2 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Language</div>
                                    <div className="sm:hidden flex bg-slate-50 p-0.5 rounded-lg border border-slate-100 text-[10px] font-bold mb-2">
                                        <button onClick={() => { setUiLang('bn'); setShowMoreMenu(false); }} className={`flex-1 text-center py-1 rounded transition-all ${uiLang === 'bn' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>বাংলা</button>
                                        <button onClick={() => { setUiLang('en'); setShowMoreMenu(false); }} className={`flex-1 text-center py-1 rounded transition-all ${uiLang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>EN</button>
                                    </div>
                                    <div className="sm:hidden h-[1px] bg-slate-100 my-0.5"></div>

                                    {!isMobileApp && (
                                        <button 
                                            onClick={() => { window.print(); setShowMoreMenu(false); }}
                                            className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2"
                                        >
                                            <Printer size={13} className="text-slate-400" />
                                            <span>{uiLang === 'bn' ? 'প্রিন্ট করুন' : 'Print Paper'}</span>
                                        </button>
                                    )}
                                    
                                    <button 
                                        onClick={() => { 
                                            setShowFilenameModal(true);
                                            setShowMoreMenu(false); 
                                        }}
                                        disabled={isDownloadingPdf}
                                        className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isDownloadingPdf ? <Loader2 size={13} className="animate-spin text-slate-400" /> : <FileDown size={13} className="text-slate-400" />}
                                        <span>{uiLang === 'bn' ? 'PDF ডাউনলোড' : 'PDF Download'}</span>
                                    </button>

                                    <button 
                                        onClick={() => { handleSaveTemplate(); setShowMoreMenu(false); }}
                                        disabled={isSavingTemplate}
                                        className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <LayoutTemplate size={13} className="text-slate-400" />
                                        <span>{uiLang === 'bn' ? 'টেমপ্লেট সেভ' : 'Save Template'}</span>
                                    </button>

                                    {id && (
                                        <button 
                                            onClick={() => { handleSaveAs(); setShowMoreMenu(false); }}
                                            disabled={isSavingDocument}
                                            className="w-full px-2.5 py-1.5 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <Copy size={13} className="text-slate-400" />
                                            <span>{uiLang === 'bn' ? 'নতুন নামে সেভ' : 'Save As'}</span>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs / Ribbon Menus */}
            <div className="flex items-center gap-2 mt-3 border-b border-slate-100 pb-2 overflow-x-auto no-scrollbar snap-x snap-mandatory flex-nowrap scroll-smooth">
                {[
                    { id: 'examInfo', icon: <ClipboardList size={14} /> },
                    { id: 'questionSetup', icon: <HelpCircle size={14} /> },
                    { id: 'pageSetup', icon: <Sliders size={14} /> },
                    { id: 'design', icon: <Palette size={14} /> },
                    { id: 'templates', icon: <LayoutTemplate size={14} /> },
                    { id: 'answerSheet', icon: <CheckSquare size={14} /> },
                    { id: 'image', icon: <ImageIcon size={14} /> }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => {
                            setActiveTab(tab.id);
                            setIsRightPanelOpen(true);
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 shrink-0 border snap-align-start ${activeTab === tab.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                    >
                        {tab.icon}
                        <span>{t[tab.id]}</span>
                    </button>
                ))}
            </div>
        </header>
    );
};

export default NexusHeader;
