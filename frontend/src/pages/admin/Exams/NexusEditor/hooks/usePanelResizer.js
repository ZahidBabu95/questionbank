import { useState, useEffect, useRef } from 'react';
import { useNexusEditor } from '../context/NexusEditorContext';

export const usePanelResizer = () => {
    const { setLeftPanelWidth, setRightPanelWidth } = useNexusEditor();
    
    const [isDraggingLeft, setIsDraggingLeft] = useState(false);
    const [isDraggingRight, setIsDraggingRight] = useState(false);

    const leftWidthRef = useRef(null);
    const rightWidthRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDraggingLeft) {
                const newWidth = Math.max(200, Math.min(e.clientX, 800)); // Min 200px, Max 800px
                leftWidthRef.current = newWidth;
                document.documentElement.style.setProperty('--left-panel-width', `${newWidth}px`);
            }
            if (isDraggingRight) {
                const newWidth = Math.max(200, Math.min(window.innerWidth - e.clientX, 800)); // Min 200px, Max 800px
                rightWidthRef.current = newWidth;
                document.documentElement.style.setProperty('--right-panel-width', `${newWidth}px`);
            }
        };

        const handleMouseUp = () => {
            if (isDraggingLeft && leftWidthRef.current !== null) {
                setLeftPanelWidth(leftWidthRef.current);
            }
            if (isDraggingRight && rightWidthRef.current !== null) {
                setRightPanelWidth(rightWidthRef.current);
            }
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
