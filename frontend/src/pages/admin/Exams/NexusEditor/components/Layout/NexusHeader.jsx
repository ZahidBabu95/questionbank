import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    PanelLeft, PanelRight, ShieldCheck, Unlock, 
    Settings2, FileText, Copy, Loader2, Printer, 
    FileDown, LayoutTemplate, Save, Languages, Cloud,
    ClipboardList, HelpCircle, Sliders, Palette, CheckSquare,
    Image as ImageIcon, MoreVertical, ArrowLeft
} from 'lucide-react';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { useExamManager } from '../../hooks/useExamManager';

const NexusHeader = () => {
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showLeftScrollShadow, setShowLeftScrollShadow] = useState(false);
    const [showRightScrollShadow, setShowRightScrollShadow] = useState(false);
    const scrollContainerRef = React.useRef(null);

    const { id } = useParams();
    const navigate = useNavigate();
    const { 
        uiLang, setUiLang, t, isMobileApp,
        isLeftPanelOpen, setIsLeftPanelOpen,
        isRightPanelOpen, setIsRightPanelOpen,
        editorMode, setEditorMode,
        pageCount, zoom,
        activeTab, setActiveTab,
        isSavingDocument, addToast, autoSaveStatus,
        setShowFilenameModal,
        docSettings, updateSetting
    } = useNexusEditor();

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState(docSettings?.exam || 'Untitled Document');
    const titleInputRef = React.useRef(null);

    React.useEffect(() => {
        setTempTitle(docSettings?.exam || 'Untitled Document');
    }, [docSettings?.exam]);

    const handleTitleClick = () => {
        setIsEditingTitle(true);
        setTimeout(() => {
            if (titleInputRef.current) {
                titleInputRef.current.focus();
                titleInputRef.current.select();
            }
        }, 50);
    };

    const handleTitleBlur = () => {
        setIsEditingTitle(false);
        const trimmed = tempTitle.trim();
        if (trimmed && trimmed !== docSettings?.exam) {
            updateSetting('exam', trimmed);
        } else {
            setTempTitle(docSettings?.exam || 'Untitled Document');
        }
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTitleBlur();
        } else if (e.key === 'Escape') {
            setIsEditingTitle(false);
            setTempTitle(docSettings?.exam || 'Untitled Document');
        }
    };

    const handleScroll = (e) => {
        const target = e.target;
        const scrollLeft = target.scrollLeft;
        const maxScroll = target.scrollWidth - target.clientWidth;
        setShowLeftScrollShadow(scrollLeft > 5);
        setShowRightScrollShadow(scrollLeft < maxScroll - 5);
    };

    React.useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        const checkScroll = () => {
            const maxScroll = el.scrollWidth - el.clientWidth;
            setShowLeftScrollShadow(el.scrollLeft > 5);
            setShowRightScrollShadow(maxScroll > 5 && el.scrollLeft < maxScroll - 5);
        };

        checkScroll();
        // A short timeout to ensure initial layout is painted
        const timer = setTimeout(checkScroll, 100);
        
        window.addEventListener('resize', checkScroll);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScroll);
        };
    }, []);
 
    const { handleSaveDocument, handleSaveAs, handleSaveTemplate, isSavingTemplate, handleDownloadPdf, isDownloadingPdf } = useExamManager();

    return (
        <header className="backdrop-blur-md bg-white/80 border-b border-slate-200 shrink-0 z-20 shadow-sm flex flex-col justify-between px-4 pt-2 print:hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2 sm:gap-3 max-w-[55%]">
                    {/* Exit/Back Button */}
                    <button 
                        onClick={() => navigate('/exams/generate/saved')}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md shadow-rose-500/25 rounded-xl text-xs font-bold transition-all active:scale-95 border border-rose-500/40 flex items-center gap-1.5 shrink-0"
                        title={uiLang === 'bn' ? 'ফিরে যান' : 'Back to Saved'}
                    >
                        <ArrowLeft size={16} className="stroke-[3]" />
                        <span className="hidden xs:inline font-semibold">{uiLang === 'bn' ? 'ফিরে যান' : 'Back'}</span>
                    </button>
                    
                    <div className="h-5 w-[1px] bg-slate-200 hidden xs:block shrink-0"></div>

                    {/* Title */}
                    <div className="flex items-center gap-2 min-w-0">
                        {isEditingTitle ? (
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={tempTitle}
                                onChange={(e) => setTempTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                onKeyDown={handleTitleKeyDown}
                                className="text-xs sm:text-sm font-black text-slate-800 tracking-tight bg-slate-50 border border-indigo-200 rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[100px] sm:max-w-[180px] md:max-w-[260px] transition-all font-outfit"
                            />
                        ) : (
                            <h1 
                                onClick={handleTitleClick}
                                className="text-xs sm:text-sm font-black text-slate-800 tracking-tight transition-all px-2 py-0.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-150 cursor-pointer truncate max-w-[100px] sm:max-w-[180px] md:max-w-[260px] font-outfit"
                                title={uiLang === 'bn' ? 'নাম পরিবর্তন করতে ক্লিক করুন' : 'Click to rename'}
                            >
                                {docSettings?.exam || 'Untitled Document'}
                            </h1>
                        )}
                        
                        {/* Auto-save/status indicator (Cloud) */}
                        <div className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm shrink-0 border transition-all ${
                            autoSaveStatus === 'saving' || isSavingDocument
                                ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                                : autoSaveStatus === 'error'
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-emerald-50/70 border-emerald-200/60 text-emerald-700'
                        }`}>
                            <div className="relative flex items-center justify-center">
                                {autoSaveStatus === 'saving' || isSavingDocument ? (
                                    <Loader2 size={11} className="animate-spin text-amber-600" />
                                ) : (
                                    <Cloud size={11} className={autoSaveStatus === 'error' ? 'text-rose-500' : 'text-emerald-500'} />
                                )}
                            </div>
                            <span>
                                {autoSaveStatus === 'saving' || isSavingDocument
                                    ? (uiLang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                                    : autoSaveStatus === 'error'
                                    ? (uiLang === 'bn' ? 'সংরক্ষণ ব্যর্থ' : 'Save Error')
                                    : (uiLang === 'bn' ? 'সংরক্ষিত' : 'Auto Sync')}
                            </span>
                        </div>
                    </div>

                    {/* Language Toggle - Desktop Only */}
                    <div className="hidden lg:flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold shrink-0">
                        <div className="pl-2 pr-1.5 flex items-center text-slate-400">
                            <Languages size={13} />
                        </div>
                        <button onClick={() => setUiLang('bn')} className={`px-2 py-0.5 rounded transition-all ${uiLang === 'bn' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>বাংলা</button>
                        <button onClick={() => setUiLang('en')} className={`px-2 py-0.5 rounded transition-all ${uiLang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>EN</button>
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
                                    {/* Language Selection in Dropdown on Mobile/Tablet */}
                                    <div className="lg:hidden px-2 py-1 text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Language</div>
                                    <div className="lg:hidden flex bg-slate-50 p-0.5 rounded-lg border border-slate-100 text-[10px] font-bold mb-2">
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
            <div className="relative w-full mt-3">
                {/* Left scroll shadow fade */}
                {showLeftScrollShadow && (
                    <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 transition-opacity duration-200" />
                )}
                {/* Right scroll shadow fade */}
                {showRightScrollShadow && (
                    <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 transition-opacity duration-200" />
                )}
                
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex items-center gap-2 border-b border-slate-100 pb-2 overflow-x-auto no-scrollbar snap-x snap-mandatory flex-nowrap scroll-smooth"
                >
                    {[
                        { id: 'examInfo', icon: <ClipboardList size={14} /> },
                        { id: 'questionSetup', icon: <HelpCircle size={14} /> },
                        { id: 'pageSetup', icon: <Sliders size={14} /> },
                        { id: 'design', icon: <Palette size={14} /> },
                        { id: 'templates', icon: <LayoutTemplate size={14} /> },
                        { id: 'answerSheet', icon: <CheckSquare size={14} /> },
                        { id: 'image', icon: <ImageIcon size={14} /> },
                        { id: 'setCode', icon: <Settings2 size={14} /> }
                    ].map(tab => {
                        if (tab.id === 'setCode' && docSettings?.multipleSetsEnabled) {
                            const count = docSettings.setCount || 4;
                            const lang = docSettings.setLanguage || 'BN';
                            const setNames = lang === 'EN' 
                                ? (count === 2 ? ['A', 'B'] : ['A', 'B', 'C', 'D'])
                                : (count === 2 ? ['ক', 'খ'] : ['ক', 'খ', 'গ', 'ঘ']);
                            
                            const activeSet = docSettings.activeSet || setNames[0];

                            return (
                                <React.Fragment key={tab.id}>
                                    {/* Set selector group to the left of the Set Code tab */}
                                    <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold shrink-0 shadow-sm mr-1">
                                        {setNames.map(setName => (
                                            <button
                                                key={setName}
                                                onClick={() => {
                                                    updateSetting('activeSet', setName);
                                                }}
                                                className={`px-2.5 py-1 rounded transition-all ${
                                                    activeSet === setName 
                                                        ? 'bg-white shadow-sm text-indigo-600 font-extrabold scale-105' 
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {uiLang === 'bn' ? `${setName} সেট` : `Set ${setName}`}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Actual Set Code Tab Button */}
                                    <button 
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsRightPanelOpen(true);
                                        }}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 active:scale-95 shrink-0 border snap-align-start ${activeTab === tab.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        {tab.icon}
                                        <span>{t[tab.id]}</span>
                                    </button>
                                </React.Fragment>
                            );
                        }

                        return (
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
                        );
                    })}
                </div>
            </div>
        </header>
    );
};

export default NexusHeader;
