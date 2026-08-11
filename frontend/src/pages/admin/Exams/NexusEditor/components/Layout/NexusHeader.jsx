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
                    {/* Header Actions: Print, Save & Dropdown */}
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-3 relative">
                        {/* Print Button (Visible Outside) */}
                        {!isMobileApp && (
                            <button 
                                onClick={() => window.print()}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 rounded-lg text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 group"
                                title={uiLang === 'bn' ? 'ডকুমেন্ট প্রিন্ট করুন' : 'Print Document'}
                            >
                                <Printer size={14} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
                                <span>{uiLang === 'bn' ? 'প্রিন্ট করুন' : 'Print'}</span>
                            </button>
                        )}

                        {/* Save Document Primary Button */}
                        <button 
                            onClick={handleSaveDocument}
                            disabled={isSavingDocument}
                            className={`px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 ${isSavingDocument ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={uiLang === 'bn' ? 'ডকুমেন্ট সংরক্ষণ করুন' : 'Save Document'}
                        >
                            {isSavingDocument ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            <span>{uiLang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}</span>
                        </button>

                        {/* Three-Dots Menu Button */}
                        <button 
                            onClick={() => setShowMoreMenu(prev => !prev)}
                            className={`w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shadow-sm active:scale-95 ${showMoreMenu ? 'bg-slate-100 border-indigo-400 text-indigo-600' : 'bg-white hover:bg-slate-50'}`}
                            title={uiLang === 'bn' ? 'অতিরিক্ত অপশন' : 'More Options'}
                        >
                            <MoreVertical size={16} className="stroke-[2.5]" />
                        </button>

                        {/* Dropdown Menu */}
                        {showMoreMenu && (
                            <>
                                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowMoreMenu(false)} />
                                <div className="absolute right-0 top-10 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-xl p-1.5 min-w-[210px] flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        {uiLang === 'bn' ? 'অতিরিক্ত অপশন' : 'More Options'}
                                    </div>
                                    
                                    {/* Save As Button */}
                                    <button 
                                        onClick={() => { 
                                            if (handleSaveAs) handleSaveAs();
                                            setShowMoreMenu(false); 
                                        }}
                                        disabled={isSavingDocument}
                                        className="w-full px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-700 rounded-lg flex items-center justify-between transition-colors group disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Copy size={14} className="text-indigo-500" />
                                            <span>{uiLang === 'bn' ? 'নতুন নামে সংরক্ষণ' : 'Save As'}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-slate-400 bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 px-1.5 py-0.5 rounded uppercase">Save As</span>
                                    </button>

                                    {/* PDF Download Button */}
                                    <button 
                                        onClick={() => { 
                                            setShowFilenameModal(true);
                                            setShowMoreMenu(false); 
                                        }}
                                        disabled={isDownloadingPdf}
                                        className="w-full px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-rose-50/70 hover:text-rose-700 rounded-lg flex items-center justify-between transition-colors group disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2">
                                            {isDownloadingPdf ? <Loader2 size={14} className="animate-spin text-rose-500" /> : <FileDown size={14} className="text-rose-500" />}
                                            <span>{uiLang === 'bn' ? 'পিডিএফ হিসেবে ডাউনলোড' : 'Download PDF'}</span>
                                        </div>
                                        <span className="text-[9px] font-mono text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase">PDF</span>
                                    </button>
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
