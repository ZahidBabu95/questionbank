import { useEffect } from 'react';
import { useNexusEditor } from '../context/NexusEditorContext';
import { useExamManager } from './useExamManager';

export const useNexusKeyboardShortcuts = () => {
    const { 
        setZoom, 
        setShowShareModal, 
        setShowFilenameModal, 
        showShortcutsModal, 
        setShowShortcutsModal,
        isSavingDocument,
        addToast,
        uiLang
    } = useNexusEditor();

    const { handleSaveDocument } = useExamManager();

    useEffect(() => {
        const handleKeyDown = (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifierKey = isMac ? e.metaKey : e.ctrlKey;
            
            // Check if user is typing in standard text inputs
            const activeEl = document.activeElement;
            const isEditingTextInput = activeEl && (
                activeEl.tagName === 'INPUT' || 
                activeEl.tagName === 'TEXTAREA' || 
                activeEl.getAttribute('contenteditable') === 'true'
            );

            // 1. Save Document: Ctrl + S / Cmd + S
            if (modifierKey && (e.key === 's' || e.key === 'S') && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                if (!isSavingDocument && handleSaveDocument) {
                    handleSaveDocument();
                }
                return;
            }

            // 2. Print Document: Ctrl + P / Cmd + P
            if (modifierKey && (e.key === 'p' || e.key === 'P') && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                window.print();
                return;
            }

            // 3. Share Exam Modal: Ctrl + Shift + S / Cmd + Shift + S
            if (modifierKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
                e.preventDefault();
                e.stopPropagation();
                if (setShowShareModal) {
                    setShowShareModal(true);
                }
                return;
            }

            // 4. Download PDF Modal: Ctrl + Shift + D / Cmd + Shift + D
            if (modifierKey && e.shiftKey && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault();
                e.stopPropagation();
                if (setShowFilenameModal) {
                    setShowFilenameModal(true);
                }
                return;
            }

            // 5. Shortcuts Help Modal: Ctrl + / or F1
            if ((modifierKey && (e.key === '/' || e.key === '?')) || e.key === 'F1') {
                e.preventDefault();
                e.stopPropagation();
                if (setShowShortcutsModal) {
                    setShowShortcutsModal(prev => !prev);
                }
                return;
            }

            // 6. Zoom Controls (Only when not editing input text)
            if (modifierKey && !isEditingTextInput) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    setZoom(prev => Math.min(200, prev + 10));
                    return;
                }
                if (e.key === '-' || e.key === '_') {
                    e.preventDefault();
                    setZoom(prev => Math.max(50, prev - 10));
                    return;
                }
                if (e.key === '0') {
                    e.preventDefault();
                    setZoom(100);
                    return;
                }
            }

            // 7. Escape closes open modals
            if (e.key === 'Escape') {
                if (showShortcutsModal && setShowShortcutsModal) {
                    setShowShortcutsModal(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [
        handleSaveDocument, 
        isSavingDocument, 
        setShowShareModal, 
        setShowFilenameModal, 
        showShortcutsModal, 
        setShowShortcutsModal, 
        setZoom,
        addToast,
        uiLang
    ]);
};
