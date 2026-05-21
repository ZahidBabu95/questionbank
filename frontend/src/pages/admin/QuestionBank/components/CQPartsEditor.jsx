import React from 'react';
import { Book } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';

const CQPartsEditor = ({ cqParts, setCqParts, language }) => {
    
    // Auto-detect structure type for visual labels based on part count/marks
    const getStructureLabel = () => {
        if (cqParts.length === 3) return 'Math/Physics Type (3 Parts)';
        return 'Standard Type (4 Parts)';
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6">
            <div className="flex items-center justify-between mb-6 border-b pb-3 border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Book size={18} className="text-indigo-500" /> CQ Sub-Questions
                </h2>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                    {getStructureLabel()}
                </span>
            </div>

            <div className="space-y-4">
                {cqParts.map((part, index) => {
                    // Decide color scheme based on index
                    const colors = [
                        { color: 'border-blue-300 bg-blue-50', iconBg: 'bg-blue-500' },
                        { color: 'border-emerald-300 bg-emerald-50', iconBg: 'bg-emerald-500' },
                        { color: 'border-amber-300 bg-amber-50', iconBg: 'bg-amber-500' },
                        { color: 'border-rose-300 bg-rose-50', iconBg: 'bg-rose-500' }
                    ];
                    const theme = colors[index % colors.length];

                    const isEnglish = language && language.toLowerCase() === 'english';
                    const displayLabel = isEnglish ? String.fromCharCode(97 + index) : (['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'][index] || String.fromCharCode(97 + index));

                    return (
                        <div key={index} className={`flex items-start gap-3 p-4 rounded-xl border-2 ${theme.color} transition-all`}>
                            <div className="shrink-0 flex flex-col items-center gap-1">
                                <span className={`w-10 h-10 rounded-xl ${theme.iconBg} text-white flex items-center justify-center font-bold text-lg shadow-sm`}>
                                    {displayLabel}
                                </span>
                                <input 
                                    type="number"
                                    value={part.marks}
                                    onChange={(e) => {
                                        const pts = [...cqParts];
                                        pts[index].marks = parseFloat(e.target.value) || 0;
                                        setCqParts(pts);
                                    }}
                                    className="w-12 text-center text-xs font-black bg-white border border-white/60 focus:border-slate-300 p-1 rounded-md outline-none"
                                    min="1"
                                    step="1"
                                    title="Marks for this part"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="space-y-3">
                                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">প্রশ্ন টেক্সট</span>
                                        <RichTextEditor
                                            value={part.text || ''}
                                            onChange={(val) => {
                                                const pts = [...cqParts];
                                                pts[index].text = val;
                                                setCqParts(pts);
                                            }}
                                            placeholder={`${displayLabel} অংশের প্রশ্ন লিখুন...`}
                                            height="h-20"
                                            minimal={true}
                                            className="text-sm bg-white"
                                        />
                                    </div>
                                    <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100 shadow-sm">
                                        <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">উত্তর (ঐচ্ছিক)</span>
                                        <RichTextEditor
                                            value={part.answer || ''}
                                            onChange={(val) => {
                                                const pts = [...cqParts];
                                                pts[index].answer = val;
                                                setCqParts(pts);
                                            }}
                                            placeholder={`${displayLabel} অংশের উত্তর লিখুন (ঐচ্ছিক)...`}
                                            height="h-16"
                                            minimal={true}
                                            className="text-sm bg-white"
                                        />
                                    </div>
                                    <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-100 shadow-sm">
                                        <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">ব্যাখ্যা (ঐচ্ছিক)</span>
                                        <RichTextEditor
                                            value={part.explanation || ''}
                                            onChange={(val) => {
                                                const pts = [...cqParts];
                                                pts[index].explanation = val;
                                                setCqParts(pts);
                                            }}
                                            placeholder={`${displayLabel} অংশের ব্যাখ্যা লিখুন (ঐচ্ছিক)...`}
                                            height="h-16"
                                            minimal={true}
                                            className="text-sm bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => {
                                    const pts = cqParts.filter((_, i) => i !== index);
                                    setCqParts(pts);
                                }}
                                className="mt-2 shrink-0 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title="Remove Part"
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-5 flex justify-end">
                <button 
                    type="button"
                    onClick={() => {
                        const isEng = language && language.toLowerCase() === 'english';
                        const nextLabels = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];
                        const newLabel = isEng ? String.fromCharCode(97 + cqParts.length) : (nextLabels[cqParts.length] || String.fromCharCode(97 + cqParts.length));
                        setCqParts([...cqParts, { label: newLabel, text: '', marks: 1 }]);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-all border border-indigo-100"
                >
                    + Add New Part
                </button>
            </div>
        </div>
    );
};

export default CQPartsEditor;
