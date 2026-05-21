import React, { createContext, useContext, useState } from 'react';
import { DEFAULT_SETTINGS } from '../components/DocumentSettings';
import { UI_TEXT } from '../components/translations';

const NexusEditorContext = createContext(null);

export const useNexusEditor = () => {
    const context = useContext(NexusEditorContext);
    if (!context) {
        throw new Error("useNexusEditor must be used within a NexusEditorProvider");
    }
    return context;
};

export const NexusEditorProvider = ({ children }) => {
    // --- Core Document State ---
    const [editorMode, setEditorMode] = useState('STRICT_LINKED');
    const [rawContent, setRawContent] = useState('');
    const [docSettings, setDocSettings] = useState(DEFAULT_SETTINGS);
    const [zoom, setZoom] = useState(100);
    const [pageCount, setPageCount] = useState(1);
    const [examData, setExamData] = useState(null);
    const [isSavingDocument, setIsSavingDocument] = useState(false);

    // --- Schema & Blueprint ---
    const [editorConfig, setEditorConfig] = useState(null);
    const [generationBlueprint, setGenerationBlueprint] = useState(null);

    // --- UI & Preferences ---
    const [uiLang, setUiLang] = useState('bn');
    const t = UI_TEXT[uiLang];
    const [workspaceTools, setWorkspaceTools] = useState({
        math: true,
        table: true,
        image: true
    });

    // --- Panel States (Left) ---
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [leftPanelWidth, setLeftPanelWidth] = useState(320);
    const [leftPanelTab, setLeftPanelTab] = useState('document'); // 'auto', 'manual', 'document'
    
    // --- Panel States (Right) ---
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [rightPanelWidth, setRightPanelWidth] = useState(420);
    const [activeTab, setActiveTab] = useState('examInfo'); // Right panel tab
    
    // --- Toasts and Canvas Theme State ---
    const [toasts, setToasts] = useState([]);
    const [canvasTheme, setCanvasTheme] = useState('white'); // 'white' | 'cream' | 'dark'

    const addToast = (message, type = 'success', duration = 4000) => {
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // --- Interaction States ---
    const [editor, setEditor] = useState(null);
    const [pendingInsertQuestion, setPendingInsertQuestion] = useState(null);
    const [swapTarget, setSwapTarget] = useState(null);
    const [pendingSwapQuestion, setPendingSwapQuestion] = useState(null);
    const [selectedImageConfig, setSelectedImageConfig] = useState(null);
    const [documentQuestions, setDocumentQuestions] = useState([]);

    // Helpers
    const updateSetting = (key, value) => setDocSettings(prev => ({ ...prev, [key]: value }));
    const updateMultiSettings = (obj) => setDocSettings(prev => ({ ...prev, ...obj }));

    const value = {
        // Core
        editorMode, setEditorMode,
        rawContent, setRawContent,
        docSettings, setDocSettings, updateSetting, updateMultiSettings,
        zoom, setZoom,
        pageCount, setPageCount,
        examData, setExamData,
        isSavingDocument, setIsSavingDocument,
        editor, setEditor,
        
        // Schema
        editorConfig, setEditorConfig,
        generationBlueprint, setGenerationBlueprint,
        
        // UI
        uiLang, setUiLang, t,
        workspaceTools, setWorkspaceTools,
        toasts, addToast, removeToast,
        canvasTheme, setCanvasTheme,
        
        // Panels
        isLeftPanelOpen, setIsLeftPanelOpen,
        leftPanelWidth, setLeftPanelWidth,
        leftPanelTab, setLeftPanelTab,
        
        isRightPanelOpen, setIsRightPanelOpen,
        rightPanelWidth, setRightPanelWidth,
        activeTab, setActiveTab,
        
        // Interactions
        pendingInsertQuestion, setPendingInsertQuestion,
        swapTarget, setSwapTarget,
        pendingSwapQuestion, setPendingSwapQuestion,
        selectedImageConfig, setSelectedImageConfig,
        documentQuestions, setDocumentQuestions
    };

    return (
        <NexusEditorContext.Provider value={value}>
            {children}
        </NexusEditorContext.Provider>
    );
};
