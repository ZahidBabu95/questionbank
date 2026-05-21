import React, { useEffect } from 'react';
import { NexusEditorProvider, useNexusEditor } from './context/NexusEditorContext';
import { usePanelResizer } from './hooks/usePanelResizer';
import { useAiImporter } from './hooks/useAiImporter';
import { useExamManager } from './hooks/useExamManager';
import NexusHeader from './components/Layout/NexusHeader';
import LeftSidebar from './components/Layout/LeftSidebar';
import RightSidebar from './components/Layout/RightSidebar';
import PaperCanvasV2 from './components/PaperCanvasV2';
import ToastContainer from './components/Layout/ToastContainer';
import CanvasControlBar from './components/Layout/CanvasControlBar';
import { PanelLeftOpen, PanelRightOpen, Database, Settings2 } from 'lucide-react';

const NexusEditorContent = () => {
    const { 
        docSettings, editorMode, rawContent, setRawContent, 
        zoom, workspaceTools, editorConfig, setPageCount,
        pendingInsertQuestion, setPendingInsertQuestion,
        pendingSwapQuestion, setPendingSwapQuestion,
        setActiveTab, setIsRightPanelOpen,
        setDocumentQuestions, documentQuestions, setSwapTarget, setIsLeftPanelOpen, setLeftPanelTab,
        setSelectedImageConfig, updateSetting,
        isLeftPanelOpen, isRightPanelOpen, leftPanelTab, activeTab,
        canvasTheme, uiLang, setEditor
    } = useNexusEditor();

    const setPendingInsertQuestionNull = React.useCallback(() => setPendingInsertQuestion(null), [setPendingInsertQuestion]);
    const setPendingSwapQuestionNull = React.useCallback(() => setPendingSwapQuestion(null), [setPendingSwapQuestion]);

    // Initialize logic hooks
    const { isDraggingLeft: resizingL, setIsDraggingLeft, isDraggingRight: resizingR, setIsDraggingRight } = usePanelResizer();
    useAiImporter();
    useExamManager();

    // Register global event listeners
    useEffect(() => {
        const handleImageSelect = (e) => {
            setSelectedImageConfig(e.detail);
            setActiveTab('imageProps');
            setIsRightPanelOpen(true);
        };
        window.addEventListener('nexusImageSelected', handleImageSelect);
        return () => window.removeEventListener('nexusImageSelected', handleImageSelect);
    }, [setActiveTab, setIsRightPanelOpen, setSelectedImageConfig]);

    useEffect(() => {
        const handleSwapRequest = (e) => {
            const { pos, nodeSize, attrs } = e.detail;
            setSwapTarget({ pos, nodeSize, attrs });
            setIsLeftPanelOpen(true);
            setLeftPanelTab('manual');
        };
        window.addEventListener('nexusSwapRequested', handleSwapRequest);
        return () => window.removeEventListener('nexusSwapRequested', handleSwapRequest);
    }, [setIsLeftPanelOpen, setLeftPanelTab, setSwapTarget]);

    useEffect(() => {
        const handleOpenTab = (e) => {
            setActiveTab(e.detail);
            setIsRightPanelOpen(true);
        };
        window.addEventListener('nexusOpenTab', handleOpenTab);
        return () => {
            window.removeEventListener('nexusOpenTab', handleOpenTab);
        };
    }, [setActiveTab, setIsRightPanelOpen]);

    useEffect(() => {
        return () => {
            window.dispatchEvent(new CustomEvent('setDynamicPageTitle', { detail: null }));
        };
    }, []);

    useEffect(() => {
        const docTitle = docSettings?.exam || 'Untitled Document';
        window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
            detail: { 
                title: docTitle, 
                subtitle: 'Nexus Paper Engine - /exams/generate/saved',
                isEditable: true,
                onTitleChange: (newTitle) => updateSetting('exam', newTitle)
            }
        }));
    }, [docSettings?.exam, updateSetting]);

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] font-outfit overflow-hidden print:overflow-visible">
            <style>{`
                @media print {
                    @page { size: ${docSettings.pageSize === 'A4' ? 'A4' : docSettings.pageSize === 'Legal' ? 'legal' : 'letter'} ${docSettings.orientation === 'landscape' || docSettings.orientation === 'Landscape' ? 'landscape' : 'portrait'}; margin: ${docSettings.marginTop || 20}mm ${docSettings.marginRight || 20}mm ${docSettings.marginBottom || 20}mm ${docSettings.marginLeft || 25}mm !important; }
                    body { margin: 0; padding: 0; background: #fff; overflow: visible !important; }
                    body * { visibility: hidden !important; }
                    .paper-canvas-container, .paper-canvas-container * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    #root, #root > div, #main-scroll-container, .nexus-editor-root, .print-canvas-wrapper { position: static !important; display: block !important; overflow: visible !important; height: auto !important; width: auto !important; transform: none !important; margin: 0 !important; padding: 0 !important; }
                    .paper-canvas-container { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; padding: 0 !important; transform: none !important; width: 100% !important; max-width: 100% !important; height: auto !important; }
                    .paper-content-wrapper { padding: 0 !important; }
                    .paper-canvas-container > div.pointer-events-none { display: none !important; }
                    .sticky, .print\\:hidden { display: none !important; }
                }
            `}</style>
            
            <NexusHeader />
            
            <div className={`flex-1 flex overflow-hidden print:block print:w-full print:h-auto print:overflow-visible ${(resizingL || resizingR) ? 'select-none' : ''}`}>
                
                {/* Closed Left Sidebar Docking Tray */}
                {!isLeftPanelOpen && (
                    <div className="w-12 bg-white border-r border-slate-200 shadow-sm flex flex-col items-center py-4 gap-4 z-10 print:hidden transition-all duration-300">
                        <button 
                             onClick={() => setIsLeftPanelOpen(true)}
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm border border-indigo-100 animate-in slide-in-from-left duration-200"
                            title="Open Question Bank"
                        >
                            <PanelLeftOpen size={16} />
                        </button>
                        <div className="w-6 h-[1px] bg-slate-200"></div>
                        <button 
                            onClick={() => {
                                setIsLeftPanelOpen(true);
                                setLeftPanelTab('manual');
                            }}
                            className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${leftPanelTab === 'manual' ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Manual Insert/Swap"
                        >
                            <Database size={15} />
                        </button>
                    </div>
                )}

                <LeftSidebar isDraggingLeft={resizingL} setIsDraggingLeft={setIsDraggingLeft} />
                
                <div className="flex-1 overflow-auto p-4 custom-scrollbar relative bg-slate-200/60 print:block print:w-full print:h-auto print:overflow-visible print:m-0 print:p-0">
                    <div className="w-max min-w-full flex flex-col items-center gap-8 min-h-full pb-32 mx-auto print:block print:w-full print:m-0 print:p-0 print:h-auto print:gap-0">
                        <PaperCanvasV2 
                            editorMode={editorMode} 
                            rawContent={rawContent} setRawContent={setRawContent}
                            docSettings={docSettings} zoom={zoom}
                            workspaceTools={workspaceTools} editorConfig={editorConfig}
                            onPageCountChange={setPageCount}
                            pendingInsertQuestion={pendingInsertQuestion} onQuestionInserted={setPendingInsertQuestionNull}
                            pendingSwapQuestion={pendingSwapQuestion} onQuestionSwapped={setPendingSwapQuestionNull}
                            setDocumentQuestions={setDocumentQuestions}
                            documentQuestions={documentQuestions}
                            canvasTheme={canvasTheme}
                            uiLang={uiLang}
                            setEditor={setEditor}
                        />
                    </div>
                </div>

                <RightSidebar isDraggingRight={resizingR} setIsDraggingRight={setIsDraggingRight} />

                {/* Closed Right Sidebar Docking Tray */}
                {!isRightPanelOpen && (
                    <div className="w-12 bg-white border-l border-slate-200 shadow-sm flex flex-col items-center py-4 gap-4 z-10 print:hidden transition-all duration-300">
                        <button 
                            onClick={() => setIsRightPanelOpen(true)}
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-sm border border-indigo-100 animate-in slide-in-from-right duration-200"
                            title="Open Settings"
                        >
                            <PanelRightOpen size={16} />
                        </button>
                        <div className="w-6 h-[1px] bg-slate-200"></div>
                        <button 
                            onClick={() => {
                                setIsRightPanelOpen(true);
                                setActiveTab('examInfo');
                            }}
                            className={`p-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${activeTab === 'examInfo' ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Exam Info"
                        >
                            <Settings2 size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* Float control bar for zoom and canvas themes */}
            <CanvasControlBar />

            {/* Custom toast alerts */}
            <ToastContainer />
        </div>
    );
};

const NexusEditor = () => {
    return (
        <NexusEditorProvider>
            <NexusEditorContent />
        </NexusEditorProvider>
    );
};

export default NexusEditor;
