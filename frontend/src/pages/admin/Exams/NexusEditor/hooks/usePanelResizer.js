import { useState, useEffect } from 'react';
import { useNexusEditor } from '../context/NexusEditorContext';

export const usePanelResizer = () => {
    const { setLeftPanelWidth, setRightPanelWidth } = useNexusEditor();
    
    const [isDraggingLeft, setIsDraggingLeft] = useState(false);
    const [isDraggingRight, setIsDraggingRight] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingLeft) {
                const newWidth = Math.max(200, Math.min(e.clientX, 800)); // Min 200px, Max 800px
                setLeftPanelWidth(newWidth);
            }
            if (isDraggingRight) {
                const newWidth = Math.max(200, Math.min(window.innerWidth - e.clientX, 800)); // Min 200px, Max 800px
                setRightPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsDraggingLeft(false);
            setIsDraggingRight(false);
            document.body.style.cursor = 'default';
        };

        if (isDraggingLeft || isDraggingRight) {
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingLeft, isDraggingRight, setLeftPanelWidth, setRightPanelWidth]);

    return {
        isDraggingLeft,
        setIsDraggingLeft,
        isDraggingRight,
        setIsDraggingRight
    };
};
