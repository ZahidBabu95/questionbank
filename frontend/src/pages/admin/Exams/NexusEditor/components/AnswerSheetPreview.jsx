import React, { useState, useEffect } from 'react';
import { useNexusEditor } from '../context/NexusEditorContext';
import { X, Printer, Loader2 } from 'lucide-react';
import questionService from '../../../../../services/questionService';
import { formatDurationString } from '../../../../../utils/formatUtils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const formatMathPowers = (html) => {
    if (!html) return '';
    return html.replace(/(<[^>]+>)|(([a-zA-Z0-9\)\}])\^\{?(-?[a-zA-Z0-9.]+)\}?)|(([a-zA-Z0-9\)\}])_\{?(-?[a-zA-Z0-9.]+)\}?)/g, (match, tag, powMatch, powBase, powExp, subMatch, subBase, subVal) => {
        if (tag) return tag;
        if (powMatch) return `${powBase}<sup>${powExp}</sup>`;
        if (subMatch) return `${subBase}<sub>${subVal}</sub>`;
        return match;
    });
};

const processTabularHTML = (html) => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const isTabularText = (text) => {
            return /\t| {3,}|(?:\s*&nbsp;\s*){2,}/i.test(text) || text.includes('\u00A0\u00A0');
        };
        
        const processBlock = (blockNode) => {
            const children = Array.from(blockNode.childNodes);
            if (children.length === 0) return;
            
            const lines = [];
            let currentLine = [];
            
            children.forEach(child => {
                if (child.tagName === 'BR') {
                    lines.push(currentLine);
                    currentLine = [];
                } else {
                    currentLine.push(child);
                }
            });
            if (currentLine.length > 0 || children[children.length - 1]?.tagName === 'BR') {
                lines.push(currentLine);
            }
            
            const lineIsTabular = lines.map(lineNodes => {
                return lineNodes.some(node => {
                    const text = node.nodeType === 3 ? node.nodeValue : (node.textContent || '');
                    return isTabularText(text);
                });
            });
            
            const groups = [];
            let currentGroup = { isTable: false, lines: [] };
            
            for (let i = 0; i < lines.length; i++) {
                const isTab = lineIsTabular[i];
                if (isTab) {
                    if (currentGroup.isTable) {
                        currentGroup.lines.push(lines[i]);
                    } else {
                        if (currentGroup.lines.length > 0) {
                            groups.push(currentGroup);
                        }
                        currentGroup = { isTable: true, lines: [lines[i]] };
                    }
                } else {
                    const nextLineIsTabular = i + 1 < lines.length && lineIsTabular[i + 1];
                    if (currentGroup.isTable && nextLineIsTabular) {
                        currentGroup.lines.push(lines[i]);
                    } else {
                        if (currentGroup.lines.length > 0) {
                            groups.push(currentGroup);
                        }
                        currentGroup = { isTable: false, lines: [lines[i]] };
                    }
                }
            }
            if (currentGroup.lines.length > 0) {
                groups.push(currentGroup);
            }
            
            while (blockNode.firstChild) {
                blockNode.removeChild(blockNode.firstChild);
            }
            
            groups.forEach((group, gIdx) => {
                if (group.isTable) {
                    const tableDiv = doc.createElement('div');
                    tableDiv.className = 'nexus-tabular-grid';
                    tableDiv.setAttribute('style', "font-family: Consolas, Monaco, 'Courier New', monospace !important; white-space: pre !important; font-size: 12.5px !important; line-height: 1.5 !important; background-color: #fafafa; border: 1px solid #d1d5db; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0; letter-spacing: 0.03em; color: #111827; display: block; width: 100%; box-sizing: border-box;");
                    
                    group.lines.forEach((lineNodes, lIdx) => {
                        lineNodes.forEach(node => {
                            if (node.nodeType === 3) {
                                node.nodeValue = node.nodeValue.replace(/\u00A0/g, ' ');
                            }
                            tableDiv.appendChild(node);
                        });
                        if (lIdx < group.lines.length - 1) {
                            tableDiv.appendChild(doc.createElement('br'));
                        }
                    });
                    blockNode.appendChild(tableDiv);
                } else {
                    group.lines.forEach((lineNodes, lIdx) => {
                        lineNodes.forEach(node => {
                            blockNode.appendChild(node);
                        });
                        if (lIdx < group.lines.length - 1 || gIdx < groups.length - 1) {
                            blockNode.appendChild(doc.createElement('br'));
                        }
                    });
                }
            });
        };
        
        const blocks = Array.from(doc.body.querySelectorAll('p, div, td, th, li'));
        if (blocks.length === 0) {
            processBlock(doc.body);
        } else {
            blocks.forEach(block => processBlock(block));
        }
        
        return doc.body.innerHTML;
    } catch (e) {
        console.error("Error in processTabularHTML:", e);
        return html;
    }
};

const renderLatexMath = (html) => {
    if (!html) return '';
    const mathBlocks = [];
    let count = 0;
    
    // Replace inline latex $...$ with placeholders
    let processed = html.replace(/\$(.*?)\$/g, (match, formula) => {
        try {
            const cleanFormula = formula
                .replace(/<[^>]+>/g, '') // Strip HTML tags inside formula
                .replace(/&nbsp;/g, ' ')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
                
            const rendered = katex.renderToString(cleanFormula, {
                throwOnError: false,
                displayMode: false
            });
            const placeholder = `___MATH_BLOCK_${count}___`;
            mathBlocks.push({ placeholder, html: rendered });
            count++;
            return placeholder;
        } catch (e) {
            console.error("KaTeX error in AnswerSheetPreview:", e);
            return match;
        }
    });
    
    // Process regular math math powers/subscripts on the rest of the text
    processed = formatMathPowers(processed);
    
    // Restore KaTeX rendered blocks
    mathBlocks.forEach(block => {
        processed = processed.replace(block.placeholder, block.html);
    });
    
    return processTabularHTML(processed);
};

const isPlaceholderText = (text) => {
    if (!text) return true;
    const clean = text.toString().replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    return clean === '' || 
           clean.startsWith('generated question') || 
           clean.startsWith('dynamic question') || 
           clean.startsWith('ডায়নামিক প্রশ্ন') || 
           clean.startsWith('ডায়নামিক প্রশ্ন');
};

const getDisplayQuestionText = (q) => {
    if (!q) return '';
    let text = q.questionText || '';
    
    if (q.stimulus) {
        const cleanStim = q.stimulus.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
        const isStimPlaceholder = cleanStim === '' || 
                                  cleanStim.startsWith('generated question') || 
                                  cleanStim.startsWith('dynamic question') || 
                                  cleanStim.startsWith('ডায়নামিক প্রশ্ন') || 
                                  cleanStim.startsWith('ডায়নামিক প্রশ্ন');
        if (!isStimPlaceholder) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                const stem = doc.querySelector('.cq-stem');
                if (stem) {
                    stem.remove();
                    text = doc.body.innerHTML;
                }
            } catch (e) {
                console.error("Failed to strip cq-stem in getDisplayQuestionText:", e);
            }
        }
    }

    const cleanText = text.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    const isPlaceholder = cleanText.startsWith('generated question') || 
                          cleanText.startsWith('dynamic question') || 
                          cleanText.startsWith('ডায়নামিক প্রশ্ন') || 
                          cleanText.startsWith('ডায়নামিক প্রশ্ন') || 
                          cleanText === '';
    if (isPlaceholder) {
        let dynamicData = q.dynamicData;
        if (dynamicData) {
            if (typeof dynamicData === 'string') {
                try {
                    dynamicData = JSON.parse(dynamicData);
                } catch (e) {
                    dynamicData = null;
                }
            }
            if (dynamicData) {
                const keys = ['text', 'question', 'questionText', 'question_text', 'content'];
                for (const key of keys) {
                    const val = dynamicData[key];
                    if (val && typeof val === 'string') {
                        const cleanVal = val.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                        if (cleanVal && !cleanVal.startsWith('generated question') && !cleanVal.startsWith('dynamic question') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন')) {
                            return renderLatexMath(val);
                        }
                    }
                }
                
                // Fallback for CQ_DESCRIPTIVE/sub_parts
                if (Array.isArray(dynamicData.sub_parts) && dynamicData.sub_parts.length > 0) {
                    const partsTexts = [];
                    dynamicData.sub_parts.forEach((part, pIdx) => {
                        if (part && typeof part === 'object') {
                            const subKeys = ['questionText', 'text', 'question', 'content'];
                            for (const key of subKeys) {
                                const val = part[key];
                                if (val && typeof val === 'string') {
                                    const cleanVal = val.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                                    if (cleanVal && !cleanVal.startsWith('generated question') && !cleanVal.startsWith('dynamic question') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন') && !cleanVal.startsWith('ডায়নামিক প্রশ্ন')) {
                                        const partLabel = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                        partsTexts.push(`(${partLabel}) ${val}`);
                                        break;
                                    }
                                }
                            }
                        }
                    });
                    if (partsTexts.length > 0) {
                        return renderLatexMath(partsTexts.join(' '));
                    }
                }
            }
        }
        return '';
    }
    return renderLatexMath(text);
};

const AnswerSheetPreview = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { documentQuestions, docSettings, uiLang } = useNexusEditor();
    const [realQuestions, setRealQuestions] = useState({});
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (!documentQuestions || documentQuestions.length === 0) return;

        const fetchQuestions = async () => {
            setLoading(true);
            try {
                const fetchedData = {};
                const promises = documentQuestions.map(async (q) => {
                    const qId = q.attrs?.questionId;
                    if (qId && !fetchedData[qId]) {
                        try {
                            const data = await questionService.getQuestionById(qId);
                            let options = [];
                            if (data.type === 'MCQ') {
                                try {
                                    options = await questionService.getOptions(qId);
                                } catch (e) {
                                    console.error("Failed to fetch options for", qId);
                                }
                            }
                            fetchedData[qId] = { ...data, options };
                        } catch (e) {
                            console.error("Failed to fetch question details for", qId, e);
                        }
                    }
                });
                await Promise.all(promises);
                setRealQuestions(fetchedData);
            } catch (err) {
                console.error("Error loading answers:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [documentQuestions]);

    const layout = docSettings?.ansLayout || 'compact';

    const getOptionLabel = (idx, style = 'bn') => {
        if (style === 'en') return String.fromCharCode(97 + idx);
        if (style === 'roman') return ['i', 'ii', 'iii', 'iv', 'v'][idx] || (idx + 1);
        if (style === 'num_en') return `${idx + 1}`;
        if (style === 'num_bn') return ['১', '২', '৩', '৪', '৫'][idx] || (idx + 1);
        return ['ক', 'খ', 'গ', 'ঘ', 'ঙ'][idx] || String.fromCharCode(97 + idx);
    };

    const handlePrint = () => {
        window.print();
    };

    // Get page size dimensions
    const getPageDimensions = () => {
        const pz = docSettings?.pageSize || 'A4';
        if (pz === 'A4') return { w: 210, h: 297 };
        if (pz === 'Legal') return { w: 216, h: 356 };
        if (pz === 'Letter') return { w: 216, h: 279 };
        return { w: docSettings?.customW || 210, h: docSettings?.customH || 297 };
    };

    const dims = getPageDimensions();
    const widthMm = docSettings?.orientation === 'landscape' ? dims.h : dims.w;
    const heightMm = docSettings?.orientation === 'landscape' ? dims.w : dims.h;

    const convertDigits = (value, language) => {
        if (value === null || value === undefined) return '';
        let str = value.toString();
        if (language === 'ENGLISH') {
            const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
            str = str.replace(/[০-৯]/g, m => bnToEn[m]);
            str = str.replace(/মিনিট/g, 'Minutes').replace(/ঘণ্টা/g, 'Hours');
        } else {
            const enToBn = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
            str = str.replace(/[0-9]/g, m => enToBn[m]);
            str = str.replace(/Minutes?/gi, 'মিনিট').replace(/Hours?/gi, 'ঘণ্টা');
        }
        return str;
    };

    const ptToPx = (pt) => pt * 1.333333;

    const zoom = docSettings?.zoom || 100; // From context if available, otherwise 100

    return (
        <div 
            className="flex justify-center transition-all duration-300 relative print-canvas-wrapper print:block print:w-full print:m-0 print:p-0"
            style={{ width: `${(widthMm * 3.7795) * (zoom / 100)}px`, minHeight: `${(heightMm * 3.7795) * (zoom / 100)}px` }}
        >
            <div 
                className="paper-canvas-container shrink-0 bg-white shadow-xl ring-1 ring-slate-900/5 relative my-8 print:my-0 print:shadow-none print:ring-0 mx-auto"
                style={{
                    width: widthMm ? `${widthMm}mm` : '210mm',
                    minHeight: heightMm ? `${heightMm}mm` : '297mm',
                    zoom: zoom / 100,
                }}
            >
            <div className="paper-content-wrapper w-full h-full"
                 style={{
                     padding: `${docSettings?.marginTop ?? 20}mm ${docSettings?.marginRight ?? 20}mm ${docSettings?.marginBottom ?? 20}mm ${docSettings?.marginLeft ?? 25}mm`,
                 }}>
                
                {/* Same Header as PaperCanvasV2 */}
                {(() => {
                    const s = docSettings || {};
                    const headerLH = s.headerLineHeight !== undefined ? Number(s.headerLineHeight) : 1.2;
                    const safeHeaderLH = s.language === 'ENGLISH' ? headerLH : Math.max(1.25, headerLH);
                    
                    const subHeaderItemMargin = Math.round((headerLH - 0.9) * 10);
                    const rowGapVal = subHeaderItemMargin;
                    const subHeaderMarginBottom = Math.round(8 * headerLH);
                    const candidateMarginTop = Math.round(12 * headerLH);
                    const candItemMargin = Math.round(8 * headerLH);
                    const hasCandidates = !!(s.showName || s.showRoll || s.showReg);
                    const doubleBorderMarginTop = hasCandidates ? Math.round(8 * headerLH) : Math.round(14 * headerLH);
                    const actualHeaderGap = s.headerGap !== undefined ? Number(s.headerGap) : ((s.headerStyle === 'ডাবল বর্ডার' || (s.showDivider && s.dividerStyle === 'double')) ? 12 : 20);

                    return (
                        <div style={{
                            fontFamily: s.language === 'ENGLISH' 
                                ? (s.enFont ? `'${s.enFont}', sans-serif` : 'inherit')
                                : (s.bnFont ? `'${s.bnFont}', sans-serif` : 'inherit'), 
                            borderBottom: s.headerStyle === 'ডাবল বর্ডার' ? 'none' : 
                                          s.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 
                                          s.headerStyle === 'থিক টপ লাইন' ? '3px solid #000' : 
                                          (s.showDivider ? (s.dividerStyle === 'double' ? 'none' : s.dividerStyle === 'dashed' ? '1px dashed #000' : '1px solid #000') : 'none'),
                            borderTop: s.headerStyle === 'থিক টপ লাইন' ? '3px solid #000' : 
                                       s.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                            borderLeft: s.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                            borderRight: s.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                            padding: s.headerStyle === 'বক্স স্টাইল' ? '10px' : '0 0 4px 0',
                            marginBottom: actualHeaderGap
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '28px', marginBottom: rowGapVal, width: '100%' }}>
                                {/* Left: Subject Code */}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
                                    {(s.showSubjectCode !== false && s.subjectCode) && (
                                        <div style={{display: 'inline-block', border: '1px solid #000', padding: '2px 8px', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                            {s.language === 'ENGLISH' ? 'Sub Code' : 'বিষয় কোড'}: {convertDigits(s.subjectCode, s.language)}
                                        </div>
                                    )}
                                </div>

                                {/* Center: Institute Name */}
                                <div style={{ flex: '0 1 auto', textAlign: 'center', maxWidth: '60%', padding: '0 10px' }}>
                                    {s.showInstitute !== false && (
                                        <div style={{fontSize: ptToPx(s.headerFontSize), fontWeight: s.boldInstitute ? 'bold' : 'normal', wordBreak: 'break-word', lineHeight: safeHeaderLH}}>
                                            {s.institute || 'প্রতিষ্ঠানের নাম'}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Set Code */}
                                <div className="nexus-header-set-code" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                                    {(s.showSetCode !== false && s.setCode) && (
                                        <div style={{display: 'inline-block', border: '1px solid #000', padding: '2px 8px', fontSize: ptToPx(s.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                            {s.language === 'ENGLISH' ? 'Set Code' : 'সেট কোড'}: {convertDigits(s.setCode, s.language)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div style={{textAlign: 'center', fontSize: ptToPx(s.subHeaderFontSize), fontWeight: s.boldSubject ? 'bold' : 'normal', marginBottom: subHeaderMarginBottom, lineHeight: safeHeaderLH}}>
                                {(s.showBoard !== false && s.board) && (
                                    <div style={{marginBottom: subHeaderItemMargin}}>
                                        {s.board} {s.language === 'ENGLISH' ? 'Board' : 'বอร์ด'}
                                    </div>
                                )}
                                {(s.showExamType !== false || s.showYear !== false) && (
                                    <div style={{marginBottom: subHeaderItemMargin}}>
                                        {[s.showExamType !== false ? s.exam : null, s.showYear !== false ? convertDigits(s.year, s.language) : null].filter(Boolean).join(' - ')}
                                    </div>
                                )}
                                {(s.showClass !== false || s.showSubject !== false || s.showGroup) && (
                                    <div>
                                        {[
                                            s.showClass !== false ? `${s.language === 'ENGLISH' ? 'Class' : 'শ্রেণি'}: ${s.className}` : null,
                                            s.showSubject !== false ? `${s.language === 'ENGLISH' ? 'Subject' : 'বিষয়'}: ${s.subject}` : null,
                                            (s.showGroup && s.group !== 'সাধারণ' && s.group !== 'General') ? `${s.language === 'ENGLISH' ? 'Group' : 'বিভাগ'}: ${s.group}` : null
                                        ].filter(Boolean).join(' | ')}
                                    </div>
                                )}
                            </div>
                            
                            {(s.showTime !== false || s.showTotalMarks !== false) && (
                                <div style={{display:'flex', justifyContent:'space-between', fontSize: ptToPx((s.subHeaderFontSize || 14) * 0.85), fontWeight: 'bold', lineHeight: safeHeaderLH}}>
                                    <span>{s.showTime !== false ? `${s.language === 'ENGLISH' ? 'Time' : 'সময়'}: ${convertDigits(formatDurationString(s.time, s.language), s.language)}` : ''}</span>
                                    <span>{s.showTotalMarks !== false ? `${s.language === 'ENGLISH' ? 'Full Marks' : 'পূর্ণমান'}: ${convertDigits(s.totalMarks, s.language)}` : ''}</span>
                                </div>
                            )}
                            
                            {(s.showName || s.showRoll || s.showReg) && (
                                <div style={{ marginTop: candidateMarginTop, fontSize: ptToPx(s.bodyFontSize) }}>
                                    {s.candidateLayout === 'inline' ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 15, flexWrap: 'wrap' }}>
                                            {s.showName && <div style={{flex: 1}}><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{display:'inline-block', width:'calc(100% - 40px)', borderBottom:'1px dashed #000'}}></span></div>}
                                            <div style={{display:'flex', gap: 15, flexShrink: 0}}>
                                                {s.showRoll && <div><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Roll No' : 'রোল নম্বর'}:</span> <span style={{display:'inline-block', width:80, borderBottom:'1px dashed #000'}}></span></div>}
                                                {s.showReg && <div><span style={{whiteSpace:'nowrap'}}>{s.language === 'ENGLISH' ? 'Reg No' : 'রেজিঃ নম্বর'}:</span> <span style={{display:'inline-block', width:90, borderBottom:'1px dashed #000'}}></span></div>}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {s.showName && <div style={{marginBottom: candItemMargin, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                            {(s.showRoll || s.showReg) && (
                                                <div style={{display:'flex', justifyContent: (s.showRoll && s.showReg) ? 'space-between' : 'flex-start', gap: 40}}>
                                                    {s.showRoll && <div style={{flex: 1, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Roll No' : 'রোল নম্বর'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                                    {s.showReg && <div style={{flex: 1, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{s.language === 'ENGLISH' ? 'Reg No' : 'রেজিঃ নম্বর'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                            {/* Double line emulation for html2canvas compatibility */}
                            {(s.headerStyle === 'ডাবল বর্ডার' || (s.headerStyle !== 'বক্স স্টাইল' && s.headerStyle !== 'থিক টপ লাইন' && s.showDivider && s.dividerStyle === 'double')) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginTop: doubleBorderMarginTop, marginBottom: '0px' }}>
                                    <div style={{ borderTop: '1px solid #000', width: '100%', height: '0px' }}></div>
                                    <div style={{ borderTop: '1px solid #000', width: '100%', height: '0px' }}></div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div className="text-center mb-8">
                    <h3 className="text-lg font-bold text-slate-800 bg-slate-100 inline-block px-8 py-2 rounded-full border-2 border-slate-300" style={{ fontFamily: docSettings?.language === 'ENGLISH' ? (docSettings?.enFont ? `'${docSettings.enFont}', sans-serif` : 'inherit') : (docSettings?.bnFont ? `'${docSettings.bnFont}', sans-serif` : 'inherit') }}>
                        {uiLang === 'bn' ? 'উত্তরপত্র' : 'Answer Sheet'}
                    </h3>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-indigo-600 print:hidden">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p className="font-bold text-slate-600">{uiLang === 'bn' ? 'উত্তর লোড হচ্ছে...' : 'Loading answers...'}</p>
                    </div>
                ) : (
                <div 
                    className="text-slate-800 font-medium pb-12" 
                    style={{ 
                        fontSize: docSettings?.bodyFontSize ? `${docSettings.bodyFontSize}pt` : '11pt', 
                        fontFamily: docSettings?.language === 'ENGLISH' 
                            ? (docSettings?.enFont ? `'${docSettings.enFont}', sans-serif` : 'inherit')
                            : (docSettings?.bnFont ? `'${docSettings.bnFont}', sans-serif` : 'inherit'),
                        lineHeight: '1.5'
                    }}
                >
                    {layout === 'compact' && (() => {
                        const mcqQuestions = [];
                        const nonMcqQuestions = [];

                        documentQuestions.forEach((q, i) => {
                            const qId = q.attrs?.questionId;
                            const realQ = qId ? realQuestions[qId] : null;
                            const qType = realQ ? realQ.type : (q.attrs?.type || 'MCQ');
                            const qNum = q.attrs?.questionNumber || (i + 1);
                            const displayNum = docSettings?.language === 'ENGLISH' 
                                ? qNum 
                                : convertDigits(qNum, 'BANGLA');

                            if (qType === 'MCQ') {
                                mcqQuestions.push({ q, index: i, displayNum, realQ });
                            } else {
                                nonMcqQuestions.push({ q, index: i, displayNum, realQ });
                            }
                        });

                        const numCols = 5;
                        const totalMcq = mcqQuestions.length;
                        const numRows = Math.ceil(totalMcq / numCols);

                        return (
                            <div>
                                {/* MCQ Answers Grid Table */}
                                {totalMcq > 0 && (
                                    <table className="w-full border-collapse border-2 border-slate-800 text-center text-sm mb-6">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-800">
                                                {Array.from({ length: numCols }).map((_, colIdx) => (
                                                    <React.Fragment key={colIdx}>
                                                        <th className={`border border-slate-800 py-1 px-1.5 font-bold ${colIdx > 0 ? 'border-l-2' : ''}`} style={{ width: '8%' }}>
                                                            {docSettings?.language === 'ENGLISH' ? 'Q.' : 'প্রশ্ন'}
                                                        </th>
                                                        <th className="border border-slate-800 py-1 px-1.5 font-bold" style={{ width: '12%' }}>
                                                            {docSettings?.language === 'ENGLISH' ? 'Ans.' : 'উত্তর'}
                                                        </th>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: numRows }).map((_, rowIdx) => (
                                                <tr key={rowIdx} className="hover:bg-slate-50 border-b border-slate-800 last:border-b-2">
                                                    {Array.from({ length: numCols }).map((_, colIdx) => {
                                                        const qIndex = rowIdx * numCols + colIdx;
                                                        
                                                        if (qIndex < totalMcq) {
                                                            const { q, displayNum, realQ } = mcqQuestions[qIndex];
                                                            const options = realQ ? realQ.options : q.attrs?.options;
                                                            const correctOpts = [];
                                                            if (options && Array.isArray(options)) {
                                                                options.forEach((opt, oi) => {
                                                                    if (opt.correct || opt.isCorrect) {
                                                                        const label = opt.optionLabel || opt.label || getOptionLabel(oi, q.attrs?.optionStyle);
                                                                        correctOpts.push(label);
                                                                    }
                                                                });
                                                            }
                                                            const ansText = correctOpts.length > 0 ? correctOpts.join(', ') : 'N/A';
                                                            const qFontSize = q.attrs?.fontSize || docSettings?.bodyFontSize || 12;

                                                            return (
                                                                <React.Fragment key={colIdx}>
                                                                    <td className={`border border-slate-800 py-1.5 px-1 font-bold text-slate-700 bg-slate-50/50 ${colIdx > 0 ? 'border-l-2' : ''}`} style={{ fontSize: ptToPx(qFontSize) }}>
                                                                        {displayNum}
                                                                    </td>
                                                                    <td className="border border-slate-800 py-1.5 px-2 font-bold text-slate-900" style={{ fontSize: ptToPx(qFontSize) }} dangerouslySetInnerHTML={{ __html: renderLatexMath(ansText) }} />
                                                                </React.Fragment>
                                                            );
                                                        } else {
                                                            return (
                                                                <React.Fragment key={colIdx}>
                                                                    <td className={`border border-slate-800 py-1.5 px-1 bg-slate-50/30 ${colIdx > 0 ? 'border-l-2' : ''}`}>-</td>
                                                                    <td className="border border-slate-800 py-1.5 px-2">-</td>
                                                                </React.Fragment>
                                                            );
                                                        }
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {/* Non-MCQ Answers List */}
                                {nonMcqQuestions.length > 0 && (
                                    <div className="mt-6 space-y-4 text-left">
                                        <h5 className="font-bold border-b border-slate-300 pb-1 text-slate-800" style={{ fontSize: ptToPx(docSettings?.subHeaderFontSize || 14) }}>
                                            {docSettings?.language === 'ENGLISH' ? 'Short & Broad Questions Answers' : 'সংক্ষিপ্ত ও রচনামূলক প্রশ্নের উত্তর'}
                                        </h5>
                                        <div className="space-y-4">
                                            {nonMcqQuestions.map(({ q, displayNum, realQ }) => {
                                                const content = getDisplayQuestionText(q.attrs);
                                                const ansText = (realQ ? realQ.correctAnswer : q.attrs?.answer) || 'N/A';
                                                const qFontSize = q.attrs?.fontSize || docSettings?.bodyFontSize || 12;

                                                let dynamicDataParsed = null;
                                                if (q.attrs?.dynamicData) {
                                                    try {
                                                        dynamicDataParsed = typeof q.attrs.dynamicData === 'string'
                                                            ? JSON.parse(q.attrs.dynamicData)
                                                            : q.attrs.dynamicData;
                                                    } catch (e) {
                                                        console.error("Failed to parse dynamicData in AnswerSheetPreview compact:", e);
                                                    }
                                                }
                                                const hasSubParts = dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.length > 0;

                                                return (
                                                    <div key={displayNum} className="border-b border-slate-100 pb-2 last:border-b-0 break-inside-avoid" style={{ fontSize: ptToPx(qFontSize) }}>
                                                        <div className="flex gap-2">
                                                            <span className="font-bold text-slate-700">{displayNum}.</span>
                                                            <div className="font-semibold text-slate-800 inline-block" dangerouslySetInnerHTML={{ __html: content }} />
                                                        </div>
                                                        {hasSubParts ? (
                                                            <div className="pl-6 mt-1.5 space-y-2 text-slate-900 font-bold">
                                                                {dynamicDataParsed.sub_parts.map((part, pIdx) => {
                                                                    const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                                                    return (
                                                                        <div key={pIdx} className="flex flex-col gap-0.5 pb-1 border-b border-slate-100 last:border-0 last:pb-0">
                                                                            <div className="flex items-start gap-1.5 text-xs font-bold text-slate-800">
                                                                                <span className="text-slate-900 font-bold shrink-0">({label}) {docSettings?.language === 'ENGLISH' ? 'Ans:' : 'উত্তর:'}</span>
                                                                                <div className="inline font-bold text-slate-900" dangerouslySetInnerHTML={{ __html: renderLatexMath(part.answer || 'N/A') }} />
                                                                            </div>
                                                                            {part.explanation && (
                                                                                <div className="flex items-start gap-1.5 pl-4 text-xs font-normal text-slate-600">
                                                                                    <span className="font-semibold shrink-0 text-slate-800">{docSettings?.language === 'ENGLISH' ? 'Explanation:' : 'ব্যাখ্যা:'}</span>
                                                                                    <div className="inline text-slate-700 font-normal" dangerouslySetInnerHTML={{ __html: renderLatexMath(part.explanation) }} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="pl-6 mt-1 text-slate-900 font-bold">
                                                                <span className="text-xs text-slate-500 font-normal mr-1.5">{docSettings?.language === 'ENGLISH' ? 'Ans:' : 'উত্তর:'}</span>
                                                                <div className="inline" dangerouslySetInnerHTML={{ __html: renderLatexMath(ansText) }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {layout === 'highlighted' && (
                        <div className="space-y-6">
                            {documentQuestions.map((q, i) => {
                                const qId = q.attrs?.questionId;
                                const realQ = qId ? realQuestions[qId] : null;
                                const qType = realQ ? realQ.type : (q.attrs?.type || 'MCQ');
                                const options = realQ ? realQ.options : q.attrs?.options;
                                const content = getDisplayQuestionText(q.attrs);

                                return (
                                    <div key={i} className="flex flex-col gap-2 break-inside-avoid">
                                        <div className="w-full flex flex-col gap-1">
                                            {q.attrs?.stimulus && !isPlaceholderText(q.attrs.stimulus) && (
                                                <div dangerouslySetInnerHTML={{ __html: renderLatexMath(q.attrs.stimulus) }} className="mb-1" />
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-bold">{i + 1}.</span>
                                            <div dangerouslySetInnerHTML={{ __html: content }} />
                                        </div>
                                        {q.attrs?.statements && Array.isArray(q.attrs.statements) && q.attrs.statements.length > 0 && (
                                            <div className="flex flex-wrap gap-x-6 gap-y-1 pl-6 mb-1">
                                                {q.attrs.statements.map((stmt, sIdx) => {
                                                    const roman = ['i', 'ii', 'iii', 'iv', 'v'][sIdx] || (sIdx + 1);
                                                    const cleanStmt = (typeof stmt === 'string' ? stmt : '').replace(/^(?:i{1,3}|iv|v|vi{0,3}|ix|x|[0-9]+|[১-৯]+)[\.\)]\s*/i, '').trim();
                                                    return (
                                                        <div key={sIdx} className="flex gap-2 items-start text-[0.95em]">
                                                            <span className="font-medium mt-[1px]">{roman}.</span>
                                                            <div dangerouslySetInnerHTML={{ __html: renderLatexMath(cleanStmt) }} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {qType === 'MCQ' && options && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                                                {options.map((opt, oi) => {
                                                    const isCorrect = opt.correct || opt.isCorrect;
                                                    const label = opt.optionLabel || opt.label || getOptionLabel(oi, q.attrs?.optionStyle);
                                                    const text = opt.optionText || opt.text || '';
                                                    return (
                                                        <div key={oi} className={`flex gap-2 p-1.5 rounded ${isCorrect ? 'bg-green-50 font-bold border border-green-300' : ''}`}>
                                                            <span>{label})</span>
                                                            <div dangerouslySetInnerHTML={{ __html: renderLatexMath(text) }} />
                                                            {isCorrect && <span className="text-green-600 ml-auto flex-shrink-0">✔️</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {layout === 'detailed' && (
                        <div className="space-y-8">
                            {documentQuestions.map((q, i) => {
                                const qId = q.attrs?.questionId;
                                const realQ = qId ? realQuestions[qId] : null;
                                const content = getDisplayQuestionText(q.attrs);
                                const qType = realQ ? realQ.type : (q.attrs?.type || 'MCQ');
                                const options = realQ ? realQ.options : q.attrs?.options;
                                let answerHtml = '';
                                let explanationHtml = '';

                                let dynamicDataParsed = null;
                                if (q.attrs?.dynamicData) {
                                    try {
                                        dynamicDataParsed = typeof q.attrs.dynamicData === 'string'
                                            ? JSON.parse(q.attrs.dynamicData)
                                            : q.attrs.dynamicData;
                                    } catch (e) {
                                        console.error("Failed to parse dynamicData in AnswerSheetPreview detailed:", e);
                                    }
                                }
                                const hasSubParts = dynamicDataParsed && dynamicDataParsed.sub_parts && Array.isArray(dynamicDataParsed.sub_parts) && dynamicDataParsed.sub_parts.length > 0;

                                if (qType === 'MCQ' && options && Array.isArray(options)) {
                                    const correctOpts = [];
                                    options.forEach((opt, oi) => {
                                        if (opt.correct || opt.isCorrect) {
                                            const label = opt.optionLabel || opt.label || getOptionLabel(oi, q.attrs?.optionStyle);
                                            const text = opt.optionText || opt.text || '';
                                            correctOpts.push(`${label}) ${text}`);
                                        }
                                    });
                                    answerHtml = correctOpts.length > 0 ? correctOpts.join(' | ') : 'N/A';
                                } else {
                                    answerHtml = (realQ ? realQ.correctAnswer : q.attrs?.answer) || 'N/A';
                                }
                                explanationHtml = (realQ ? realQ.explanation : q.attrs?.explanation) || '';
                                
                                return (
                                    <div key={i} className="flex flex-col gap-3 pb-6 border-b border-slate-100 last:border-0 break-inside-avoid">
                                        <div className="w-full flex flex-col gap-1">
                                            {q.attrs?.stimulus && !isPlaceholderText(q.attrs.stimulus) && (
                                                <div dangerouslySetInnerHTML={{ __html: renderLatexMath(q.attrs.stimulus) }} className="mb-1 text-lg" />
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-bold text-lg">{i + 1}.</span>
                                            <div className="text-lg" dangerouslySetInnerHTML={{ __html: content }} />
                                        </div>
                                        {q.attrs?.statements && Array.isArray(q.attrs.statements) && q.attrs.statements.length > 0 && (
                                            <div className="flex flex-wrap gap-x-6 gap-y-1 pl-6 mb-1">
                                                {q.attrs.statements.map((stmt, sIdx) => {
                                                    const roman = ['i', 'ii', 'iii', 'iv', 'v'][sIdx] || (sIdx + 1);
                                                    const cleanStmt = (typeof stmt === 'string' ? stmt : '').replace(/^(?:i{1,3}|iv|v|vi{0,3}|ix|x|[0-9]+|[১-৯]+)[\.\)]\s*/i, '').trim();
                                                    return (
                                                        <div key={sIdx} className="flex gap-2 items-start text-[0.95em] text-lg">
                                                            <span className="font-medium mt-[1px]">{roman}.</span>
                                                            <div dangerouslySetInnerHTML={{ __html: renderLatexMath(cleanStmt) }} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <div className="pl-6 space-y-2">
                                            {hasSubParts ? (
                                                <div className="space-y-3 w-full">
                                                    {dynamicDataParsed.sub_parts.map((part, pIdx) => {
                                                        const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                                        return (
                                                            <div key={pIdx} className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 space-y-1">
                                                                <div className="flex items-start gap-1.5 font-bold text-slate-800 text-sm">
                                                                    <span className="text-slate-900 font-bold shrink-0">({label}) {uiLang === 'bn' ? 'সঠিক উত্তর:' : 'Correct Answer:'}</span>
                                                                    <div className="inline font-bold text-slate-900" dangerouslySetInnerHTML={{ __html: renderLatexMath(part.answer || 'N/A') }} />
                                                                </div>
                                                                {part.explanation && (
                                                                    <div className="text-sm mt-1.5 flex items-start gap-1">
                                                                        <span className="font-bold text-slate-800 shrink-0">{uiLang === 'bn' ? 'ব্যাখ্যা:' : 'Explanation:'} </span>
                                                                        <div className="font-normal text-slate-700" dangerouslySetInnerHTML={{ __html: renderLatexMath(part.explanation) }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                                        <span className="font-bold text-slate-900 text-sm">{uiLang === 'bn' ? 'সঠিক উত্তর:' : 'Correct Answer:'} </span>
                                                        <div className="inline font-bold" dangerouslySetInnerHTML={{ __html: renderLatexMath(answerHtml || 'N/A') }} />
                                                    </div>
                                                    {explanationHtml && (
                                                        <div className="text-sm mt-1.5 flex items-start gap-1">
                                                            <span className="font-bold text-slate-800 shrink-0">{uiLang === 'bn' ? 'ব্যাখ্যা:' : 'Explanation:'} </span>
                                                            <div dangerouslySetInnerHTML={{ __html: renderLatexMath(explanationHtml) }} />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                )}

            </div>
        </div>
        </div>
    );
};

export default AnswerSheetPreview;
