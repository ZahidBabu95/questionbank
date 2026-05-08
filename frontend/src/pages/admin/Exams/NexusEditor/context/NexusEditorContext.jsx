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
    const [leftPanelWidth, setLeftPanelWidth] = useState(288);
    const [leftPanelTab, setLeftPanelTab] = useState('auto'); // 'auto', 'manual', 'document'
    
    // --- Panel States (Right) ---
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [rightPanelWidth, setRightPanelWidth] = useState(320);
    const [activeTab, setActiveTab] = useState('examInfo'); // Right panel tab
    
    // --- Interaction States ---
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
        
        // Schema
        editorConfig, setEditorConfig,
        generationBlueprint, setGenerationBlueprint,
        
        // UI
        uiLang, setUiLang, t,
        workspaceTools, setWorkspaceTools,
        
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
