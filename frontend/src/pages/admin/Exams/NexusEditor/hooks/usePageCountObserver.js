import { useEffect, useState } from 'react';

export const usePageCountObserver = (containerRef, editor, totalH, paddingTop, paddingBottom, onPageCountChange) => {
    const [pageCount, setPageCount] = useState(1);

    useEffect(() => {
        if (!containerRef.current || !editor) return;

        const pm = containerRef.current.querySelector('.ProseMirror');
        if (!pm) return;

        let resizeTimer;
        const observer = new ResizeObserver((entries) => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // Use requestAnimationFrame to ensure DOM is fully painted
                window.requestAnimationFrame(() => {
                    const pmScrollH = pm.scrollHeight;
                    const totalContentH = pmScrollH + paddingTop + paddingBottom;
                    
                    const calculatedPages = Math.max(1, Math.ceil(totalContentH / totalH));
                    setPageCount(prev => {
                        if (prev !== calculatedPages) {
                            if (onPageCountChange) onPageCountChange(calculatedPages);
                            return calculatedPages;
                        }
                        return prev;
                    });
                });
            }, 200); // 200ms debounce
        });
        
        observer.observe(pm);
        return () => {
            observer.disconnect();
            clearTimeout(resizeTimer);
        };
    }, [totalH, paddingTop, paddingBottom, editor, onPageCountChange]);

    return pageCount;
};
