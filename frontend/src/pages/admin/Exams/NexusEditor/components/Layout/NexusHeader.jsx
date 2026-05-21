import React from 'react';
import { useParams } from 'react-router-dom';
import { 
    PanelLeft, PanelRight, ShieldCheck, Unlock, 
    Settings2, FileText, Copy, Loader2, Printer, 
    FileDown, LayoutTemplate, Save, Languages, Cloud,
    ClipboardList, HelpCircle, Sliders, Palette, CheckSquare,
    Image as ImageIcon
} from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { useExamManager } from '../../hooks/useExamManager';

const NexusHeader = () => {
    const { id } = useParams();
    const { 
        uiLang, setUiLang, t, 
        isLeftPanelOpen, setIsLeftPanelOpen,
        isRightPanelOpen, setIsRightPanelOpen,
        editorMode, setEditorMode,
        pageCount, zoom,
        activeTab, setActiveTab,
        isSavingDocument, addToast
    } = useNexusEditor();

    const { handleSaveDocument, handleSaveAs, handleSaveTemplate, isSavingTemplate } = useExamManager();

    return (
        <header className="backdrop-blur-md bg-white/80 border-b border-slate-200 shrink-0 z-20 shadow-sm flex flex-col justify-between px-4 pt-2 print:hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    {/* Language Toggle */}
                    <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
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
                        <span className="hidden sm:inline">Auto Sync</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-xs font-bold shadow-sm">
                        <button 
                            onClick={() => setEditorMode('STRICT_LINKED')}
                            title={t.strictMode}
                            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 ${editorMode === 'STRICT_LINKED' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ShieldCheck size={14} className={editorMode === 'STRICT_LINKED' ? 'text-indigo-600' : 'text-slate-400'} />
                            <span>{uiLang === 'bn' ? 'স্ট্রিক্ট' : 'Strict'}</span>
                        </button>
                        <button 
                            onClick={() => setEditorMode('FREE_EDIT')}
                            title={t.freeMode}
                            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 ${editorMode === 'FREE_EDIT' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Unlock size={14} className={editorMode === 'FREE_EDIT' ? 'text-indigo-600' : 'text-slate-400'} />
                            <span>{uiLang === 'bn' ? 'রিভাইজ' : 'Revise'}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                        {/* Print Button */}
                        <button 
                            onClick={() => window.print()}
                            className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                            title={uiLang === 'bn' ? 'ডকুমেন্ট প্রিন্ট করুন' : 'Print Document'}
                        >
                            <Printer size={14} className="text-slate-600" />
                            <span>{uiLang === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
                        </button>

                        {/* PDF Download Button */}
                        <button 
                            onClick={() => {
                                addToast(uiLang === 'bn' ? 'অটোমেটিক পিডিএফ ডাউনলোড ফিচারটি আন্ডার ডেভেলপমেন্ট। দয়া করে "প্রিন্ট" বাটনে ক্লিক করে Destination থেকে "Save as PDF" ব্যবহার করুন।' : 'Automatic PDF download is under development. Please click the "Print" button and select "Save as PDF" as destination.', 'info');
                            }}
                            className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold shadow-sm transition-all hover:bg-rose-100 hover:border-rose-300 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                            title={uiLang === 'bn' ? 'PDF হিসেবে ডাউনলোড করুন' : 'Download PDF'}
                        >
                            <FileDown size={14} />
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
                </div>
            </div>

            {/* Tabs / Ribbon Menus */}
            <div className="flex items-center gap-1.5 mt-3 border-b border-slate-100 pb-1.5 overflow-x-auto custom-scrollbar">
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
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${activeTab === tab.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
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
