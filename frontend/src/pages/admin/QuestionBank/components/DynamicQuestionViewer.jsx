import React from 'react';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';

const cleanPlaceholderText = (html) => {
    if (!html) return '';
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Remove empty stem if it contains placeholder text
        const stem = doc.querySelector('.cq-stem');
        if (stem) {
            const stemText = (stem.textContent || stem.innerText || '').trim().toLowerCase();
            if (stemText.startsWith('generated question') || 
                stemText.startsWith('dynamic question') || 
                stemText.startsWith('ডায়নামিক প্রশ্ন') || 
                stemText.startsWith('ডায়নামিক প্রশ্ন') || 
                stemText === '') {
                stem.remove();
            }
        }

        const walk = (node) => {
            if (node.nodeType === 3) { // TEXT_NODE
                let txt = node.nodeValue;
                txt = txt
                    .replace(/generated\s+question/gi, '')
                    .replace(/dynamic\s+question/gi, '')
                    .replace(/ডায়নামিক\s+প্রশ্ন/g, '')
                    .replace(/ডায়নামিক\s+প্রশ্ন/g, '');
                
                // Strip leftover numbering/punctuation at the beginning of the text node
                txt = txt.replace(/^\s*[০-৯\d\s\.\,\-\:\)\(\[\]\{\}\/\\।]+/, '');
                node.nodeValue = txt;
            } else {
                for (let child of node.childNodes) {
                    walk(child);
                }
            }
        };
        
        walk(doc.body);
        
        // Now check if the remaining body has any actual text content
        const bodyText = (doc.body.textContent || doc.body.innerText || '').trim();
        const onlyPunct = /^[০-৯\d\s\.\,\-\:\)\(\[\]\{\}\/\\।]*$/;
        if (onlyPunct.test(bodyText)) {
            return '';
        }
        
        return doc.body.innerHTML;
    } catch (e) {
        console.error("Error in cleanPlaceholderText:", e);
        let clean = html
            .replace(/generated\s+question/gi, '')
            .replace(/dynamic\s+question/gi, '')
            .replace(/ডায়নামিক\s+প্রশ্ন/g, '')
            .replace(/ডায়নামিক\s+প্রশ্ন/g, '');
        
        clean = clean.replace(/^\s*[০-৯\d\s\.\,\-\:\)\(\[\]\{\}\/\\।]+/, '');
        const plainText = clean.replace(/<[^>]*>?/gm, '').trim();
        if (/^[০-৯\d\s\.\,\-\:\)\(\[\]\{\}\/\\।]*$/.test(plainText)) {
            return '';
        }
        return clean;
    }
};

const DynamicQuestionViewer = ({ q, mode = 'list', showAnswer = false, showExplanation = false, isDark = false }) => {
    if (!q || !q.dynamicData) return null;
    
    let data = q.dynamicData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse dynamicData:', e);
            return null;
        }
    }
    
    const renderValue = (key, value, isAnswerBlock = false) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;

        if (typeof value === 'string') {
            const cleanVal = value.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
            if (cleanVal.startsWith('generated question') || cleanVal.startsWith('dynamic question') || cleanVal.startsWith('ডায়নামিক প্রশ্ন') || cleanVal.startsWith('ডায়নামিক প্রশ্ন') || cleanVal === '') {
                return null;
            }
        }

        const lowerKey = key.toLowerCase();
        const hideLabel = lowerKey === 'text' || lowerKey === 'question' || lowerKey === 'questiontext' || lowerKey === 'question_text' || lowerKey === 'content';

        if (typeof value === 'string') {
            return (
                <div key={key} className="mb-3 last:mb-0">
                    {!hideLabel && (
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                            isAnswerBlock ? 'text-emerald-700' : isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                            {key.replace(/_/g, ' ')}
                        </h4>
                    )}
                    <div className={isAnswerBlock ? 'text-emerald-900 font-medium' : isDark ? 'text-slate-300' : 'text-slate-700'}>
                        <MarkdownRenderer content={value} />
                    </div>
                </div>
            );
        } else if (Array.isArray(value)) {
            return (
                <div key={key} className="mb-4 last:mb-0">
                    {!hideLabel && (
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                            isAnswerBlock ? 'text-emerald-700' : isDark ? 'text-slate-500' : 'text-slate-400'
                        }`}>
                            {key.replace(/_/g, ' ')}
                        </h4>
                    )}
                    <div className="space-y-2">
                        {value.map((item, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${
                                isAnswerBlock ? 'bg-emerald-100/50 border-emerald-200' : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'
                            }`}>
                                {typeof item === 'object' ? (
                                    <div className="flex flex-wrap gap-4">
                                        {Object.entries(item).map(([k, v]) => (
                                            <div key={k} className="flex-1 min-w-[120px]">
                                                <span className={`text-[10px] font-bold block mb-1 uppercase ${
                                                    isAnswerBlock ? 'text-emerald-600' : isDark ? 'text-slate-500' : 'text-slate-400'
                                                }`}>
                                                    {k.replace(/_/g, ' ')}
                                                </span>
                                                <div className={isAnswerBlock ? 'text-emerald-900' : isDark ? 'text-slate-300' : 'text-slate-700'}>
                                                    <MarkdownRenderer content={v || '-'} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={isAnswerBlock ? 'text-emerald-900' : isDark ? 'text-slate-300' : 'text-slate-700'}>
                                        <MarkdownRenderer content={item} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    const entries = Object.entries(data);
    const questionFields = [];
    const answerFields = [];
    const explanationFields = [];

    const isDescriptiveCQ = q.type === 'CQ_DESCRIPTIVE';
    const hideSubParts = data.hideSubPartsTable === true || data.hide_sub_parts === true || isDescriptiveCQ;

    const metadataKeys = [
        'questiontype', 'question_type', 'type',
        'sources', 'source',
        'stimulus',
        'difficulty',
        'marks',
        'language',
        'bloomlevel', 'bloom_level'
    ];

    const hasSubPartsAnswers = data.sub_parts && Array.isArray(data.sub_parts) && data.sub_parts.some(part => part.answer);
    const hasSubPartsExplanations = data.sub_parts && Array.isArray(data.sub_parts) && data.sub_parts.some(part => part.explanation);

    entries.forEach(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return;
        const lowerKey = key.toLowerCase();

        if (metadataKeys.includes(lowerKey)) {
            return;
        }

        if (lowerKey === 'sub_parts') {
            return;
        }

        if (lowerKey.includes('explanation') || lowerKey.includes('rationale')) {
            if (!hasSubPartsExplanations) {
                explanationFields.push([key, value]);
            }
        } else if (lowerKey.includes('answer') || lowerKey.includes('solution') || lowerKey.includes('correct')) {
            if (!hasSubPartsAnswers) {
                answerFields.push([key, value]);
            }
        } else {
            questionFields.push([key, value]);
        }
    });

    const getCleanQuestionText = (htmlText) => {
        return cleanPlaceholderText(htmlText);
    };

    const cleanedQuestionText = getCleanQuestionText(q.questionText);

    return (
        <div className="dynamic-viewer">
            {cleanedQuestionText && (
                <div className="mb-4">
                    <MarkdownRenderer content={cleanedQuestionText} className={isDark ? 'prose-invert' : ''} />
                </div>
            )}
            
            <div className="dynamic-fields">
                {questionFields.map(([key, value]) => renderValue(key, value, false))}
            </div>

            {data.sub_parts && Array.isArray(data.sub_parts) && data.sub_parts.length > 0 && !hideSubParts && (
                <div className={`mt-3 pl-2 space-y-2 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                    {data.sub_parts.map((part, pIdx) => {
                        const partLabel = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                        const partMarks = part.marks !== undefined && part.marks !== null ? part.marks : (pIdx + 1);
                        return (
                            <div key={pIdx} className="flex justify-between items-start gap-4">
                                <div className="flex gap-2">
                                    <span className="font-bold">({partLabel})</span>
                                    <div className="font-normal inline">
                                        <MarkdownRenderer content={part.questionText || ''} />
                                    </div>
                                </div>
                                {partMarks && (
                                    <span className={`text-xs whitespace-nowrap select-none shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        ({partMarks})
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showAnswer && (
                <>
                    {answerFields.length > 0 && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg">
                            {answerFields.map(([key, value]) => renderValue(key, value, true))}
                        </div>
                    )}
                    {data.sub_parts && Array.isArray(data.sub_parts) && data.sub_parts.length > 0 && hasSubPartsAnswers && (
                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Sub Parts Answers</h4>
                            {data.sub_parts.map((part, pIdx) => {
                                const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                return (
                                    <div key={pIdx} className="flex flex-col gap-1 border-b border-emerald-100 last:border-0 pb-2 last:pb-0">
                                        {part.answer ? (
                                            <div className="flex items-start gap-1.5 text-xs text-slate-800">
                                                <span className="text-emerald-800 font-bold shrink-0">({label}) উত্তর:</span>
                                                <div className="inline text-emerald-900 font-normal"><MarkdownRenderer content={part.answer} /></div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-1.5 text-xs text-slate-400">
                                                <span>({label}) N/A</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {showExplanation && (
                <>
                    {explanationFields.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                            {explanationFields.map(([key, value]) => renderValue(key, value, false))}
                        </div>
                    )}
                    {data.sub_parts && Array.isArray(data.sub_parts) && data.sub_parts.length > 0 && hasSubPartsExplanations && (
                        <div className="mt-4 p-3 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3">
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Sub Parts Explanations</h4>
                            {data.sub_parts.map((part, pIdx) => {
                                const label = part.part_label || part.label || ['ক', 'খ', 'গ', 'ঘ'][pIdx];
                                return part.explanation ? (
                                    <div key={pIdx} className="flex flex-col gap-1 border-b border-blue-100 last:border-0 pb-2 last:pb-0">
                                        <div className="flex items-start gap-1.5 text-xs text-slate-800">
                                            <span className="text-blue-800 font-bold shrink-0">({label}) ব্যাখ্যা:</span>
                                            <div className="inline text-slate-700 font-normal"><MarkdownRenderer content={part.explanation} /></div>
                                        </div>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DynamicQuestionViewer;
