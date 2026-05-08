import React, { useState, useEffect } from 'react';
import { useNexusEditor } from '../context/NexusEditorContext';
import { X, Printer, Loader2 } from 'lucide-react';
import questionService from '../../../../../services/questionService';

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
                    borderBottom: docSettings?.headerStyle === 'ডাবল বর্ডার' ? '3px double #000' : 
                                  docSettings?.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 
                                  docSettings?.headerStyle === 'থিক টপ লাইন' ? '3px solid #000' : 
                                  (docSettings?.showDivider ? (docSettings?.dividerStyle === 'double' ? '3px double #000' : docSettings?.dividerStyle === 'dashed' ? '1px dashed #000' : '1px solid #000') : 'none'),
                    borderTop: docSettings?.headerStyle === 'থিক টপ লাইন' ? '3px solid #000' : 
                               docSettings?.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                    borderLeft: docSettings?.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                    borderRight: docSettings?.headerStyle === 'বক্স স্টাইল' ? '1px solid #000' : 'none',
                    padding: docSettings?.headerStyle === 'বক্স স্টাইল' ? '10px' : '0 0 10px 0',
                    marginBottom: 20
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
                                <div style={{fontSize: ptToPx(docSettings?.headerFontSize), fontWeight: docSettings?.boldInstitute ? 'bold' : 'normal', wordBreak: 'break-word', lineHeight: 1.2}}>
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
                    
                    <div style={{textAlign: 'center', fontSize: ptToPx(docSettings?.subHeaderFontSize), fontWeight: docSettings?.boldSubject ? 'bold' : 'normal', marginBottom: 8}}>
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
                        <div style={{display:'flex', justifyContent:'space-between', fontSize: ptToPx(docSettings?.bodyFontSize), fontWeight: 'bold'}}>
                            <span>{docSettings?.showTime !== false ? `${docSettings?.language === 'ENGLISH' ? 'Time' : 'সময়'}: ${convertDigits(docSettings?.time, docSettings?.language)}` : ''}</span>
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
                    {layout === 'compact' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {documentQuestions.map((q, i) => {
                                const qId = q.attrs?.questionId;
                                const realQ = qId ? realQuestions[qId] : null;
                                const qType = realQ ? realQ.type : (q.attrs?.type || 'MCQ');
                                const options = realQ ? realQ.options : q.attrs?.options;
                                let ansText = '';

                                if (qType === 'MCQ' && options && Array.isArray(options)) {
                                    const correctOpts = [];
                                    options.forEach((opt, oi) => {
                                        if (opt.correct || opt.isCorrect) {
                                            const label = opt.optionLabel || opt.label || getOptionLabel(oi, q.attrs?.optionStyle);
                                            correctOpts.push(label);
                                        }
                                    });
                                    if (correctOpts.length > 0) {
                                        ansText = correctOpts.join(', ');
                                    } else {
                                        ansText = 'N/A';
                                    }
                                } else {
                                    ansText = (realQ ? realQ.correctAnswer : q.attrs?.answer) || 'N/A';
                                }

                                return (
                                    <div key={i} className="flex items-start gap-2 border border-slate-200 p-2 rounded-lg break-inside-avoid">
                                        <span className="font-bold text-slate-600 w-6">{i + 1}.</span>
                                        <span className="font-bold text-indigo-700" dangerouslySetInnerHTML={{ __html: ansText }} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {layout === 'highlighted' && (
                        <div className="space-y-6">
                            {documentQuestions.map((q, i) => {
                                const qId = q.attrs?.questionId;
                                const realQ = qId ? realQuestions[qId] : null;
                                const qType = realQ ? realQ.type : (q.attrs?.type || 'MCQ');
                                const options = realQ ? realQ.options : q.attrs?.options;
                                const content = q.attrs?.questionText || q.attrs?.content || '';

                                return (
                                    <div key={i} className="flex flex-col gap-2 break-inside-avoid">
                                        <div className="w-full flex flex-col gap-1">
                                            {q.attrs?.stimulus && (
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
                                const content = q.attrs?.questionText || q.attrs?.content || '';
                                const qType = realQ ? realQ.type : (q.attrs?.type || 'MCQ');
                                const options = realQ ? realQ.options : q.attrs?.options;
                                let answerHtml = '';
                                let explanationHtml = '';

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
                                            {q.attrs?.stimulus && (
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
