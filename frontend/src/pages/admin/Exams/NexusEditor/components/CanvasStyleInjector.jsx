import React, { memo } from 'react';

const CanvasStyleInjector = memo(({ s, ptToPx, mmToPx }) => {
    return (
        <style dangerouslySetInnerHTML={{ __html: `
            .strict-analytics-mode {
                caret-color: transparent !important;
                user-select: none !important;
                -webkit-user-select: none !important;
            }
            .strict-analytics-mode [data-section-id] {
                pointer-events: none !important;
            }
            .strict-analytics-mode p, .strict-analytics-mode h3 {
                cursor: default !important;
            }
            .ProseMirror,
            .ProseMirror *,
            .paper-canvas-container,
            .paper-canvas-container * {
                font-family: '${s.language === 'ENGLISH' ? (s.enFont || 'Times New Roman') : (s.bnFont || 'Noto Serif Bengali')}', sans-serif;
            }
            
            .ProseMirror {
                font-size: ${ptToPx(s.bodyFontSize)}px;
                line-height: ${s.lineHeight};
                width: 100% !important;
                background-color: transparent !important;
                box-sizing: border-box;
                outline: none;
                margin: 0 !important;
                padding: 0 !important;
                
                /* Column Support */
                ${Math.max(s.columns || 1, ...(s.sections || []).map(sec => sec.columns || 1)) > 1 ? `
                column-count: ${Math.max(s.columns || 1, ...(s.sections || []).map(sec => sec.columns || 1))};
                column-gap: ${mmToPx(s.columns > 1 ? (s.colGap || 10) : ((s.sections || []).find(sec => sec.columns > 1 && sec.colGap)?.colGap || s.colGap || 10))}px;
                ${(s.sections || []).some(sec => sec.columns > 1 && sec.columnBorder) || (s.columns > 1 && s.columnBorder !== false) ? 'column-rule: 1.5px solid #000000;' : ''}
                column-fill: balance !important;
                ` : ''}
                
                counter-reset: question-counter;
            }

            .nexus-native-header-portal-container {
                display: block !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                break-inside: avoid !important;
                break-after: avoid !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
                
                /* Column span and background stacking */
                ${(s.columns || 1) === 1 ? `
                column-span: all !important;
                -webkit-column-span: all !important;
                ` : ''}
                position: relative !important;
                z-index: 10 !important;
                background-color: #ffffff !important;
            }
            .nexus-native-header-portal-container:empty {
                display: none !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            .nexus-native-header {
                ${(!s.columns || s.columns === 1) ? `
                column-span: all !important;
                -webkit-column-span: all !important;
                ` : ''}
                display: block !important;
            }
            .ProseMirror:focus {
                outline: none;
            }
            
            /* Inline Answer Sheet Marking */
            .show-answers-highlighted .nexus-correct-option {
                background-color: #f0fdf4 !important;
                outline: 1.5px solid #86efac;
                border-radius: 3px;
                position: relative;
                padding-right: 24px !important;
            }
            .show-answers-highlighted .nexus-correct-option::after {
                content: '✔';
                position: absolute;
                right: 6px;
                top: 50%;
                transform: translateY(-50%);
                color: #16a34a;
                font-size: 14px;
                font-weight: bold;
            }
            
            .show-answers-detailed .nexus-detailed-answer-block {
                display: block !important;
            }
            
            /* Compact Answer Sheet Marking */
            .show-answers-compact .ProseMirror {
                column-count: 4 !important;
                column-gap: 20px !important;
            }
            .show-answers-compact [data-type="question-block"] {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                padding-left: 2.6em !important;
                margin-bottom: 12px !important;
                break-inside: avoid;
                page-break-inside: avoid;
            }
            .show-answers-compact [data-type="question-block"]::before {
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
            }
            .show-answers-compact [data-type="question-block"] > .relative.transition-all,
            .show-answers-compact .nexus-question-wrapper > .nexus-question-content,
            .show-answers-compact [data-type="question-block"] > .options-grid {
                display: none !important;
            }
            
            .show-answers-compact .nexus-detailed-answer-block {
                display: block !important;
                margin-top: 0 !important;
            }
            .show-answers-compact .nexus-detailed-answer-block .explanation-block {
                display: none !important;
            }
            .show-answers-compact .nexus-detailed-answer-block .answer-label-text {
                display: none !important;
            }

            .nexus-compact-answer-sheet {
                column-span: all !important;
                -webkit-column-span: all !important;
            }

            /* Dynamic Section Display Toggles & Styles */
            ${(s.sections || []).map(sec => {
                const mg = sec.masterGap || 3;
                const cLineGap = sec.smartGap ? (mg === 1 ? 1.2 : mg === 2 ? 1.4 : mg === 3 ? 1.6 : mg === 4 ? 1.8 : 2.0) : 
                                (sec.lineGap !== undefined && sec.lineGap !== '' ? sec.lineGap : (s.lineHeight || 1.5));
                const cOptionGap = sec.smartGap ? (mg === 1 ? 4 : mg === 2 ? 6 : mg === 3 ? 8 : mg === 4 ? 12 : 16) : 
                                (sec.optionGap !== undefined && sec.optionGap !== '' ? sec.optionGap : 8);
                const cQuestionGap = sec.smartGap ? (mg === 1 ? 8 : mg === 2 ? 12 : mg === 3 ? 16 : mg === 4 ? 20 : 26) : 
                                (sec.questionGap !== undefined && sec.questionGap !== '' ? sec.questionGap : (s.questionGap || 15));
                const needsReset = sec.continuousNumbering === false;
                const resetVal = (Number(sec.numberingStart) || 1) - 1;

                return `
                ${sec.showName === false ? `
                    [data-section-id="${sec.id}"].section-name {
                        display: block !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        background: none !important;
                        column-span: all;
                        ${needsReset ? `counter-reset: question-counter ${resetVal} !important;` : ''}
                    }
                ` : `
                    [data-section-id="${sec.id}"].section-name {
                        font-weight: ${sec.nameBold !== false ? 'bold' : 'normal'} !important;
                        font-style: ${sec.nameItalic ? 'italic' : 'normal'};
                        text-decoration: ${sec.nameUnderline ? 'underline' : 'none'};
                        ${sec.nameFontSize ? `font-size: ${sec.nameFontSize}px !important;` : ''}
                        line-height: 1.25 !important;
                        
                        /* Stacking to prevent column-rule cut-through */
                        position: relative !important;
                        z-index: 10 !important;
                        ${!(sec.nameBg === true || (sec.nameBg !== false && s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড')) 
                            ? 'background-color: #ffffff !important;' 
                            : ''}
                        
                        /* Background */
                        ${sec.nameBg === true || (sec.nameBg !== false && s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড') 
                            ? 'background-color: #000000 !important; color: #ffffff !important; padding: 6px 10px; border-radius: 4px; display: block;' 
                            : ''}
                            
                        /* Border / Divider */
                        ${sec.nameDivider === true || (sec.nameDivider !== false && s.sectionStyle === 'বর্ডার বক্স')
                            ? 'border: 1px solid #000000 !important; padding: 6px 10px; border-radius: 4px; display: block;'
                            : (sec.nameDivider !== false && s.sectionStyle === 'আন্ডারলাইন')
                            ? 'border-bottom: 1px solid #000000 !important; padding-bottom: 6px; display: block;'
                            : (sec.nameDivider !== false && s.sectionStyle === 'ডটেড লাইন')
                            ? 'border-bottom: 1px dotted #000000 !important; padding-bottom: 6px; display: block;'
                            : sec.nameDivider === true
                            ? 'border-bottom: 1px solid #000000 !important; padding-bottom: 6px; display: block;'
                            : ''}
                        
                        margin-top: ${sec.nameTopGap !== undefined && sec.nameTopGap !== '' ? sec.nameTopGap : 24}px !important;
                        margin-bottom: ${sec.nameGap !== undefined && sec.nameGap !== '' ? sec.nameGap : 12}px !important;
                        display: block !important;
                        break-after: avoid;
                        page-break-after: avoid;
                        column-break-after: avoid;
                        ${needsReset ? `counter-reset: question-counter ${resetVal} !important;` : ''}
                    }
                    [data-section-id="${sec.id}"].section-name * {
                        ${sec.nameBg === true || (sec.nameBg !== false && s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড') ? `color: #ffffff !important;` : ''}
                    }
                `}
                
                /* Reset counter on first question of section if continuousNumbering is false */
                ${needsReset ? `
                .ProseMirror > *:has([data-section-id="${sec.id}"][data-first-in-section="true"]),
                .paper-canvas-container > *:has([data-section-id="${sec.id}"][data-first-in-section="true"]),
                [data-section-id="${sec.id}"][data-type="question-block"][data-first-in-section="true"] {
                    counter-reset: question-counter ${resetVal} !important;
                }
                ` : ''}
                
                /* Section Question Blocks (including all child elements) */
                [data-section-id="${sec.id}"][data-type="question-block"],
                [data-section-id="${sec.id}"][data-type="question-block"] * {
                    font-family: '${sec.fontFamily || (s.language === 'ENGLISH' || sec.numberingStyle === 'en' ? (s.enFont || 'Times New Roman') : (s.bnFont || 'Noto Serif Bengali'))}', sans-serif !important;
                    font-size: ${ptToPx(sec.fontSize || s.bodyFontSize || 14)}px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] {
                    line-height: ${cLineGap} !important;
                    margin-bottom: ${cQuestionGap}px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-question-layout {
                    gap: 0px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-stimulus-block {
                    margin-bottom: 0px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-questions {
                    margin-top: ${cOptionGap}px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] .options-grid {
                    row-gap: ${cOptionGap < 0 ? 0 : cOptionGap}px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] .options-grid > div {
                    margin-bottom: ${cOptionGap < 0 ? cOptionGap : 0}px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-questions ol {
                    gap: ${cOptionGap < 0 ? 0 : cOptionGap}px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-questions ol li {
                    margin-bottom: ${cOptionGap < 0 ? cOptionGap : 0}px !important;
                }
                
                /* Section Header/Name, Conditions, Instructions */
                [data-section-id="${sec.id}"].section-name,
                [data-section-id="${sec.id}"].section-name *,
                [data-section-id="${sec.id}"].section-conditions,
                [data-section-id="${sec.id}"].section-conditions *,
                [data-section-id="${sec.id}"].section-instructions,
                [data-section-id="${sec.id}"].section-instructions * {
                    font-family: '${sec.fontFamily || (s.language === 'ENGLISH' || sec.numberingStyle === 'en' ? (s.enFont || 'Times New Roman') : (s.bnFont || 'Noto Serif Bengali'))}', sans-serif !important;
                }
                ${sec.showConditions === false ? `[data-section-id="${sec.id}"].section-conditions { display: none !important; }` : `
                    [data-section-id="${sec.id}"].section-conditions {
                        font-weight: ${sec.condBold ? 'bold' : 'normal'};
                        font-style: ${sec.condItalic ? 'italic' : 'normal'};
                        text-decoration: ${sec.condUnderline ? 'underline' : 'none'};
                        ${sec.condFontSize ? `font-size: ${sec.condFontSize}px !important;` : ''}
                        
                        /* Stacking to prevent column-rule cut-through */
                        position: relative !important;
                        z-index: 10 !important;
                        ${!sec.condBg ? 'background-color: #ffffff !important;' : ''}
                        
                        ${sec.condBg ? `background-color: #000000 !important; color: #ffffff !important; padding: 6px 10px; border-radius: 4px; display: block;` : ''}
                        ${sec.condDivider ? `border-bottom: 1px solid #000000; padding-bottom: 6px; display: block;` : ''}
                        ${sec.condTopGap ? `margin-top: ${sec.condTopGap}px !important; display: block;` : ''}
                        ${sec.condGap ? `margin-bottom: ${sec.condGap}px !important; display: block;` : ''}
                        break-after: avoid;
                        page-break-after: avoid;
                        column-break-after: avoid;
                    }
                    [data-section-id="${sec.id}"].section-conditions * {
                        ${sec.condBg ? `color: #ffffff !important;` : ''}
                    }
                `}
                ${sec.showInstructions === false ? `[data-section-id="${sec.id}"].section-instructions { display: none !important; }` : `
                    [data-section-id="${sec.id}"].section-instructions {
                        font-weight: ${sec.instBold ? 'bold' : 'normal'};
                        font-style: ${sec.instItalic ? 'italic' : 'normal'};
                        text-decoration: ${sec.instUnderline ? 'underline' : 'none'};
                        ${sec.instFontSize ? `font-size: ${sec.instFontSize}px !important;` : ''}
                        
                        /* Stacking to prevent column-rule cut-through */
                        position: relative !important;
                        z-index: 10 !important;
                        ${!sec.instBg ? 'background-color: #ffffff !important;' : ''}
                        
                        ${sec.instBg ? `background-color: #000000 !important; color: #ffffff !important; padding: 6px 10px; border-radius: 4px; display: block;` : ''}
                        ${sec.instDivider ? `border-bottom: 1px solid #000000; padding-bottom: 6px; display: block;` : ''}
                        ${sec.instTopGap ? `margin-top: ${sec.instTopGap}px !important; display: block;` : ''}
                        ${sec.instGap ? `margin-bottom: ${sec.instGap}px !important; display: block;` : ''}
                        line-height: ${Math.max(1.0, Number(cLineGap))} !important;
                        break-after: avoid;
                        page-break-after: avoid;
                        column-break-after: avoid;
                    }
                    [data-section-id="${sec.id}"].section-instructions * {
                        ${sec.instBg ? `color: #ffffff !important;` : ''}
                    }
                `}
                
                /* Ensure Headers, Instructions, and Conditions Span All Columns if global columns not active */
                ${(s.columns || 1) === 1 ? `
                [data-section-id="${sec.id}"].section-name
                ${sec.showConditions !== false ? `, [data-section-id="${sec.id}"].section-conditions` : ''}
                ${sec.showInstructions !== false ? `, [data-section-id="${sec.id}"].section-instructions` : ''} {
                    column-span: all !important;
                    -webkit-column-span: all !important;
                    display: block !important;
                }
                ` : `
                [data-section-id="${sec.id}"].section-name
                ${sec.showConditions !== false ? `, [data-section-id="${sec.id}"].section-conditions` : ''}
                ${sec.showInstructions !== false ? `, [data-section-id="${sec.id}"].section-instructions` : ''} {
                    display: block !important;
                }
                `}
                [data-section-id="${sec.id}"].section-name {
                    line-height: 1.25 !important;
                }
                [data-section-id="${sec.id}"].section-conditions,
                [data-section-id="${sec.id}"].section-instructions {
                    line-height: ${Math.max(1.0, Number(cLineGap))} !important;
                }
                
                /* Specific Theme backgrounds for spanning elements in this section */
                ${!(sec.nameBg === true || (sec.nameBg !== false && s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড')) ? `
                .theme-cream [data-section-id="${sec.id}"].section-name {
                    background-color: #fbf0d9 !important;
                }
                .theme-dark [data-section-id="${sec.id}"].section-name {
                    background-color: #1e293b !important;
                }
                ` : ''}
                ${!sec.condBg ? `
                .theme-cream [data-section-id="${sec.id}"].section-conditions {
                    background-color: #fbf0d9 !important;
                }
                .theme-dark [data-section-id="${sec.id}"].section-conditions {
                    background-color: #1e293b !important;
                }
                ` : ''}
                ${!sec.instBg ? `
                .theme-cream [data-section-id="${sec.id}"].section-instructions {
                    background-color: #fbf0d9 !important;
                }
                .theme-dark [data-section-id="${sec.id}"].section-instructions {
                    background-color: #1e293b !important;
                }
                ` : ''}
                
                /* 1-Column Section Question Blocks Spanning All Columns */
                ${((s.columns || 1) === 1 && (sec.columns || 1) === 1) ? `
                [data-section-id="${sec.id}"][data-type="question-block"] {
                    column-span: all !important;
                    -webkit-column-span: all !important;
                }
                ` : ''}
                
                /* Hide Empty Nodes */
                [data-section-id="${sec.id}"].section-conditions:empty,
                [data-section-id="${sec.id}"].section-instructions:empty {
                    display: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
            `;}).join('\n')}

            /* Auto Numbering via CSS Counters */
            [data-type="question-block"] {
                counter-increment: question-counter;
                margin-bottom: ${s.questionGap !== undefined && s.questionGap !== '' ? s.questionGap : 15}px;
                padding-left: 2.6em !important; /* Explicit space for up to 3-digit numbers */
                margin-left: 0 !important;
                position: relative;
                break-inside: avoid;
                break-inside: avoid-column;
                break-inside: avoid-page;
                page-break-inside: avoid;
                -webkit-column-break-inside: avoid;
            }
            
            [data-type="question-block"]::before {
                display: none !important;
            }
            
            /* Reset paragraph margins inside editor to avoid prose inheritance */
            .ProseMirror p {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
            }

            [data-type="question-block"][data-numberingstyle="bn"]::before${s.language !== 'ENGLISH' ? `,
            [data-type="question-block"]:not([data-numberingstyle])::before` : ''} {
                content: counter(question-counter, bengali) ".";
            }
            [data-type="question-block"][data-numberingstyle="en"]::before${s.language === 'ENGLISH' ? `,
            [data-type="question-block"]:not([data-numberingstyle])::before` : ''} {
                content: counter(question-counter, decimal) ".";
            }
            [data-type="question-block"][data-numberingstyle="roman"]::before {
                content: counter(question-counter, lower-roman) ".";
            }
            [data-type="question-block"][data-numberingstyle="alpha"]::before {
                content: counter(question-counter, lower-alpha) ")";
            }

            /* Strict Mode overrides */
            .strict-analytics-mode [data-type="question-block"] {
                user-select: none;
            }

            /* Theme Previews */
            .theme-cream .ProseMirror {
                color: #433422 !important;
            }
            .theme-cream .nexus-native-header-portal-container {
                background-color: #fbf0d9 !important;
            }
            .theme-dark .ProseMirror {
                color: #f1f5f9 !important;
            }
            .theme-dark .nexus-native-header-portal-container {
                background-color: #1e293b !important;
            }
            .theme-dark [data-type="question-block"]::before {
                color: #cbd5e1 !important;
            }
            .theme-dark table, .theme-dark td, .theme-dark th {
                border-color: #475569 !important;
            }
            .theme-dark hr {
                border-color: #334155 !important;
            }
            .theme-dark .nexus-question-wrapper {
                border-color: #334155 !important;
            }
            
            @media print {
                .paper-canvas-container {
                    zoom: ${s.printScale ? s.printScale / 100 : 0.96} !important;
                }
                .ProseMirror {
                    zoom: 1.0 !important;
                }
                .paper-canvas-container,
                .paper-canvas-container * {
                    background-color: transparent !important;
                    background-image: none !important;
                    color: #000000 !important;
                    border-color: #000000 !important;
                    box-shadow: none !important;
                }
                .paper-canvas-container [data-type="question-block"]::before {
                    color: #000000 !important;
                }
                .paper-canvas-container.theme-dark,
                .paper-canvas-container.theme-cream {
                    background-color: #ffffff !important;
                }
            }

            /* Centralized Highlight Flash Animation */
            @keyframes highlightFlash {
                0% { background-color: rgba(79, 70, 229, 0.15); box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
                100% { background-color: transparent; box-shadow: none; }
            }
            .nexus-highlight-flash {
                animation: highlightFlash 1.5s ease-out;
                border-radius: 8px;
            }
        `}} />
    );
}, (prevProps, nextProps) => {
    // Only re-render if the relevant settings have changed.
    const p = prevProps.s;
    const n = nextProps.s;
    return (
        p.language === n.language &&
        p.enFont === n.enFont &&
        p.bnFont === n.bnFont &&
        p.bodyFontSize === n.bodyFontSize &&
        p.lineHeight === n.lineHeight &&
        p.columns === n.columns &&
        p.colGap === n.colGap &&
        p.columnBorder === n.columnBorder &&
        p.sectionStyle === n.sectionStyle &&
        p.questionGap === n.questionGap &&
        p.printScale === n.printScale &&
        JSON.stringify((p.sections || []).map(sec => {
            const { name, instructions, conditions, ...rest } = sec;
            return rest;
        })) === JSON.stringify((n.sections || []).map(sec => {
            const { name, instructions, conditions, ...rest } = sec;
            return rest;
        }))
    );
});

export default CanvasStyleInjector;
