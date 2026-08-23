import React, { memo } from 'react';
import { Check } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';

const MCQOptionsEditor = memo(({ options, handleOptionChange, handleCorrectOption, language, isInline }) => {
    return (
        <div className={`bg-white rounded-xl shadow-2xs border border-slate-200/80 ${isInline ? 'p-2.5 mt-2.5' : 'p-6'}`}>
            {!isInline && (
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 text-lg mb-6 pb-3">
                    <Check size={16} className="text-emerald-500" /> Answer Options
                </h2>
            )}

            <div className={`grid ${isInline ? 'grid-cols-2 gap-2' : 'grid-cols-1 md:grid-cols-2 gap-3'}`}>
                {options.map((option, index) => {
                    const isEnglish = language && language.toLowerCase() === 'english';
                    const displayLabel = isEnglish ? String.fromCharCode(65 + index) : (['ক', 'খ', 'গ', 'ঘ'][index] || String.fromCharCode(65 + index));
                    return (
                    <div key={index} className={`flex flex-col gap-1 rounded-xl border transition-all ${isInline ? 'p-2' : 'p-4'} ${option.isCorrect ? 'border-emerald-300 bg-emerald-50/30 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${option.isCorrect ? 'text-emerald-700' : 'text-slate-600'}`}>বিকল্প {displayLabel}</span>
                            <label className="flex items-center gap-1 cursor-pointer bg-white px-1.5 py-0.2 rounded-md border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors">
                                <input type="radio" name="correctOption" checked={option.isCorrect} onChange={() => handleCorrectOption(index)} className="w-3 h-3 text-emerald-500 border-slate-300 focus:ring-emerald-500" />
                                <span className={`text-[9px] font-bold ${option.isCorrect ? 'text-emerald-700' : 'text-slate-400'}`}>Correct</span>
                            </label>
                        </div>
                        <div className="flex-1 mt-0.5">
                            <RichTextEditor theme="bubble" value={option.optionText || ''} onChange={(val) => handleOptionChange(index, 'optionText', val)} placeholder="Option text..." className="bg-white border border-slate-200 rounded-lg text-xs" minimal compact={isInline} height="[&_.ql-editor]:min-h-[32px] [&_.ql-editor]:py-1 [&_.ql-editor]:px-2" />
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
});

export default MCQOptionsEditor;
