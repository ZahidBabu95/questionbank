import React, { memo } from 'react';
import { Check } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';

const MCQOptionsEditor = memo(({ options, handleOptionChange, handleCorrectOption, language, isInline }) => {
    return (
        <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${isInline ? 'p-3' : 'p-6'}`}>
            <h2 className={`font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 ${isInline ? 'text-xs mb-3 pb-1.5' : 'text-lg mb-6 pb-3'}`}>
                <Check size={16} className="text-emerald-500" /> Answer Options
            </h2>

            <div className={`grid gap-3 ${isInline ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                {options.map((option, index) => {
                    const isEnglish = language && language.toLowerCase() === 'english';
                    const displayLabel = isEnglish ? String.fromCharCode(65 + index) : (['ক', 'খ', 'গ', 'ঘ'][index] || String.fromCharCode(65 + index));
                    return (
                    <div key={index} className={`flex flex-col gap-1.5 rounded-xl border-2 transition-all ${isInline ? 'p-2' : 'p-4'} ${option.isCorrect ? 'border-emerald-400 bg-emerald-50/20 shadow-sm shadow-emerald-100' : 'border-slate-200 bg-white hover:border-slate-350 shadow-sm'}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-black uppercase tracking-wider ${option.isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>বিকল্প {displayLabel}</span>
                            <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                                <input type="radio" name="correctOption" checked={option.isCorrect} onChange={() => handleCorrectOption(index)} className="w-3 h-3 text-emerald-500 border-slate-300 focus:ring-emerald-500" />
                                <span className={`text-[9px] font-bold ${option.isCorrect ? 'text-emerald-600' : 'text-slate-500'}`}>Correct</span>
                            </label>
                        </div>
                        <div className="flex-1 mt-1">
                            <RichTextEditor theme="bubble" value={option.optionText || ''} onChange={(val) => handleOptionChange(index, 'optionText', val)} placeholder="Option text..." className="bg-white border border-slate-200 rounded-lg text-xs" minimal compact={isInline} height="[&_.ql-editor]:min-h-[36px] [&_.ql-editor]:py-1.5 [&_.ql-editor]:px-2.5" />
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
});

export default MCQOptionsEditor;
