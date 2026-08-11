import { useEffect, useState, useRef } from 'react';

export const usePageCountObserver = (containerRef, editor, totalH, paddingTop, paddingBottom, onPageCountChange, docSettings) => {
    const [pageCount, setPageCount] = useState(1);

    // Keep dynamic parameters in a Ref to prevent tearing down the event listeners on margin changes
    const paramsRef = useRef({ totalH, paddingTop, paddingBottom, onPageCountChange, docSettings });
    
    useEffect(() => {
        paramsRef.current = { totalH, paddingTop, paddingBottom, onPageCountChange, docSettings };
    }, [totalH, paddingTop, paddingBottom, onPageCountChange, docSettings]);

    useEffect(() => {
        if (!containerRef.current || !editor) return;

        const pm = containerRef.current.querySelector('.ProseMirror');
        if (!pm) return;

        let debounceTimer;
        
        const calculatePages = () => {
            if (!pm || editor.isDestroyed) return;

            const { 
                totalH: curTotalH, 
                paddingTop: curPaddingTop, 
                paddingBottom: curPaddingBottom, 
                onPageCountChange: curOnPageCountChange,
                docSettings: curDocSettings
            } = paramsRef.current;

            const maxPrintableHeight = curTotalH - curPaddingTop - curPaddingBottom - 10; // 10px safety buffer matching PDF safetyBuffer
            if (maxPrintableHeight <= 0) return;

            // Detect native exam header height rendered on Page 1
            const headerEl = containerRef.current?.querySelector('.nexus-native-header-portal-container, .nexus-native-header');
            const headerH = (headerEl && headerEl.offsetHeight > 0) ? headerEl.offsetHeight : 0;

            // Detect active global column count on ProseMirror
            let globalCols = 1;
            try {
                const computedCols = window.getComputedStyle(pm).columnCount;
                if (computedCols && computedCols !== 'auto' && !isNaN(computedCols)) {
                    globalCols = Math.max(1, parseInt(computedCols, 10));
                }
            } catch (e) {}

            // Calculate true vertical height contribution for each child across all sections
            let totalVerticalHeight = 0;
            const children = Array.from(pm.children);

            children.forEach(child => {
                if (child.classList.contains('nexus-editor-page-divider-badge') || child.getAttribute('data-html2canvas-ignore') === 'true') {
                    return;
                }

                const ch = child.offsetHeight || 0;
                if (ch <= 0) return;

                // Check if child has column-span: all (or -webkit-column-span: all) or is a 1-column section
                let isSpanningAll = false;
                let childCols = globalCols;

                const secId = child.getAttribute('data-section-id') || child.querySelector('[data-section-id]')?.getAttribute('data-section-id');
                if (secId && curDocSettings?.sections) {
                    const secObj = curDocSettings.sections.find(sec => sec.id === secId);
                    if (secObj && secObj.columns) {
                        childCols = Number(secObj.columns) || globalCols;
                    }
                }

                try {
                    const childComp = window.getComputedStyle(child);
                    const colSpan = childComp.columnSpan || childComp.webkitColumnSpan;
                    if (colSpan === 'all') {
                        isSpanningAll = true;
                    }
                } catch (err) {}

                if (isSpanningAll || childCols <= 1) {
                    // 1-column / Spanning element takes 100% of its vertical height
                    totalVerticalHeight += ch;
                } else {
                    // Multi-column element: divide by columns with atomic block packing overhead
                    totalVerticalHeight += (ch / Math.max(1, childCols));
                }
            });

            // Capacity on Page 1 is reduced by top native header height
            const page1ColHeight = Math.max(100, maxPrintableHeight - headerH);
            const isMultiCol = globalCols > 1 || (curDocSettings?.sections || []).some(s => (s.columns || 1) > 1);
            
            // For multi-column, atomic question blocks (break-inside: avoid) leave bottom gaps in column 1
            const colSafetyCoeff = isMultiCol ? 0.78 : 0.88;
            const page1Capacity = page1ColHeight * colSafetyCoeff;
            const nextPageCapacity = maxPrintableHeight * colSafetyCoeff;

            let pagesFromVertical = 1;
            if (totalVerticalHeight > page1Capacity) {
                const remainingVerticalHeight = totalVerticalHeight - page1Capacity;
                pagesFromVertical = 1 + Math.ceil(remainingVerticalHeight / nextPageCapacity);
            }

            // Also measure ProseMirror scroll height fallback
            const pmScrollH = pm.scrollHeight || 0;
            const pagesFromScroll = Math.max(1, Math.ceil(pmScrollH / maxPrintableHeight));

            // Bounding Box Right-Edge & Bottom Overflow Check
            let widthBasedPages = 1;
            let heightBasedChildPages = 1;
            try {
                const pmRect = pm.getBoundingClientRect();
                const zoomFactor = parseFloat(containerRef.current?.style?.zoom) || 1;
                if (pmRect.width > 0) {
                    let maxChildRight = pmRect.left;
                    children.forEach(child => {
                        if (!child.classList.contains('nexus-editor-page-divider-badge') && child.getAttribute('data-html2canvas-ignore') !== 'true') {
                            const cRect = child.getBoundingClientRect();
                            if (cRect.right > maxChildRight) maxChildRight = cRect.right;

                            const relBottom = (cRect.bottom - pmRect.top) / zoomFactor;
                            const childPagesNeeded = Math.max(1, Math.ceil((relBottom - 5) / Math.max(100, maxPrintableHeight)));
                            if (childPagesNeeded > heightBasedChildPages) {
                                heightBasedChildPages = childPagesNeeded;
                            }
                        }
                    });

                    const paperRightEdge = pmRect.left + pmRect.width;
                    if (maxChildRight > paperRightEdge - 15) {
                        const overflowWidth = maxChildRight - pmRect.left;
                        widthBasedPages = Math.ceil(overflowWidth / Math.max(1, pmRect.width));
                    }
                }
            } catch (err) {}

            let calculatedPages = Math.max(1, pagesFromVertical, pagesFromScroll, widthBasedPages, heightBasedChildPages);
            
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
            const debounceTime = (pm.children.length > 250 || editor.isFocused) ? 400 : 80;
            debounceTimer = setTimeout(() => {
                window.requestAnimationFrame(calculatePages);
            }, debounceTime);
        };

        // Run initial calculations & multi-stage delayed checks for async images / math formulas during auto swap
        calculatePages();
        const timer1 = setTimeout(calculatePages, 200);
        const timer2 = setTimeout(calculatePages, 600);
        const timer3 = setTimeout(calculatePages, 1200);

        // 1. ResizeObserver: Instantly detects when any question's height changes (e.g. image loads, math renders, auto swap)
        let resizeObserver;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                triggerUpdate();
            });
            resizeObserver.observe(pm);
            Array.from(pm.children).forEach(child => resizeObserver.observe(child));
        }

        // 2. MutationObserver: Instantly detects DOM node replacements when questions are swapped automatically
        let mutationObserver;
        if (typeof MutationObserver !== 'undefined') {
            mutationObserver = new MutationObserver(() => {
                triggerUpdate();
                if (resizeObserver && pm) {
                    Array.from(pm.children).forEach(child => resizeObserver.observe(child));
                }
            });
            mutationObserver.observe(pm, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });
        }

        // 3. Listen to editor updates, window resizing, and nexus-editor-rerender events
        editor.on('update', triggerUpdate);
        window.addEventListener('resize', triggerUpdate);
        window.addEventListener('nexus-editor-rerender', triggerUpdate);

        // 4. Capture image load events inside the editor
        const handleImageLoad = (e) => {
            if (e.target && e.target.tagName === 'IMG') {
                triggerUpdate();
            }
        };
        pm.addEventListener('load', handleImageLoad, true);

        return () => {
            clearTimeout(debounceTimer);
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            if (resizeObserver) resizeObserver.disconnect();
            if (mutationObserver) mutationObserver.disconnect();
            editor.off('update', triggerUpdate);
            window.removeEventListener('resize', triggerUpdate);
            window.removeEventListener('nexus-editor-rerender', triggerUpdate);
            pm.removeEventListener('load', handleImageLoad, true);
        };
    }, [editor]); // Only trigger when editor mounts

    return pageCount;
};
