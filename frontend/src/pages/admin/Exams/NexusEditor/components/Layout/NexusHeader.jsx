import React from 'react';
import { useParams } from 'react-router-dom';
import { 
    PanelLeft, PanelRight, ShieldCheck, Unlock, 
    Settings2, FileText, Copy, Loader2
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
        isSavingDocument
    } = useNexusEditor();

    const { handleSaveDocument, handleSaveAs, handleSaveTemplate, isSavingTemplate } = useExamManager();

    return (
        <header className="bg-white border-b border-slate-200 shrink-0 z-20 shadow-sm flex flex-col justify-between px-4 pt-2 print:hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    {/* Panel Left Toggle */}
                    <button 
                        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)} 
                        className={`p-1.5 rounded-lg border transition-all ${isLeftPanelOpen ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}
                        title={t.questionBank}
                    >
                        <PanelLeft size={16} />
                    </button>

                    {/* Language Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setUiLang('bn')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${uiLang === 'bn' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>বাংলা</button>
                        <button onClick={() => setUiLang('en')} className={`px-4 py-1 rounded text-xs font-bold transition-all ${uiLang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>English</button>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button 
                            onClick={() => setEditorMode('STRICT_LINKED')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1 ${editorMode === 'STRICT_LINKED' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ShieldCheck size={14} /> {t.strictMode}
                        </button>
                        <button 
                            onClick={() => {
                                alert(uiLang === 'bn' ? 'ফ্রি এডিট মোড ফিচারটি আন্ডার ডেভেলপমেন্ট।' : 'Free Edit Mode is under development.');
                            }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1 text-slate-500 hover:text-slate-700`}
                        >
                            <Unlock size={14} /> {t.freeMode}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm font-medium text-slate-700 mr-2 border border-slate-200 shadow-sm" title="Total Pages">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            {pageCount} {uiLang === 'bn' ? 'পেজ' : 'Pages'}
                        </div>
                        <button 
                            onClick={() => window.print()}
                            className="px-4 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                            title="Print"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            {uiLang === 'bn' ? 'প্রিন্ট' : 'Print'}
                        </button>
                        <button 
                            onClick={() => {
                                alert(uiLang === 'bn' ? 'অটোমেটিক পিডিএফ ডাউনলোড ফিচারটি আন্ডার ডেভেলপমেন্ট। দয়া করে "প্রিন্ট" বাটনে ক্লিক করে Destination থেকে "Save as PDF" ব্যবহার করুন।' : 'Automatic PDF download is under development. Please click the "Print" button and select "Save as PDF" as destination.');
                            }}
                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                            title="Download PDF"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            {uiLang === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF'}
                        </button>
                        <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
                        <button 
                            onClick={handleSaveTemplate}
                            disabled={isSavingTemplate}
                            className={`px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isSavingTemplate ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-slate-300'}`}
                        >
                            {isSavingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} />}
                            {isSavingTemplate ? t.loading : t.saveTemplate}
                        </button>
                        <button 
                            onClick={handleSaveDocument}
                            disabled={isSavingDocument}
                            className={`px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSavingDocument ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            {isSavingDocument ? t.loading : t.saveDoc}
                        </button>
                        {id && (
                            <button 
                                onClick={handleSaveAs}
                                disabled={isSavingDocument}
                                className={`px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Copy size={16} />
                                {t.saveAs}
                            </button>
                        )}
                        
                        {/* Panel Right Toggle */}
                        <button 
                            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} 
                            className={`ml-2 p-1.5 rounded-lg border transition-all ${isRightPanelOpen ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'}`}
                            title={t[activeTab]}
                        >
                            <PanelRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs / Ribbon Menus */}
            <div className="flex items-end gap-1 mt-2 overflow-x-auto custom-scrollbar pb-1">
                {['questionSetup', 'examInfo', 'pageSetup', 'font', 'design', 'templates', 'answerSheet'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-[13px] font-bold border-b-2 transition-all ${activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                        {t[tab]}
                    </button>
                ))}
            </div>
        </header>
    );
};

export default NexusHeader;
