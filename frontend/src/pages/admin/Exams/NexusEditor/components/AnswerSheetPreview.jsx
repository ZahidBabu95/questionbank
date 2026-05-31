import React, { useState, useEffect } from 'react';
import { useNexusEditor } from '../context/NexusEditorContext';
import { X, Printer, Loader2 } from 'lucide-react';
import questionService from '../../../../../services/questionService';
import { formatDurationString } from '../../../../../utils/formatUtils';

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
                            return val;
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
                        return partsTexts.join(' ');
                    }
                }
            }
        }
        return '';
    }
    return text;
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
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                }}
            >
            <div className="paper-content-wrapper w-full h-full"
                 style={{
                     padding: `${docSettings?.marginTop || 20}mm ${docSettings?.marginRight || 20}mm ${docSettings?.marginBottom || 20}mm ${docSettings?.marginLeft || 25}mm`,
                 }}>
                
                {/* Same Header as PaperCanvasV2 */}
                <div style={{
                    fontFamily: docSettings?.language === 'ENGLISH' 
                        ? (docSettings?.enFont ? `'${docSettings.enFont}', sans-serif` : 'inherit')
                        : (docSettings?.bnFont ? `'${docSettings.bnFont}', sans-serif` : 'inherit'), 
                    borderBottom: docSettings?.headerStyle === 'ডাবল বর্ডার' ? 'none' : 
                                  docSettings?.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 
                                  docSettings?.headerStyle === 'থিক টপ লাইন' ? '3px solid #000' : 
                                  (docSettings?.showDivider ? (docSettings?.dividerStyle === 'double' ? 'none' : docSettings?.dividerStyle === 'dashed' ? '1px dashed #000' : '1px solid #000') : 'none'),
                    borderTop: docSettings?.headerStyle === 'থিক টপ লাইন' ? '3px solid #000' : 
                               docSettings?.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                    borderLeft: docSettings?.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                    borderRight: docSettings?.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                    padding: docSettings?.headerStyle === 'বক্স স্টাইল' ? '10px' : '0 0 4px 0',
                    marginBottom: (docSettings?.headerStyle === 'ডাবল বর্ডার' || (docSettings?.showDivider && docSettings?.dividerStyle === 'double')) ? 12 : 20
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '28px', marginBottom: 4, width: '100%' }}>
                        {/* Left: Subject Code */}
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
                            {(docSettings?.showSubjectCode !== false && docSettings?.subjectCode) && (
                                <div style={{display: 'inline-block', border: '1px solid #000', padding: '2px 8px', fontSize: ptToPx(docSettings?.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                    {docSettings?.language === 'ENGLISH' ? 'Sub Code' : 'বিষয় কোড'}: {convertDigits(docSettings?.subjectCode, docSettings?.language)}
                                </div>
                            )}
                        </div>

                        {/* Center: Institute Name */}
                        <div style={{ flex: '0 1 auto', textAlign: 'center', maxWidth: '60%', padding: '0 10px' }}>
                            {docSettings?.showInstitute !== false && (
                                <div style={{fontSize: ptToPx(docSettings?.headerFontSize), fontWeight: docSettings?.boldInstitute ? 'bold' : 'normal', wordBreak: 'break-word', lineHeight: docSettings?.headerLineHeight || 1.2}}>
                                    {docSettings?.institute || 'প্রতিষ্ঠানের নাম'}
                                </div>
                            )}
                        </div>

                        {/* Right: Set Code */}
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                            {(docSettings?.showSetCode !== false && docSettings?.setCode) && (
                                <div style={{display: 'inline-block', border: '1px solid #000', padding: '2px 8px', fontSize: ptToPx(docSettings?.bodyFontSize), fontWeight: 'bold', borderRadius: '4px', whiteSpace: 'nowrap'}}>
                                    {docSettings?.language === 'ENGLISH' ? 'Set Code' : 'সেট কোড'}: {convertDigits(docSettings?.setCode, docSettings?.language)}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div style={{textAlign: 'center', fontSize: ptToPx(docSettings?.subHeaderFontSize), fontWeight: docSettings?.boldSubject ? 'bold' : 'normal', marginBottom: 8, lineHeight: docSettings?.headerLineHeight || 1.2}}>
                        {(docSettings?.showBoard !== false && docSettings?.board) && (
                            <div style={{marginBottom: 2}}>
                                {docSettings?.board} {docSettings?.language === 'ENGLISH' ? 'Board' : 'বোর্ড'}
                            </div>
                        )}
                        {(docSettings?.showExamType !== false || docSettings?.showYear !== false) && (
                            <div>
                                {[docSettings?.showExamType !== false ? docSettings?.exam : null, docSettings?.showYear !== false ? convertDigits(docSettings?.year, docSettings?.language) : null].filter(Boolean).join(' - ')}
                            </div>
                        )}
                        {(docSettings?.showClass !== false || docSettings?.showSubject !== false || docSettings?.showGroup) && (
                            <div>
                                {[
                                    docSettings?.showClass !== false ? `${docSettings?.language === 'ENGLISH' ? 'Class' : 'শ্রেণি'}: ${docSettings?.className}` : null,
                                    docSettings?.showSubject !== false ? `${docSettings?.language === 'ENGLISH' ? 'Subject' : 'বিষয়'}: ${docSettings?.subject}` : null,
                                    (docSettings?.showGroup && docSettings?.group !== 'সাধারণ' && docSettings?.group !== 'General') ? `${docSettings?.language === 'ENGLISH' ? 'Group' : 'বিভাগ'}: ${docSettings?.group}` : null
                                ].filter(Boolean).join(' | ')}
                            </div>
                        )}
                    </div>
                    
                    {(docSettings?.showTime !== false || docSettings?.showTotalMarks !== false) && (
                        <div style={{display:'flex', justifyContent:'space-between', fontSize: ptToPx((docSettings?.subHeaderFontSize || 14) * 0.85), fontWeight: 'bold', lineHeight: 1}}>
                            <span>{docSettings?.showTime !== false ? `${docSettings?.language === 'ENGLISH' ? 'Time' : 'সময়'}: ${convertDigits(formatDurationString(docSettings?.time, docSettings?.language), docSettings?.language)}` : ''}</span>
                            <span>{docSettings?.showTotalMarks !== false ? `${docSettings?.language === 'ENGLISH' ? 'Full Marks' : 'পূর্ণমান'}: ${convertDigits(docSettings?.totalMarks, docSettings?.language)}` : ''}</span>
                        </div>
                    )}
                    
                    {(docSettings?.showName || docSettings?.showRoll || docSettings?.showReg) && (
                        <div style={{ marginTop: 12, fontSize: ptToPx(docSettings?.bodyFontSize) }}>
                            {docSettings?.candidateLayout === 'inline' ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 15 }}>
                                    {docSettings?.showName && <div style={{flex: 1}}><span style={{whiteSpace:'nowrap'}}>{docSettings?.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{display:'inline-block', width:'calc(100% - 40px)', borderBottom:'1px dashed #000'}}></span></div>}
                                    <div style={{display:'flex', gap: 15, flexShrink: 0}}>
                                        {docSettings?.showRoll && <div><span style={{whiteSpace:'nowrap'}}>{docSettings?.language === 'ENGLISH' ? 'Roll No' : 'রোল নম্বর'}:</span> <span style={{display:'inline-block', width:80, borderBottom:'1px dashed #000'}}></span></div>}
                                        {docSettings?.showReg && <div><span style={{whiteSpace:'nowrap'}}>{docSettings?.language === 'ENGLISH' ? 'Reg No' : 'রেজিঃ নম্বর'}:</span> <span style={{display:'inline-block', width:90, borderBottom:'1px dashed #000'}}></span></div>}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {docSettings?.showName && <div style={{marginBottom: 8, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{docSettings?.language === 'ENGLISH' ? 'Name' : 'নাম'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                    {(docSettings?.showRoll || docSettings?.showReg) && (
                                        <div style={{display:'flex', justifyContent: (docSettings?.showRoll && docSettings?.showReg) ? 'space-between' : 'flex-start', gap: 40}}>
                                            {docSettings?.showRoll && <div style={{flex: 1, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{docSettings?.language === 'ENGLISH' ? 'Roll No' : 'রোল নম্বর'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                            {docSettings?.showReg && <div style={{flex: 1, display:'flex'}}><span style={{whiteSpace:'nowrap', marginRight: 5}}>{docSettings?.language === 'ENGLISH' ? 'Reg No' : 'রেজিঃ নম্বর'}:</span> <span style={{flex: 1, borderBottom:'1px dashed #000'}}></span></div>}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    {/* Double line emulation for html2canvas compatibility */}
                    {(docSettings?.headerStyle === 'ডাবল বর্ডার' || (docSettings?.headerStyle !== 'বক্স স্টাইল' && docSettings?.headerStyle !== 'থিক টপ লাইন' && docSettings?.showDivider && docSettings?.dividerStyle === 'double')) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', marginTop: '4px', marginBottom: '0px' }}>
                            <div style={{ borderTop: '1px solid #000', width: '100%', height: '0px' }}></div>
                            <div style={{ borderTop: '1px solid #000', width: '100%', height: '0px' }}></div>
                        </div>
                    )}
                </div>

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
                                                                    <td className="border border-slate-800 py-1.5 px-2 font-bold text-indigo-700" style={{ fontSize: ptToPx(qFontSize) }} dangerouslySetInnerHTML={{ __html: ansText }} />
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
                                                            <div className="pl-6 mt-1.5 space-y-2 text-indigo-700 font-bold">
                                                                {dynamicDataParsed.sub_parts.map((part, pIdx) => {
                                                                    const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                                                    return (
                                                                        <div key={pIdx} className="flex flex-col gap-0.5 pb-1 border-b border-indigo-50/50 last:border-0 last:pb-0">
                                                                            <div className="flex items-start gap-1.5 text-xs font-bold text-slate-800">
                                                                                <span className="text-indigo-800 font-bold shrink-0">({label}) {docSettings?.language === 'ENGLISH' ? 'Ans:' : 'উত্তর:'}</span>
                                                                                <div className="inline font-bold text-indigo-700" dangerouslySetInnerHTML={{ __html: part.answer || 'N/A' }} />
                                                                            </div>
                                                                            {part.explanation && (
                                                                                <div className="flex items-start gap-1.5 pl-4 text-xs font-normal text-slate-600">
                                                                                    <span className="font-semibold shrink-0 text-emerald-700">{docSettings?.language === 'ENGLISH' ? 'Explanation:' : 'ব্যাখ্যা:'}</span>
                                                                                    <div className="inline text-slate-700 font-normal" dangerouslySetInnerHTML={{ __html: part.explanation }} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="pl-6 mt-1 text-indigo-700 font-bold">
                                                                <span className="text-xs text-slate-500 font-normal mr-1.5">{docSettings?.language === 'ENGLISH' ? 'Ans:' : 'উত্তর:'}</span>
                                                                <div className="inline" dangerouslySetInnerHTML={{ __html: ansText }} />
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
                                                <div dangerouslySetInnerHTML={{ __html: q.attrs.stimulus }} className="mb-1" />
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
                                                            <div dangerouslySetInnerHTML={{ __html: cleanStmt }} />
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
                                                            <div dangerouslySetInnerHTML={{ __html: text }} />
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
                                                <div dangerouslySetInnerHTML={{ __html: q.attrs.stimulus }} className="mb-1 text-lg" />
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
                                                            <div dangerouslySetInnerHTML={{ __html: cleanStmt }} />
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
                                                            <div key={pIdx} className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1.5 text-left">
                                                                <div className="flex items-start gap-1.5 font-bold text-slate-800 text-sm">
                                                                    <span className="text-indigo-800 font-bold shrink-0">({label}) {uiLang === 'bn' ? 'সঠিক উত্তর:' : 'Correct Answer:'}</span>
                                                                    <div className="inline font-bold text-indigo-700" dangerouslySetInnerHTML={{ __html: part.answer || 'N/A' }} />
                                                                </div>
                                                                {part.explanation && (
                                                                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm mt-2">
                                                                        <span className="font-bold text-emerald-800">{uiLang === 'bn' ? 'ব্যাখ্যা:' : 'Explanation:'} </span>
                                                                        <div className="mt-1 font-normal text-slate-700" dangerouslySetInnerHTML={{ __html: part.explanation }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                                                        <span className="font-bold text-indigo-800 text-sm">{uiLang === 'bn' ? 'সঠিক উত্তর:' : 'Correct Answer:'} </span>
                                                        <div className="inline font-bold" dangerouslySetInnerHTML={{ __html: answerHtml || 'N/A' }} />
                                                    </div>
                                                    {explanationHtml && (
                                                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm mt-2">
                                                            <span className="font-bold text-emerald-800">{uiLang === 'bn' ? 'ব্যাখ্যা:' : 'Explanation:'} </span>
                                                            <div className="mt-1" dangerouslySetInnerHTML={{ __html: explanationHtml }} />
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
