import { useEffect, useState, useRef } from 'react';

export const usePageCountObserver = (containerRef, editor, totalH, paddingTop, paddingBottom, onPageCountChange) => {
    const [pageCount, setPageCount] = useState(1);

    // Keep dynamic parameters in a Ref to prevent tearing down the ResizeObserver on margin drag
    const paramsRef = useRef({ totalH, paddingTop, paddingBottom, onPageCountChange });
    
    useEffect(() => {
        paramsRef.current = { totalH, paddingTop, paddingBottom, onPageCountChange };
    }, [totalH, paddingTop, paddingBottom, onPageCountChange]);

    useEffect(() => {
        if (!containerRef.current || !editor) return;

        const pm = containerRef.current.querySelector('.ProseMirror');
        if (!pm) return;

        let resizeTimer;
        const observer = new ResizeObserver((entries) => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded" warning & layout thrashing
                window.requestAnimationFrame(() => {
                    if (!pm) return;
                    const pmScrollH = pm.scrollHeight;
                    
                    const { 
                        totalH: curTotalH, 
                        paddingTop: curPaddingTop, 
                        paddingBottom: curPaddingBottom, 
                        onPageCountChange: curOnPageCountChange 
                    } = paramsRef.current;

                    const totalContentH = pmScrollH + curPaddingTop + curPaddingBottom;
                    const calculatedPages = Math.max(1, Math.ceil(totalContentH / curTotalH));
                    
                    setPageCount(prev => {
                        if (prev !== calculatedPages) {
                            if (curOnPageCountChange) curOnPageCountChange(calculatedPages);
                            return calculatedPages;
                        }
                        return prev;
                    });
                });
            }, 100); // Super-responsive 100ms debounce
        });
        
        observer.observe(pm);
        return () => {
            observer.disconnect();
            clearTimeout(resizeTimer);
        };
    }, [editor]); // Only trigger when editor mounts

    return pageCount;
};
