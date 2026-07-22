import React from 'react';
import { HelpCircle, CheckCircle, Info, BookOpen } from 'lucide-react';

const DynamicQuestionPreview = ({ type, data }) => {
    if (!data) return null;

    const renderRichText = (html) => {
        if (!html) return null;
        return <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: html }} />;
    };

    // --- MCQ Render ---
    if (type === 'MCQ' || type === 'MULTIPLE_CHOICE') {
        const options = Array.isArray(data.options) ? data.options : [];
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm font-sans">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wider">MCQ Preview</span>
                    <span className="text-xs font-mono text-slate-400">Type: {data.mcqType || 'SIMPLE'}</span>
                </div>

                {data.stimulus && (
                    <div className="mb-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm italic text-slate-700 relative">
                        <div className="absolute -top-2 -left-2 bg-indigo-500 text-white rounded-lg p-1 text-[9px] font-black uppercase">উদ্দীপক</div>
                        {renderRichText(data.stimulus)}
                    </div>
                )}

                <div className="text-sm font-bold text-slate-800 mb-4 flex gap-2">
                    <span className="text-indigo-600">Q.</span>
                    {renderRichText(data.questionText) || <span className="text-slate-400 italic">প্রশ্ন টাইপ করুন...</span>}
                </div>

                {options.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {options.map((opt, idx) => {
                            const labels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
                            const isCorrect = opt.isCorrect === 'true' || opt.isCorrect === true;
                            return (
                                <div 
                                    key={idx} 
                                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                        isCorrect 
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm' 
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                    }`}
                                >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                        isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {labels[idx] || (idx + 1)}
                                    </span>
                                    <span className="text-xs font-medium">{opt.text || <span className="text-slate-300 italic">বিকল্প খালি</span>}</span>
                                    {isCorrect && <CheckCircle size={14} className="text-emerald-600 ml-auto shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic bg-white border border-slate-100 rounded-xl mb-4">
                        কোনো অপশন যোগ করা হয়নি।
                    </div>
                )}

                {data.explanation && (
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-blue-800 flex gap-2">
                        <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                        <div>
                            <span className="font-bold">ব্যাখ্যা:</span> {data.explanation}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- CQ Render ---
    if (type === 'CQ' || type === 'CREATIVE') {
        const subQuestions = Array.isArray(data.subQuestions) ? data.subQuestions : [];
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm font-sans">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <span className="text-xs font-bold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full uppercase tracking-wider">CQ Preview</span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded">মান: ১০</span>
                </div>

                <div className="mb-5 p-4 bg-white border border-slate-150 rounded-xl shadow-sm text-slate-700 relative">
                    <div className="absolute -top-2 -left-2 bg-violet-500 text-white rounded-lg px-2 py-0.5 text-[9px] font-black uppercase shadow-sm shadow-violet-200">উদ্দীপক (Stem)</div>
                    {renderRichText(data.stimulus) || <div className="text-slate-300 italic text-xs py-4 text-center">উদ্দীপক টাইপ করুন...</div>}
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">প্রশ্নসমূহ:</h3>
                {subQuestions.length > 0 ? (
                    <div className="space-y-3">
                        {subQuestions.map((sq, idx) => (
                            <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-start gap-3">
                                <span className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                                    {sq.label || String.fromCharCode(2438 + idx)}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-800">{sq.text || <span className="text-slate-300 italic">প্রশ্ন খালি</span>}</p>
                                </div>
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md shrink-0">
                                    মান: {sq.marks || '১'}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic bg-white border border-slate-100 rounded-xl">
                        উপ-প্রশ্ন যোগ করা হয়নি।
                    </div>
                )}
            </div>
        );
    }

    // --- SHORT Render ---
    if (type === 'SHORT' || type === 'SHORT_ANSWER') {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm font-sans">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-wider">Short Question Preview</span>
                </div>

                {data.stimulus && (
                    <div className="mb-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm italic text-slate-700 relative">
                        <div className="absolute -top-2 -left-2 bg-amber-500 text-white rounded-lg p-1 text-[9px] font-black uppercase">উদ্দীপক</div>
                        {renderRichText(data.stimulus)}
                    </div>
                )}

                <div className="text-sm font-bold text-slate-800 mb-4 flex gap-2">
                    <span className="text-amber-600">Q.</span>
                    {renderRichText(data.questionText) || <span className="text-slate-400 italic">প্রশ্ন টাইপ করুন...</span>}
                </div>

                {data.correctAnswer && (
                    <div className="mb-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800">
                        <span className="font-bold block mb-1">সঠিক উত্তর:</span>
                        {data.correctAnswer}
                    </div>
                )}

                {data.explanation && (
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-blue-800 flex gap-2">
                        <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                        <div>
                            <span className="font-bold">ব্যাখ্যা/উত্তর সংকেত:</span> {data.explanation}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // --- Custom Dynamic Schema Renderer ---
    const keys = Object.keys(data);
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <span className="text-xs font-bold bg-slate-600 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">{type} Preview</span>
                <span className="text-[10px] text-slate-400 font-mono">Custom Schema</span>
            </div>

            <div className="space-y-4">
                {keys.map(key => {
                    const value = data[key];
                    if (value === undefined || value === null || value === '') return null;

                    const cleanKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                    if (typeof value === 'object' && Array.isArray(value)) {
                        return (
                            <div key={key} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">{cleanKey}</label>
                                <div className="space-y-2">
                                    {value.map((item, idx) => (
                                        <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                                            {typeof item === 'object' ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {Object.keys(item).map(subKey => (
                                                        <div key={subKey}>
                                                            <span className="font-bold text-slate-500 mr-1">{subKey}:</span>
                                                            <span className="text-slate-800 font-semibold">{String(item[subKey])}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-slate-800 font-semibold">{String(item)}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={key} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{cleanKey}</label>
                            {typeof value === 'string' && value.includes('<') && value.includes('>') ? (
                                renderRichText(value)
                            ) : (
                                <p className="text-xs font-semibold text-slate-800 leading-relaxed">{String(value)}</p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DynamicQuestionPreview;
