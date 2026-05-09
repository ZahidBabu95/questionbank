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
            
            .ProseMirror {
                font-family: '${s.language === 'ENGLISH' ? (s.enFont || 'Times New Roman') : (s.bnFont || 'Noto Serif Bengali')}', sans-serif;
                font-size: ${ptToPx(s.bodyFontSize)}px;
                line-height: ${s.lineHeight};
                width: 100% !important;
                background-color: transparent !important;
                box-sizing: border-box;
                outline: none;
                margin: 0 !important;
                padding: 0 !important;
                
                /* Editor View is forced to 1-column to guarantee accurate vertical page breaks and reading order. */
                ${Math.max(s.columns || 1, ...(s.sections || []).map(sec => sec.columns || 1)) > 1 ? `
                /* Column Support */
                column-count: ${Math.max(s.columns || 1, ...(s.sections || []).map(sec => sec.columns || 1))};
                column-gap: ${mmToPx((s.sections || []).find(sec => sec.columns > 1 && sec.colGap)?.colGap || s.colGap || 10)}px;
                ${(s.sections || []).some(sec => sec.columns > 1 && sec.columnBorder) || s.columns > 1 ? 'column-rule: 1.5px solid #000000;' : ''}
                ` : ''}
                
                counter-reset: question-counter;
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

            /* Dynamic Section Display Toggles & Styles */
            ${(s.sections || []).map(sec => {
                const mg = sec.masterGap || 3;
                const cLineGap = sec.smartGap ? (mg === 1 ? 1.2 : mg === 2 ? 1.4 : mg === 3 ? 1.6 : mg === 4 ? 1.8 : 2.0) : 
                                (sec.lineGap !== undefined && sec.lineGap !== '' ? sec.lineGap : (s.lineHeight || 1.5));
                const cOptionGap = sec.smartGap ? (mg === 1 ? 4 : mg === 2 ? 6 : mg === 3 ? 8 : mg === 4 ? 12 : 16) : 
                                (sec.optionGap !== undefined && sec.optionGap !== '' ? sec.optionGap : 8);
                const cQuestionGap = sec.smartGap ? (mg === 1 ? 8 : mg === 2 ? 12 : mg === 3 ? 16 : mg === 4 ? 20 : 26) : 
                                (sec.questionGap !== undefined && sec.questionGap !== '' ? sec.questionGap : (s.questionGap || 15));
                return `
                ${sec.showName === false ? `[data-section-id="${sec.id}"].section-name { display: none !important; }` : `
                    [data-section-id="${sec.id}"].section-name {
                        font-weight: ${sec.nameBold !== false ? 'bold' : 'normal'} !important;
                        font-style: ${sec.nameItalic ? 'italic' : 'normal'};
                        text-decoration: ${sec.nameUnderline ? 'underline' : 'none'};
                        ${sec.nameFontSize ? `font-size: ${sec.nameFontSize}px !important;` : ''}
                        
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
                        
                        ${sec.nameTopGap ? `margin-top: ${sec.nameTopGap}px !important; display: block;` : ''}
                        ${sec.nameGap ? `margin-bottom: ${sec.nameGap}px !important; display: block;` : ''}
                        break-after: avoid;
                        page-break-after: avoid;
                        column-break-after: avoid;
                    }
                    [data-section-id="${sec.id}"].section-name * {
                        ${sec.nameBg === true || (sec.nameBg !== false && s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড') ? `color: #ffffff !important;` : ''}
                    }
                `}
                ${sec.showConditions === false ? `[data-section-id="${sec.id}"].section-conditions { display: none !important; }` : `
                    [data-section-id="${sec.id}"].section-conditions {
                        font-weight: ${sec.condBold ? 'bold' : 'normal'};
                        font-style: ${sec.condItalic ? 'italic' : 'normal'};
                        text-decoration: ${sec.condUnderline ? 'underline' : 'none'};
                        ${sec.condFontSize ? `font-size: ${sec.condFontSize}px !important;` : ''}
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
                
                /* Apply column-span to simple headers instead to avoid Chrome crashes */
                [data-section-id="${sec.id}"] {
                    column-span: all;
                    line-height: ${Math.max(1.0, Number(cLineGap))} !important;
                }
                
                /* Hide Empty Nodes */
                [data-section-id="${sec.id}"].section-conditions:empty,
                [data-section-id="${sec.id}"].section-instructions:empty {
                    display: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                /* Ensure Headers Span All Columns */
                [data-section-id="${sec.id}"] {
                    column-span: all;
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
                position: absolute;
                left: 0; /* Start at the absolute left of the block */
                top: 0px; /* Match the paddingTop of QuestionBlockNode for perfect vertical alignment */
                font-weight: 700;
                font-size: 1em; /* inherit the dynamic question font size */
                color: #0f172a;
                width: 2.2em; /* Safe width for 3 digits + dot */
                text-align: right;
                padding-right: 0.4em; /* Space between dot and text */
                white-space: nowrap;
            }
            
            /* Reset paragraph margins inside editor to avoid prose inheritance */
            .ProseMirror p {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
            }

            [data-type="question-block"][data-numberingstyle="bn"]::before,
            [data-type="question-block"]:not([data-numberingstyle])::before {
                content: counter(question-counter, bengali) ".";
            }
            [data-type="question-block"][data-numberingstyle="en"]::before {
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
            
            @media print {
                .ProseMirror {
                    zoom: ${s.printScale ? s.printScale / 100 : 1.0} !important;
                }
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
