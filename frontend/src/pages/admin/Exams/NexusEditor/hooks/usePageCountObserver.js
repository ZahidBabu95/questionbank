import { useEffect, useState, useRef } from 'react';

export const usePageCountObserver = (containerRef, editor, totalH, paddingTop, paddingBottom, onPageCountChange) => {
    const [pageCount, setPageCount] = useState(1);

    // Keep dynamic parameters in a Ref to prevent tearing down the event listeners on margin changes
    const paramsRef = useRef({ totalH, paddingTop, paddingBottom, onPageCountChange });
    
    useEffect(() => {
        paramsRef.current = { totalH, paddingTop, paddingBottom, onPageCountChange };
    }, [totalH, paddingTop, paddingBottom, onPageCountChange]);

    useEffect(() => {
        if (!containerRef.current || !editor) return;

        const pm = containerRef.current.querySelector('.ProseMirror');
        if (!pm) return;

        let debounceTimer;
        
        const calculatePages = () => {
            if (!pm || editor.isDestroyed) return;
            const pmScrollH = pm.scrollHeight;
            
            const { 
                totalH: curTotalH, 
                paddingTop: curPaddingTop, 
                paddingBottom: curPaddingBottom, 
                onPageCountChange: curOnPageCountChange 
            } = paramsRef.current;

            const maxPrintableHeight = curTotalH - curPaddingTop - curPaddingBottom - 10; // 10px safety buffer matching PDF safetyBuffer
            const calculatedPages = Math.max(1, Math.ceil(pmScrollH / maxPrintableHeight));
            
            setPageCount(prev => {
                if (prev !== calculatedPages) {
                    if (curOnPageCountChange) curOnPageCountChange(calculatedPages);
                    return calculatedPages;
                }
                return prev;
            });
        };

        const triggerUpdate = () => {
            clearTimeout(debounceTimer);
            const debounceTime = (pm.children.length > 250 || editor.isFocused) ? 2000 : 200;
            debounceTimer = setTimeout(() => {
                window.requestAnimationFrame(calculatePages);
            }, debounceTime);
        };

        // Run initially
        triggerUpdate();

        // Listen to content updates and window resizing (no feedback loops!)
        editor.on('update', triggerUpdate);
        window.addEventListener('resize', triggerUpdate);

        // Capture image load events inside the editor to re-calculate page count
        const handleImageLoad = (e) => {
            if (e.target && e.target.tagName === 'IMG') {
                triggerUpdate();
            }
        };
        pm.addEventListener('load', handleImageLoad, true);

        return () => {
            clearTimeout(debounceTimer);
            editor.off('update', triggerUpdate);
            window.removeEventListener('resize', triggerUpdate);
            pm.removeEventListener('load', handleImageLoad, true);
        };
    }, [editor]); // Only trigger when editor mounts

    return pageCount;
};
