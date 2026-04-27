import React from 'react';
import {
    Settings, LayoutGrid, FileText, List, RotateCcw,
    Minus, Plus, RotateCw, Trash2, Layout, Square
} from 'lucide-react';

const RightProperties = ({
    rightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
    selection,
    setSelection,
    exam,
    setExam,
    config,
    setConfig,
    updateQuestion,
    deleteQuestion,
    MATH_SSC_TEMPLATE
}) => {
    return (
        <aside className={`${rightPanelOpen ? 'w-80' : 'w-0'} bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.05)] flex flex-col h-full z-20 shrink-0 transition-all duration-300 overflow-hidden`}>
            <div className="flex bg-slate-100/80 p-1 m-2 rounded-xl border border-slate-200">
                <button
                    onClick={() => setRightPanelTab('properties')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all ${rightPanelTab === 'properties' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                    <Settings size={14} /> Properties
                </button>
                <button
                    onClick={() => setRightPanelTab('templates')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all ${rightPanelTab === 'templates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
                >
                    <LayoutGrid size={14} /> Templates
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {rightPanelTab === 'properties' ? (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Context Selection Header */}
                        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 shrink-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-indigo-600 rounded text-white shadow-sm">
                                    {selection.type === 'question' ? <List size={14} /> : selection.type === 'header' ? <LayoutGrid size={14} /> : <FileText size={14} />}
                                </div>
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                                    {selection.type === 'question' ? `Question Context` : selection.type === 'header' ? 'Header Settings' : 'Document Setup'}
                                </span>
                            </div>
                            <h2 className="text-[14px] font-bold text-slate-800 truncate">
                                {selection.type === 'question' ? `Editing Question #${exam.questions.findIndex(q => q.id === selection.id) + 1}` : selection.type === 'header' ? exam.instituteName || 'Header Editor' : 'Page Layout & Styles'}
                            </h2>
                            {selection.type !== 'page' && (
                                <button
                                    onClick={() => setSelection({ type: 'page', id: null })}
                                    className="mt-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                    <RotateCcw size={10} /> Reset Selection
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-20">
                            {/* 1. QUESTION PROPERTIES */}
                            {selection.type === 'question' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-500 mb-2 block flex justify-between">
                                                <span>Point Weight (Marks)</span>
                                                <span className="text-indigo-600 font-black">{exam.questions.find(q => q.id === selection.id)?.marks || 0} pts</span>
                                            </label>
                                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                                                <button onClick={() => updateQuestion(selection.id, 'marks', Math.max(0, (exam.questions.find(q => q.id === selection.id)?.marks || 0) - 1))} className="px-3 py-3 text-slate-400 hover:text-indigo-600 transition-colors"><Minus size={16} /></button>
                                                <input
                                                    type="number"
                                                    value={exam.questions.find(q => q.id === selection.id)?.marks || 0}
                                                    onChange={(e) => updateQuestion(selection.id, 'marks', parseInt(e.target.value))}
                                                    className="flex-1 bg-transparent text-center text-sm font-bold text-slate-800 outline-none"
                                                />
                                                <button onClick={() => updateQuestion(selection.id, 'marks', (exam.questions.find(q => q.id === selection.id)?.marks || 0) + 1)} className="px-3 py-3 text-slate-400 hover:text-indigo-600 transition-colors"><Plus size={16} /></button>
                                            </div>
                                        </div>

                                        {exam.questions.find(q => q.id === selection.id)?.type === 'MCQ' && (
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">MCQ Options</label>
                                                <button
                                                    onClick={() => updateQuestion(selection.id, 'shuffleOptions', !exam.questions.find(q => q.id === selection.id)?.shuffleOptions)}
                                                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${exam.questions.find(q => q.id === selection.id)?.shuffleOptions ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                                >
                                                    <RotateCw size={14} /> {exam.questions.find(q => q.id === selection.id)?.shuffleOptions ? 'Options Randomizing' : 'Order Locked'}
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => deleteQuestion(selection.id)}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-[12px] font-bold transition-all border border-rose-100"
                                        >
                                            <Trash2 size={16} /> Remove Question
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selection.type === 'header' && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Visibility Settings</label>
                                        <div className="space-y-3">
                                            {[
                                                { key: 'showInstituteName', label: 'Institution Name' },
                                                { key: 'showTitle', label: 'Exam Title' },
                                                { key: 'showStudentInfo', label: 'Student Roll Area' },
                                                { key: 'showInstructions', label: 'Instructions Text' }
                                            ].map(item => (
                                                <div key={item.key} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                                    <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                                                    <button
                                                        onClick={() => setConfig({ ...config, [item.key]: !config[item.key] })}
                                                        className={`w-9 h-5 rounded-full relative transition-all ${config[item.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                                    >
                                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config[item.key] ? 'left-5' : 'left-1'}`}></div>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Font Scaling (Points)</label>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-indigo-900 mb-1">
                                                    <span>Institute Size</span>
                                                    <span>{config.instituteFontSize}pt</span>
                                                </div>
                                                <input
                                                    type="range" min="14" max="42" value={config.instituteFontSize}
                                                    onChange={e => setConfig({ ...config, instituteFontSize: parseInt(e.target.value) })}
                                                    className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-indigo-900 mb-1">
                                                    <span>Title Size</span>
                                                    <span>{config.titleFontSize}pt</span>
                                                </div>
                                                <input
                                                    type="range" min="12" max="32" value={config.titleFontSize}
                                                    onChange={e => setConfig({ ...config, titleFontSize: parseInt(e.target.value) })}
                                                    className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selection.type === 'page' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    {/* Paper & Layout Header */}
                                    <div className="px-1">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] mb-4 flex items-center gap-2">
                                            <Layout size={14} /> Document Setup
                                        </h3>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 px-1">Paper Size</label>
                                                <select
                                                    value={config.paperSize}
                                                    onChange={e => setConfig({ ...config, paperSize: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                                                >
                                                    <option value="A4">A4 Standard</option>
                                                    <option value="Legal">Legal</option>
                                                    <option value="Letter">Letter</option>
                                                    <option value="A3">A3 Large</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 px-1">Orientation</label>
                                                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                                                    <button
                                                        onClick={() => setConfig({ ...config, orientation: 'portrait' })}
                                                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${config.orientation === 'portrait' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        title="Portrait"
                                                    >
                                                        <Square size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfig({ ...config, orientation: 'landscape' })}
                                                        className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${config.orientation === 'landscape' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                        title="Landscape"
                                                    >
                                                        <Square size={14} className="rotate-90" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Margins & Columns</label>

                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[11px] font-bold text-slate-600">Margins</span>
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase">{config.margins}</span>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {['narrow', 'moderate', 'normal', 'wide'].map(m => (
                                                                <button
                                                                    key={m}
                                                                    onClick={() => setConfig({ ...config, margins: m })}
                                                                    className={`py-2 rounded-lg text-[9px] font-black uppercase border transition-all ${config.margins === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-200'}`}
                                                                >
                                                                    {m.substring(0, 3)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[11px] font-bold text-slate-600">Columns</span>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => setConfig({ ...config, showColumnDivider: !config.showColumnDivider })}
                                                                    className={`text-[9px] font-bold px-2 py-0.5 rounded ${config.showColumnDivider ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                                                                >
                                                                    Divider
                                                                </button>
                                                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{config.columns}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                                            {[1, 2, 3].map(c => (
                                                                <button
                                                                    key={c}
                                                                    onClick={() => setConfig({ ...config, columns: c })}
                                                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.columns === c ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                                                >
                                                                    {c} Col
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <button
                                                            onClick={() => setConfig({ ...config, showPageBorder: !config.showPageBorder })}
                                                            className={`w-full py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-center gap-2 ${config.showPageBorder ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'}`}
                                                        >
                                                            <Square size={12} className={config.showPageBorder ? "fill-white/20" : ""} /> {config.showPageBorder ? 'Remove Page Border' : 'Add Page Border'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 block font-outfit">Typography (Global)</label>
                                                <div className="space-y-3">
                                                    <select
                                                        value={config.fontFamily}
                                                        onChange={e => setConfig({ ...config, fontFamily: e.target.value })}
                                                        className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                    >
                                                        <option value="font-serif">Classic Serif (English)</option>
                                                        <option value="font-sans">Modern Sans (English)</option>
                                                        <option value="font-tiro text-lg">Tiro Bangla (Unicode)</option>
                                                        <option value="font-hind text-lg">Hind Siliguri (Unicode)</option>
                                                        <option value="font-noto text-lg">Noto Sans Bengali</option>
                                                    </select>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 space-y-1">
                                                            <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">Base Size</p>
                                                            <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                                                <button onClick={() => setConfig({ ...config, fontSize: Math.max(8, config.fontSize - 1) })} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12} /></button>
                                                                <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.fontSize}pt</span>
                                                                <button onClick={() => setConfig({ ...config, fontSize: Math.min(24, config.fontSize + 1) })} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <p className="text-[9px] font-bold text-indigo-400 uppercase px-1">Spacing</p>
                                                            <div className="flex items-center bg-white border border-indigo-100 rounded-xl overflow-hidden">
                                                                <button onClick={() => setConfig({ ...config, lineSpacing: Math.max(1, config.lineSpacing - 0.1) })} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Minus size={12} /></button>
                                                                <span className="flex-1 text-center text-xs font-bold text-slate-800">{config.lineSpacing.toFixed(1)}</span>
                                                                <button onClick={() => setConfig({ ...config, lineSpacing: Math.min(3, config.lineSpacing + 0.1) })} className="px-2 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"><Plus size={12} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                                <div className="flex justify-between items-center mb-3">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Watermark</label>
                                                    <button
                                                        onClick={() => setConfig({ ...config, watermark: !config.watermark })}
                                                        className={`w-10 h-5 rounded-full relative transition-all ${config.watermark ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                                    >
                                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${config.watermark ? 'left-6' : 'left-1'}`}></div>
                                                    </button>
                                                </div>

                                                {config.watermark && (
                                                    <div className="space-y-3 animate-in fade-in zoom-in-95">
                                                        <input
                                                            type="text"
                                                            value={config.watermarkText}
                                                            onChange={e => setConfig({ ...config, watermarkText: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                                            placeholder="Enter watermark text..."
                                                        />
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                                                <span>Opacity</span>
                                                                <span>{config.watermarkOpacity}%</span>
                                                            </div>
                                                            <input
                                                                type="range"
                                                                min="5"
                                                                max="100"
                                                                value={config.watermarkOpacity}
                                                                onChange={e => setConfig({ ...config, watermarkOpacity: parseInt(e.target.value) })}
                                                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-1 text-center">
                                        <p className="text-[10px] text-slate-400 font-medium italic">Changes are applied immediately to the canvas. Standard paper rules are enforced for professional printing.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-4">Sample Layouts</span>

                        <div
                            onClick={() => setExam(MATH_SSC_TEMPLATE)}
                            className="group cursor-pointer border border-slate-200 hover:border-indigo-400 rounded-xl overflow-hidden transition-all hover:shadow-lg bg-slate-50"
                        >
                            <div className="bg-white m-2 p-3 aspect-[3/4] shadow-sm flex flex-col items-center gap-2 overflow-hidden relative">
                                <div className="w-full h-1 bg-slate-200 rounded"></div>
                                <div className="w-20 h-1 bg-slate-100 rounded"></div>
                                <div className="flex gap-2 w-full mt-2">
                                    <div className="flex-1 space-y-1">
                                        <div className="w-full h-1 bg-slate-100 rounded"></div>
                                        <div className="w-full h-1 bg-slate-100 rounded"></div>
                                        <div className="w-4 h-1 bg-slate-100 rounded"></div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="w-full h-1 bg-slate-100 rounded"></div>
                                        <div className="w-full h-1 bg-slate-100 rounded"></div>
                                        <div className="w-4 h-1 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-all flex items-center justify-center">
                                    <Plus size={24} className="text-indigo-600 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-110 transition-all duration-300" />
                                </div>
                            </div>
                            <div className="p-3 bg-white border-t border-slate-100 group-hover:bg-indigo-50 transition-colors">
                                <h4 className="text-[12px] font-black text-slate-800">SSC Math Mock (Bangla)</h4>
                                <p className="text-[10px] text-slate-500 font-medium">Standard 2-column layout with Unicode support</p>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <p className="text-[11px] text-amber-700 leading-relaxed font-medium italic">
                                <b>Tip:</b> Selecting a template will overwrite current content. Save your work before switching!
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default RightProperties;
