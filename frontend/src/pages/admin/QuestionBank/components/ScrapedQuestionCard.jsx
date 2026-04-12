import React, { memo } from 'react';
import { Eye, Pencil, Trash2, Check, Bot, Crop, X } from 'lucide-react';
import RichTextEditor from '../../../../components/RichTextEditor';
import MarkdownRenderer from '../../../../components/MarkdownRenderer';


const ScrapedQuestionCard = memo(({
    q,
    idx,
    previewQuestion,
    setPreviewQuestion,
    updateQuestion,
    removeQuestion,
    activeSourcePage,
    setActiveSourcePage,
    setCropperTarget
}) => {
    const isEditing = previewQuestion?.id === q.id && previewQuestion?._editing;
    const isPreview = previewQuestion?.id === q.id && !previewQuestion?._editing;

    // Is this card's source page the currently active one? (Default to true for page 1 if not set)
    const cardPage = q.sourcePage || 1;
    const isActivePage = activeSourcePage === cardPage;

    return (
        <div key={q.id} 
             onClick={(e) => { 
                 if (setActiveSourcePage) setActiveSourcePage(cardPage); 
                 if (!isEditing && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select') && !e.target.closest('.ql-editor')) {
                     // Toggle preview
                     if (isPreview) setPreviewQuestion(null);
                     else setPreviewQuestion(q);
                 }
             }}
             className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-md ${
                 isEditing ? 'border-blue-400 ring-4 ring-blue-50 shadow-xl shadow-blue-900/5' : 
                 isActivePage ? 'border-violet-400 ring-2 ring-violet-100 shadow-lg shadow-violet-900/5 transform scale-[1.01]' : 
                 'border-slate-200 hover:shadow-md hover:border-violet-200'
             }`}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">
                                {idx + 1}
                            </span>
                            {!isEditing ? (
                                <>
                                    <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 font-bold border border-blue-100/50 shadow-sm backdrop-blur-sm">{q.bloomLevel}</span>
                                    <span className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 font-bold border border-amber-100/50 shadow-sm backdrop-blur-sm">{q.difficulty}</span>
                                    {q.sourcePage && (
                                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-bold border border-emerald-100/50 shadow-sm flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                            পৃষ্ঠা {q.sourcePage}
                                        </span>
                                    )}
                                    {q.source && (
                                        <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 font-medium border border-slate-200/50 shadow-sm truncate max-w-[200px]" title={q.source}>
                                            📚 {q.source}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <select value={q.bloomLevel} onChange={e => updateQuestion(q.id, 'bloomLevel', e.target.value)}
                                        className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 font-bold border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-sm">
                                        <option value="KNOWLEDGE">KNOWLEDGE</option>
                                        <option value="COMPREHENSION">COMPREHENSION</option>
                                        <option value="APPLICATION">APPLICATION</option>
                                        <option value="HIGHER_ORDER">HIGHER_ORDER</option>
                                    </select>
                                    <select value={q.difficulty} onChange={e => updateQuestion(q.id, 'difficulty', e.target.value)}
                                        className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold border border-amber-200 outline-none">
                                        <option value="EASY">EASY</option>
                                        <option value="MEDIUM">MEDIUM</option>
                                        <option value="HARD">HARD</option>
                                    </select>
                                </>
                            )}
                        </div>
                        {isEditing ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                    {/* Edit Stimulus */}
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-1">উদ্দীপক (ঐচ্ছিক)</label>
                                        <RichTextEditor 
                                            value={q.stimulus || ''} 
                                            onChange={val => updateQuestion(q.id, 'stimulus', val)}
                                            placeholder="উদ্দীপক লিখুন..."
                                            height="min-h-[100px]"
                                            className="border border-slate-200 rounded-lg overflow-hidden bg-white mt-1" 
                                        />
                                    </div>
                                    
                                    {/* Edit Image */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">প্রশ্ন/উদ্দীপকের ছবি</label>
                                            <button onClick={() => setCropperTarget && setCropperTarget({ questionId: q.id })}
                                                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm border border-emerald-200">
                                                <Crop size={11} /> {q.imageUrl ? 'ছবি পরিবর্তন/ক্রপ করুন' : 'ছবি যোগ/ক্রপ করুন'}
                                            </button>
                                        </div>
                                        {q.imageUrl && (
                                            <div className="relative inline-block mt-2 group">
                                                <img src={q.imageUrl} alt="preview" className="max-h-32 rounded border border-slate-200 shadow-sm" />
                                                <button onClick={() => updateQuestion(q.id, 'imageUrl', '')}
                                                    className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-colors" title="ছবি মুছুন">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <label className="text-[10px] font-bold text-blue-500 uppercase mb-1 block">মূল প্রশ্ন</label>
                                <RichTextEditor 
                                    value={q.questionText}
                                    onChange={val => updateQuestion(q.id, 'questionText', val)}
                                    placeholder="মূল প্রশ্ন লিখুন..."
                                    height="min-h-[120px]"
                                    className="border border-blue-300 rounded-xl overflow-hidden bg-white shadow-sm mt-1 mb-2" 
                                />
                                
                                {q.mcqType === 'MULTIPLE_COMPLETION' && q.statements && (
                                    <div className="space-y-1 pl-4 border-l-2 border-indigo-200">
                                        {q.statements.map((stmt, sIdx) => (
                                            <input key={sIdx} type="text" value={stmt}
                                                onChange={e => {
                                                    const newStmts = [...q.statements];
                                                    newStmts[sIdx] = e.target.value;
                                                    updateQuestion(q.id, 'statements', newStmts);
                                                }}
                                                className="w-full text-sm p-1.5 border border-indigo-100 rounded outline-none focus:border-indigo-300 bg-indigo-50/30" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Stimulus / উদ্দীপক OR dedicated imageUrl */}
                                {(q.stimulus || q.imageUrl) && (
                                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                        {q.stimulus && (
                                            <>
                                                <span className="font-bold text-amber-700 block mb-1">উদ্দীপক:</span>
                                                <div className="leading-relaxed"><MarkdownRenderer content={q.stimulus || ''} /></div>
                                            </>
                                        )}
                                        {/* Show imageUrl if not already embedded in stimulus */}
                                        {q.imageUrl && !q.stimulus?.includes(q.imageUrl) && (
                                            <div className="mt-1">
                                                <img
                                                    src={q.imageUrl}
                                                    alt="প্রশ্নের ছবি"
                                                    className="max-w-full max-h-64 object-contain rounded border border-amber-200"
                                                    onError={(e) => { e.target.style.display='none'; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="text-sm text-slate-700 font-medium leading-relaxed">
                                    <MarkdownRenderer content={q.questionText || ''} />
                                </div>
                                {q.mcqType === 'MULTIPLE_COMPLETION' && q.statements && q.statements.length > 0 && (
                                    <div className="pl-4 border-l-2 border-indigo-200 space-y-1">
                                        {q.statements.map((stmt, sIdx) => (
                                            <div key={sIdx} className="text-sm text-slate-600"><MarkdownRenderer content={stmt || ''} /></div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                        {isEditing ? (
                            <button onClick={() => setPreviewQuestion(null)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-all shadow-sm">
                                <Check size={11} /> সংরক্ষণ
                            </button>
                        ) : (
                            <>
                                <button onClick={() => setPreviewQuestion(previewQuestion?.id === q.id ? null : q)}
                                    className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center transition-colors" title="প্রিভিউ">
                                    <Eye size={13} />
                                </button>
                                <button onClick={() => setPreviewQuestion({ ...q, _editing: true })}
                                    className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500 flex items-center justify-center transition-colors" title="সম্পাদনা">
                                    <Pencil size={13} />
                                </button>
                                <button onClick={() => removeQuestion(q.id)}
                                    className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center transition-colors" title="মুছুন">
                                    <Trash2 size={13} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ─── EDIT MODE ─── */}
                {isEditing && (
                    <div className="mt-4 pt-4 border-t border-blue-100 space-y-4">
                        {/* Options or Correct Answer */}
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200">
                        {(q.options && q.options.length > 0) ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">মাল্টিপল চয়েস অপশনসমূহ (সঠিক উত্তরটি সিলেক্ট করুন)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(q.options || []).map((opt, oi) => (
                                        <div key={oi}
                                            className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${opt.isCorrect === true || opt.isCorrect === 'true' || opt.correct === true || opt.correct === 'true'
                                                ? 'bg-emerald-50 border-emerald-400 shadow-sm shadow-emerald-100' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                                            <button onClick={() => {
                                                const newOpts = q.options.map((o, i) => ({ ...o, isCorrect: i === oi, correct: i === oi }));
                                                updateQuestion(q.id, 'options', newOpts);
                                            }}
                                                className={`w-6 h-6 mt-0.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 cursor-pointer transition-all ${opt.isCorrect === true || opt.isCorrect === 'true' || opt.correct === true || opt.correct === 'true' ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200 ring-offset-1' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                                {opt.isCorrect === true || opt.isCorrect === 'true' || opt.correct === true || opt.correct === 'true' ? <Check size={12} /> : (opt.label || opt.optionLabel || String.fromCharCode(2534+oi))}
                                            </button>
                                            <div className="flex-1 w-full min-w-0 max-w-full -mt-1 relative pr-6">
                                                <RichTextEditor 
                                                    value={opt.text || opt.optionText || ''}
                                                    onChange={val => {
                                                        const newOpts = [...q.options];
                                                        newOpts[oi] = { ...newOpts[oi], text: val, optionText: val };
                                                        updateQuestion(q.id, 'options', newOpts);
                                                    }}
                                                    placeholder="অপশন লিখুন..."
                                                    theme="bubble"
                                                    minimal={true}
                                                    showEquation={false}
                                                    height="min-h-[30px]"
                                                    className="w-full" 
                                                />
                                                <button onClick={() => setCropperTarget && setCropperTarget({ questionId: q.id, optionIndex: oi })}
                                                    className={`absolute top-1 -right-1 p-1 rounded-md transition-colors ${opt.imageUrl ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`} title={opt.imageUrl ? 'ছবি পরিবর্তন/ক্রপ করুন' : 'ছবি যোগ/ক্রপ করুন'}>
                                                    <Crop size={14} />
                                                </button>
                                                {opt.imageUrl && (
                                                    <div className="relative inline-block mt-1 group">
                                                        <img src={opt.imageUrl} alt="preview" className="max-h-16 rounded border border-slate-200 shadow-sm" />
                                                        <button onClick={() => {
                                                            const newOpts = [...q.options];
                                                            newOpts[oi] = { ...newOpts[oi], imageUrl: '' };
                                                            updateQuestion(q.id, 'options', newOpts);
                                                        }} className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white p-0.5 rounded-full shadow-md transition-colors">
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">সঠিক উত্তর</label>
                                <RichTextEditor 
                                    value={q.correctAnswer || ''} 
                                    onChange={val => updateQuestion(q.id, 'correctAnswer', val)}
                                    placeholder="সঠিক উত্তর লিখুন..."
                                    height="min-h-[100px]"
                                    className="border border-slate-200 rounded-lg overflow-hidden bg-white mt-1" 
                                />
                            </div>
                        )}
                        </div>

                        {/* Topic + Source — per question */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">টপিক (এই প্রশ্নের)</label>
                                <input type="text" value={q.topic || ''} onChange={e => updateQuestion(q.id, 'topic', e.target.value)}
                                    className="w-full text-xs p-2 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="যেমন: সালোকসংশ্লেষণ" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">সোর্স</label>
                                <input type="text" value={q.source || ''} onChange={e => updateQuestion(q.id, 'source', e.target.value)}
                                    className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="যেমন: ষষ্ঠ শ্রেণি | আনন্দপাঠ" />
                            </div>
                        </div>

                        {/* Explanation */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">ব্যাখ্যা</label>
                                {q.aiExplanation !== false && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold border border-violet-200">
                                        <Bot size={9} /> AI জেনারেটেড
                                    </span>
                                )}
                            </div>
                            <RichTextEditor 
                                value={q.explanation || ''}
                                onChange={val => {
                                    updateQuestion(q.id, 'explanation', val);
                                    updateQuestion(q.id, 'aiExplanation', false); // Remove AI tag on manual edit
                                }}
                                placeholder="সঠিক উত্তরের ব্যাখ্যা..."
                                height="min-h-[100px]"
                                className="border border-slate-200 rounded-lg overflow-hidden bg-white mt-1" 
                            />
                        </div>
                    </div>
                )}

                {/* ─── PREVIEW MODE ─── */}
                {isPreview && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        {/* Stimulus in preview */}
                        {q.stimulus && (
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                <span className="font-bold text-amber-700 block mb-1">উদ্দীপক:</span>
                                <div className="leading-relaxed"><MarkdownRenderer content={q.stimulus || ''} /></div>
                            </div>
                        )}
                        {(q.options && q.options.length > 0) ? (
                            <div className="grid grid-cols-2 gap-2">
                                {(q.options || []).map((opt, oi) => (
                                    <div key={opt.label || opt.optionLabel || oi}
                                        className={`flex items-center gap-2 p-2 rounded-lg text-xs ${opt.isCorrect === true || opt.isCorrect === 'true' || opt.correct === true || opt.correct === 'true'
                                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold'
                                            : 'bg-slate-50 border border-slate-100 text-slate-600'
                                        }`}>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${opt.isCorrect === true || opt.isCorrect === 'true' || opt.correct === true || opt.correct === 'true' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {opt.isCorrect === true || opt.isCorrect === 'true' || opt.correct === true || opt.correct === 'true' ? <Check size={10} /> : (opt.label || opt.optionLabel)}
                                        </span>
                                        <div className="flex-1 mt-0.5 pt-0.5 min-w-0 overflow-hidden">
                                            <div className="break-words"><MarkdownRenderer content={opt.text || opt.optionText || ''} /></div>
                                            {opt.imageUrl && (
                                                <img src={opt.imageUrl} alt="option" className="mt-1.5 max-h-20 max-w-full rounded shadow-sm border border-slate-200 object-contain" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] text-emerald-700 flex items-start gap-2">
                                <div className="flex-1">
                                    <strong>সঠিক উত্তর:</strong> {q.correctAnswer || 'উত্তর নেই'}
                                </div>
                            </div>
                        )}
                        {q.explanation && (
                            <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-700 flex items-start gap-2">
                                <div className="flex-1">
                                    <strong>ব্যাখ্যা:</strong> {q.explanation}
                                </div>
                                {q.aiExplanation !== false && (
                                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold border border-violet-200">
                                        <Bot size={9} /> AI জেনারেটেড
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

export default ScrapedQuestionCard;
