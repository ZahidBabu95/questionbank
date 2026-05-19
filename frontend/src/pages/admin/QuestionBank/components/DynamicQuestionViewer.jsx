import React from 'react';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';

const DynamicQuestionViewer = ({ q, mode = 'list', showAnswer = false, isDark = false }) => {
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
    
    const renderValue = (key, value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;

        if (typeof value === 'string') {
            return (
                <div key={key} className="mb-3">
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {key.replace(/_/g, ' ')}
                    </h4>
                    <div className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                        <MarkdownRenderer content={value} />
                    </div>
                </div>
            );
        } else if (Array.isArray(value)) {
            return (
                <div key={key} className="mb-4">
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {key.replace(/_/g, ' ')}
                    </h4>
                    <div className="space-y-2">
                        {value.map((item, idx) => (
                            <div key={idx} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                                {typeof item === 'object' ? (
                                    <div className="flex flex-wrap gap-4">
                                        {Object.entries(item).map(([k, v]) => (
                                            <div key={k} className="flex-1 min-w-[120px]">
                                                <span className={`text-[10px] font-bold block mb-1 uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {k.replace(/_/g, ' ')}
                                                </span>
                                                <div className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                                    <MarkdownRenderer content={v || '-'} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={isDark ? 'text-slate-300' : 'text-slate-700'}>
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

    return (
        <div className="dynamic-viewer">
            {mode === 'list' && (
                <div className="mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isDark ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'}`}>
                        Dynamic: {q.type}
                    </span>
                </div>
            )}
            
            {q.questionText && !q.questionText.startsWith('Dynamic Question') && (
                <div className="mb-4">
                    <MarkdownRenderer content={q.questionText} className={isDark ? 'prose-invert' : ''} />
                </div>
            )}
            
            <div className="dynamic-fields">
                {Object.entries(data).map(([key, value]) => renderValue(key, value))}
            </div>
        </div>
    );
};

export default DynamicQuestionViewer;
