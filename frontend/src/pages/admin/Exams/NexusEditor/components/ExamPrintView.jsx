import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { NexusEditorProvider, useNexusEditor } from '../context/NexusEditorContext';
import { useExamManager } from '../hooks/useExamManager';
import PaperCanvasV2 from './PaperCanvasV2';

const ExamPrintViewContent = () => {
    const { id } = useParams();
    const { 
        isEditorLoaded, 
        editorMode, 
        rawContent, 
        setRawContent, 
        docSettings, 
        zoom, 
        workspaceTools, 
        editorConfig, 
        pendingInsertQuestion, 
        setPendingInsertQuestion, 
        pendingSwapQuestion, 
        setPendingSwapQuestion, 
        setDocumentQuestions, 
        documentQuestions, 
        canvasTheme, 
        uiLang, 
        setEditor, 
        setIsEditorLoaded 
    } = useNexusEditor();

    useExamManager();

    useEffect(() => {
        if (isEditorLoaded) {
            const checkReadiness = async () => {
                try {
                    await document.fonts.ready;
                    const bnFont = docSettings?.bnFont || 'Noto Serif Bengali';
                    await Promise.all([
                        document.fonts.load(`16px "${bnFont}"`),
                        document.fonts.load('16px "Kalpurush"'),
                        document.fonts.load('16px "SolaimanLipi"'),
                        document.fonts.load('16px "Noto Serif Bengali"'),
                        document.fonts.load('16px "Hind Siliguri"'),
                        document.fonts.load('16px "Tiro Bangla"')
                    ]).catch(() => null);
                } finally {
                    setTimeout(() => {
                        document.body.setAttribute('data-print-ready', 'true');
                        const urlParams = new URLSearchParams(window.location.search);
                        if (urlParams.get('autoPrint') === 'true') {
                            setTimeout(() => {
                                window.print();
                            }, 300);
                        }
                    }, 800);
                }
            };
            checkReadiness();
        }
    }, [isEditorLoaded, docSettings?.bnFont]);

    return (
        <div id="print-view-root" className="w-full min-h-screen bg-white flex flex-col items-center justify-start p-0 m-0 overflow-visible print-mode">
            <PaperCanvasV2 
                editorMode={editorMode} 
                rawContent={rawContent} 
                setRawContent={setRawContent}
                docSettings={docSettings} 
                zoom={100}
                workspaceTools={workspaceTools} 
                editorConfig={editorConfig}
                pendingInsertQuestion={pendingInsertQuestion} 
                onQuestionInserted={() => setPendingInsertQuestion(null)}
                pendingSwapQuestion={pendingSwapQuestion} 
                onQuestionSwapped={() => setPendingSwapQuestion(null)}
                setDocumentQuestions={setDocumentQuestions}
                documentQuestions={documentQuestions}
                canvasTheme="white"
                uiLang={uiLang}
                setEditor={setEditor}
                setIsEditorLoaded={setIsEditorLoaded}
            />
        </div>
    );
};

const ExamPrintView = () => {
    return (
        <NexusEditorProvider>
            <ExamPrintViewContent />
        </NexusEditorProvider>
    );
};

export default ExamPrintView;
