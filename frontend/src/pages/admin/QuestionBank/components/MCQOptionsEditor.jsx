import React, { memo } from 'react';
import { Check } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';

const MCQOptionsEditor = memo(({ options, handleOptionChange, handleCorrectOption }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-6 border-b pb-3 border-slate-100">
                <Check size={18} className="text-emerald-500" /> Answer Options
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((option, index) => (
                    <div key={index} className={`flex flex-col gap-2 p-4 rounded-xl border-2 transition-all ${option.isCorrect ? 'border-emerald-400 bg-emerald-50/50 shadow-sm shadow-emerald-100' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'}`}>
                        <div className="flex items-center justify-between border-b border-transparent pb-1">
                            <span className={`text-xs font-bold uppercase tracking-widest ${option.isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}>Option {option.optionLabel}</span>
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                                <input type="radio" name="correctOption" checked={option.isCorrect} onChange={() => handleCorrectOption(index)} className="w-4 h-4 text-emerald-500 border-slate-300 focus:ring-emerald-500" />
                                <span className={`text-xs font-bold ${option.isCorrect ? 'text-emerald-600' : 'text-slate-600'}`}>Correct Key</span>
                            </label>
                        </div>
                        <div className="flex-1 mt-2">
                            <RichTextEditor theme="bubble" value={option.optionText || ''} onChange={(val) => handleOptionChange(index, 'optionText', val)} placeholder="Option text..." className="bg-white border border-slate-200 rounded-lg" minimal height="[&_.ql-editor]:min-h-[40px] [&_.ql-editor]:py-2 [&_.ql-editor]:px-3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default MCQOptionsEditor;
