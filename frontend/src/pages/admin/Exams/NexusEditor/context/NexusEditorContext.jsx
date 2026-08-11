import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DEFAULT_SETTINGS, DEFAULT_PORTRAIT_SETTINGS, DEFAULT_LANDSCAPE_SETTINGS } from '../components/DocumentSettings';
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
    // --- Mobile Screen & Embedded Mode Detection ---
    const getIsMobile = () => {
        return window.innerWidth < 1440 || window.location.search.includes('embedded=true') || sessionStorage.getItem('embedded') === 'true';
    };
    const getIsTablet = () => {
        const isEmbedded = window.location.search.includes('embedded=true') || sessionStorage.getItem('embedded') === 'true';
        return window.innerWidth >= 768 && window.innerWidth < 1440 && !isEmbedded;
    };

    const [isMobileApp, setIsMobileApp] = useState(getIsMobile);
    const [isTablet, setIsTablet] = useState(getIsTablet);

    React.useEffect(() => {
        const handleResize = () => {
            const mobile = getIsMobile();
            const tablet = getIsTablet();
            setIsMobileApp(mobile);
            setIsTablet(tablet);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Core Document State ---
    const { id } = useParams();
    const [isEditorLoaded, setIsEditorLoaded] = useState(!id);
    const [loadingProgress, _setLoadingProgress] = useState(0);
    const setLoadingProgress = React.useCallback((val) => {
        _setLoadingProgress(prev => {
            if (typeof val === 'function') {
                const nextVal = val(prev);
                return Math.max(prev, nextVal);
            }
            if (val === 0) return 0;
            return Math.max(prev, val);
        });
    }, []);
    const [loadingStatusText, setLoadingStatusText] = useState('');
    const [editorMode, setEditorMode] = useState('STRICT_LINKED');
    const [rawContent, setRawContent] = useState('');
    const [docSettings, setDocSettings] = useState(DEFAULT_SETTINGS);
    const [zoom, setZoom] = useState(isMobileApp ? 60 : 100);
    const [pageCount, setPageCount] = useState(1);
    const [examData, setExamData] = useState(null);
    const [isSavingDocument, setIsSavingDocument] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadStatus, setDownloadStatus] = useState('');
    const [showFilenameModal, setShowFilenameModal] = useState(false);

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
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(!isMobileApp);
    const [leftPanelWidth, setLeftPanelWidth] = useState(320);
    const [leftPanelTab, setLeftPanelTab] = useState('document'); // 'auto', 'manual', 'document'
    
    // --- Panel States (Right) ---
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(!isMobileApp);
    const [rightPanelWidth, setRightPanelWidth] = useState(420);
    const [activeTab, setActiveTab] = useState('examInfo'); // Right panel tab
    
    // --- Toasts and Canvas Theme State ---
    const [toasts, setToasts] = useState([]);
    const [canvasTheme, setCanvasTheme] = useState('white'); // 'white' | 'cream' | 'dark'

    const addToast = useCallback((message, type = 'success', duration = 4000) => {
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // --- Interaction States ---
    const [editor, setEditor] = useState(null);
    const [pendingInsertQuestion, setPendingInsertQuestion] = useState(null);
    const [swapTarget, setSwapTarget] = useState(null);
    const [pendingSwapQuestion, setPendingSwapQuestion] = useState(null);
    const [selectedImageConfig, setSelectedImageConfig] = useState(null);
    const [documentQuestions, setDocumentQuestions] = useState([]);

    // Helpers
    const updateSetting = useCallback((key, value) => {
        setDocSettings(prev => {
            const nextSettings = { ...prev, [key]: value };
            const currentOrientation = prev.orientation || 'portrait';

            // Helper to capture the current layout state for caching
            const captureLayout = (state) => ({
                columns: state.columns,
                colGap: state.colGap,
                columnBorder: state.columnBorder,
                marginTop: state.marginTop,
                marginBottom: state.marginBottom,
                marginLeft: state.marginLeft,
                marginRight: state.marginRight,
                pageSize: state.pageSize,
                customW: state.customW,
                customH: state.customH,
                sections: state.sections?.map(sec => ({
                    id: sec.id,
                    columns: sec.columns,
                    fontSize: sec.fontSize,
                    lineGap: sec.lineGap,
                    questionGap: sec.questionGap,
                    optionGap: sec.optionGap
                }))
            });

            // If the user is editing a layout property, update the cache for the active orientation
            const layoutKeys = [
                'columns', 'colGap', 'columnBorder', 
                'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
                'pageSize', 'customW', 'customH', 'sections'
            ];
            
            if (layoutKeys.includes(key)) {
                if (currentOrientation === 'landscape') {
                    nextSettings.landscapeLayout = captureLayout(nextSettings);
                } else {
                    nextSettings.portraitLayout = captureLayout(nextSettings);
                }
            }
            
            // If the key is 'orientation', dynamically merge the cached/default settings of the target orientation
            if (key === 'orientation') {
                const targetOrientation = value; // 'portrait' or 'landscape'

                // Save the current layout to the old orientation's cache first
                if (currentOrientation === 'landscape') {
                    nextSettings.landscapeLayout = captureLayout(prev);
                } else {
                    nextSettings.portraitLayout = captureLayout(prev);
                }

                // Get layout from cache or default settings
                const cachedLayout = targetOrientation === 'landscape' ? nextSettings.landscapeLayout : nextSettings.portraitLayout;
                const defaults = targetOrientation === 'landscape' ? DEFAULT_LANDSCAPE_SETTINGS : DEFAULT_PORTRAIT_SETTINGS;
                
                const keysToApply = [
                    'columns', 'colGap', 'columnBorder', 
                    'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
                    'pageSize', 'customW', 'customH'
                ];
                
                const layoutOverrides = {};
                keysToApply.forEach(k => {
                    if (cachedLayout && cachedLayout[k] !== undefined) {
                        layoutOverrides[k] = cachedLayout[k];
                    } else if (defaults[k] !== undefined) {
                        layoutOverrides[k] = defaults[k];
                    }
                });

                // Dynamically merge section-level layout properties from cache/defaults to preserve section IDs and text contents
                let updatedSections = prev.sections;
                if (prev.sections) {
                    const sectionLayoutKeys = ['columns', 'fontSize', 'lineGap', 'questionGap', 'optionGap'];
                    updatedSections = prev.sections.map((sec, idx) => {
                        const cachedSec = cachedLayout?.sections?.find(cs => cs.id === sec.id);
                        const defaultSec = defaults.sections?.[idx];
                        
                        const secOverrides = {};
                        sectionLayoutKeys.forEach(sk => {
                            if (cachedSec && cachedSec[sk] !== undefined) {
                                secOverrides[sk] = cachedSec[sk];
                            } else if (defaultSec && defaultSec[sk] !== undefined) {
                                secOverrides[sk] = defaultSec[sk];
                            }
                        });
                        return {
                            ...sec,
                            ...secOverrides
                        };
                    });
                }
                
                return {
                    ...nextSettings,
                    ...layoutOverrides,
                    sections: updatedSections,
                    orientation: targetOrientation
                };
            }
            
            return nextSettings;
        });
    }, []);

    const updateMultiSettings = useCallback((obj) => {
        setDocSettings(prev => {
            const nextSettings = { ...prev, ...obj };
            const currentOrientation = prev.orientation || 'portrait';
            
            const captureLayout = (state) => ({
                columns: state.columns,
                colGap: state.colGap,
                columnBorder: state.columnBorder,
                marginTop: state.marginTop,
                marginBottom: state.marginBottom,
                marginLeft: state.marginLeft,
                marginRight: state.marginRight,
                pageSize: state.pageSize,
                customW: state.customW,
                customH: state.customH,
                sections: state.sections?.map(sec => ({
                    id: sec.id,
                    columns: sec.columns,
                    fontSize: sec.fontSize,
                    lineGap: sec.lineGap,
                    questionGap: sec.questionGap,
                    optionGap: sec.optionGap
                }))
            });

            const layoutKeys = [
                'columns', 'colGap', 'columnBorder', 
                'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
                'pageSize', 'customW', 'customH', 'sections'
            ];
            
            const hasLayoutKey = Object.keys(obj).some(k => layoutKeys.includes(k));
            if (hasLayoutKey) {
                if (currentOrientation === 'landscape') {
                    nextSettings.landscapeLayout = captureLayout(nextSettings);
                } else {
                    nextSettings.portraitLayout = captureLayout(nextSettings);
                }
            }
            
            return nextSettings;
        });
    }, []);

    // Automatically recalculate set mappings for OMR / Set Code
    React.useEffect(() => {
        if (!docSettings.multipleSetsEnabled) {
            if (docSettings.setMappings || docSettings.activeSet) {
                setDocSettings(prev => {
                    const next = { ...prev };
                    delete next.setMappings;
                    delete next.activeSet;
                    return next;
                });
            }
            return;
        }

        // Filter MCQ questions from documentQuestions
        const mcqs = (documentQuestions || []).filter(q => q.attrs?.type === 'MCQ');
        
        const count = docSettings.setCount || 4;
        const lang = docSettings.setLanguage || 'BN';
        const shuffleType = docSettings.shuffleType || 'QUESTIONS_AND_OPTIONS';
        const seedSalt = docSettings.setCodeSeedSalt || 123456;

        // Seeded random number generator (Mulberry32)
        const mulberry32 = (a) => {
            return () => {
                let t = a += 0x6D2B79F5;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        };

        // Seeded shuffle function
        const seededShuffle = (array, seed) => {
            const rand = mulberry32(seed);
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(rand() * (i + 1));
                const temp = shuffled[i];
                shuffled[i] = shuffled[j];
                shuffled[j] = temp;
            }
            return shuffled;
        };

        const setNames = lang === 'EN' 
            ? (count === 2 ? ['A', 'B'] : ['A', 'B', 'C', 'D'])
            : (count === 2 ? ['ক', 'খ'] : ['ক', 'খ', 'গ', 'ঘ']);

        const originalQuestions = mcqs.map((q, idx) => ({
            index: idx,
            id: q.attrs?.questionId || `temp-q-${idx}`,
            options: (q.attrs?.options || []).map((o, oIdx) => ({
                id: o.id || `opt-${oIdx}`,
                text: o.optionText || o.text || ''
            }))
        }));

        const newMappings = {};
        
        setNames.forEach((setName, setIdx) => {
            if (setIdx === 0) {
                // Master set is not shuffled
                newMappings[setName] = {
                    questions: originalQuestions.map(q => q.id),
                    options: originalQuestions.reduce((acc, q) => {
                        acc[q.id] = q.options.map(o => o.id);
                        return acc;
                    }, {})
                };
            } else {
                const seed = seedSalt + setIdx;
                // Shuffle questions
                const shuffledQ = seededShuffle(originalQuestions, seed);
                
                // Shuffle options
                const optionsMapping = {};
                originalQuestions.forEach(q => {
                    if (shuffleType === 'QUESTIONS_AND_OPTIONS') {
                        const shuffledOpts = seededShuffle(q.options, seed + 100);
                        optionsMapping[q.id] = shuffledOpts.map(o => o.id);
                    } else {
                        optionsMapping[q.id] = q.options.map(o => o.id);
                    }
                });
                
                newMappings[setName] = {
                    questions: shuffledQ.map(q => q.id),
                    options: optionsMapping
                };
            }
        });

        const activeSet = docSettings.activeSet;
        const defaultActiveSet = setNames[0] || 'ক';
        
        let shouldUpdate = false;
        const nextSettings = { ...docSettings };

        if (JSON.stringify(docSettings.setMappings) !== JSON.stringify(newMappings)) {
            nextSettings.setMappings = newMappings;
            shouldUpdate = true;
        }

        if (!activeSet || !setNames.includes(activeSet)) {
            nextSettings.activeSet = defaultActiveSet;
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            setDocSettings(nextSettings);
        }
    }, [
        documentQuestions,
        docSettings.multipleSetsEnabled,
        docSettings.setCount,
        docSettings.setLanguage,
        docSettings.shuffleType,
        docSettings.setCodeSeedSalt,
        docSettings.activeSet
    ]);

    const value = useMemo(() => ({
        // Core
        editorMode, setEditorMode,
        rawContent, setRawContent,
        isEditorLoaded, setIsEditorLoaded,
        loadingProgress, setLoadingProgress,
        loadingStatusText, setLoadingStatusText,
        docSettings, setDocSettings, updateSetting, updateMultiSettings,
        zoom, setZoom,
        pageCount, setPageCount,
        examData, setExamData,
        isSavingDocument, setIsSavingDocument,
        autoSaveStatus, setAutoSaveStatus,
        isDownloadingPdf, setIsDownloadingPdf,
        downloadProgress, setDownloadProgress,
        downloadStatus, setDownloadStatus,
        showFilenameModal, setShowFilenameModal,
        editor, setEditor,
        
        // Schema
        editorConfig, setEditorConfig,
        generationBlueprint, setGenerationBlueprint,
        
        // UI
        uiLang, setUiLang, t, isMobileApp, isTablet,
        workspaceTools, setWorkspaceTools,
        toasts, addToast, removeToast,
        canvasTheme, setCanvasTheme,
        
        // Panels
        isLeftPanelOpen, setIsLeftPanelOpen,
        leftPanelWidth, setLeftPanelWidth,
        leftPanelTab, setLeftPanelTab,
        
        // Panels
        isRightPanelOpen, setIsRightPanelOpen,
        rightPanelWidth, setRightPanelWidth,
        activeTab, setActiveTab,
        
        // Interactions
        pendingInsertQuestion, setPendingInsertQuestion,
        swapTarget, setSwapTarget,
        pendingSwapQuestion, setPendingSwapQuestion,
        selectedImageConfig, setSelectedImageConfig,
        documentQuestions, setDocumentQuestions
    }), [
        editorMode, rawContent, isEditorLoaded, loadingProgress, loadingStatusText, docSettings, updateSetting, updateMultiSettings,
        zoom, pageCount, examData, isSavingDocument, autoSaveStatus, editor,
        isDownloadingPdf, downloadProgress, downloadStatus, showFilenameModal,
        editorConfig, generationBlueprint,
        uiLang, t, isMobileApp, isTablet, workspaceTools, toasts, addToast, removeToast, canvasTheme,
        isLeftPanelOpen, leftPanelWidth, leftPanelTab,
        isRightPanelOpen, rightPanelWidth, activeTab,
        pendingInsertQuestion, swapTarget, pendingSwapQuestion, selectedImageConfig, documentQuestions
    ]);

    return (
        <NexusEditorContext.Provider value={value}>
            {children}
        </NexusEditorContext.Provider>
    );
};
