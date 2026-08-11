import React, { memo } from 'react';

const getFontFallback = (fontName) => {
    if (!fontName) return "'Noto Serif Bengali', 'Kalpurush', serif";
    const name = fontName.toLowerCase();
    if (name.includes('kalpurush')) return "'Kalpurush', 'Noto Serif Bengali', serif";
    if (name.includes('solaiman')) return "'SolaimanLipi', 'Noto Serif Bengali', serif";
    if (name.includes('hind')) return "'Hind Siliguri', 'Noto Sans Bengali', sans-serif";
    if (name.includes('tiro')) return "'Tiro Bangla', 'Noto Serif Bengali', serif";
    if (name.includes('baloo')) return "'Baloo Da 2', 'Noto Sans Bengali', sans-serif";
    if (name.includes('anek')) return "'Anek Bangla', 'Noto Sans Bengali', sans-serif";
    if (name.includes('serif') || name.includes('times')) return "'Noto Serif Bengali', serif";
    return "'Noto Serif Bengali', 'Kalpurush', sans-serif";
};

const CanvasStyleInjector = memo(({ s, ptToPx, mmToPx }) => {
    const bnFallback = getFontFallback(s.bnFont || 'Noto Serif Bengali');
    const enFallback = getFontFallback(s.enFont || 'Times New Roman');
    const bodyFallback = s.language === 'ENGLISH' ? enFallback : bnFallback;

    // Calculate column settings according to global vs section columns priority
    const globalColCount = Number(s.columns) || 1;
    const isGlobalColActive = globalColCount > 1;

    let totalColumns = 1;
    let colGap = s.colGap || 10;
    let hasColumnBorder = false;

    if (isGlobalColActive) {
        totalColumns = globalColCount;
        const hasAnySecBorder = (s.sections || []).some(sec => sec.columnBorder === true);
        hasColumnBorder = s.columnBorder !== false || hasAnySecBorder;
    } else {
        const maxSectionCol = Math.max(1, ...(s.sections || []).map(sec => Number(sec.columns) || 1));
        totalColumns = maxSectionCol;
        
        const sectionWithGap = (s.sections || []).find(sec => (Number(sec.columns) || 1) > 1 && sec.colGap);
        if (sectionWithGap) {
            colGap = sectionWithGap.colGap;
        }
        
        hasColumnBorder = (s.sections || []).some(sec => (Number(sec.columns) || 1) > 1 && sec.columnBorder !== false) || (s.columnBorder !== false && totalColumns > 1);
    }

    const headerSpanVal = isGlobalColActive ? 'none' : 'all';

    return (
        <style dangerouslySetInnerHTML={{ __html: `
            @import url('https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600;700;800&family=Baloo+Da+2:wght@400;500;600;700;800&family=Hind+Siliguri:wght@300;400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&family=Noto+Serif+Bengali:wght@400;500;600;700;800&family=Tiro+Bangla:ital@0;1&display=swap');
            @import url('https://fonts.maateen.me/kalpurush/font.css');
            @import url('https://fonts.maateen.me/solaiman-lipi/font.css');

            @font-face {
                font-family: 'Kalpurush';
                font-style: normal;
                font-weight: 400;
                font-display: swap;
                src: url('/fonts/Kalpurush.woff2') format('woff2'),
                     url('/fonts/Kalpurush.ttf') format('truetype'),
                     url('https://fonts.maateen.me/kalpurush/Kalpurush-v0.258.woff2') format('woff2');
            }
            @font-face {
                font-family: 'SolaimanLipi';
                font-style: normal;
                font-weight: 400;
                font-display: swap;
                src: url('/fonts/SolaimanLipi.woff2') format('woff2'),
                     url('/fonts/SolaimanLipi.ttf') format('truetype'),
                     url('https://fonts.maateen.me/solaiman-lipi/solaimanlipi-normal-v1.0.woff2') format('woff2');
            }
            @font-face {
                font-family: 'Hind Siliguri';
                font-style: normal;
                font-weight: 400;
                font-display: swap;
                src: url('/fonts/HindSiliguri.ttf') format('truetype'),
                     url('/fonts/HindSiliguri.woff2') format('woff2'),
                     url('https://fonts.gstatic.com/s/hindsiliguri/v12/ijw645juG1yv1d49voc9-163MNO94w.woff2') format('woff2');
            }
            @font-face {
                font-family: 'Noto Serif Bengali';
                font-style: normal;
                font-weight: 400;
                font-display: swap;
                src: url('/fonts/NotoSerifBengali.woff2') format('woff2'),
                     url('https://fonts.gstatic.com/s/notoserifbengali/v21/0FlvVP22Y7Wv0bg7937dYMRiO1T0vMxsXoZk.woff2') format('woff2');
            }
            @font-face {
                font-family: 'Tiro Bangla';
                font-style: normal;
                font-weight: 400;
                font-display: swap;
                src: url('/fonts/TiroBangla.woff2') format('woff2'),
                     url('https://fonts.gstatic.com/s/tirobangla/v5/3qv_2707-Ntht2-nJ_1B01z1YvY.woff2') format('woff2');
            }

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
            .paper-canvas-container *,
            .nexus-native-header,
            .nexus-native-header *,
            .nexus-native-header-portal-container,
            .nexus-native-header-portal-container *,
            table, td, th, tr, p, span, div, h1, h2, h3, h4, h5, h6 {
                font-family: '${s.language === 'ENGLISH' ? (s.enFont || 'Times New Roman') : (s.bnFont || 'Noto Serif Bengali')}', ${bodyFallback} !important;
            }
            
            .paper-canvas-container {
                box-sizing: border-box !important;
                max-width: 100% !important;
            }

            .paper-page-background {
                box-sizing: border-box !important;
                overflow: hidden !important;
            }

            [data-type="question-block"] {
                break-inside: avoid-column !important;
                break-inside: avoid-page !important;
                page-break-inside: avoid !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .ProseMirror {
                font-size: ${ptToPx(s.bodyFontSize)}px;
                line-height: ${s.lineHeight};
                width: 100% !important;
                max-width: 100% !important;
                overflow-x: hidden !important;
                background-color: transparent !important;
                box-sizing: border-box !important;
                outline: none;
                margin: 0 !important;
                padding: 0 !important;
                
                /* Column Support */
                ${totalColumns > 1 ? `
                column-count: ${totalColumns} !important;
                column-gap: ${hasColumnBorder ? Math.max(14, mmToPx(colGap)) : mmToPx(colGap)}px !important;
                column-rule: none !important;
                -webkit-column-rule: none !important;
                column-fill: auto !important;
                -webkit-column-fill: auto !important;
                ` : ''}
                
                counter-reset: question-counter;
            }

            .ProseMirror::after {
                content: "";
                display: block;
                clear: both;
                height: 0;
                column-span: all !important;
                -webkit-column-span: all !important;
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
                column-span: ${headerSpanVal} !important;
                -webkit-column-span: ${headerSpanVal} !important;
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
                column-span: ${headerSpanVal} !important;
                -webkit-column-span: ${headerSpanVal} !important;
                display: block !important;
            }
            .ProseMirror:focus {
                outline: none;
            }
            
            .print-column-divider,
            .print-column-divider-svg,
            .print-column-divider-svg line {
                display: block !important;
                visibility: visible !important;
                border-left-color: #000000 !important;
                stroke: #000000 !important;
                stroke-width: 1.5px !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
            }

            /* Strictly Hide Editor UI Helper Badges & Dividers in Print/PDF Mode */
            .print-mode .nexus-editor-page-divider-badge,
            .print-mode [data-html2canvas-ignore="true"],
            .print-mode .nexus-header-set-code-helper,
            .print-mode .nexus-drag-handle,
            @media print {
                .nexus-editor-page-divider-badge,
                [data-html2canvas-ignore="true"],
                .nexus-header-set-code-helper,
                .nexus-drag-handle,
                .print\:hidden {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    opacity: 0 !important;
                }
                .print-column-divider,
                .print-column-divider-svg,
                .print-column-divider-svg line {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    stroke: #000000 !important;
                    stroke-width: 1.5px !important;
                    border-left-color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    z-index: 99999 !important;
                }
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
            
            /* Inline answer/explanation display - controlled by metadata settings */
            .show-answers-inline .nexus-detailed-answer-block {
                display: block !important;
                border-top: none !important;
                padding-top: 4px !important;
                margin-top: 4px !important;
            }
            .show-answers-inline .nexus-detailed-answer-block .explanation-block {
                display: none !important;
            }
            .show-answers-inline.show-explanation-inline .nexus-detailed-answer-block {
                display: block !important;
            }
            .show-answers-inline.show-explanation-inline .nexus-detailed-answer-block .explanation-block {
                display: flex !important;
            }
            .show-explanation-inline:not(.show-answers-inline) .nexus-detailed-answer-block {
                display: block !important;
            }
            .show-explanation-inline:not(.show-answers-inline) .nexus-detailed-answer-block .nexus-answer-line,
            .show-explanation-inline:not(.show-answers-inline) .nexus-detailed-answer-block > div:first-child {
                display: none !important;
            }
            
            /* Source badge visible in print when show-sources is on */
            .show-sources-inline .nexus-source-badge {
                display: inline-block !important;
                font-size: 0.85em !important;
                font-weight: normal !important;
                color: #475569 !important;
                margin-left: 0.4em !important;
                background: none !important;
                border: none !important;
                padding: 0 !important;
            }
            @media print {
                .show-sources-inline .nexus-source-badge {
                    display: inline-block !important;
                    color: #000000 !important;
                }
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

                const secFont = sec.fontFamily || (s.language === 'ENGLISH' || sec.numberingStyle === 'en' ? (s.enFont || 'Times New Roman') : (s.bnFont || 'Noto Serif Bengali'));
                const secFallback = getFontFallback(secFont);

                const secCols = Number(sec.columns) || 1;
                const secColGap = sec.colGap || 10;

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
                        
                        ${!(sec.nameBg === true || (sec.nameBg !== false && s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড')) 
                            ? 'background-color: transparent !important;' 
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
                    font-family: '${secFont}', ${secFallback} !important;
                    font-size: ${ptToPx(sec.fontSize || s.bodyFontSize || 14)}px !important;
                }
                
                [data-section-id="${sec.id}"][data-type="question-block"] {
                    line-height: ${cLineGap} !important;
                    margin-bottom: ${cQuestionGap}px !important;
                }
                
                /* Child text tags inherit line gap perfectly to prevent extra gap in p/span tags inside editor */
                [data-section-id="${sec.id}"][data-type="question-block"] p,
                [data-section-id="${sec.id}"][data-type="question-block"] div,
                [data-section-id="${sec.id}"][data-type="question-block"] span,
                [data-section-id="${sec.id}"][data-type="question-block"] li {
                    line-height: inherit !important;
                }

                /* Synchronize Multiple Completion / Polynomial statements gap with section parameters */
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statements-container {
                    margin-top: 0.15em !important;
                    margin-bottom: 0.15em !important;
                    padding-left: 1.5em !important;
                    column-span: none !important;
                    -webkit-column-span: none !important;
                }
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statements-list {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 0px !important;
                }
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statement-item {
                    margin-bottom: 0px !important;
                    line-height: ${cLineGap} !important;
                }
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statement-item *,
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statement-text,
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statement-text * {
                    line-height: ${cLineGap} !important;
                }
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statement-text p,
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statement-text span,
                [data-section-id="${sec.id}"][data-type="question-block"] .cq-statement-text div {
                    margin: 0 !important;
                    padding: 0 !important;
                    line-height: ${cLineGap} !important;
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
                    font-family: '${secFont}', ${secFallback} !important;
                }
                ${sec.showConditions === false ? `[data-section-id="${sec.id}"].section-conditions { display: none !important; }` : `
                    [data-section-id="${sec.id}"].section-conditions {
                        font-weight: ${sec.condBold ? 'bold' : 'normal'};
                        font-style: ${sec.condItalic ? 'italic' : 'normal'};
                        text-decoration: ${sec.condUnderline ? 'underline' : 'none'};
                        ${sec.condFontSize ? `font-size: ${sec.condFontSize}px !important;` : ''}
                        
                        ${!sec.condBg ? 'background-color: transparent !important;' : ''}
                        
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
                        
                        ${!sec.instBg ? 'background-color: transparent !important;' : ''}
                        
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
                
                /* Ensure Headers, Instructions, and Conditions Span All Columns conditionally */
                [data-section-id="${sec.id}"].section-name
                ${sec.showConditions !== false ? `, [data-section-id="${sec.id}"].section-conditions` : ''}
                ${sec.showInstructions !== false ? `, [data-section-id="${sec.id}"].section-instructions` : ''} {
                    column-span: ${headerSpanVal} !important;
                    -webkit-column-span: ${headerSpanVal} !important;
                    display: block !important;
                }
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
                ${(!isGlobalColActive && (sec.columns || 1) === 1) ? `
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
            .ProseMirror p,
            [data-type="question-block"] p {
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
            /* Universal Table Styling for Question Paper & Canvas */
            .ProseMirror table,
            .paper-canvas-container table,
            [data-type="question-block"] table,
            .nexus-question-content table {
                border-collapse: collapse !important;
                width: 100% !important;
                margin: 8px 0 !important;
                table-layout: auto;
            }
            .ProseMirror table td,
            .ProseMirror table th,
            .paper-canvas-container table td,
            .paper-canvas-container table th,
            [data-type="question-block"] table td,
            [data-type="question-block"] table th,
            .nexus-question-content table td,
            .nexus-question-content table th {
                border: 1px solid #000000 !important;
                padding: 6px 8px !important;
                line-height: 1.25 !important;
                vertical-align: middle !important;
                text-align: center !important;
                box-sizing: border-box !important;
                word-break: break-word !important;
            }
            .ProseMirror table td *,
            .ProseMirror table th *,
            .paper-canvas-container table td *,
            .paper-canvas-container table th *,
            [data-type="question-block"] table td *,
            [data-type="question-block"] table th *,
            .nexus-question-content table td *,
            .nexus-question-content table th * {
                line-height: 1.25 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .ProseMirror table th,
            .paper-canvas-container table th,
            [data-type="question-block"] table th,
            .nexus-question-content table th {
                font-weight: bold !important;
                background-color: rgba(0, 0, 0, 0.03) !important;
            }
            .nexus-tabular-grid {
                border: 1px solid #000000 !important;
                border-radius: 4px;
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

            /* Custom Page Break Node Styling */
            .page-break {
                column-span: all !important;
                -webkit-column-span: all !important;
                break-before: page !important;
                page-break-before: always !important;
                height: 24px;
                border-top: 2px dashed #6366f1;
                margin: 20px 0;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
            }
            .page-break::after {
                content: "Page Break / পৃষ্ঠা বিভাজক";
                position: absolute;
                background: #e0e7ff;
                color: #4f46e5;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 8px;
                border-radius: 4px;
            }

            .print-mode .page-break {
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                background: none !important;
                break-before: page !important;
                page-break-before: always !important;
                column-span: all !important;
                -webkit-column-span: all !important;
            }
            .print-mode .page-break::after,
            .print-mode .page-break::before {
                display: none !important;
                content: "" !important;
                opacity: 0 !important;
                visibility: hidden !important;
            }

            body, .paper-canvas-container, [data-type="question-block"], .ProseMirror {
                text-rendering: optimizeLegibility !important;
                -webkit-font-smoothing: antialiased !important;
                font-variant-ligatures: normal !important;
                font-feature-settings: "liga" 1, "clig" 1 !important;
            }

            @media print {
                body {
                    zoom: 1 !important;
                }
                .page-break {
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    background: none !important;
                    break-before: page !important;
                    page-break-before: always !important;
                    column-span: all !important;
                    -webkit-column-span: all !important;
                }
                .page-break::after,
                .page-break::before {
                    display: none !important;
                    content: "" !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                }
                .paper-canvas-container,
                .paper-content-wrapper,
                .paper-content-wrapper > div,
                .ProseMirror {
                    position: static !important;
                    display: block !important;
                    overflow: visible !important;
                    zoom: 1 !important;
                    height: auto !important;
                    min-height: 0 !important;
                }
                .ProseMirror::after {
                    content: "";
                    display: block;
                    clear: both;
                    height: 0;
                    column-span: all !important;
                    -webkit-column-span: all !important;
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
                [data-type="question-block"] {
                    padding-top: 4px !important;
                    padding-bottom: 4px !important;
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
            /* PDF Export Mode overrides */
            .pdf-export-mode .paper-page-background {
                border: none !important;
                border-bottom: none !important;
                box-shadow: none !important;
            }

            /* Active PDF Export Styles (Page-by-Page Capture overrides) */
            .pdf-export-active.paper-canvas-container {
                background-color: #ffffff !important;
                box-shadow: none !important;
            }
            .pdf-export-active .paper-page-background {
                background-color: #ffffff !important;
                border: none !important;
                border-bottom: none !important;
                box-shadow: none !important;
            }
            .pdf-export-active .ProseMirror {
                color: #000000 !important;
                background-color: transparent !important;
                column-rule: none !important; /* Fixes html2canvas horizontal black bands in multi-columns */
            }
            .pdf-export-active .ProseMirror * {
                color: #000000 !important;
            }
            .pdf-export-active table,
            .pdf-export-active td,
            .pdf-export-active th {
                box-sizing: border-box !important;
            }
            .pdf-export-active td,
            .pdf-export-active th {
                border: 1px solid #000000 !important;
                padding: 6px 8px !important;
                line-height: 1.25 !important;
                vertical-align: middle !important;
            }
            .pdf-export-active td *,
            .pdf-export-active th * {
                line-height: 1.25 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .show-answers-highlighted.pdf-export-active .nexus-correct-option,
            .show-answers-highlighted.pdf-export-active .nexus-correct-option * {
                background-color: #f0fdf4 !important;
                color: #16a34a !important;
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
