import React from 'react';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';

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
            return (
                <div key={key} className="mb-3 last:mb-0">
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                        isAnswerBlock ? 'text-emerald-700' : isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                        {key.replace(/_/g, ' ')}
                    </h4>
                    <div className={isAnswerBlock ? 'text-emerald-900 font-medium' : isDark ? 'text-slate-300' : 'text-slate-700'}>
                        <MarkdownRenderer content={value} />
                    </div>
                </div>
            );
        } else if (Array.isArray(value)) {
            return (
                <div key={key} className="mb-4 last:mb-0">
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                        isAnswerBlock ? 'text-emerald-700' : isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                        {key.replace(/_/g, ' ')}
                    </h4>
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

    entries.forEach(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return;
        const lowerKey = key.toLowerCase();

        if (lowerKey.includes('explanation') || lowerKey.includes('rationale')) {
            explanationFields.push([key, value]);
        } else if (lowerKey.includes('answer') || lowerKey.includes('solution') || lowerKey.includes('correct')) {
            answerFields.push([key, value]);
        } else {
            questionFields.push([key, value]);
        }
    });



    return (
        <div className="dynamic-viewer">
            {q.questionText && !q.questionText.startsWith('Dynamic Question') && (
                <div className="mb-4">
                    <MarkdownRenderer content={q.questionText} className={isDark ? 'prose-invert' : ''} />
                </div>
            )}
            
            <div className="dynamic-fields">
                {questionFields.map(([key, value]) => renderValue(key, value, false))}
            </div>

            {showAnswer && answerFields.length > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg">
                    {answerFields.map(([key, value]) => renderValue(key, value, true))}
                </div>
            )}

            {showExplanation && explanationFields.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                    {explanationFields.map(([key, value]) => renderValue(key, value, false))}
                </div>
            )}
        </div>
    );
};

export default DynamicQuestionViewer;
