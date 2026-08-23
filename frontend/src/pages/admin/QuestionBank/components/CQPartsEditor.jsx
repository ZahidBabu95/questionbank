import React from 'react';
import { Book } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';

const CQPartsEditor = ({ cqParts, setCqParts, language, isInline }) => {
    const [expandedFields, setExpandedFields] = React.useState({});
    
    const toggleField = (index, field) => {
        setExpandedFields(prev => ({
            ...prev,
            [`${index}_${field}`]: !prev[`${index}_${field}`]
        }));
    };

    // Auto-detect structure type for visual labels based on part count/marks
    const getStructureLabel = () => {
        if (cqParts.length === 3) return 'Math/Physics Type (3 Parts)';
        return 'Standard Type (4 Parts)';
    };

    return (
        <div className={`bg-white rounded-xl shadow-2xs border border-slate-200/80 ${isInline ? 'p-2.5 mt-2.5' : 'p-6 mt-6'}`}>
            <div className={`flex items-center justify-between border-b border-slate-100 ${isInline ? 'mb-2 pb-1' : 'mb-6 pb-3'}`}>
                <h2 className={`${isInline ? 'text-[11.5px]' : 'text-lg'} font-black text-slate-800 flex items-center gap-1.5`}>
                    <Book size={14} className="text-indigo-500" /> CQ Sub-Questions
                </h2>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                    {getStructureLabel()}
                </span>
            </div>

            <div className={`${isInline ? 'space-y-2' : 'space-y-4'}`}>
                {cqParts.map((part, index) => {
                    // Decide color scheme based on index
                    const colors = [
                        { color: 'border-blue-200 bg-blue-50/20', iconBg: 'bg-blue-500' },
                        { color: 'border-emerald-200 bg-emerald-50/20', iconBg: 'bg-emerald-500' },
                        { color: 'border-amber-200 bg-amber-50/20', iconBg: 'bg-amber-500' },
                        { color: 'border-rose-200 bg-rose-50/20', iconBg: 'bg-rose-500' }
                    ];
                    const theme = colors[index % colors.length];

                    const isEnglish = language && language.toLowerCase() === 'english';
                    const displayLabel = isEnglish ? String.fromCharCode(97 + index) : (['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'][index] || String.fromCharCode(97 + index));

                    // In inline modal mode, only expand answer/explanation when explicitly requested
                    const showAns = isInline ? !!expandedFields[`${index}_answer`] : true;
                    const showExp = isInline ? !!expandedFields[`${index}_explanation`] : true;

                    return (
                        <div key={index} className={`flex items-start rounded-xl border ${theme.color} transition-all ${isInline ? 'p-2 gap-2 bg-white/80' : 'p-4 gap-3'}`}>
                            <div className="shrink-0 flex flex-col items-center gap-1">
                                <span className={`rounded-lg ${theme.iconBg} text-white flex items-center justify-center font-bold shadow-2xs ${isInline ? 'w-6 h-6 text-xs' : 'w-10 h-10 text-lg'}`}>
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
                                    className="w-8 text-center text-[10.5px] font-black bg-white border border-slate-200 focus:border-indigo-400 p-0.5 rounded outline-none font-mono"
                                    min="1"
                                    step="1"
                                    title="নম্বর"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="space-y-1.5">
                                    <RichTextEditor
                                        value={part.text || ''}
                                        onChange={(val) => {
                                            const pts = [...cqParts];
                                            pts[index].text = val;
                                            setCqParts(pts);
                                        }}
                                        placeholder={`${displayLabel} অংশের প্রশ্ন লিখুন...`}
                                        height={isInline ? "h-auto" : "h-20"}
                                        minimal={true}
                                        compact={isInline}
                                        className="text-xs bg-white shadow-2xs"
                                    />
                                    
                                    {isInline && (
                                        <div className="flex items-center gap-1.5 select-none pt-0.5">
                                            <button
                                                type="button"
                                                onClick={() => toggleField(index, 'answer')}
                                                className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold transition-all border flex items-center gap-1 ${
                                                    showAns
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                                        : part.answer
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100/70'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                                                }`}
                                            >
                                                <span>💡 উত্তর {part.answer ? '(যুক্ত আছে)' : ''}</span>
                                                <span className="text-[8.5px] opacity-70">{showAns ? '▲' : '▼'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleField(index, 'explanation')}
                                                className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold transition-all border flex items-center gap-1 ${
                                                    showExp
                                                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                                                        : part.explanation
                                                            ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100/70'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                                                }`}
                                            >
                                                <span>📘 ব্যাখ্যা {part.explanation ? '(যুক্ত আছে)' : ''}</span>
                                                <span className="text-[8.5px] opacity-70">{showExp ? '▲' : '▼'}</span>
                                            </button>
                                        </div>
                                    )}

                                    {showAns && (
                                        <div className="bg-emerald-50/30 p-2 rounded-lg border border-emerald-200/70 shadow-2xs animate-in fade-in duration-150">
                                            <span className="block text-[9px] font-bold text-emerald-700 uppercase tracking-wide mb-0.5">উত্তর (ঐচ্ছিক)</span>
                                            <RichTextEditor
                                                value={part.answer || ''}
                                                onChange={(val) => {
                                                    const pts = [...cqParts];
                                                    pts[index].answer = val;
                                                    setCqParts(pts);
                                                }}
                                                placeholder={`${displayLabel} অংশের উত্তর লিখুন (ঐচ্ছিক)...`}
                                                height={isInline ? "h-10" : "h-16"}
                                                minimal={true}
                                                compact={isInline}
                                                className="text-xs bg-white"
                                            />
                                        </div>
                                    )}

                                    {showExp && (
                                        <div className="bg-amber-50/30 p-2 rounded-lg border border-amber-200/70 shadow-2xs animate-in fade-in duration-150">
                                            <span className="block text-[9px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">ব্যাখ্যা (ঐচ্ছিক)</span>
                                            <RichTextEditor
                                                value={part.explanation || ''}
                                                onChange={(val) => {
                                                    const pts = [...cqParts];
                                                    pts[index].explanation = val;
                                                    setCqParts(pts);
                                                }}
                                                placeholder={`${displayLabel} অংশের ব্যাখ্যা লিখুন (ঐচ্ছিক)...`}
                                                height={isInline ? "h-10" : "h-16"}
                                                minimal={true}
                                                compact={isInline}
                                                className="text-xs bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => {
                                    const pts = cqParts.filter((_, i) => i !== index);
                                    setCqParts(pts);
                                }}
                                className="mt-0.5 shrink-0 p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Remove Part"
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>
            
            <div className={`flex justify-end ${isInline ? 'mt-3' : 'mt-5'}`}>
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
