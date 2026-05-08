import React, { useEffect } from 'react';
import { NexusEditorProvider, useNexusEditor } from './context/NexusEditorContext';
import { usePanelResizer } from './hooks/usePanelResizer';
import { useAiImporter } from './hooks/useAiImporter';
import { useExamManager } from './hooks/useExamManager';
import NexusHeader from './components/Layout/NexusHeader';
import LeftSidebar from './components/Layout/LeftSidebar';
import RightSidebar from './components/Layout/RightSidebar';
import PaperCanvasV2 from './components/PaperCanvasV2';

const NexusEditorContent = () => {
    const { 
        docSettings, editorMode, rawContent, setRawContent, 
        zoom, workspaceTools, editorConfig, setPageCount,
        pendingInsertQuestion, setPendingInsertQuestion,
        pendingSwapQuestion, setPendingSwapQuestion,
        setActiveTab, setIsRightPanelOpen,
        setDocumentQuestions, documentQuestions, setSwapTarget, setIsLeftPanelOpen, setLeftPanelTab,
        setSelectedImageConfig, updateSetting
    } = useNexusEditor();

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
        const docTitle = docSettings?.exam || 'Untitled Document';
        window.dispatchEvent(new CustomEvent('setDynamicPageTitle', {
            detail: { 
                title: docTitle, 
                subtitle: 'Nexus Paper Engine - /exams/generate/saved',
                isEditable: true,
                onTitleChange: (newTitle) => updateSetting('exam', newTitle)
            }
        }));
        return () => window.dispatchEvent(new CustomEvent('setDynamicPageTitle', { detail: null }));
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
                <LeftSidebar isDraggingLeft={resizingL} setIsDraggingLeft={setIsDraggingLeft} />
                
                <div className="flex-1 overflow-auto p-4 custom-scrollbar relative bg-slate-200/60 print:block print:w-full print:h-auto print:overflow-visible print:m-0 print:p-0">
                    <div className="w-max min-w-full flex flex-col items-center gap-8 min-h-full pb-32 mx-auto print:block print:w-full print:m-0 print:p-0 print:h-auto print:gap-0">
                        <PaperCanvasV2 
                            editorMode={editorMode} 
                            rawContent={rawContent} setRawContent={setRawContent}
                            docSettings={docSettings} zoom={zoom}
                            workspaceTools={workspaceTools} editorConfig={editorConfig}
                            onPageCountChange={setPageCount}
                            pendingInsertQuestion={pendingInsertQuestion} onQuestionInserted={() => setPendingInsertQuestion(null)}
                            pendingSwapQuestion={pendingSwapQuestion} onQuestionSwapped={() => setPendingSwapQuestion(null)}
                            setDocumentQuestions={setDocumentQuestions}
                            documentQuestions={documentQuestions}
                        />
                    </div>
                </div>

                <RightSidebar isDraggingRight={resizingR} setIsDraggingRight={setIsDraggingRight} />
            </div>
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
